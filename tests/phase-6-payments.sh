#!/usr/bin/env bash
# Phase 6 smoke test — Stripe Checkout + webhook + provisioning + refund.
#
# Exercises the full webhook code path with real signature verification:
#   1. Create a Supabase user, attach to demo firm, insert a pending payment.
#   2. Construct a checkout.session.completed event referencing that payment,
#      sign it with our webhook secret via stripe.webhooks.generateTestHeaderString,
#      invoke POST /api/stripe/webhook directly via tsx → expect provisioning.
#   3. Replay the SAME event → expect idempotent ack (200, handled=false).
#   4. Construct a charge.refunded event → invoke webhook → expect account
#      flipped to 'disabled' and payment to 'refunded'.
#   5. Bad signature → expect 400.
#
# Run from project root after sourcing oracle-funded/.env.local.
set -euo pipefail

: "${NEXT_PUBLIC_SUPABASE_URL:?source oracle-funded/.env.local first}"
: "${SUPABASE_SECRET_KEY:?source oracle-funded/.env.local first}"
: "${STRIPE_SECRET_KEY:?source oracle-funded/.env.local first}"
: "${STRIPE_WEBHOOK_SECRET:?source oracle-funded/.env.local first}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EMAIL="phase6-pay-$(date +%s)@example.com"
PASSWORD="TestPwd123!"
DEMO_FIRM_ID="00000000-0000-0000-0000-000000000001"
CONFIG_ID="00000000-0000-0000-0000-000000000002"
FIXTURE_DIR="/tmp/phase6-fixtures-$$"
mkdir -p "$FIXTURE_DIR"

ok=0
fail=0
assert() { if [ "$3" = "$2" ]; then echo "  ✓ $1"; ok=$((ok+1)); else echo "  ✗ $1 — expected '$2', got '$3'"; fail=$((fail+1)); fi; }
assert_true() { if [ "$2" = "true" ]; then echo "  ✓ $1"; ok=$((ok+1)); else echo "  ✗ $1"; fail=$((fail+1)); fi; }

cleanup() {
  if [ -n "${USER_ID:-}" ]; then
    curl -s -X DELETE "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
      -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" >/dev/null || true
  fi
  rm -rf "$FIXTURE_DIR"
}
trap cleanup EXIT

echo "Phase 6 — Stripe payments"

# ── Setup ──────────────────────────────────────────────────────────────────
USER_ID=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"email_confirm\":true}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/firm_members" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"firm_id\":\"$DEMO_FIRM_ID\",\"user_id\":\"$USER_ID\",\"role\":\"trader\"}" >/dev/null

# Pending payment row referencing the session id we'll embed in the fake event.
SESSION_ID="cs_test_phase6_$(date +%s)"
PAYMENT_ID=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/payments" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"firm_id\":\"$DEMO_FIRM_ID\",\"user_id\":\"$USER_ID\",\"config_id\":\"$CONFIG_ID\",\"stripe_session_id\":\"$SESSION_ID\",\"amount_cents\":29900,\"status\":\"pending\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")
echo "  → pending payment $PAYMENT_ID for session $SESSION_ID"

# ── Build the checkout.session.completed fixture ────────────────────────────
EVENT_ID="evt_test_phase6_$(date +%s)"
cat > "$FIXTURE_DIR/checkout-completed.json" <<EOF
{
  "id": "$EVENT_ID",
  "object": "event",
  "api_version": "2026-04-22.dahlia",
  "created": $(date +%s),
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "$SESSION_ID",
      "object": "checkout.session",
      "amount_total": 29900,
      "currency": "cad",
      "customer_email": "$EMAIL",
      "mode": "payment",
      "payment_intent": "pi_test_phase6_$(date +%s)",
      "payment_status": "paid",
      "status": "complete",
      "metadata": {
        "firmId": "$DEMO_FIRM_ID",
        "userId": "$USER_ID",
        "configId": "$CONFIG_ID"
      }
    }
  }
}
EOF

# ── 1. Webhook fires → provisioning runs ────────────────────────────────────
W1=$(cd "$REPO_ROOT/oracle-funded" && npx --yes tsx scripts/run-stripe-webhook.ts "$FIXTURE_DIR/checkout-completed.json" 2>&1 | tail -1)
W1_STATUS=$(echo "$W1" | python3 -c "import sys,json;print(json.load(sys.stdin).get('status','-1'))" 2>/dev/null || echo "-1")
W1_HANDLED=$(echo "$W1" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('body',{}).get('handled',False))" 2>/dev/null || echo "false")
[ "$W1_STATUS" != "200" ] && echo "    raw: $W1"
assert "checkout.session.completed → 200 OK" "200" "$W1_STATUS"
assert "checkout.session.completed handled=true" "True" "$W1_HANDLED"

