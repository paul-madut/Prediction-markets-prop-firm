# OracleFunded — Runbook

Pre-demo checklist, day-of operations, and "what do I do if X breaks."
Keep this short. Long runbooks don't get read.

## Repo state at MVP

```
Branch: mvp (10+ commits ahead of origin/mvp at last update)
Test suite: 129/129 ✓ across 9 phase smoke tests
Build: pnpm -F oracle-funded build → green
```

Run all phase tests with one command:

```bash
set -a && source oracle-funded/.env.local && set +a
bash tests/run-all.sh
```

## Pre-demo checklist (run 30 minutes before)

### 1. Service health

```bash
# Each should return ok.
bash tests/phase-1-db.sh           # Supabase reachable, schema applied
bash tests/phase-3-polymarket.sh   # Polymarket Gamma API up
bash tests/phase-9-observability.sh  # Redis ping + cron + heartbeat
```

If Supabase fails: the project may have been paused. Visit
`https://supabase.com/dashboard/project/liapdgdwwfmclvtwwmcv` to wake it.
Free-tier projects pause after 7 days of inactivity.

If Polymarket fails: their REST API is occasionally down. The order
engine will reject fills with `no_quote_for_market` until it recovers.
Mark-to-floor close uses `avgEntryPriceCents` as a fallback so
breached accounts still close cleanly.

### 2. Stripe CLI running

For local demo with webhooks:

```bash
~/.local/bin/stripe listen \
  --forward-to localhost:3000/api/stripe/webhook \
  --events checkout.session.completed,charge.refunded,charge.dispute.created
```

Leave this running in a separate terminal. The signing secret is the same as
`STRIPE_WEBHOOK_SECRET` in `.env.local` — no need to update on every run.

### 3. Demo data refresh

Verify the four challenge configs exist:

```bash
set -a && source oracle-funded/.env.local && set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/challenge_configs?select=name&order=account_size_cents.asc" \
  -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY"
```

Expect: `Demo $50K Evaluation`, `PRO6 — $50K Evaluation`, `PRO10 — $100K Evaluation`,
`Instant Funded — $25K`.

If you need fresh demo accounts in various states, the smoke tests
(`tests/phase-{4,5,7}-*.sh`) leave clean state via `trap cleanup` so they
don't leak. Run them once to confirm.

### 4. Test sign-in works

The persistent demo trader account:

```
Email:    test@oraclefunded.dev
Password: DemoTrader-2026!
```

Sign in at http://localhost:3000/sign-in — should land on /dashboard.

## Demo flow (~10 minutes)

1. **Trader sign-up** → /sign-up → confirm landing on /dashboard with the
   firm context resolved
2. **Browse markets** → /dashboard/markets → live Polymarket data
3. **Buy a challenge** → /dashboard/new-challenge → real configs from /api/configs
   → click Purchase on PRO6 → Stripe Checkout (use card 4242 4242 4242 4242)
4. **Place a market order** → fills via /api/orders → trade row written,
   position upserted, balance debited
5. **Show eval state** → /api/accounts/<id>/equity → equity, floor,
   distance, isBreach
6. **Trader payout** → /dashboard/payouts → request a payout from a
   funded account → see the live "you'll receive X" preview (profit split)
7. **Admin queue** → /admin/payouts → see the request → Approve →
   Mark Paid with external reference → trader gets payout-paid email
8. **Force breach** → POST /api/admin/accounts/<id>/force-breach → shows
   mark-to-floor close, breach_event row, account flips to breached
9. **Audit trail** → GET /api/admin/audit (filterable by action) → every
   step above is recorded with actor + before/after state

Wired pages on real backend (every page below loads live data):
- `/sign-in`, `/sign-up` — Supabase auth
- `/dashboard` (home) — real account state, equity vs floor, distance bar
- `/dashboard/new-challenge` — real challenge configs + Stripe Checkout
- `/dashboard/payouts` — real payout request + history
- `/dashboard/markets` — live Polymarket data
- `/admin` — real pending-payout summary
- `/admin/payouts` — real admin queue (approve / reject / mark paid)
- `/admin/audit` — real audit log search

Stub pages (consistent "in development" placeholder, not mock data):
- `/dashboard/portfolio`, `/history`, `/analytics`, `/challenge`, `/crypto`,
  `/rules`, `/settings`, `/help`, `/markets/[ticker]`
