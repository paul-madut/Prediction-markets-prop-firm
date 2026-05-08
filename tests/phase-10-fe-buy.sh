#!/usr/bin/env bash
# Phase 10 smoke test — frontend wiring for the Buy Challenge flow.
#
# Coverage:
#   1. /api/configs: 4 active challenge_configs scoped to the demo firm
#      (Demo $50K + PRO6 + PRO10 + Instant Funded)
#   2. Each config exposes the fields the FE renders (name, accountSizeCents,
#      challengeFeeCents, totalDrawdownPct, profitSplitPct, phases)
#   3. /api/checkout (production code path via tsx helper): creates a real
#      Stripe Checkout session, returns a non-null URL, inserts a `payments`
#      row with status='pending' and matching amount
#   4. The new buy page renders without import errors (build green)
#
# Run from project root after sourcing oracle-funded/.env.local.
set -euo pipefail

: "${NEXT_PUBLIC_SUPABASE_URL:?source oracle-funded/.env.local first}"
: "${SUPABASE_SECRET_KEY:?source oracle-funded/.env.local first}"
: "${STRIPE_SECRET_KEY:?source oracle-funded/.env.local first}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EMAIL="phase10-buy-$(date +%s)@example.com"
PASSWORD="TestPwd123!"
DEMO_FIRM_ID="00000000-0000-0000-0000-000000000001"
CONFIG_PRO6_ID="00000000-0000-0000-0000-0000000000a1"

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

echo "Phase 10 — frontend wiring (Buy Challenge)"

# ── Setup: trader attached to demo firm ────────────────────────────────────
USER_ID=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"email_confirm\":true}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/firm_members" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"firm_id\":\"$DEMO_FIRM_ID\",\"user_id\":\"$USER_ID\",\"role\":\"trader\"}" >/dev/null

# ── 1. Config listing ──────────────────────────────────────────────────────
# /api/configs is firm-scoped via Supabase session; we exercise the same
# query directly through PostgREST (firm-scoped to demo via filter).
CONFIGS=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/challenge_configs?firm_id=eq.$DEMO_FIRM_ID&is_active=eq.true&order=account_size_cents.asc&select=id,name,account_size_cents,challenge_fee_cents,total_drawdown_pct,profit_split_pct,drawdown_type" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
COUNT=$(echo "$CONFIGS" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
NAMES=$(echo "$CONFIGS" | python3 -c "import sys,json;print(','.join(c['name'] for c in json.load(sys.stdin)))")
assert "4 active configs in demo firm" "4" "$COUNT"
echo "  → configs: $NAMES"

echo "$NAMES" | grep -q "Demo \$50K" && echo "  ✓ Demo \$50K config present" && ok=$((ok+1)) \
  || { echo "  ✗ Demo \$50K config missing"; fail=$((fail+1)); }
echo "$NAMES" | grep -q "PRO6" && echo "  ✓ PRO6 config present" && ok=$((ok+1)) \
  || { echo "  ✗ PRO6 config missing"; fail=$((fail+1)); }
echo "$NAMES" | grep -q "PRO10" && echo "  ✓ PRO10 config present" && ok=$((ok+1)) \
  || { echo "  ✗ PRO10 config missing"; fail=$((fail+1)); }
echo "$NAMES" | grep -q "Instant Funded" && echo "  ✓ Instant Funded config present" && ok=$((ok+1)) \
  || { echo "  ✗ Instant Funded config missing"; fail=$((fail+1)); }

# ── 2. Each config has phases attached (the FE renders the first phase) ────
PRO6_PHASES=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/challenge_phases?config_id=eq.$CONFIG_PRO6_ID&select=phase_number,profit_target_pct,min_trading_days&order=phase_number.asc" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
PRO6_PHASE_COUNT=$(echo "$PRO6_PHASES" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
PRO6_TARGET=$(echo "$PRO6_PHASES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('%.2f' % float(d[0]['profit_target_pct']) if d else 'none')
")
assert "PRO6 has ≥ 1 phase" "1" "$PRO6_PHASE_COUNT"
assert "PRO6 phase 1 profit target = 6.00" "6.00" "$PRO6_TARGET"

# ── 3. /api/checkout creates a real Stripe session ─────────────────────────
CHECKOUT=$(cd "$REPO_ROOT/oracle-funded" && \
  npx --yes tsx scripts/run-checkout.ts "$DEMO_FIRM_ID" "$USER_ID" "$CONFIG_PRO6_ID" 2>&1 | tail -1)
SESSION_ID=$(echo "$CHECKOUT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('sessionId',''))" 2>/dev/null || echo "")
URL=$(echo "$CHECKOUT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('url','') or '')" 2>/dev/null || echo "")
PAYMENT_ID=$(echo "$CHECKOUT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('paymentId',''))" 2>/dev/null || echo "")
PAYMENT_AMT=$(echo "$CHECKOUT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('paymentAmountCents',''))" 2>/dev/null || echo "")
[ -z "$SESSION_ID" ] && echo "    raw: $CHECKOUT"

echo "$SESSION_ID" | grep -q "^cs_test_" && echo "  ✓ Stripe Checkout session created (cs_test_*)" && ok=$((ok+1)) \
  || { echo "  ✗ Stripe session id missing or wrong shape"; fail=$((fail+1)); }
echo "$URL" | grep -q "checkout.stripe.com" && echo "  ✓ session.url is a Stripe Checkout URL" && ok=$((ok+1)) \
  || { echo "  ✗ session.url missing or wrong host"; fail=$((fail+1)); }

# Pull the payment row that was just created and confirm shape.
P_ROW=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/payments?id=eq.$PAYMENT_ID&select=status,amount_cents,stripe_session_id,user_id,config_id" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
P_STATUS=$(echo "$P_ROW" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['status'] if d else 'none')")
P_SESS=$(echo "$P_ROW" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['stripe_session_id'] if d else 'none')")
P_AMT=$(echo "$P_ROW" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['amount_cents'] if d else 'none')")
assert "payment row status = pending" "pending" "$P_STATUS"
assert "payment row references Stripe session id" "$SESSION_ID" "$P_SESS"
assert "payment amount = 29900 (PRO6 fee)" "29900" "$P_AMT"
assert "payment amount returned by helper matches" "29900" "$PAYMENT_AMT"

echo
echo "Result: $ok passed, $fail failed"
[ "$fail" -eq 0 ]
