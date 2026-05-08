#!/usr/bin/env bash
# Phase 8 smoke test — payout request flow + admin review + email templates.
#
# Coverage:
#   1. Payout request inserted; balance debited; trader_amount = requested × split.
#   2. Admin /reject refunds the balance and writes a reason.
#   3. Admin /approve flips 'requested' → 'approved'.
#   4. Admin /mark-paid flips 'approved' → 'paid' with external_reference;
#      EMAIL_DRY_RUN=true keeps the trader-email send non-fatal.
#   5. Email templates (welcome, breach, payout-paid) render non-empty
#      subject + html and interpolate the expected fields.
#   6. sendTransactional with EMAIL_DRY_RUN=true returns ok without network.
#
# Run from project root after sourcing oracle-funded/.env.local.
set -euo pipefail

: "${NEXT_PUBLIC_SUPABASE_URL:?source oracle-funded/.env.local first}"
: "${SUPABASE_SECRET_KEY:?source oracle-funded/.env.local first}"
: "${RESEND_API_KEY:?source oracle-funded/.env.local first}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EMAIL="phase8-trader-$(date +%s)@example.com"
ADMIN_EMAIL="phase8-admin-$(date +%s)@example.com"
PASSWORD="TestPwd123!"
DEMO_FIRM_ID="00000000-0000-0000-0000-000000000001"
CONFIG_ID="00000000-0000-0000-0000-000000000002"
PHASE_ID="00000000-0000-0000-0000-000000000003"

ok=0
fail=0
assert() { if [ "$3" = "$2" ]; then echo "  ✓ $1"; ok=$((ok+1)); else echo "  ✗ $1 — expected '$2', got '$3'"; fail=$((fail+1)); fi; }
assert_true() { if [ "$2" = "true" ]; then echo "  ✓ $1"; ok=$((ok+1)); else echo "  ✗ $1"; fail=$((fail+1)); fi; }

cleanup() {
  for u in "${ADMIN_USER_ID:-}" "${TRADER_USER_ID:-}"; do
    [ -z "$u" ] && continue
    curl -s -X DELETE "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/$u" \
      -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" >/dev/null || true
  done
}
trap cleanup EXIT

echo "Phase 8 — payouts + emails"

# ── Setup: trader + admin + funded account ──────────────────────────────────
TRADER_USER_ID=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"email_confirm\":true}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
ADMIN_USER_ID=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$PASSWORD\",\"email_confirm\":true}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/firm_members" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"firm_id\":\"$DEMO_FIRM_ID\",\"user_id\":\"$TRADER_USER_ID\",\"role\":\"trader\"}" >/dev/null
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/firm_members" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"firm_id\":\"$DEMO_FIRM_ID\",\"user_id\":\"$ADMIN_USER_ID\",\"role\":\"admin\"}" >/dev/null

# Funded account with $5,000 profit ($55,000 − $50,000 starting).
ACCOUNT_ID=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{
    \"firm_id\":\"$DEMO_FIRM_ID\",\"user_id\":\"$TRADER_USER_ID\",\"config_id\":\"$CONFIG_ID\",
    \"current_phase_id\":\"$PHASE_ID\",\"status\":\"funded\",
    \"starting_balance_cents\":5000000,\"current_balance_cents\":5500000,
    \"highest_eod_balance_cents\":5500000,\"highest_eod_equity_cents\":5500000,
    \"drawdown_floor_cents\":4500000,\"day_start_equity_cents\":5500000
  }" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")
echo "  → funded account $ACCOUNT_ID"

# ── 1. Payout request math ─────────────────────────────────────────────────
P1=$(cd "$REPO_ROOT/oracle-funded" && \
  npx --yes tsx scripts/insert-payout.ts "$ACCOUNT_ID" "$TRADER_USER_ID" 100000 2>&1 | tail -1)
PAYOUT_ID=$(echo "$P1" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
TRADER_AMT=$(echo "$P1" | python3 -c "import sys,json;print(json.load(sys.stdin).get('traderAmountCents',''))" 2>/dev/null || echo "")
[ -z "$PAYOUT_ID" ] && echo "    raw: $P1"
assert_true "payout request inserted" "$([ -n "$PAYOUT_ID" ] && echo true || echo false)"
assert "trader_amount_cents = requested × 80% (100000 → 80000)" "80000" "$TRADER_AMT"

BAL_AFTER_REQ=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?id=eq.$ACCOUNT_ID&select=current_balance_cents" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['current_balance_cents'])")
assert "balance debited (5,500,000 − 100,000)" "5400000" "$BAL_AFTER_REQ"

# ── 2. Admin /reject refunds + records reason ───────────────────────────────
REJ=$(cd "$REPO_ROOT/oracle-funded" && \
  ADMIN_GUARD_TEST_USER_ID="$ADMIN_USER_ID" ADMIN_GUARD_TEST_AAL=aal2 \
  npx --yes tsx scripts/run-payout-action.ts reject "$PAYOUT_ID" '{"reason":"missing payment destination"}' 2>&1 | tail -1)
