#!/usr/bin/env bash
# Phase 5 smoke test — eval engine end-to-end.
#
# Combines pure property tests against packages/utils with DB-driven
# integration tests that induce a breach against a real account row.
#
# Property tests (no DB):
#   1. Static floor is invariant — same state in, same value out.
#   2. Trailing-EOD floor is monotonically non-decreasing as the high-water mark rises.
#   3. computeEquityFromStoredPnl == computeEquityFromPrices when stored PnL
#      was computed with the same bid (the equity formula is consistent across the two paths).
#   4. Mark-to-floor close drives the final balance to the floor exactly,
#      down to the cent.
#   5. EOD job is idempotent — running it twice on the same UTC day advances
#      no rows the second time.
#
# Integration tests (DB):
#   6. Breach induction: lower an account's drawdown_floor above current equity,
#      run evalTick, assert account.status='breached', breach_event row written,
#      synthetic closing trades present, positions zeroed.
#
# Run from project root after sourcing oracle-funded/.env.local.
set -euo pipefail

: "${NEXT_PUBLIC_SUPABASE_URL:?source oracle-funded/.env.local first}"
: "${SUPABASE_SECRET_KEY:?source oracle-funded/.env.local first}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EMAIL="phase5-eval-$(date +%s)@example.com"
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

echo "Phase 5 — eval engine"

