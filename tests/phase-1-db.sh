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

# 3. Demo challenge config seeded (specific row by id, not a global count —
#    Blueberry configs from migration 20260508000006 are also expected here).
demo_config=$(q "challenge_configs?id=eq.00000000-0000-0000-0000-000000000002")
assert "demo config seeded"      "1"            "$(count "$demo_config")"
assert "config trailing_eod"     "trailing_eod" "$(field "$demo_config" drawdown_type)"

# 4. At least one phase exists for the demo config.
phases=$(q "challenge_phases?config_id=eq.00000000-0000-0000-0000-000000000002")
phase_count=$(count "$phases")
[ "$phase_count" -ge 1 ] && echo "  ✓ demo config has ≥ 1 phase" && ok=$((ok+1)) \
  || { echo "  ✗ demo config has no phases"; fail=$((fail+1)); }

# 5. Blueberry configs from migration 20260508000006 are present.
for slug in "PRO6 — \$50K Evaluation" "PRO10 — \$100K Evaluation" "Instant Funded — \$25K"; do
  enc=$(python3 -c "import urllib.parse;print(urllib.parse.quote('''$slug'''))")
  blueberry=$(q "challenge_configs?name=eq.$enc")
  [ "$(count "$blueberry")" = "1" ] && echo "  ✓ Blueberry config '$slug' present" && ok=$((ok+1)) \
    || { echo "  ✗ Blueberry config '$slug' missing"; fail=$((fail+1)); }
done

echo
echo "Result: $ok passed, $fail failed"
[ "$fail" -eq 0 ]
