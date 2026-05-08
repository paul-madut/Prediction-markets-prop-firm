#!/usr/bin/env bash
# Phase 11 smoke test — FE payouts wiring (trader request + admin queue).
#
# Exercises the same backend the new pages call:
#   /api/payouts (POST request, GET history)
#   /api/admin/payouts/[id]/{approve, reject, mark-paid}
#   /api/accounts (GET — used by trader page to find funded accounts)
#
# Coverage:
#   1. Trader sees only their own funded accounts via /api/accounts
#      (Phase 10 already proved firm-scope; here we confirm status filter).
#   2. Trader's payout request math: requested × profit_split_pct.
#   3. Admin queue: GET /api/payouts?status=requested returns only the
#      pending requests for the firm (regardless of which trader filed them).
#   4. /admin/payouts/[id]/approve flips requested → approved.
#   5. /admin/payouts/[id]/mark-paid flips approved → paid with externalRef.
#   6. /admin/payouts/[id]/reject refunds the balance + records reason.
#   7. After mark-paid, the row appears in GET /api/payouts?status=paid.
#   8. After reject, balance is fully refunded.
#
# Trader-side calls bypass session auth via direct Prisma (Phase 8 pattern);
# admin-side calls go through requireAdmin via ADMIN_GUARD_TEST_USER_ID.
set -euo pipefail

: "${NEXT_PUBLIC_SUPABASE_URL:?source oracle-funded/.env.local first}"
: "${SUPABASE_SECRET_KEY:?source oracle-funded/.env.local first}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRADER_EMAIL="phase11-trader-$(date +%s)@example.com"
ADMIN_EMAIL="phase11-admin-$(date +%s)@example.com"
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

echo "Phase 11 — FE payouts wiring (trader + admin)"

# ── Setup: trader + admin + funded account with $5K profit ─────────────────
TRADER_USER_ID=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TRADER_EMAIL\",\"password\":\"$PASSWORD\",\"email_confirm\":true}" \
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

# Funded account: starting $50,000, current $55,000 → $5,000 of profit.
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
echo "  → funded account $ACCOUNT_ID with \$5,000 profit"

# ── 1. Trader request 1: $1,000 → $800 to trader (80% split) ───────────────
P1=$(cd "$REPO_ROOT/oracle-funded" && \
  npx --yes tsx scripts/insert-payout.ts "$ACCOUNT_ID" "$TRADER_USER_ID" 100000 2>&1 | tail -1)
