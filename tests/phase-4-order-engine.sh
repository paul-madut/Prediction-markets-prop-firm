#!/usr/bin/env bash
# Phase 4 smoke test — order engine end-to-end with a real Polymarket fill.
#
# Provisions a trader + active account, picks a live Polymarket market,
# inserts a pending order via the DB, runs fillOrder, then asserts:
#   - trade row written
#   - position upserted
#   - account balance updated
#   - order marked filled
#   - rate limiter blocks at the configured ceiling
#
# Cleanup: deletes the test user → CASCADE drops firm_members + the account.
#
# Run from project root after sourcing oracle-funded/.env.local.
set -euo pipefail

: "${NEXT_PUBLIC_SUPABASE_URL:?source oracle-funded/.env.local first}"
: "${SUPABASE_SECRET_KEY:?source oracle-funded/.env.local first}"
: "${DATABASE_URL:?source oracle-funded/.env.local first}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EMAIL="phase4-engine-$(date +%s)@example.com"
PASSWORD="TestPwd123!"
DEMO_FIRM_ID="00000000-0000-0000-0000-000000000001"
CONFIG_ID="00000000-0000-0000-0000-000000000002"
PHASE_ID="00000000-0000-0000-0000-000000000003"

ok=0
fail=0
assert() { if [ "$3" = "$2" ]; then echo "  ✓ $1"; ok=$((ok+1)); else echo "  ✗ $1 — expected '$2', got '$3'"; fail=$((fail+1)); fi; }
assert_true() { if [ "$2" = "true" ]; then echo "  ✓ $1"; ok=$((ok+1)); else echo "  ✗ $1"; fail=$((fail+1)); fi; }

cleanup() {
  if [ -n "${USER_ID:-}" ]; then
    curl -s -X DELETE "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
      -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" >/dev/null || true
  fi
}
trap cleanup EXIT

echo "Phase 4 — order engine"

# ── Setup ──────────────────────────────────────────────────────────────────
MARKET_ID=$(curl -s "https://gamma-api.polymarket.com/markets?limit=1&active=true&closed=false" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);m=(d if isinstance(d,list) else d['markets'])[0];print(m['id'])")
echo "  → live market id=$MARKET_ID"

USER_ID=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"email_confirm\":true}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/firm_members" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"firm_id\":\"$DEMO_FIRM_ID\",\"user_id\":\"$USER_ID\",\"role\":\"trader\"}" >/dev/null

ACCOUNT_ID=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{
    \"firm_id\":\"$DEMO_FIRM_ID\",
    \"user_id\":\"$USER_ID\",
    \"config_id\":\"$CONFIG_ID\",
    \"current_phase_id\":\"$PHASE_ID\",
    \"status\":\"active\",
    \"starting_balance_cents\":5000000,
    \"current_balance_cents\":5000000,
    \"highest_eod_balance_cents\":5000000,
    \"highest_eod_equity_cents\":5000000,
    \"drawdown_floor_cents\":4500000,
    \"day_start_equity_cents\":0
  }" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")

IDEMP=$(python3 -c "import uuid;print(uuid.uuid4())")
ORDER_ID=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/orders" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{
    \"firm_id\":\"$DEMO_FIRM_ID\",
    \"account_id\":\"$ACCOUNT_ID\",
    \"venue\":\"polymarket\",
    \"external_market_id\":\"$MARKET_ID\",
    \"external_market_ticker\":\"$MARKET_ID\",
    \"side\":\"yes\",
    \"action\":\"buy\",
    \"size_contracts\":10,
    \"order_type\":\"market\",
    \"idempotency_key\":\"$IDEMP\",
    \"status\":\"pending\"
  }" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")
echo "  → inserted pending order id=$ORDER_ID"

