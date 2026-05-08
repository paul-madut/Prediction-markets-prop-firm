#!/usr/bin/env bash
# Run every phase smoke test in order. Exits 0 on full pass, non-zero on any
# failure. Bash 3.x compatible (macOS default — no assoc arrays).
#
# Usage (from project root):
#   set -a && source oracle-funded/.env.local && set +a
#   bash tests/run-all.sh
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

PHASES="1-db 2-auth 3-polymarket 4-order-engine 5-eval-engine 6-payments 7-admin 8-payouts-emails 9-observability 10-fe-buy 11-fe-payouts"

# Parallel arrays keyed by index instead of name (bash-3 friendly).
PHASE_KEYS=()
PHASE_RESULTS=()
PHASE_LINES=()
TOTAL_PASS=0
TOTAL_FAIL=0
FAILED_PHASES=""

for p in $PHASES; do
  echo
  echo "═══════════════════════════════════════════"
  echo "  phase-$p"
  echo "═══════════════════════════════════════════"
  out=$(bash "tests/phase-$p.sh" 2>&1)
  rc=$?
  echo "$out"
  summary=$(echo "$out" | grep "^Result:" | tail -1)
  PHASE_KEYS+=("$p")
  PHASE_LINES+=("${summary:-Result: ?? passed, ?? failed}")
  if [ "$rc" -eq 0 ]; then
    PHASE_RESULTS+=("PASS")
    TOTAL_PASS=$((TOTAL_PASS + 1))
  else
    PHASE_RESULTS+=("FAIL")
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
    FAILED_PHASES="$FAILED_PHASES $p"
  fi
done

echo
echo "═══════════════════════════════════════════"
echo "  SUMMARY"
echo "═══════════════════════════════════════════"
n=${#PHASE_KEYS[@]}
i=0
while [ $i -lt $n ]; do
  k="${PHASE_KEYS[$i]}"
  r="${PHASE_RESULTS[$i]}"
  l="${PHASE_LINES[$i]}"
  if [ "$r" = "PASS" ]; then
    printf "  ✓ phase-%-20s %s\n" "$k" "$l"
  else
    printf "  ✗ phase-%-20s %s\n" "$k" "$l"
  fi
  i=$((i + 1))
done
echo
echo "Phases: $TOTAL_PASS/$n passing"
if [ "$TOTAL_FAIL" -gt 0 ]; then
  echo "Failed:$FAILED_PHASES"
  exit 1
fi
exit 0
