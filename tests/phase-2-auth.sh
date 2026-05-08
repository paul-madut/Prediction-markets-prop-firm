#!/usr/bin/env bash
# Phase 2 smoke test — Supabase Auth swap end-to-end.
# Verifies user creation, password sign-in, JWT signing, JWKS verification
# through packages/auth (production code path), cross-schema FK enforcement,
# and ON DELETE CASCADE behaviour.
#
# Run from project root after sourcing oracle-funded/.env.local.
set -euo pipefail

: "${NEXT_PUBLIC_SUPABASE_URL:?source oracle-funded/.env.local first}"
: "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:?source oracle-funded/.env.local first}"
: "${SUPABASE_SECRET_KEY:?source oracle-funded/.env.local first}"
: "${SUPABASE_JWT_JWKS_URL:?source oracle-funded/.env.local first}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEST_EMAIL="phase2-smoke-$(date +%s)@example.com"
TEST_PASSWORD="TestPwd123!"
DEMO_FIRM_ID="00000000-0000-0000-0000-000000000001"

ok=0
fail=0
assert() {
  if [ "$3" = "$2" ]; then echo "  ✓ $1"; ok=$((ok+1));
  else echo "  ✗ $1 — expected '$2', got '$3'"; fail=$((fail+1)); fi
}

cleanup() {
  if [ -n "${USER_ID:-}" ]; then
    curl -s -X DELETE "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
      -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" >/dev/null || true
  fi
}
trap cleanup EXIT

echo "Phase 2 — Supabase Auth"

# 1. Create user via Admin API (auto-confirm bypasses email verification).
USER_RESP=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"email_confirm\":true}")
USER_ID=$(echo "$USER_RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))")
[ -n "$USER_ID" ] && echo "  ✓ admin user create (id=$USER_ID)" && ok=$((ok+1)) \
  || { echo "  ✗ admin user create — $USER_RESP"; fail=$((fail+1)); exit 1; }

# 2. Sign in with the publishable key (the public flow).
ACCESS_TOKEN=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))")
[ -n "$ACCESS_TOKEN" ] && echo "  ✓ password sign-in" && ok=$((ok+1)) \
  || { echo "  ✗ password sign-in"; fail=$((fail+1)); exit 1; }

# 3. JWT shape check — alg, kid, sub.
JWT_HDR=$(echo "$ACCESS_TOKEN" | cut -d. -f1)
JWT_PAYLOAD=$(echo "$ACCESS_TOKEN" | cut -d. -f2)
ALG=$(python3 -c "import base64,json,sys;s='$JWT_HDR';s+='='*(-len(s)%4);print(json.loads(base64.urlsafe_b64decode(s))['alg'])")
SUB=$(python3 -c "import base64,json,sys;s='$JWT_PAYLOAD';s+='='*(-len(s)%4);print(json.loads(base64.urlsafe_b64decode(s))['sub'])")
assert "JWT alg = ES256" "ES256" "$ALG"
assert "JWT sub = user_id" "$USER_ID" "$SUB"

# 4. Verify the JWT via packages/auth (the production verification path).
cd "$REPO_ROOT/packages/auth"
node --input-type=module -e "
import { verifyToken } from './dist/verify.js';
const r = await verifyToken('$ACCESS_TOKEN');
if (r.userId !== '$USER_ID') { console.error('userId mismatch'); process.exit(1); }
" >/dev/null
assert "verifyToken (jose + JWKS) accepts the token" "0" "$?"
cd "$REPO_ROOT"

# 5. Insert firm_members for the new user.
INSERT=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/firm_members" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"firm_id\":\"$DEMO_FIRM_ID\",\"user_id\":\"$USER_ID\",\"role\":\"trader\"}")
ROLE=$(echo "$INSERT" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['role'])")
assert "firm_members row created with role=trader" "trader" "$ROLE"

# 6. FK enforcement: bogus user_id must be rejected.
FK_CODE=$(curl -s -o /tmp/_fk -w "%{http_code}" -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/firm_members" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"firm_id\":\"$DEMO_FIRM_ID\",\"user_id\":\"deadbeef-dead-beef-dead-beefdeadbeef\",\"role\":\"trader\"}")
assert "bogus user_id rejected by FK" "409" "$FK_CODE"
PG_CODE=$(python3 -c "import json;print(json.load(open('/tmp/_fk'))['code'])")
assert "FK error code is 23503 (foreign_key_violation)" "23503" "$PG_CODE"

# 7. ON DELETE CASCADE: delete the user, expect firm_members to be gone.
curl -s -X DELETE "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" >/dev/null
unset USER_ID  # don't double-delete in trap

REMAINING=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/firm_members?user_id=eq.$SUB" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
  | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
assert "ON DELETE CASCADE removed firm_members rows" "0" "$REMAINING"

echo
echo "Result: $ok passed, $fail failed"
[ "$fail" -eq 0 ]