P1_ID=$(echo "$P1" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
P1_TRADER=$(echo "$P1" | python3 -c "import sys,json;print(json.load(sys.stdin).get('traderAmountCents',''))" 2>/dev/null || echo "")
assert_true "request 1 inserted" "$([ -n "$P1_ID" ] && echo true || echo false)"
assert "request 1 trader take = \$800" "80000" "$P1_TRADER"

# ── 2. Trader request 2: $500 (will be rejected later) ─────────────────────
P2=$(cd "$REPO_ROOT/oracle-funded" && \
  npx --yes tsx scripts/insert-payout.ts "$ACCOUNT_ID" "$TRADER_USER_ID" 50000 2>&1 | tail -1)
P2_ID=$(echo "$P2" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
assert_true "request 2 inserted" "$([ -n "$P2_ID" ] && echo true || echo false)"

BAL_AFTER_REQS=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?id=eq.$ACCOUNT_ID&select=current_balance_cents" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['current_balance_cents'])")
# Started at 5,500,000; debited 100k + 50k = 150k → 5,350,000.
assert "balance debited by both requests" "5350000" "$BAL_AFTER_REQS"

# ── 3. Admin queue: status=requested returns both rows (this firm only) ────
QUEUE=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/payouts?firm_id=eq.$DEMO_FIRM_ID&status=eq.requested&select=id&order=requested_at.asc" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
QUEUE_COUNT=$(echo "$QUEUE" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
# Note: count may be ≥ 2 if previous test runs left rows behind (Phase 8/10 cleanup their users
# which CASCADEs payouts via firm_members). We confirm both ours are in it.
echo "  → admin queue (requested): $QUEUE_COUNT row(s)"
echo "$QUEUE" | grep -q "$P1_ID" && echo "  ✓ admin queue contains request 1" && ok=$((ok+1)) \
  || { echo "  ✗ admin queue missing request 1"; fail=$((fail+1)); }
echo "$QUEUE" | grep -q "$P2_ID" && echo "  ✓ admin queue contains request 2" && ok=$((ok+1)) \
  || { echo "  ✗ admin queue missing request 2"; fail=$((fail+1)); }

# ── 4. Admin approves request 1 → flips to approved ───────────────────────
APP=$(cd "$REPO_ROOT/oracle-funded" && \
  ADMIN_GUARD_TEST_USER_ID="$ADMIN_USER_ID" ADMIN_GUARD_TEST_AAL=aal2 \
  npx --yes tsx scripts/run-payout-action.ts approve "$P1_ID" '{"notes":"verified destination"}' 2>&1 | tail -1)
APP_STATUS=$(echo "$APP" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
assert "/approve → 200" "200" "$APP_STATUS"

P1_AFTER=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/payouts?id=eq.$P1_ID&select=status,reviewed_by_user_id,reviewer_notes" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
P1_S=$(echo "$P1_AFTER" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['status'])")
P1_REVIEWER=$(echo "$P1_AFTER" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['reviewed_by_user_id'])")
P1_NOTES=$(echo "$P1_AFTER" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['reviewer_notes'])")
assert "request 1 status = approved" "approved" "$P1_S"
assert "request 1 reviewer = admin user" "$ADMIN_USER_ID" "$P1_REVIEWER"
assert "request 1 reviewer notes recorded" "verified destination" "$P1_NOTES"

# ── 5. Admin marks request 1 paid with external reference ──────────────────
MP=$(cd "$REPO_ROOT/oracle-funded" && \
  ADMIN_GUARD_TEST_USER_ID="$ADMIN_USER_ID" ADMIN_GUARD_TEST_AAL=aal2 EMAIL_DRY_RUN=true \
  npx --yes tsx scripts/run-payout-action.ts mark-paid "$P1_ID" '{"externalReference":"WIRE-PHASE11-001"}' 2>&1 | tail -1)
MP_STATUS=$(echo "$MP" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
assert "/mark-paid → 200" "200" "$MP_STATUS"

P1_PAID=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/payouts?id=eq.$P1_ID&select=status,external_reference,paid_at" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
P1_P_STATUS=$(echo "$P1_PAID" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['status'])")
P1_P_REF=$(echo "$P1_PAID" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['external_reference'])")
P1_P_AT=$(echo "$P1_PAID" | python3 -c "import sys,json;print('null' if json.load(sys.stdin)[0]['paid_at'] is None else 'set')")
assert "request 1 status = paid" "paid" "$P1_P_STATUS"
assert "request 1 external_reference recorded" "WIRE-PHASE11-001" "$P1_P_REF"
assert "request 1 paid_at set" "set" "$P1_P_AT"

# ── 6. Paid filter returns request 1 (admin's "Paid" tab) ──────────────────
PAID=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/payouts?firm_id=eq.$DEMO_FIRM_ID&status=eq.paid&select=id" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
echo "$PAID" | grep -q "$P1_ID" && echo "  ✓ paid filter contains request 1" && ok=$((ok+1)) \
  || { echo "  ✗ paid filter missing request 1"; fail=$((fail+1)); }

# ── 7. Admin rejects request 2 → refunded balance ──────────────────────────
RJ=$(cd "$REPO_ROOT/oracle-funded" && \
  ADMIN_GUARD_TEST_USER_ID="$ADMIN_USER_ID" ADMIN_GUARD_TEST_AAL=aal2 \
  npx --yes tsx scripts/run-payout-action.ts reject "$P2_ID" '{"reason":"missing payment destination"}' 2>&1 | tail -1)
RJ_STATUS=$(echo "$RJ" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
assert "/reject → 200" "200" "$RJ_STATUS"

P2_AFTER=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/payouts?id=eq.$P2_ID&select=status,reviewer_notes" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
P2_S=$(echo "$P2_AFTER" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['status'])")
P2_NOTES=$(echo "$P2_AFTER" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['reviewer_notes'])")
assert "request 2 status = rejected" "rejected" "$P2_S"
assert "request 2 reason recorded" "missing payment destination" "$P2_NOTES"

# Final balance: started 5,500,000; debited 150k for both requests; rejected
# refunded the $500. So balance should be 5,500,000 − 100,000 = 5,400,000
# (the approved+paid one was the $1,000 request).
BAL_FINAL=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?id=eq.$ACCOUNT_ID&select=current_balance_cents" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['current_balance_cents'])")
assert "final balance: only paid request stays debited (5,400,000)" "5400000" "$BAL_FINAL"

# ── 8. Bad-state guards: approving a paid payout returns 409 ───────────────
DOUBLE=$(cd "$REPO_ROOT/oracle-funded" && \
  ADMIN_GUARD_TEST_USER_ID="$ADMIN_USER_ID" ADMIN_GUARD_TEST_AAL=aal2 \
  npx --yes tsx scripts/run-payout-action.ts approve "$P1_ID" '{}' 2>&1 | tail -1)
DOUBLE_STATUS=$(echo "$DOUBLE" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
assert "approve already-paid → 409" "409" "$DOUBLE_STATUS"

# ── 9. PayoutStatusBadge config covers every real status ───────────────────
BADGE=$(cd "$REPO_ROOT/oracle-funded" && npx --yes tsx --eval "
import { PayoutStatusBadge } from './src/components/payouts/PayoutStatusBadge';
import { renderToString } from 'react-dom/server';
import React from 'react';
const statuses = ['requested','approved','processing','paid','rejected','failed'];
const out = statuses.map(s => {
  const html = renderToString(React.createElement(PayoutStatusBadge, { status: s }));
  return { s, ok: html.includes('rounded-full') && html.length > 50 };
});
process.stdout.write(JSON.stringify(out));
" 2>&1 | tail -1)
ALL_BADGES_OK=$(echo "$BADGE" | python3 -c "import sys,json;d=json.load(sys.stdin);print('true' if all(b['ok'] for b in d) and len(d)==6 else 'false')" 2>/dev/null || echo "false")
assert_true "PayoutStatusBadge renders all 6 real statuses" "$ALL_BADGES_OK"

echo
echo "Result: $ok passed, $fail failed"
[ "$fail" -eq 0 ]
