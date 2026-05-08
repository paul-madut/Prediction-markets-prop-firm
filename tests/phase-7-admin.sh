#!/usr/bin/env bash
# Phase 7 smoke test — admin actions + audit search + 2FA enforcement.
#
# Coverage:
#   1. requireAdmin denies trader role (403)
#   2. requireAdmin denies aal1-only admin session (403, code=mfa_required)
#   3. /override sets rule_overrides + records before/after in audit
#   4. /reset zeroes positions, restores starting balance, status=active
#   5. /force-close closes positions at current bid; account stays active
#   6. /force-breach flips account to breached + writes breach_event
#   7. /audit search returns the rows we just produced, filterable by action
#
# Run from project root after sourcing oracle-funded/.env.local.
set -euo pipefail

: "${NEXT_PUBLIC_SUPABASE_URL:?source oracle-funded/.env.local first}"
: "${SUPABASE_SECRET_KEY:?source oracle-funded/.env.local first}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EMAIL="phase7-admin-$(date +%s)@example.com"
TRADER_EMAIL="phase7-trader-$(date +%s)@example.com"
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

echo "Phase 7 — admin actions + audit + 2FA"

# ── Setup: admin user (role=admin), trader user (role=trader), one account ──
ADMIN_USER_ID=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"email_confirm\":true}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
TRADER_USER_ID=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TRADER_EMAIL\",\"password\":\"$PASSWORD\",\"email_confirm\":true}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/firm_members" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"firm_id\":\"$DEMO_FIRM_ID\",\"user_id\":\"$ADMIN_USER_ID\",\"role\":\"admin\"}" >/dev/null
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/firm_members" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"firm_id\":\"$DEMO_FIRM_ID\",\"user_id\":\"$TRADER_USER_ID\",\"role\":\"trader\"}" >/dev/null

ACCOUNT_ID=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{
    \"firm_id\":\"$DEMO_FIRM_ID\",\"user_id\":\"$TRADER_USER_ID\",\"config_id\":\"$CONFIG_ID\",
    \"current_phase_id\":\"$PHASE_ID\",\"status\":\"active\",
    \"starting_balance_cents\":5000000,\"current_balance_cents\":4990000,
    \"highest_eod_balance_cents\":5000000,\"highest_eod_equity_cents\":5000000,
    \"drawdown_floor_cents\":4500000,\"day_start_equity_cents\":5000000
  }" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")

# Insert a fake position so /force-close + /force-breach have something to act on.
MARKET_ID=$(curl -s "https://gamma-api.polymarket.com/markets?limit=1&active=true&closed=false" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);m=(d if isinstance(d,list) else d['markets'])[0];print(m['id'])")
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/positions" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"firm_id\":\"$DEMO_FIRM_ID\",\"account_id\":\"$ACCOUNT_ID\",\"venue\":\"polymarket\",\"external_market_id\":\"$MARKET_ID\",\"side\":\"yes\",\"net_contracts\":100,\"avg_entry_price_cents\":50,\"unrealized_pnl_cents\":0}" >/dev/null

# ── 1. Trader denied admin route (403) ─────────────────────────────────────
T1=$(cd "$REPO_ROOT/oracle-funded" && \
  ADMIN_GUARD_TEST_USER_ID="$TRADER_USER_ID" ADMIN_GUARD_TEST_AAL=aal2 \
  npx --yes tsx scripts/run-admin-action.ts override "$ACCOUNT_ID" '{"totalDrawdownPct":15,"reason":"test"}' 2>&1 | tail -1)