- `/admin/traders`, `/admin/configs`, `/admin/firm`, `/admin/news`,
  `/admin/signals`, `/admin/accounts/[id]`

No mock data files exist anywhere in the repo.

## What to watch for during demo

- **Tick-all cron should heartbeat every minute.** Check
  `/api/health` → `worker.ageMs < 60000`.
- **Stripe-cli MUST be running** for the buy-challenge flow to provision
  the account. Without it, the webhook never fires and the account stays
  in `pending` payment state.
- **Polymarket prices update when refreshed** — there's no continuous
  poller writing to a hot cache. Order fills hit Gamma REST inline.

## Common breakages

| Symptom | Likely cause | Fix |
|---|---|---|
| Sign-in succeeds but /dashboard shows "Not authenticated" | Middleware proxy file deprecated warning, but the SB session cookie didn't refresh | Hard refresh (cmd+shift+R) — the SSR middleware refreshes on first hit |
| Stripe webhook returns 400 (invalid signature) | `STRIPE_WEBHOOK_SECRET` env doesn't match the running `stripe listen` instance | Restart `stripe listen`; copy the new `whsec_*` from its output to `.env.local`; restart `npm run dev` |
| `no_quote_for_market` on every fill | Polymarket Gamma down OR the externalMarketId you're using isn't active anymore | Pick a fresh active market: `curl 'https://gamma-api.polymarket.com/markets?limit=1&active=true&closed=false'` |
| `/api/health` returns 503 with redis.ok=false | Upstash database paused or token rotated | Check Upstash console; rotate token in `.env.local` if needed |
| `evalTick` fails with `version_conflict` | A concurrent fill or admin action raced this tick | Retry — the tick is idempotent; one of the writers wins |
| Phase tests fail with P2022 (column missing) | Schema drift between Prisma and SQL not yet fixed | All known drifts are migrated as of `20260508000005`. If a new one shows up, file an issue |

## Service dependencies (what's where)

| Service | Purpose | Status when this runbook was written |
|---|---|---|
| Supabase | Postgres + Auth + RLS | ✅ live (project `liapdgdwwfmclvtwwmcv`) |
| Upstash Redis | Heartbeat + future hot cache | ✅ live (`fit-gazelle-84766`) |
| Stripe (test mode) | Checkout + webhook | ✅ live, requires `stripe listen` for local |
| Resend | Welcome / breach / payout-paid | ✅ live; sender is `onboarding@resend.dev` until domain verified |
| Sentry | Error tracking | ✅ wired (`webflux-oz/webflux`) |
| BetterStack | Logs (HTTP source) + uptime | Token in env; uptime monitor not yet pointed at deployed URL |
| Vercel | Hosting + Cron | Not yet deployed (vercel.json ready) |
| Railway | Worker (Polymarket WS poller) | Stub; not running. Vercel Cron covers eval cadence for MVP |
| Polymarket Gamma | Market data | Public, no auth |
| Kalshi | Deferred (Decision 20). Add when API approval lands |

## Deferred — known to be unbuilt at demo time

- Continuous worker poll loop (Railway) — Vercel Cron at 1-minute cadence
  does eval; price drifts between fills are caught on the next minute.
  Plan: build the worker post-launch when Polymarket WebSocket parity matters.
- Kalshi WebSocket integration — needs API credentials.
- TOTP enrolment UI — Supabase Auth's MFA APIs are wired in `requireAdmin`,
  but `/2fa-enrollment` page is still mock. Demo bypasses via
  `NEXT_PUBLIC_DEMO_MODE=true` (admin-guard skips AAL2 check).
- Frontend wiring for /api/checkout, /api/payouts, etc. — backend routes
  are correct; existing UI pages still load mock data and don't call them
  yet. Wiring is per-page UI work, not infra.
- Domain-verified Resend sender — currently `onboarding@resend.dev`.

## Emergency contacts during demo

- DB / Supabase issues: dashboard at `supabase.com/dashboard/project/liapdgdwwfmclvtwwmcv`
- Stripe: `dashboard.stripe.com` → toggle Test mode
- Sentry alerts: `webflux-oz.sentry.io`
- The smoke tests (`tests/run-all.sh`) are the fastest way to verify nothing
  regressed during the demo. Re-run if you smell trouble.

## Production deploy env checklist