# ── 1. Math sanity: live market produces a usable fill price ────────────────
RESULT=$(cd "$REPO_ROOT/packages/utils" && node --input-type=module -e "
import { fetchProviderQuote, computeFillPrice, computePositionDelta } from './dist/index.js';
const quote = await fetchProviderQuote('polymarket', '$MARKET_ID');
if (!quote) { console.log(JSON.stringify({ ok:false })); process.exit(0); }
const fillPriceCents = computeFillPrice(quote, 'yes', 'buy');
const delta = computePositionDelta('buy', 10, fillPriceCents, 0, 0, 0, quote.yesBid);
console.log(JSON.stringify({ ok:true, fillPriceCents, netContracts: delta.netContracts }));
")
OK_FLAG=$(echo "$RESULT" | python3 -c "import sys,json;print(json.load(sys.stdin)['ok'])")
FILL_PRICE=$(echo "$RESULT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('fillPriceCents','-1'))")
NET=$(echo "$RESULT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('netContracts','-1'))")
assert "fetchProviderQuote + delta calc succeeds for live market" "True" "$OK_FLAG"
assert "netContracts after buy 10 = 10" "10" "$NET"
SANE="false"; [ "$FILL_PRICE" -ge 1 ] && [ "$FILL_PRICE" -le 99 ] && SANE="true"
assert_true "fill price in [1,99] cents (got $FILL_PRICE)" "$SANE"

# ── 2. Run real fillOrder() via tsx — production code path ──────────────────
cd "$REPO_ROOT"
set +e
FILL_OUTPUT=$(cd "$REPO_ROOT/oracle-funded" && npx --yes tsx scripts/run-fill.ts "$ORDER_ID" 2>&1)
FILL_RC=$?
set -e
FILL_LAST=$(echo "$FILL_OUTPUT" | tail -1)
FILL_OK=$(echo "$FILL_LAST" | python3 -c "import sys,json;
try:
    d = json.loads(sys.stdin.read())
    print(d.get('ok', False))
except Exception:
    print('false')" 2>/dev/null || echo "false")
if [ "$FILL_OK" != "True" ]; then
  echo "    fillOrder rc=$FILL_RC, output:"
  echo "$FILL_OUTPUT" | sed 's/^/      /'
fi
assert "fillOrder() returns ok=true" "True" "$FILL_OK"

# ── 3. DB side-effects ──────────────────────────────────────────────────────
ORDER_STATUS=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/orders?id=eq.$ORDER_ID&select=status" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['status'])")
assert "order.status flipped to filled" "filled" "$ORDER_STATUS"

TRADE_COUNT=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/trades?order_id=eq.$ORDER_ID&select=id" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
assert "exactly one trade row written for the order" "1" "$TRADE_COUNT"

POSITION_NET=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/positions?account_id=eq.$ACCOUNT_ID&external_market_id=eq.$MARKET_ID&side=eq.yes&select=net_contracts" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['net_contracts'] if d else -1)")
assert "position.net_contracts = 10" "10" "$POSITION_NET"

NEW_BALANCE=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?id=eq.$ACCOUNT_ID&select=current_balance_cents" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['current_balance_cents'])")
LOWER_THAN_START="false"; [ "$NEW_BALANCE" -lt 5000000 ] && LOWER_THAN_START="true"
assert_true "balance dropped after buy fill ($NEW_BALANCE < 5,000,000)" "$LOWER_THAN_START"

# ── 4. Rate limiter math ────────────────────────────────────────────────────
RL_RESULT=$(cd "$REPO_ROOT/packages/utils" && node --input-type=module -e "
import { checkRateLimit, resetRateLimitForTests } from './dist/rate-limit.js';
resetRateLimitForTests();
const k = 'phase-4-test';
let lastAllowed = false;
for (let i = 0; i < 10; i++) lastAllowed = checkRateLimit(k, 10, 1000).allowed;
const eleventh = checkRateLimit(k, 10, 1000);
console.log(JSON.stringify({ tenth: lastAllowed, eleventh: eleventh.allowed, retry: eleventh.retryAfterMs > 0 }));
")
TENTH=$(echo "$RL_RESULT" | python3 -c "import sys,json;print(json.load(sys.stdin)['tenth'])")
ELEVENTH=$(echo "$RL_RESULT" | python3 -c "import sys,json;print(json.load(sys.stdin)['eleventh'])")
RETRY=$(echo "$RL_RESULT" | python3 -c "import sys,json;print(json.load(sys.stdin)['retry'])")
assert "rate limiter allows 10th call within window" "True" "$TENTH"
assert "rate limiter blocks 11th call within window" "False" "$ELEVENTH"
assert "block carries retryAfterMs > 0" "True" "$RETRY"

echo
echo "Result: $ok passed, $fail failed"
[ "$fail" -eq 0 ]