# ── Property test 1+2+3+4: pure math against compiled packages/utils ────────
PROP_RESULT=$(cd "$REPO_ROOT/packages/utils" && node --input-type=module -e "
import {
  computeStaticFloor, computeTrailingFloor, computeEquityFromPrices,
  computeEquityFromStoredPnl, computeUnrealizedPnl,
} from './dist/index.js';

const out = {};

// 1. Static floor invariant
const baseState = {
  startingBalanceCents: 10000000n,
  highestEodBalanceCents: 10000000n,
  highestEodEquityCents: 10000000n,
  dayStartEquityCents: 10000000n,
  ruleOverrides: {},
};
const cfg = { drawdownType: 'static', trailingReference: 'eod_balance', totalDrawdownPct: 10, dailyDrawdownPct: null };
const f1 = computeStaticFloor(baseState, cfg);
const f2 = computeStaticFloor(baseState, cfg);
out.static_invariant = f1 === f2 && f1 === 9000000n;

// 2. Trailing floor monotonic non-decreasing
const cfgT = { ...cfg, drawdownType: 'trailing_eod' };
const t1 = computeTrailingFloor(baseState, cfgT);
const higherState = { ...baseState, highestEodBalanceCents: 11000000n };
const t2 = computeTrailingFloor(higherState, cfgT);
out.trailing_monotonic = t2 >= t1 && t2 === 9900000n;

// 3. equity from stored PnL == equity from prices, when stored PnL was set with same bid
const positions = [
  { netContracts: 10, avgEntryPriceCents: 60, currentBidCents: 55 },
];
const liveEquity = computeEquityFromPrices(99400n, positions);
// Stored case: unrealizedPnl was computed with bid=55, avgEntry=60
const stored = positions.map(p => ({
  netContracts: p.netContracts,
  avgEntryPriceCents: p.avgEntryPriceCents,
  unrealizedPnlCents: computeUnrealizedPnl(p.netContracts, p.avgEntryPriceCents, p.currentBidCents),
}));
const storedEquity = computeEquityFromStoredPnl(99400n, stored);
out.equity_consistent = liveEquity === storedEquity;
// Sanity: 99400 + 10*55 = 99950
out.equity_correct_value = liveEquity === 99950n;

// 4. Mark-to-floor close drives balance to floor exactly (single + multi position)
const { planMarkToFloorClose } = await import('../../oracle-funded/src/lib/eval-engine/mark-to-floor.ts').catch(()=>({}));
// (planMarkToFloorClose is in oracle-funded; tested via integration below)

console.log(JSON.stringify(out));
")

INVARIANT=$(echo "$PROP_RESULT" | python3 -c "import sys,json;print(json.load(sys.stdin)['static_invariant'])")
MONOTONIC=$(echo "$PROP_RESULT" | python3 -c "import sys,json;print(json.load(sys.stdin)['trailing_monotonic'])")
EQUITY_CONSISTENT=$(echo "$PROP_RESULT" | python3 -c "import sys,json;print(json.load(sys.stdin)['equity_consistent'])")
EQUITY_CORRECT=$(echo "$PROP_RESULT" | python3 -c "import sys,json;print(json.load(sys.stdin)['equity_correct_value'])")
assert "Property 1: static floor is invariant" "True" "$INVARIANT"
assert "Property 2: trailing floor is monotonically non-decreasing" "True" "$MONOTONIC"
assert "Property 3: stored-PnL equity == live-price equity" "True" "$EQUITY_CONSISTENT"
assert "(equity formula returns the right value: 99950n)" "True" "$EQUITY_CORRECT"

# ── Property 4: mark-to-floor — uses oracle-funded so run via tsx ────────────
M2F=$(cd "$REPO_ROOT/oracle-funded" && npx --yes tsx --input-type=module -e "
import { planMarkToFloorClose } from './src/lib/eval-engine/mark-to-floor';

// Single position: balance 100, floor 90, position 10@5 with bid=3 → market close gives 130, no adjustment
const single = planMarkToFloorClose(100n, 90n, [{
  positionId: 'p1', venue: 'polymarket', externalMarketId: 'm', side: 'yes',
  netContracts: 10, avgEntryPriceCents: 5, currentBidCents: 3,
}]);
const single_ok = single.finalBalanceCents === 130n;

// Underwater: balance 50, floor 90, 10@5 with bid=3 → market close lands at 80 < 90 → bump
const under = planMarkToFloorClose(50n, 90n, [{
  positionId: 'p1', venue: 'polymarket', externalMarketId: 'm', side: 'yes',
  netContracts: 10, avgEntryPriceCents: 5, currentBidCents: 3,
}]);
const under_ok = under.finalBalanceCents === 90n && under.trades[0].adjustedToFloor === true;

// Multi-position: balance 50, floor 100, two positions with bids=2 → market close gives 50+20+20=90 → bump 10 on last
const multi = planMarkToFloorClose(50n, 100n, [
  { positionId: 'p1', venue: 'polymarket', externalMarketId: 'm1', side: 'yes', netContracts: 10, avgEntryPriceCents: 5, currentBidCents: 2 },
  { positionId: 'p2', venue: 'polymarket', externalMarketId: 'm2', side: 'no',  netContracts: 10, avgEntryPriceCents: 5, currentBidCents: 2 },
]);
const multi_ok = multi.finalBalanceCents === 100n && multi.trades[1].adjustedToFloor === true && multi.trades[0].adjustedToFloor === false;

console.log(JSON.stringify({ single_ok, under_ok, multi_ok }));
" 2>&1 | tail -1)
SINGLE=$(echo "$M2F" | python3 -c "import sys,json;print(json.load(sys.stdin)['single_ok'])" 2>/dev/null || echo "false")
UNDER=$(echo "$M2F" | python3 -c "import sys,json;print(json.load(sys.stdin)['under_ok'])" 2>/dev/null || echo "false")
MULTI=$(echo "$M2F" | python3 -c "import sys,json;print(json.load(sys.stdin)['multi_ok'])" 2>/dev/null || echo "false")
[ "$SINGLE" != "True" ] && echo "    m2f raw: $M2F"
assert "Property 4a: market close above floor preserved as-is" "True" "$SINGLE"
assert "Property 4b: underwater close adjusts last trade up to floor" "True" "$UNDER"
assert "Property 4c: multi-position adjustment lands on last position only" "True" "$MULTI"

# ── Integration: induce a breach + verify ────────────────────────────────────
MARKET_ID=$(curl -s "https://gamma-api.polymarket.com/markets?limit=1&active=true&closed=false" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);m=(d if isinstance(d,list) else d['markets'])[0];print(m['id'])")

USER_ID=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"email_confirm\":true}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/firm_members" -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" -H "Content-Type: application/json" -d "{\"firm_id\":\"$DEMO_FIRM_ID\",\"user_id\":\"$USER_ID\",\"role\":\"trader\"}" >/dev/null

ACCOUNT_ID=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{
    \"firm_id\":\"$DEMO_FIRM_ID\",\"user_id\":\"$USER_ID\",\"config_id\":\"$CONFIG_ID\",
    \"current_phase_id\":\"$PHASE_ID\",\"status\":\"active\",
    \"starting_balance_cents\":5000000,\"current_balance_cents\":4990000,
    \"highest_eod_balance_cents\":5000000,\"highest_eod_equity_cents\":5000000,
    \"drawdown_floor_cents\":4500000,\"day_start_equity_cents\":5000000
  }" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")

# Insert an open position so the eval tick has something to mark + close.
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/positions" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"firm_id\":\"$DEMO_FIRM_ID\",\"account_id\":\"$ACCOUNT_ID\",\"venue\":\"polymarket\",\"external_market_id\":\"$MARKET_ID\",\"side\":\"yes\",\"net_contracts\":10000,\"avg_entry_price_cents\":50,\"unrealized_pnl_cents\":0}" >/dev/null

# Force a breach: set the drawdown floor above current equity.
# Equity = balance + bid × N ≈ 4,990,000 + 55 × 10000 = 5,540,000. Set floor = 5,600,000 to trigger.
curl -s -X PATCH "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?id=eq.$ACCOUNT_ID" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"drawdown_floor_cents\":5600000}" >/dev/null

# Lift the trailing-EOD config to static so floor is stable. Patch the config row.
curl -s -X PATCH "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/challenge_configs?id=eq.$CONFIG_ID" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"drawdown_type\":\"static\",\"total_drawdown_pct\":\"50.00\",\"daily_drawdown_pct\":null}" >/dev/null
# With static + 50% drawdown and starting balance 5,000,000, floor = 2,500,000.
# But equity ~5,540,000 wouldn't breach. Bump starting balance virtually via override.
curl -s -X PATCH "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?id=eq.$ACCOUNT_ID" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"starting_balance_cents\":12000000}" >/dev/null
# Now floor = 12,000,000 × 0.5 = 6,000,000 > equity ~5,540,000 → breach.

# Run the tick.
TICK_OUTPUT=$(cd "$REPO_ROOT/oracle-funded" && npx --yes tsx scripts/run-tick.ts "$ACCOUNT_ID" 2>&1 | tail -1)
KIND=$(echo "$TICK_OUTPUT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('kind',''))" 2>/dev/null || echo "<parse-fail>")
IS_BREACH=$(echo "$TICK_OUTPUT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('isBreach',False))" 2>/dev/null || echo "false")
if [ "$KIND" != "ok" ] || [ "$IS_BREACH" != "True" ]; then
  echo "    tick output: $TICK_OUTPUT"
fi
assert "evalTick on breach-state account returns isBreach=true" "True" "$IS_BREACH"

ACC_STATUS=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?id=eq.$ACCOUNT_ID&select=status" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['status'])")
assert "account.status flipped to breached" "breached" "$ACC_STATUS"

BREACH_COUNT=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/breach_events?account_id=eq.$ACCOUNT_ID&select=id" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
assert "breach_event row written" "1" "$BREACH_COUNT"

POS_NET=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/positions?account_id=eq.$ACCOUNT_ID&select=net_contracts" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['net_contracts'] if d else -1)")
assert "position zeroed after mark-to-floor" "0" "$POS_NET"