T1_STATUS=$(echo "$T1" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
assert "trader role denied admin route (403)" "403" "$T1_STATUS"

# ── 2. Admin without aal2 denied (403, mfa_required) ───────────────────────
T2=$(cd "$REPO_ROOT/oracle-funded" && \
  ADMIN_GUARD_TEST_USER_ID="$ADMIN_USER_ID" ADMIN_GUARD_TEST_AAL=aal1 \
  npx --yes tsx scripts/run-admin-action.ts override "$ACCOUNT_ID" '{"totalDrawdownPct":15,"reason":"test"}' 2>&1 | tail -1)
T2_STATUS=$(echo "$T2" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
T2_CODE=$(echo "$T2" | python3 -c "import sys,json;print(json.load(sys.stdin).get('body',{}).get('code',''))" 2>/dev/null || echo "")
assert "admin without aal2 → 403" "403" "$T2_STATUS"
assert "denial code = mfa_required" "mfa_required" "$T2_CODE"

# Common admin env for the rest.
ADMIN_ENV="ADMIN_GUARD_TEST_USER_ID=$ADMIN_USER_ID ADMIN_GUARD_TEST_AAL=aal2"

# ── 3. /override applies rule_overrides ─────────────────────────────────────
O1=$(cd "$REPO_ROOT/oracle-funded" && \
  env $ADMIN_ENV npx --yes tsx scripts/run-admin-action.ts override "$ACCOUNT_ID" \
    '{"totalDrawdownPct":15,"dailyDrawdownPct":7,"reason":"loosen for review"}' 2>&1 | tail -1)
O1_STATUS=$(echo "$O1" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
assert "/override → 200" "200" "$O1_STATUS"

OV=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?id=eq.$ACCOUNT_ID&select=rule_overrides,override_reason,override_set_by_user_id" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
TOTAL_PCT=$(echo "$OV" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['rule_overrides'].get('total_drawdown_pct'))")
DAILY_PCT=$(echo "$OV" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['rule_overrides'].get('daily_drawdown_pct'))")
SET_BY=$(echo "$OV" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['override_set_by_user_id'])")
assert "rule_overrides.total_drawdown_pct = 15" "15" "$TOTAL_PCT"
assert "rule_overrides.daily_drawdown_pct = 7" "7" "$DAILY_PCT"
assert "override_set_by_user_id = admin" "$ADMIN_USER_ID" "$SET_BY"

# ── 4. /force-close closes positions at current bid; account stays active ──
FC=$(cd "$REPO_ROOT/oracle-funded" && \
  env $ADMIN_ENV npx --yes tsx scripts/run-admin-action.ts force-close "$ACCOUNT_ID" \
    '{"reason":"news event imminent"}' 2>&1 | tail -1)
FC_STATUS=$(echo "$FC" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
FC_CLOSED=$(echo "$FC" | python3 -c "import sys,json;print(json.load(sys.stdin).get('body',{}).get('closed','-1'))" 2>/dev/null || echo "-1")
assert "/force-close → 200" "200" "$FC_STATUS"
assert "/force-close closed 1 position" "1" "$FC_CLOSED"

POS_NET=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/positions?account_id=eq.$ACCOUNT_ID&select=net_contracts" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['net_contracts'] if d else -1)")
A_STATUS=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?id=eq.$ACCOUNT_ID&select=status" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['status'])")
assert "position zeroed after /force-close" "0" "$POS_NET"
assert "account remains active after /force-close" "active" "$A_STATUS"

# ── 5. /force-breach flips to breached + breach_event written ──────────────
FB=$(cd "$REPO_ROOT/oracle-funded" && \
  env $ADMIN_ENV npx --yes tsx scripts/run-admin-action.ts force-breach "$ACCOUNT_ID" \
    '{"reason":"latency arb caught in review"}' 2>&1 | tail -1)
FB_STATUS=$(echo "$FB" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
assert "/force-breach → 200" "200" "$FB_STATUS"

A_AFTER=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?id=eq.$ACCOUNT_ID&select=status,breach_event_id" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
A_FINAL=$(echo "$A_AFTER" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['status'])")
BE_ID=$(echo "$A_AFTER" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['breach_event_id'])")
assert "account → breached" "breached" "$A_FINAL"
assert_true "breach_event_id populated" "$([ -n "$BE_ID" ] && [ "$BE_ID" != "None" ] && echo true || echo false)"

BE_TYPE=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/breach_events?account_id=eq.$ACCOUNT_ID&select=breach_type" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[-1]['breach_type'])")
assert "breach_type = rule_violation (admin-forced)" "rule_violation" "$BE_TYPE"

# ── 6. /reset clears breached state ────────────────────────────────────────
RS=$(cd "$REPO_ROOT/oracle-funded" && \
  env $ADMIN_ENV npx --yes tsx scripts/run-admin-action.ts reset "$ACCOUNT_ID" \
    '{"reason":"goodwill restart"}' 2>&1 | tail -1)
RS_STATUS=$(echo "$RS" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
assert "/reset → 200" "200" "$RS_STATUS"

A_RESET=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?id=eq.$ACCOUNT_ID&select=status,current_balance_cents,breach_at" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
A_R_STATUS=$(echo "$A_RESET" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['status'])")
A_R_BAL=$(echo "$A_RESET" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['current_balance_cents'])")
A_R_BREACH=$(echo "$A_RESET" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['breach_at'])")
assert "/reset → status=active" "active" "$A_R_STATUS"
assert "/reset → balance restored to startingBalance" "5000000" "$A_R_BAL"
assert "/reset → breach_at cleared" "None" "$A_R_BREACH"

# ── 7. /audit search finds the actions we just performed ───────────────────
AUDIT=$(cd "$REPO_ROOT/oracle-funded" && \
  env $ADMIN_ENV npx --yes tsx scripts/run-admin-action.ts audit-search "" "" "?actorUserId=$ADMIN_USER_ID&limit=20" 2>&1 | tail -1)
AUDIT_STATUS=$(echo "$AUDIT" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
ACTIONS=$(echo "$AUDIT" | python3 -c "import sys,json;d=json.load(sys.stdin);print(','.join(sorted({r['action'] for r in d['body']['rows']})))" 2>/dev/null || echo "")
assert "/audit search → 200" "200" "$AUDIT_STATUS"
echo "  → audit actions seen: $ACTIONS"
echo "$ACTIONS" | grep -q "account.override" && \
  echo "  ✓ audit includes account.override" && ok=$((ok+1)) || \
  { echo "  ✗ audit missing account.override"; fail=$((fail+1)); }
echo "$ACTIONS" | grep -q "account.force_breach" && \
  echo "  ✓ audit includes account.force_breach" && ok=$((ok+1)) || \
  { echo "  ✗ audit missing account.force_breach"; fail=$((fail+1)); }
echo "$ACTIONS" | grep -q "account.reset" && \
  echo "  ✓ audit includes account.reset" && ok=$((ok+1)) || \
  { echo "  ✗ audit missing account.reset"; fail=$((fail+1)); }

# ── 8. /audit search filtered by action returns only matches ───────────────
AUDIT2=$(cd "$REPO_ROOT/oracle-funded" && \
  env $ADMIN_ENV npx --yes tsx scripts/run-admin-action.ts audit-search "" "" "?action=account.override" 2>&1 | tail -1)
ALL_OVERRIDE=$(echo "$AUDIT2" | python3 -c "
import sys,json
d=json.load(sys.stdin)['body']['rows']
print('true' if all(r['action']=='account.override' for r in d) and len(d)>=1 else 'false')
" 2>/dev/null || echo "false")
assert_true "audit action= filter returns only matches" "$ALL_OVERRIDE"

echo
echo "Result: $ok passed, $fail failed"
[ "$fail" -eq 0 ]
