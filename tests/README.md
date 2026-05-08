# Phase smoke tests

Light end-of-phase verification scripts. Each script is self-contained and
re-runnable; running them does not require the Next.js dev server.

Run any script after sourcing `oracle-funded/.env.local`:

```bash
set -a && source oracle-funded/.env.local && set +a
bash tests/phase-1-db.sh
bash tests/phase-2-auth.sh
```

A script exits 0 on success, non-zero on any check failure.

## Tests by phase

| File | Verifies |
|---|---|
| `phase-1-db.sh` | Migrations applied, seed firm/config/phase rows present |
| `phase-2-auth.sh` | Supabase user lifecycle, JWT signing, JWKS verification through `packages/auth`, cross-schema FK constraints, ON DELETE CASCADE |
| `phase-3-polymarket.sh` | Gamma REST reachable, `fetchProviderQuote` normalizes correctly (binary complement, no crossed book, prices in [0,100]), null for bogus ids, kalshi falls back to mock |

These are intentionally narrow — they catch wiring/config breakage, not
business-logic correctness. Domain-correctness tests (eval engine math,
order fill atomicity) belong in their own Vitest suites added during the
relevant build phase.