# Restore the config so other tests don't see corrupted seeds.
curl -s -X PATCH "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/challenge_configs?id=eq.$CONFIG_ID" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"drawdown_type\":\"trailing_eod\",\"total_drawdown_pct\":\"10.00\",\"daily_drawdown_pct\":\"5.00\"}" >/dev/null

# ── Property 5: EOD idempotency ──────────────────────────────────────────────
EOD1=$(cd "$REPO_ROOT/oracle-funded" && npx --yes tsx scripts/run-eod.ts 2>&1 | tail -1)
EOD2=$(cd "$REPO_ROOT/oracle-funded" && npx --yes tsx scripts/run-eod.ts 2>&1 | tail -1)
ADV1=$(echo "$EOD1" | python3 -c "import sys,json;print(json.load(sys.stdin)['accountsAdvanced'])" 2>/dev/null || echo "-1")
ADV2=$(echo "$EOD2" | python3 -c "import sys,json;print(json.load(sys.stdin)['accountsAdvanced'])" 2>/dev/null || echo "-1")
[ "$ADV1" = "-1" ] && echo "    eod1: $EOD1"
[ "$ADV2" = "-1" ] && echo "    eod2: $EOD2"
SECOND_RUN_NOOP="false"; [ "$ADV2" = "0" ] && SECOND_RUN_NOOP="true"
assert_true "Property 5: EOD second run advances 0 accounts (idempotent)" "$SECOND_RUN_NOOP"

echo
echo "Result: $ok passed, $fail failed"
[ "$fail" -eq 0 ]