Set these in **Vercel project settings → Environment Variables** (Production
scope). Do NOT copy `.env.local` straight up — `NEXT_PUBLIC_DEMO_MODE` must
flip. `next.config.ts` will refuse to build if it doesn't.

### Critical security flags (must be correct)

| Var | Prod value | Why |
|---|---|---|
| `NEXT_PUBLIC_DEMO_MODE` | **unset** or `false` | `true` disables AAL2/MFA enforcement on every admin endpoint. Build fails if set to `true` in production. |
| `NODE_ENV` | `production` (set by Vercel automatically) | Triggers Sentry sample-rate drop + Pino JSON output |

### Supabase

| Var | Source | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | Safe to expose |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API → publishable | Safe to expose; the old "anon" key |
| `SUPABASE_SECRET_KEY` | Supabase → Settings → API → secret | **Server-only**. Never `NEXT_PUBLIC_*`. |
| `SUPABASE_PROJECT_REF` | Supabase → Settings → General → Reference ID | Used by edge runtimes / debug logs |
| `SUPABASE_JWT_JWKS_URL` | `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` | Public endpoint, fine to commit |
| `DATABASE_URL` | Supabase → Database → Connection pooler (Transaction mode, port 6543) | **Different from dev** — use the pooler in serverless |
| `DIRECT_URL` | Same project → Connection string (port 5432) | For Prisma migrate / non-pooled connections |

### Stripe (LIVE mode for prod)

| Var | Source |
|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys → Live publishable (`pk_live_*`) |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Live secret (`sk_live_*`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → your prod endpoint → Signing secret (`whsec_*`) |

Webhook endpoint config in the Stripe dashboard: `https://<your-prod-domain>/api/stripe/webhook` listening for `checkout.session.completed`, `charge.refunded`, `charge.dispute.created`.

### Infrastructure

| Var | Source |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash → DB → REST API → URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash → DB → REST API → Token |
| `CRON_SECRET` | Generate fresh per env: `openssl rand -hex 32`. Vercel Cron sends this automatically as `Authorization: Bearer …` |
| `RESEND_API_KEY` | Resend → API Keys |
| `RESEND_FROM_EMAIL` | Verified domain sender (NOT `onboarding@resend.dev` in prod) |

### Observability

| Var | Source |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry → Project Settings → Client Keys (DSN) |
| `SENTRY_AUTH_TOKEN` | Sentry → Org Settings → Auth Tokens (build-time; scopes `project:write project:read project:releases`) |
| `SENTRY_ORG`, `SENTRY_PROJECT` | Slugs from the dashboard URL |
| `BETTERSTACK_LOGS_SOURCE_TOKEN` | Better Stack → Sources → your HTTP source |
| `LOG_LEVEL` | `info` for prod (`debug` floods Sentry quota) |

### App

| Var | Source |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Your prod URL, e.g. `https://app.webflux.ca`. Used in Stripe success/cancel URLs and OAuth `redirectTo` |
| `POLYMARKET_GAMMA_BASE_URL` | `https://gamma-api.polymarket.com` (same as dev) |
| `KALSHI_API_BASE_URL` | Same as dev until Kalshi credentials land |
| `KALSHI_KEY_ID`, `KALSHI_PRIVATE_KEY` | Leave blank until Kalshi access is granted |

### Pre-deploy validation

Before flipping the prod DNS:

1. `pnpm --filter oracle-funded build` against the prod env file — confirms `next.config.ts` guard passes (i.e. DEMO_MODE is OFF).
2. Sign in as `admin@oraclefunded.test` (or the real owner) — should be redirected to `/2fa-enrollment?next=/admin` on first admin hit.
3. Complete TOTP enrollment with an authenticator app (1Password, Authy, Google Authenticator). Session now at AAL2; admin pages load.
4. Sign out, sign back in — Supabase should challenge for the second factor. Confirm.
5. Hit `/api/health` from outside — expect 200 with `db.ok && redis.ok`.
6. Send one webhook test from the Stripe dashboard (Webhooks → your endpoint → Send test event → `checkout.session.completed`) — confirm 200 in logs.
7. Trigger `tick-all` manually: `curl -H "Authorization: Bearer $CRON_SECRET" https://<prod>/api/cron/tick-all` — expect 200.
8. Tail Sentry for any startup errors in the first 60 seconds.
