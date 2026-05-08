#!/usr/bin/env bash
# Phase 1 smoke test — verifies migrations applied + seed data present.
# Run from project root after sourcing oracle-funded/.env.local.
set -euo pipefail

: "${NEXT_PUBLIC_SUPABASE_URL:?source oracle-funded/.env.local first}"
: "${SUPABASE_SECRET_KEY:?source oracle-funded/.env.local first}"

ok=0
fail=0

assert() {
  local name="$1" expect="$2" got="$3"
  if [ "$got" = "$expect" ]; then
    echo "  ✓ $name"
    ok=$((ok+1))
  else
    echo "  ✗ $name — expected '$expect', got '$got'"
    fail=$((fail+1))
  fi
}

q() {
  curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/$1" \
    -H "apikey: $SUPABASE_SECRET_KEY" \
    -H "Authorization: Bearer $SUPABASE_SECRET_KEY"
}

count() { echo "$1" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))"; }
field() { echo "$1" | python3 -c "import sys,json;print(json.load(sys.stdin)[0].get('$2',''))"; }

echo "Phase 1 — DB schema + seed"

# 1. Public schema has all 17 expected tables (sample 5 critical ones).
for t in firms firm_members challenge_configs accounts orders trades positions audit_log; do
  resp=$(curl -s -o /dev/null -w "%{http_code}" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/$t?limit=0" \
    -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")
  assert "table public.$t reachable" "200" "$resp"
done

# 2. Demo firm seeded with the expected slug + venue.
firms=$(q "firms?slug=eq.demo")
assert "demo firm row count"     "1"          "$(count "$firms")"
assert "demo firm name"          "Demo Prop Firm" "$(field "$firms" name)"
assert "demo firm status"        "active"     "$(field "$firms" status)"

# 3. Demo challenge config seeded.
configs=$(q "challenge_configs?firm_id=eq.00000000-0000-0000-0000-000000000001")
assert "challenge_configs count" "1" "$(count "$configs")"
assert "config trailing_eod"     "trailing_eod" "$(field "$configs" drawdown_type)"

# 4. Demo phase seeded.
phases=$(q "challenge_phases?config_id=eq.00000000-0000-0000-0000-000000000002")
assert "challenge_phases count"  "1" "$(count "$phases")"

echo
echo "Result: $ok passed, $fail failed"
[ "$fail" -eq 0 ]
