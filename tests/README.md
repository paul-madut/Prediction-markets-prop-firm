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
| `phase-4-order-engine.sh` | Real `fillOrder()` end-to-end: live Polymarket market → pending order → trade row written → position upserted → account balance updated, plus rate-limiter window math |
| `phase-5-eval-engine.sh` | 5 property tests (static floor invariant, trailing floor monotonic, stored-PnL ≡ live-price equity, mark-to-floor lands exactly on the floor, EOD idempotent) + integration test that induces a real breach and verifies state transitions and synthetic close trades |
| `phase-6-payments.sh` | Stripe webhook end-to-end: real signature verification (signed via SDK's `generateTestHeaderString`), `checkout.session.completed` provisions account + flips payment to paid, replay is idempotent (`already_processed`), bad signature returns 400, `charge.refunded` flips payment + disables account |
| `phase-7-admin.sh` | Admin actions + audit + 2FA: trader denied (403), admin-without-aal2 denied with `mfa_required` code, `/override` + `/force-close` + `/force-breach` + `/reset` end-to-end against a real account, audit-log search returns + filters the resulting rows |
| `phase-8-payouts-emails.sh` | Payout request + admin review: trader-amount math (`requested × profit_split_pct`), balance debit on request + refund on reject, `/approve` + `/mark-paid` happy path with `external_reference` recorded, bad-state guard returns 409, all 3 email templates render with interpolated fields, `EMAIL_DRY_RUN=true` keeps `sendTransactional` non-throwing |

These are intentionally narrow — they catch wiring/config breakage, not
business-logic correctness. Domain-correctness tests (eval engine math,
order fill atomicity) belong in their own Vitest suites added during the
relevant build phase.