REJ_STATUS=$(echo "$REJ" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
assert "/reject → 200" "200" "$REJ_STATUS"

P_AFTER=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/payouts?id=eq.$PAYOUT_ID&select=status,reviewer_notes" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
P_STAT=$(echo "$P_AFTER" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['status'])")
P_NOTES=$(echo "$P_AFTER" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['reviewer_notes'])")
assert "payout status = rejected" "rejected" "$P_STAT"
assert "rejection reason recorded" "missing payment destination" "$P_NOTES"

BAL_AFTER_REJ=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?id=eq.$ACCOUNT_ID&select=current_balance_cents" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['current_balance_cents'])")
assert "balance refunded after reject (back to 5,500,000)" "5500000" "$BAL_AFTER_REJ"

# ── 3. Approve + mark-paid happy path ──────────────────────────────────────
P2=$(cd "$REPO_ROOT/oracle-funded" && \
  npx --yes tsx scripts/insert-payout.ts "$ACCOUNT_ID" "$TRADER_USER_ID" 200000 2>&1 | tail -1)
P2_ID=$(echo "$P2" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
assert_true "second payout inserted for approve test" "$([ -n "$P2_ID" ] && echo true || echo false)"

APP=$(cd "$REPO_ROOT/oracle-funded" && \
  ADMIN_GUARD_TEST_USER_ID="$ADMIN_USER_ID" ADMIN_GUARD_TEST_AAL=aal2 \
  npx --yes tsx scripts/run-payout-action.ts approve "$P2_ID" '{"notes":"verified destination"}' 2>&1 | tail -1)
APP_STATUS=$(echo "$APP" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
assert "/approve → 200" "200" "$APP_STATUS"

MARKED=$(cd "$REPO_ROOT/oracle-funded" && \
  ADMIN_GUARD_TEST_USER_ID="$ADMIN_USER_ID" ADMIN_GUARD_TEST_AAL=aal2 EMAIL_DRY_RUN=true \
  npx --yes tsx scripts/run-payout-action.ts mark-paid "$P2_ID" '{"externalReference":"INTERAC-XYZ-789"}' 2>&1 | tail -1)
MARKED_STATUS=$(echo "$MARKED" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
assert "/mark-paid → 200" "200" "$MARKED_STATUS"

P2_FINAL=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/payouts?id=eq.$P2_ID&select=status,external_reference,paid_at" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
P2_STAT=$(echo "$P2_FINAL" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['status'])")
P2_REF=$(echo "$P2_FINAL" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['external_reference'])")
P2_PAID_AT=$(echo "$P2_FINAL" | python3 -c "import sys,json;print('null' if json.load(sys.stdin)[0]['paid_at'] is None else 'set')")
assert "payout status = paid" "paid" "$P2_STAT"
assert "external_reference recorded" "INTERAC-XYZ-789" "$P2_REF"
assert "paid_at timestamp set" "set" "$P2_PAID_AT"

# Bad-state guards.
DOUBLE=$(cd "$REPO_ROOT/oracle-funded" && \
  ADMIN_GUARD_TEST_USER_ID="$ADMIN_USER_ID" ADMIN_GUARD_TEST_AAL=aal2 \
  npx --yes tsx scripts/run-payout-action.ts approve "$P2_ID" '{}' 2>&1 | tail -1)
DOUBLE_STATUS=$(echo "$DOUBLE" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
assert "approve already-paid → 409 (bad_state guard)" "409" "$DOUBLE_STATUS"

# ── 4. Email template shape sanity (and dry-run send) ───────────────────────
TPL=$(cd "$REPO_ROOT/oracle-funded" && EMAIL_DRY_RUN=true \
  npx --yes tsx scripts/check-templates.ts 2>&1 | tail -1)
W=$(echo "$TPL" | python3 -c "import sys,json;print(json.load(sys.stdin)['welcome'])" 2>/dev/null || echo "false")
B=$(echo "$TPL" | python3 -c "import sys,json;print(json.load(sys.stdin)['breach'])" 2>/dev/null || echo "false")
P=$(echo "$TPL" | python3 -c "import sys,json;print(json.load(sys.stdin)['payout'])" 2>/dev/null || echo "false")
B_AMT=$(echo "$TPL" | python3 -c "import sys,json;print(json.load(sys.stdin)['breach_includes_amount'])" 2>/dev/null || echo "false")
P_REF=$(echo "$TPL" | python3 -c "import sys,json;print(json.load(sys.stdin)['payout_includes_ref'])" 2>/dev/null || echo "false")
DRY=$(echo "$TPL" | python3 -c "import sys,json;print(json.load(sys.stdin)['send_dry_run_ok'])" 2>/dev/null || echo "false")
assert "welcome template renders non-empty" "True" "$W"
assert "breach template renders non-empty" "True" "$B"
assert "payout-paid template renders non-empty" "True" "$P"
assert "breach template includes formatted equity (\$45,000.00)" "True" "$B_AMT"
assert "payout-paid template includes externalReference" "True" "$P_REF"
assert "EMAIL_DRY_RUN keeps sendTransactional non-throwing + ok" "True" "$DRY"

echo
echo "Result: $ok passed, $fail failed"
[ "$fail" -eq 0 ]
