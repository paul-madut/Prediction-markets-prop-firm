#!/usr/bin/env bash
# Phase 3 smoke test — Polymarket provider end-to-end.
# Verifies the Gamma REST API is reachable, our normalizer produces a valid
# MarketQuote, and fetchProviderQuote returns sensible values for a real
# active Polymarket market.
#
# Run from project root after sourcing oracle-funded/.env.local.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

ok=0
fail=0
assert() {
  if [ "$3" = "$2" ]; then echo "  ✓ $1"; ok=$((ok+1));
  else echo "  ✗ $1 — expected '$2', got '$3'"; fail=$((fail+1)); fi
}
assert_true() {
  if [ "$2" = "true" ]; then echo "  ✓ $1"; ok=$((ok+1));
  else echo "  ✗ $1 — got '$2'"; fail=$((fail+1)); fi
}

echo "Phase 3 — Polymarket provider"

# 1. Gamma `/markets` reachable, returns active markets.
PROBE=$(curl -sf "https://gamma-api.polymarket.com/markets?limit=1&active=true&closed=false")
HAS_ROW=$(echo "$PROBE" | python3 -c "import sys,json;d=json.load(sys.stdin);print('true' if (d if isinstance(d,list) else d.get('markets')) else 'false')")
assert_true "Gamma /markets reachable + active rows" "$HAS_ROW"

# 2. Pick an active liquid market for the rest of the tests.
MARKET_ID=$(echo "$PROBE" | python3 -c "import sys,json;d=json.load(sys.stdin);m=(d if isinstance(d,list) else d['markets'])[0];print(m['id'])")
echo "  → using market id=$MARKET_ID"

# 3. /markets/<id> returns a single market object.
SINGLE=$(curl -sf "https://gamma-api.polymarket.com/markets/$MARKET_ID")
SINGLE_ID=$(echo "$SINGLE" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))")
assert "/markets/<id> returns same market" "$MARKET_ID" "$SINGLE_ID"

# 4. fetchProviderQuote (production code path) returns a normalized quote.
cd "$REPO_ROOT/packages/utils"
QUOTE_JSON=$(node --input-type=module -e "
import { fetchProviderQuote } from './dist/providers.js';
const q = await fetchProviderQuote('polymarket', '$MARKET_ID');
process.stdout.write(JSON.stringify(q ?? null));
")
HAS_QUOTE=$(echo "$QUOTE_JSON" | python3 -c "import sys,json;print('true' if json.load(sys.stdin) else 'false')")
assert_true "fetchProviderQuote returns non-null for active market" "$HAS_QUOTE"

if [ "$HAS_QUOTE" = "true" ]; then
  YES_BID=$(echo "$QUOTE_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin)['yesBid'])")
  YES_ASK=$(echo "$QUOTE_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin)['yesAsk'])")
  NO_BID=$(echo "$QUOTE_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin)['noBid'])")
  NO_ASK=$(echo "$QUOTE_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin)['noAsk'])")

  # 5. yesBid + noAsk = 100  AND  yesAsk + noBid = 100  (binary complement).
  SUM1=$((YES_BID + NO_ASK))
  SUM2=$((YES_ASK + NO_BID))
  assert "binary complement: yesBid + noAsk = 100" "100" "$SUM1"
  assert "binary complement: yesAsk + noBid = 100" "100" "$SUM2"

  # 6. yesBid ≤ yesAsk (book is not crossed) and prices in [0, 100].
  CROSSED="false"; [ "$YES_BID" -gt "$YES_ASK" ] && CROSSED="true"
  assert_true "book not crossed" "$([ "$CROSSED" = "false" ] && echo true || echo false)"
  IN_RANGE="true"; { [ "$YES_BID" -lt 0 ] || [ "$YES_ASK" -gt 100 ]; } && IN_RANGE="false"
  assert_true "yes prices in [0,100] cents" "$IN_RANGE"
fi
cd "$REPO_ROOT"

# 7. fetchProviderQuote with a bogus id returns null without throwing.
BAD_RESULT=$(cd "$REPO_ROOT/packages/utils" && node --input-type=module -e "
import { fetchProviderQuote } from './dist/providers.js';
const q = await fetchProviderQuote('polymarket', '999999999999999');
process.stdout.write(q === null ? 'null' : JSON.stringify(q));
")
assert "bogus market id returns null" "null" "$BAD_RESULT"

# 8. Kalshi venue still resolves (mock fallback per Decision 20).
KAL_RESULT=$(cd "$REPO_ROOT/packages/utils" && node --input-type=module -e "
import { fetchProviderQuote } from './dist/providers.js';
const q = await fetchProviderQuote('kalshi', 'some-ticker');
process.stdout.write(q ? 'ok' : 'null');
")
assert "kalshi venue falls back to mock" "ok" "$KAL_RESULT"

echo
echo "Result: $ok passed, $fail failed"
[ "$fail" -eq 0 ]
