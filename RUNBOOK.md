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
3. **Buy a challenge** → /dashboard/buy → real configs from /api/configs
   → click Purchase on PRO6 → Stripe Checkout (use card 4242 4242 4242 4242)
4. **Place a market order** → fills via /api/orders → trade row written,
   position upserted, balance debited
5. **Show eval state** → /api/accounts/<id>/equity → equity, floor,
   distance, isBreach
6. **Trader payout** → /dashboard/payouts-live → request a payout from a
   funded account → see the live "you'll receive X" preview (profit split)
7. **Admin queue** → /admin/payouts-live → see the request → Approve →
   Mark Paid with external reference → trader gets payout-paid email
8. **Force breach** → POST /api/admin/accounts/<id>/force-breach → shows
   mark-to-floor close, breach_event row, account flips to breached
9. **Audit trail** → GET /api/admin/audit (filterable by action) → every
   step above is recorded with actor + before/after state

Wired pages on real backend (use these for the demo):
- `/sign-in`, `/sign-up` — Supabase auth
- `/dashboard/buy` — real challenge configs + Stripe Checkout
- `/dashboard/payouts-live` — real payout request + history
- `/admin/payouts-live` — real admin queue (approve / reject / mark paid)
- `/dashboard/markets` — already-wired Polymarket data

Mock-data pages (still styled, work for visual demo but not load-bearing):
- `/dashboard` (home) — equity history, calendar, journal
- `/dashboard/portfolio`, `/history`, `/analytics`
- `/admin/traders`, `/admin/audit` (page UI), `/admin/compliance`

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
