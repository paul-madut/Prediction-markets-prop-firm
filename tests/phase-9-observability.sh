#!/usr/bin/env bash
# Phase 9 smoke test — observability + cron infrastructure.
#
# Coverage:
#   1. /api/health returns 200 with both DB + Redis healthy
#   2. /api/cron/tick-all rejects calls without the right Bearer secret (401)
#   3. /api/cron/tick-all with right secret runs evalTick across all active
#      accounts and writes the worker heartbeat to Redis
#   4. /api/cron/eod with right secret runs the EOD job (idempotent in same UTC day)
#   5. After tick-all, /api/health worker.ageMs is fresh (< 60s)
#   6. pino logger renders without throwing (logger.info smoke check)
#
# Run from project root after sourcing oracle-funded/.env.local.
set -euo pipefail

: "${UPSTASH_REDIS_REST_URL:?source oracle-funded/.env.local first}"
: "${UPSTASH_REDIS_REST_TOKEN:?source oracle-funded/.env.local first}"
: "${CRON_SECRET:?CRON_SECRET unset}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

ok=0
fail=0
assert() { if [ "$3" = "$2" ]; then echo "  ✓ $1"; ok=$((ok+1)); else echo "  ✗ $1 — expected '$2', got '$3'"; fail=$((fail+1)); fi; }
assert_true() { if [ "$2" = "true" ]; then echo "  ✓ $1"; ok=$((ok+1)); else echo "  ✗ $1"; fail=$((fail+1)); fi; }

echo "Phase 9 — observability + cron"

# ── 1. /api/health = 200 with healthy DB + Redis ────────────────────────────
H=$(cd "$REPO_ROOT/oracle-funded" && LOG_LEVEL=silent npx --yes tsx scripts/run-cron.ts health 2>&1 | tail -1)
H_STATUS=$(echo "$H" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
H_OK=$(echo "$H" | python3 -c "import sys,json;print(json.load(sys.stdin)['body']['ok'])" 2>/dev/null || echo "false")
H_DB=$(echo "$H" | python3 -c "import sys,json;print(json.load(sys.stdin)['body']['checks']['db']['ok'])" 2>/dev/null || echo "false")
H_REDIS=$(echo "$H" | python3 -c "import sys,json;print(json.load(sys.stdin)['body']['checks']['redis']['ok'])" 2>/dev/null || echo "false")
assert "/api/health → 200" "200" "$H_STATUS"
assert "health.ok = true" "True" "$H_OK"
assert "health.checks.db.ok = true" "True" "$H_DB"
assert "health.checks.redis.ok = true" "True" "$H_REDIS"

# ── 2. /api/cron/tick-all rejects bad/missing secret (401) ──────────────────
NO_AUTH=$(cd "$REPO_ROOT/oracle-funded" && NODE_ENV=production LOG_LEVEL=silent npx --yes tsx scripts/run-cron.ts tick-all "wrong-secret" 2>&1 | tail -1)
NO_AUTH_STATUS=$(echo "$NO_AUTH" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
assert "/api/cron/tick-all without correct secret → 401" "401" "$NO_AUTH_STATUS"

# ── 3. /api/cron/tick-all with right secret runs ────────────────────────────
T=$(cd "$REPO_ROOT/oracle-funded" && LOG_LEVEL=silent npx --yes tsx scripts/run-cron.ts tick-all "$CRON_SECRET" 2>&1 | tail -1)
T_STATUS=$(echo "$T" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
T_OK=$(echo "$T" | python3 -c "import sys,json;print(json.load(sys.stdin)['body']['ok'])" 2>/dev/null || echo "false")
T_SCANNED=$(echo "$T" | python3 -c "import sys,json;print(json.load(sys.stdin)['body']['scanned'])" 2>/dev/null || echo "-1")
[ "$T_STATUS" != "200" ] && echo "    raw: $T"
assert "/api/cron/tick-all → 200" "200" "$T_STATUS"
assert "tick-all body.ok = true" "True" "$T_OK"
[ "$T_SCANNED" -ge 0 ] && echo "  ✓ tick-all scanned $T_SCANNED accounts" && ok=$((ok+1)) || \
  { echo "  ✗ scanned not numeric"; fail=$((fail+1)); }

# ── 4. Worker heartbeat in Redis is fresh after tick-all ────────────────────
HB=$(curl -s "$UPSTASH_REDIS_REST_URL/get/worker:heartbeat:lastMessageMs" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('result','null'))")
NOW=$(python3 -c "import time;print(int(time.time()*1000))")
AGE=$(( NOW - HB ))
[ "$HB" != "null" ] && [ "$AGE" -ge 0 ] && [ "$AGE" -lt 60000 ] && \
  echo "  ✓ worker heartbeat fresh ($AGE ms)" && ok=$((ok+1)) || \
  { echo "  ✗ worker heartbeat stale or missing (age=$AGE, raw=$HB)"; fail=$((fail+1)); }

# ── 5. /api/cron/eod with right secret runs ────────────────────────────────
E=$(cd "$REPO_ROOT/oracle-funded" && LOG_LEVEL=silent npx --yes tsx scripts/run-cron.ts eod "$CRON_SECRET" 2>&1 | tail -1)
E_STATUS=$(echo "$E" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "-1")
E_OK=$(echo "$E" | python3 -c "import sys,json;print(json.load(sys.stdin)['body']['ok'])" 2>/dev/null || echo "false")
[ "$E_STATUS" != "200" ] && echo "    raw: $E"
assert "/api/cron/eod → 200" "200" "$E_STATUS"
assert "eod body.ok = true" "True" "$E_OK"

# ── 6. pino logger smoke (just confirm no throw on import + log) ────────────
PINO=$(cd "$REPO_ROOT/oracle-funded" && LOG_LEVEL=info npx --yes tsx --eval "
import { logger } from './src/lib/logger';
logger.info({ event: 'phase9-pino-smoke' }, 'pino smoke');
process.stdout.write('PHASE9_PINO_OK');
" 2>&1)
echo "$PINO" | grep -q "PHASE9_PINO_OK" && \
  echo "  ✓ pino logger imports + writes" && ok=$((ok+1)) || \
  { echo "  ✗ pino logger broken"; fail=$((fail+1)); }
# And confirm pino DID write something (even if pretty-printed, it shouldn't error).
echo "$PINO" | grep -q "phase9-pino-smoke" && \
  echo "  ✓ pino actually emitted the message" && ok=$((ok+1)) || \
  { echo "  ✗ pino message missing from output"; fail=$((fail+1)); }

echo
echo "Result: $ok passed, $fail failed"
[ "$fail" -eq 0 ]