PAYMENT_STATUS=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/payments?id=eq.$PAYMENT_ID&select=status,stripe_event_id,account_id" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
P_STATUS=$(echo "$PAYMENT_STATUS" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['status'])")
P_EVENT_ID=$(echo "$PAYMENT_STATUS" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['stripe_event_id'])")
P_ACCOUNT_ID=$(echo "$PAYMENT_STATUS" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['account_id'])")
assert "payment flipped to 'paid'" "paid" "$P_STATUS"
assert "payment recorded the stripe event id" "$EVENT_ID" "$P_EVENT_ID"
assert_true "payment got an account_id" "$([ -n "$P_ACCOUNT_ID" ] && [ "$P_ACCOUNT_ID" != "None" ] && echo true || echo false)"

ACC_COUNT=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?user_id=eq.$USER_ID&select=id,status" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
ACC_STATUS=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?user_id=eq.$USER_ID&select=status" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['status'] if d else 'none')")
assert "account provisioned (1 row for user)" "1" "$ACC_COUNT"
assert "account status = 'active'" "active" "$ACC_STATUS"

# ── 2. Idempotency: replay the same event → handled=false ───────────────────
W2=$(cd "$REPO_ROOT/oracle-funded" && npx --yes tsx scripts/run-stripe-webhook.ts "$FIXTURE_DIR/checkout-completed.json" 2>&1 | tail -1)
W2_HANDLED=$(echo "$W2" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('body',{}).get('handled',True))" 2>/dev/null || echo "true")
W2_REASON=$(echo "$W2" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('body',{}).get('reason',''))" 2>/dev/null || echo "")
assert "replay of same event id → handled=false" "False" "$W2_HANDLED"
assert "replay reason = 'already_processed'" "already_processed" "$W2_REASON"

ACC_COUNT2=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?user_id=eq.$USER_ID&select=id" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
assert "no second account created on replay" "1" "$ACC_COUNT2"

# ── 3. Bad signature → 400 ──────────────────────────────────────────────────
# Sign with a DIFFERENT secret than the route is verifying with.
# STRIPE_TEST_SIGNING_SECRET overrides the signer; STRIPE_WEBHOOK_SECRET
# (untouched) is what the route uses to verify.
BAD_RESULT=$(cd "$REPO_ROOT/oracle-funded" && STRIPE_TEST_SIGNING_SECRET="whsec_thisIsNotTheRealSecretJustForTest" \
  npx --yes tsx scripts/run-stripe-webhook.ts "$FIXTURE_DIR/checkout-completed.json" 2>&1 | tail -1)
BAD_STATUS=$(echo "$BAD_RESULT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('status','-1'))" 2>/dev/null || echo "-1")
assert "wrong webhook secret → 400" "400" "$BAD_STATUS"

# ── 4. Refund → account disabled ────────────────────────────────────────────
# The refund handler resolves session via PaymentIntent. We can't easily fake
# that round-trip without hitting Stripe. Instead, embed the session id in
# charge.metadata.stripe_session_id (the handler's first lookup path).
REFUND_EVENT_ID="evt_refund_phase6_$(date +%s)"
cat > "$FIXTURE_DIR/charge-refunded.json" <<EOF
{
  "id": "$REFUND_EVENT_ID",
  "object": "event",
  "api_version": "2026-04-22.dahlia",
  "created": $(date +%s),
  "type": "charge.refunded",
  "data": {
    "object": {
      "id": "ch_test_phase6_$(date +%s)",
      "object": "charge",
      "amount": 29900,
      "amount_refunded": 29900,
      "currency": "cad",
      "refunded": true,
      "metadata": {
        "stripe_session_id": "$SESSION_ID"
      }
    }
  }
}
EOF

W3=$(cd "$REPO_ROOT/oracle-funded" && npx --yes tsx scripts/run-stripe-webhook.ts "$FIXTURE_DIR/charge-refunded.json" 2>&1 | tail -1)
W3_STATUS=$(echo "$W3" | python3 -c "import sys,json;print(json.load(sys.stdin).get('status','-1'))" 2>/dev/null || echo "-1")
[ "$W3_STATUS" != "200" ] && echo "    raw: $W3"
assert "charge.refunded → 200" "200" "$W3_STATUS"

P_FINAL=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/payments?id=eq.$PAYMENT_ID&select=status" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['status'])")
A_FINAL=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?user_id=eq.$USER_ID&select=status" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['status'])")
assert "payment status = 'refunded'" "refunded" "$P_FINAL"
assert "account status flipped to 'disabled' (refundDisablesAccount=true)" "disabled" "$A_FINAL"

echo
echo "Result: $ok passed, $fail failed"
[ "$fail" -eq 0 ]
