# WebFlux / OracleFunded — Production Readiness Audit

**Date:** 2026-05-12
**Reviewer role:** senior QA engineer + staff software architect
**Source of truth:** `WebFlux_MVP_Plan.md`, `docs/decisions.md`
**Scope:** Full codebase at `oracle-funded/`, `packages/*`, `apps/worker/`, migrations under `oracle-funded/supabase/migrations/`

---

# 0. Progress Update — 2026-05-12

A first stabilization pass shipped against the Build Order in §7 of this doc. Status of each item:

**Day 1 — Production-config hardening**

- ✅ **Build-time guard in `next.config.ts`** — refuses any build/runtime with `NODE_ENV=production && NEXT_PUBLIC_DEMO_MODE=true`. Module-load throw so `next build` and `next start` both fail fast with an explicit error message.
- ✅ **AAL2 redirect in `app/admin/layout.tsx`** — fourth check added after role: if `claims.aal !== 'aal2'` and DEMO_MODE bypass is off, redirect to `/2fa-enrollment?next=/admin`. Honors the same dev bypass as `requireAdmin()`.
- ⏳ **TOTP enrollment on the test admin/owner accounts** — manual user action (requires authenticator app). When DEMO_MODE is flipped off, sign in as `admin@oraclefunded.test` and `owner@oraclefunded.test`, complete the `/2fa-enrollment` flow once each. Then verify the redirect: sign out → sign in with email/pw only (AAL1) → visiting `/admin` should bounce to `/2fa-enrollment?next=/admin`.
- ✅ **`RUNBOOK.md` env checklist for prod** — added comprehensive "Production deploy env checklist" section: critical security flags, Supabase, Stripe (LIVE), infra, observability, app config, plus an 8-step pre-deploy validation script.
- ⏳ **`NEXT_PUBLIC_DEMO_MODE=false` on Vercel project env** — out-of-band action (must be set in Vercel dashboard, not in any committed file). The build guard will refuse to compile in prod if it isn't set.

**Day 2 — Test infrastructure + property tests**

- ✅ **`vitest` + `@vitest/coverage-v8` installed** in `packages/utils`. Test scripts: `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`. Root `package.json` exposes `pnpm -w run test` which fans out to all workspaces via `pnpm -r --if-present test`.
- ✅ **5 property tests for `eval.ts`** at `packages/utils/src/eval.test.ts`. 22 test cases covering:
  - Property 1: `equity = balance + position_value` (zero positions, cost basis + unrealized P&L, current-bid marks, permutation invariance, zeroed positions excluded)
  - Property 2: Static floor immutability (100 repeated calls, peak-balance independence, override shadowing)
  - Property 3: Trailing-EOD floor monotonicity (rising peaks, falling intraday, trailing reference variants, 20×30-day property runs)
  - Property 4: Daily floor (null when unconfigured, override clears, math correctness, effective floor = max(base, daily))
  - Property 5: Breach detection (`lt` vs `lte` boundary, unknown comparison defaults to `lt`, idempotency under repeated calls)
- ✅ **`validateOrder` unit tests** at `packages/utils/src/order-validation.test.ts`. 19 test cases — happy path (4) + one per rejection reason (`not_tradeable_state`, `account_not_owned`, `venue_not_enabled`, `size_exceeds_limit`, `position_limit_exceeded`, `position_not_found`, `order_too_large`, `news_cooldown`) + ordering-of-checks defense (2).
- ✅ **GitHub Actions CI** at `.github/workflows/ci.yml`. Runs on PRs and pushes to `main`/`mvp`: setup pnpm 9, Node 20 with cache, `pnpm install --frozen-lockfile`, then `pnpm -r --if-present type-check` and `pnpm -w run test`. 10-minute timeout.

**Current test suite state**: 41 tests passing in 287ms locally. Typechecks clean across all packages.

**What's still on the Build Order from §7** (not yet shipped):

- Day 3 — RLS test suite + recovery crons (`/api/cron/payment-recovery`, `/api/cron/stuck-orders`)
- Day 4 — Eval engine hardening (`FOR UPDATE` in `evalTick`, persist `drawdown_floor_cents`, expanded override key enforcement, cost-basis pre-check, idempotent order replay)
- Day 5 — BetterStack transport, empty-state placeholders, dashboard KPIs from real data, "market closed" banner, first Playwright spec

**Risk register impact**:

- **R1** (`DEMO_MODE=true` in prod) — partially mitigated: build now fails loudly. Still need the Vercel env flip (out-of-band) and TOTP enrollment on the test accounts.
- **R2** (zero automated tests) — partially mitigated: 41 tests in place covering the eval engine's 5 non-negotiable properties + the order-validation chain. Still need RLS integration tests and Playwright E2E.

---

# 1. Executive Summary

**Current state.** The codebase is a working multi-tenant prediction-markets prop firm at roughly **75–85% of the WebFlux MVP plan**. The architecture is sound and the critical paths (sign-in → buy challenge → place order → fill → payout request → admin approve → mark paid) are wired end-to-end against real APIs (Supabase Auth, Stripe, Polymarket Gamma, Prisma/Postgres). Admin operational surfaces (firm settings, configs, traders, accounts, payouts, audit, news) are fully present. The order engine's fill transaction is correct (FOR UPDATE lock, in-lock price re-read, BigInt arithmetic, atomic position+balance update). Stripe webhook handling is correctly idempotent (signature verified, `stripe_event_id` UNIQUE, all three event types handled).

**Biggest risks (in order):**

1. **`NEXT_PUBLIC_DEMO_MODE=true` is currently in `.env.local`.** If that ships to prod, admin/owner endpoints stop enforcing MFA. Every privileged action (force-breach, override, payout approve) becomes single-factor. Trivially exploitable if an admin Google account is compromised.
2. **Zero automated tests.** No vitest/jest/playwright. The MVP plan calls 5 eval-engine property tests "non-negotiable" (§6) and RLS tenant-isolation tests blocking deploy (§15 Risk 9). None exist. This is the single biggest gap between "demo-ready" and "real money."
3. **Eval engine doesn't persist `accounts.drawdown_floor_cents`.** It's recomputed every tick (correct) but never written back, so forensic queries on the accounts table show stale floors and trader-dispute investigations require recomputing from snapshots.
4. **No recovery crons.** Stuck payments (webhook lost) and stuck orders (fill transaction hangs) have no automated remediation. Both will require manual SQL within the first incident.
5. **Worker is a stub.** `apps/worker` returns `{ok: true}`. Once Kalshi WS is enabled per §11 Day 8, Vercel functions cannot maintain stateful WebSockets — the current cron-inside-Vercel pattern works only for Polymarket REST polling.
6. **Rate limiting is in-process memory.** Adequate for single-instance test; multi-region prod traffic bypasses it freely.

**Overall readiness verdict.**

- **Blueberry demo / pilot with 5–10 friendly traders**: ready in 1–2 days of patching (DEMO_MODE flip, basic empty states).
- **Real customer money at any meaningful volume**: 5–8 working days away. The work is concentrated and tractable — fix DEMO_MODE, ship the property tests and RLS tests, add 3 recovery crons, persist eval floor, integrate Upstash for rate limiting. None of these are hard; collectively they're the difference between "works" and "audit-defensible."

---

# 2. Route and Flow Audit

Status legend: **OK** = wired end-to-end | **PARTIAL** = implemented but with gaps | **BROKEN** = visible bug | **STUB/MISSING** = not implemented or placeholder.

## 2.1 Public + Auth Pages

| Route | Role | Expected | Status | Gaps | Coverage Needed |
|---|---|---|---|---|---|
| `/` | Public | Redirect signed-in → /dashboard, else → /sign-in | OK | None | Smoke |
| `/sign-in` | Public | Email/pw + Google OAuth, surface `?error=` from callback | OK | "Forgot password" is a placeholder (line 86 of page.tsx) — no reset email flow | E2E happy path + invalid creds |
| `/sign-up` | Public | Create user + auto-register to `demo` firm | OK | Password strength meter is cosmetic; backend enforces minLength=8 only | E2E + dup email + weak password |
| `/auth/callback` | Public (OAuth landing) | Exchange code, create `firm_members` if missing, redirect | OK (after recent fixes) | First-time OAuth user gets demo firm only; multi-firm onboarding unimplemented | E2E with stub Google IdP |
| `/2fa-enrollment` | Authenticated | TOTP enroll + AAL2 elevation | OK | New enrollment vs existing-factor elevation both wired; no "lost authenticator" recovery path | Manual test only (involves real authenticator app) |

## 2.2 Trader Dashboard `/dashboard/*`

| Route | Expected | Status | Gaps |
|---|---|---|---|
| `/dashboard` | Welcome hero + KPIs + chart + objectives + tabs | PARTIAL | `winRate`, `currentDailyDrawdown`, `todaysProfit`, `trades`, `positions` all hardcoded zero (no trades/intra-day endpoint). Equity history is a 14-point monotone interpolation (placeholder). Calendar tab renders empty. News not surfaced. |
| `/dashboard/markets` | List from `/api/markets`, sidedness filter, drift loop | OK | Filter applied only client-side; backend `validateOrder` does **not** enforce sidedness (only `fillOrder` does, per spec) |
| `/dashboard/markets/[ticker]` | Quote + outcome picker (multi) + trade panel + recent fills | OK (after recent fixes) | Outcome titles use heuristic prefix strip; doesn't handle every Polymarket question shape. No "market closed" banner on direct-link to a closed market. |
| `/dashboard/portfolio` | Stats + open positions + recent fills | OK | "Current" price on each row is derived from `unrealizedPnlCents / netContracts`, not a live quote — accurate to the last eval tick, not real-time. |
| `/dashboard/challenge` | Phase progress + rules | OK | Skeleton ships; phase strip synthesised because `/api/accounts` only returns `currentPhase`, not all phases. |
| `/dashboard/analytics` | Trade aggregates | PARTIAL | Pulls `/api/trades` correctly; empty state shows nothing (not "No trades yet"). |
| `/dashboard/history` | Searchable trade ledger + CSV | OK | CSV export uses `csvExport.ts`; not tested at >1000 rows. |
| `/dashboard/payouts` | Request + history | OK | No client-side preview of profit-split breakdown if config split changes mid-flight. |
| `/dashboard/new-challenge` | Plan cards → Stripe Checkout | OK | If Stripe API times out, the user sees a raw 500. No retry. |
| `/dashboard/rules` | Plain-English ruleset | OK | Reads from `activeAccount.config` + phase; doesn't display `rule_overrides` (so a trader with a relaxed drawdown sees the config default). |
| `/dashboard/help` | Static FAQ | OK | Static; no contact form. |
| `/dashboard/settings` | Profile + accounts + signout | OK | "Reset password" relies on `resetPasswordForEmail` — works only for email users; no message for OAuth-only users. |

## 2.3 Admin `/admin/*`

| Route | Expected | Status | Gaps |
|---|---|---|---|
| `/admin` | Pending queue tiles | OK | No KPI tiles (active accounts, breaches/day) per §9.1904. |
| `/admin/firm` | Firm settings | OK | "Status: paused" option exists but no actual paused-state UX (no banner on trader side). |
| `/admin/configs` | List + isActive toggle | OK | No duplicate-config action; new-config form lives in separate route. |
| `/admin/configs/new`, `/admin/configs/[id]/edit` | Full form | OK | Phase ordering and `phase_number` collisions not validated client-side. |
| `/admin/traders` | List + filter | OK | No bulk actions per §9 vision. |
| `/admin/traders/[traderId]` | Per-trader accounts | PARTIAL | Display name from auth.users not exposed (note in file header). |
| `/admin/accounts/[id]` | Override + suspend + force-breach + force-close + reset + promote/reset-phase | OK | Override modal exposes new keys (profitSplit, position caps, minTradingDays) but eval engine doesn't honor them yet — documented to user. |
| `/admin/payouts` | Approve/reject/mark-paid | OK | No "bulk approve" path; one-at-a-time. |
| `/admin/audit` | Search + cursor pagination | OK | No export (CSV). |
| `/admin/news` | News-cooldown CRUD | OK | UI doesn't preview what markets will be blocked. |
| `/admin/signals/[id]` | Cheat-signal review | STUB | Deferred per §7; infra present, queries disabled. Correct per plan. |
| **Missing per §9** | Risk-manager dashboard, affiliate console | MISSING | The plan does not require these in MVP, but the user prompt mentions both roles. Currently no risk-manager or affiliate role exists in `FirmRole` enum. |

## 2.4 API: Trader-facing

| Endpoint | Verbs | Status | Gaps |
|---|---|---|---|
| `/api/auth/me` | GET | PARTIAL | Returns firm + profile correctly. **Does not flag MFA-required for admin/owner roles** — admin with AAL1 session gets full context. |
| `/api/auth/register` | POST | OK | One-firm-per-user check (409 on dup). |
| `/api/accounts` | GET | OK | Admins get all firm accounts (intentional); first-result selection in `AppContext` confused testers when admin was logged in. |
| `/api/accounts/[id]` | GET, PATCH | OK | PATCH covers active ↔ disabled. |
| `/api/accounts/[id]/equity` | GET | OK | No account.status guard before computing — equity returned for `disabled` accounts. |
| `/api/orders` | GET, POST | OK | Idempotency keys enforced via UNIQUE constraint — but duplicate POST returns a 500 (constraint violation) rather than the original order. Spec calls for the latter. |
| `/api/orders/[id]` | GET | OK | — |
| `/api/trades` | GET | OK | — |
| `/api/payouts` | GET, POST | OK | Trader sees own; admin sees firm. Profit-split math correct (basis points). |
| `/api/checkout` | POST | OK | No retry-on-Stripe-timeout. |
| `/api/configs` | GET | OK | Active-only filter for traders is correct. |
| `/api/markets` | GET | PARTIAL | Polymarket only; Kalshi venue completely absent. Closed-market filter added recently. |

## 2.5 API: Admin

All 15 admin routes use `requireAdmin()` (role + AAL2 + firm). Sampled and verified.

| Endpoint | Verbs | Status | Gaps |
|---|---|---|---|
| `/api/admin/firm` | GET, PATCH | OK | `oneSidedThresholdPct` validated 0–49. |
| `/api/admin/configs` | GET, POST | OK | GET added recently for admin list. |
| `/api/admin/configs/[id]` | GET, PATCH | OK | — |
| `/api/admin/accounts/[id]/override` | POST | OK | New keys stored but engine doesn't honor them yet (forward-compat). |
| `/api/admin/accounts/[id]/suspend`, `/resume` | POST | OK | Recently shipped. |
| `/api/admin/accounts/[id]/promote-phase`, `/reset-phase` | POST | OK | Recently shipped. |
| `/api/admin/accounts/[id]/force-close`, `/force-breach`, `/reset` | POST | OK | Force-breach takes live mark-to-floor close per §6. |
| `/api/admin/payouts/[id]/approve`, `/reject`, `/mark-paid` | POST | OK | Reject refunds escrow; mark-paid stores external ref + sends email. |
| `/api/admin/audit` | GET | OK | Cursor pagination. |
| `/api/admin/news`, `/[id]` | GET, POST, PATCH, DELETE | OK | — |
| `/api/admin/signals`, `/[id]` | GET, PATCH | OK | Empty in MVP (deferred). |

## 2.6 Webhooks + Cron

| Endpoint | Status | Gaps |
|---|---|---|
| `/api/stripe/webhook` | OK | Signature verified, idempotent on `stripe_event_id`, handles `checkout.session.completed` / `charge.refunded` / `charge.dispute.created`. No DLQ for failed provisioning. |
| `/api/cron/tick-all` | PARTIAL | Bearer-auth OK, heartbeat OK. **No FOR UPDATE lock on the per-account loop** — two overlapping cron firings can double-evaluate the same account in the same minute and write duplicate breach events. |
| `/api/cron/eod` | OK | Idempotent via `last_eod_run_at` column. |
| `/api/cron/payment-recovery` | MISSING | Spec §8 calls for stuck-payment recovery. Doesn't exist. |
| `/api/cron/stuck-orders` | MISSING | Spec §5 calls for stuck-order recovery (>60s pending). Doesn't exist. |
| `/api/health` | OK | Checks DB + Redis + worker heartbeat. Returns 503 on DB/Redis fail. |

## 2.7 Background Workers

| Process | Status | Gaps |
|---|---|---|
| `apps/worker` (Railway) | STUB | Returns `{status:'ok'}`. Spec assumes this hosts Kalshi WS + eval loop once Kalshi enabled. |
| Polymarket REST poller | INLINE | Runs inside Vercel cron; no separate worker. OK for MVP. |
| Redis hot price cache | MISSING | Not wired. All quote fetches hit Polymarket directly. |
| `price_history` writes | MISSING | Schema exists; zero writes anywhere in code. Detection backtesting impossible until shipped. |

---

# 3. Manual Test Plan

Priority: **P0** = blocks ship | **P1** = blocks pilot | **P2** = polish.

## 3.1 Auth

| # | Test | Pre | Steps | Expected | Pri | If broken |
|---|---|---|---|---|---|---|
| A1 | Email/pw sign-up | Fresh email | `/sign-up` → submit → land `/dashboard` | Account created, `firm_members` row exists, dashboard renders | P0 | Sev1 — onboarding broken |
| A2 | Email/pw sign-in | Account exists | `/sign-in` → submit | Land `/dashboard` | P0 | Sev1 |
| A3 | Google OAuth sign-up | None | Click Google → consent → callback | `firm_members` row created, redirect to `/dashboard` | P0 | Sev1 |
| A4 | Google OAuth sign-in (returning) | OAuth user exists | Click Google | Same row found, no duplicate firm membership | P0 | Sev1 |
| A5 | Sign-out | Signed in | TopBar dropdown → Sign Out | Cookies cleared, redirect to `/sign-in` | P0 | Sev2 |
| A6 | TOTP enrollment | Admin user, no MFA | Visit `/2fa-enrollment` → scan → verify 6-digit | Session at `aal2`, can access admin endpoints | P1 | Sev1 in prod (when DEMO_MODE=false) |
| A7 | Failed sign-in surfaces error | Wrong password | Submit | Banner shows "Invalid login credentials" | P1 | Sev3 |
| A8 | OAuth callback error surfaces on `/sign-in` | Manipulate callback URL | Hit `/auth/callback?error=...` | `/sign-in` shows banner with the error | P1 | Sev3 |
| A9 | Redirect after sign-in honors `redirect_url` | Signed out | Visit `/admin/firm` → bounced to `/sign-in?redirect_url=/admin/firm` → sign in | Land on `/admin/firm` | P1 | Sev3 |

## 3.2 Trader Onboarding + Purchase

| # | Test | Pre | Steps | Expected | Pri |
|---|---|---|---|---|---|
| O1 | Buy $1 test challenge | Signed in, test config active | `/dashboard/new-challenge` → select TEST $1 Stripe → Checkout → 4242 card → success | Webhook fires, account row appears in `/dashboard`, balance = $5000 | P0 |
| O2 | Buy real-priced challenge | Same | Pick PRO6 $50K → 4242 card | Account at $50K starting balance, active, drawdown floor = $45K (10% TDD) | P0 |
| O3 | Cancel checkout | Mid-flow | Click cancel | Redirect back to `/dashboard?checkout=cancel`; no account created | P0 |
| O4 | Webhook replay (idempotency) | Successful purchase | `stripe events resend <evt_id>` | Second delivery is no-op; no duplicate account, no audit log dup | P0 |
| O5 | Refund disables account | Funded purchase | `stripe refunds create --payment_intent ...` | Webhook fires `charge.refunded`, account status → `disabled` if `refundDisablesAccount=true` | P1 |
| O6 | Dispute marks payment | Same | Trigger dispute via Stripe test | Payment status → `disputed`, audit log entry | P1 |

## 3.3 Order Entry + Fill

| # | Test | Pre | Steps | Expected | Pri |
|---|---|---|---|---|---|
| T1 | Buy YES happy path | Funded account, open market | `/dashboard/markets/[ticker]` → Buy 10 YES | Order accepted, fill price returned, position row appears | P0 |
| T2 | Position-limit reject | Already 1 position on this market (maxPositionsPerMarket=1) | Submit again | 422 with `position_limit_exceeded` | P0 |
| T3 | Wrong-account submit (cross-user) | Trader A logged in, account B's UUID | Force POST with account B id | 403 forbidden (route-level isAdmin check) | P0 |
| T4 | One-sided market block | Firm threshold=5, market yes_ask=3 | Try to order | 200 with `fillError: one_sided_market_blocked` | P0 |
| T5 | Order on closed market | Market `close_time` < now | Direct URL | UI: outcome doesn't appear in list. API: rejected with `no_quote_for_market` | P0 |
| T6 | Idempotent submit | Same `idempotencyKey` twice | POST twice | Second returns same order (currently: 500 constraint violation) | P1 |
| T7 | Rate limit (10/sec) | Same account | Burst 15 in 1s | Some 429s | P1 |
| T8 | Close position | Open position | `/dashboard/portfolio` → Close button | Opposing market order fires, position drops to 0 | P0 |
| T9 | Sell with no position | None | Force POST sell | 422 `position_not_found` | P1 |
| T10 | News cooldown blocks | News event active | Submit during window | 422 `news_cooldown` | P1 |
| T11 | Suspended account can't trade | Admin suspended user | Submit | 422 `not_tradeable_state` | P0 |

## 3.4 Eval Engine + Breach

| # | Test | Pre | Steps | Expected | Pri |
|---|---|---|---|---|---|
| E1 | Breach at drawdown floor (static) | Account near floor | Force position loss past floor → wait for next eval tick | Status flips to `breached`, positions mark-to-floor closed, breach_event row | P0 |
| E2 | Trailing-EOD floor moves on profit | Funded acct, profitable EOD | Run cron eod | `highest_eod_balance_cents` updates; effective floor moves up next day | P0 |
| E3 | Daily floor resets at UTC 00:00 | Held loss intraday | Wait for EOD | `day_start_equity_cents` resets; intraday loss tracker resets | P1 |
| E4 | Phase transition (Phase 1 → 2) | At profit target + min days | Trigger eval | `currentPhaseId` advances; status briefly `passed_phase` then `active` | P0 |
| E5 | Funded transition (final phase) | At target on last phase | Eval | Status → `funded` | P0 |
| E6 | Breach idempotency | Already breached | Re-run eval | No duplicate breach_event, no audit log dup | P0 |
| E7 | Admin force-breach mark-to-floor | Active account with open positions | `/admin/accounts/[id]` → Force breach + reason | All positions closed at floor, balance = floor, status = breached | P0 |

## 3.5 Payouts

| # | Test | Pre | Steps | Expected | Pri |
|---|---|---|---|---|---|
| P1 | Request payout (funded) | Funded acct, profit > 0 | `/dashboard/payouts` → request 50% of profit | Balance debits immediately, payout row at `requested`, audit log | P0 |
| P2 | Request from non-funded | Active (not funded) | API call | 422 `account_not_funded` | P0 |
| P3 | Request exceeds profit | profit = $500, ask $1000 | API | 422 with profit cap | P0 |
| P4 | Admin approve → mark-paid → email | Pending payout | Approve, then mark-paid with ref | Status moves; email sent (check Resend logs); audit logs | P0 |
| P5 | Admin reject refunds escrow | Pending | Reject with reason | Balance restored, status `rejected`, audit log | P0 |
| P6 | Optimistic-lock conflict | Two admins click approve | Race | One 200, one 409 `version_conflict` | P1 |

## 3.6 Admin actions

| # | Test | Steps | Expected | Pri |
|---|---|---|---|---|
| AD1 | Suspend → resume | `/admin/accounts/[id]` → Suspend (reason) → Resume | Status flips; state_log + audit | P0 |
| AD2 | Suspend breached account | Try | 409 (can't suspend breached) | P1 |
| AD3 | Promote phase | Active acct | Click Promote | currentPhaseId advances, trading-day counter resets | P0 |
| AD4 | Promote already funded | Try | 409 | P1 |
| AD5 | Reset phase | Past phase 1 | Click Reset to Phase 1 | currentPhaseId moves back, days reset | P0 |
| AD6 | Override drawdown | Modal → totalDrawdownPct=15, reason=goodwill | `rule_overrides` JSON has key, audit logs, expiration optional | P0 |
| AD7 | Override profitSplit | Same | Stored but not enforced today (documented) | P2 |
| AD8 | Force-close all positions | Open positions | Click | Positions closed at current bid; balance reflects | P0 |
| AD9 | Toggle config for-sale | `/admin/configs` toggle | `isActive` flips; trader `/api/configs` no longer returns it | P0 |
| AD10 | Edit firm sidedness threshold | `/admin/firm` → set 5 → save | `/dashboard/markets` filters extremes; `/api/orders` rejects them at fill | P0 |

## 3.7 Multi-tenancy (the high-stakes bucket)

| # | Test | Steps | Expected | Pri |
|---|---|---|---|---|
| M1 | Trader A reads Trader B (same firm) | Forge `/api/accounts/<B's id>` | 404 or 403 | P0 |
| M2 | Trader A reads Trader B (different firm) | Same | 404 (firmId scope) | P0 |
| M3 | Admin firm A reads firm B | Forge admin call | 404 (firmId scope) | P0 |
| M4 | Subdomain swap | `acme.localhost` user hits `beta.localhost` URL | Middleware honors slug; auth fails firm lookup | P1 |
| M5 | Trader hits `/admin/*` | URL-bar typed | Layout-level redirect to `/dashboard?error=admin_only` | P0 |
| M6 | Admin without AAL2 hits admin API | DEMO_MODE=false | 403 `mfa_required` | P0 (prod) |
| M7 | Service-role key in client bundle | grep prod bundle | Not present | P0 |
| M8 | RLS at DB layer | Connect as PostgREST anon | Cannot read other firm rows | P0 |

## 3.8 Edge cases

- Network blip during `POST /api/orders` (client retries with same idempotency key) → handle gracefully (currently 500).
- Stripe down during checkout creation → user sees raw 500.
- Account at exactly the floor (== vs <) per `breach_comparison` config → respected.
- Trader with zero accounts visits `/dashboard/markets` → must not crash on `activeAccount === null`.
- Time-zone DST around UTC midnight EOD → idempotency via `last_eod_run_at` handles this.

---

# 4. Automated Test Plan

No tests exist today. Establishing the framework is itself the first task.

**Bootstrap stack:**

- `vitest` for unit + integration (Node + JSdom)
- `@playwright/test` for E2E
- `supertest` (or fetch-mock + vitest) for API contract
- `@databases/pg-test` or Supabase local for DB-backed integration
- GitHub Actions for CI

## 4.1 Unit tests — `packages/utils` and `oracle-funded/src/lib`

**Real:** pure functions. **Mocked:** clock (`vi.useFakeTimers`), Math.random.

| Module | Scenarios |
|---|---|
| `order-validation.ts` | All 9 reasons fire under matching inputs. Boundary: maxContractsPerOrder===null bypasses size check; existingPositionContracts===0 + buy + at-limit positions blocked; news cooldown active vs just-ended. |
| `eval.ts` — `computeEquityFromStoredPnl` | Equity = balance + Σ unrealizedPnlCents. BigInt arithmetic. |
| `eval.ts` — `computeStaticFloor` | Immutable: returns same value across many calls with same start. |
| `eval.ts` — `computeTrailingEodFloor` | Monotonic: floor only goes up across days with growing peak. |
| `eval.ts` — `computeDailyLossFloor` | Null when not configured; correct otherwise. |
| `eval.ts` — `checkBreach` | `lt` vs `lte` respected at boundary. |
| `pnl.ts` — `computeFillPrice` | YES buy uses yes_ask; YES sell uses yes_bid; NO buy uses no_ask; NO sell uses no_bid; null returns when missing. |
| `pnl.ts` — `computePositionDelta` | Long-add, partial-close, full-close, position-flip blocked, fees=0 in MVP. |
| `rate-limit.ts` | 10/sec window enforces; recovers after window. |
| `polymarket.ts` | Inverted spread returns null; crossed prices return null; out-of-range returns null. |

**The 5 non-negotiables from §6 — these must exist before any further work:**

1. Equity = balance + Σ unrealizedPnlCents (property test).
2. Static floor immutability under 100 random ticks.
3. Trailing-EOD floor monotonicity under 100 random EOD sequences.
4. Daily floor resets at UTC midnight (idempotent across reruns).
5. Breach detection idempotent: running tick twice produces one breach_event.

## 4.2 Integration tests — DB + Prisma + RLS

**Real:** local Postgres with the actual migrations applied. **Mocked:** Stripe, Polymarket, Resend.

Setup: spin up Supabase locally via CLI or use `pg-test` with `supabase/migrations/*.sql` applied. Two Prisma clients: one with the service role (writes test fixtures), one with the anon role + a JWT (exercises RLS).

| Test | Verifies |
|---|---|
| RLS — accounts | Trader A cannot select Trader B's row (same firm or other firm). |
| RLS — orders, trades, positions, payments, payouts, drawdown_snapshots, breach_events | Same. |
| RLS — challenge_configs | Firm A admin cannot read firm B's configs. |
| RLS — audit_log | Only admin/owner role reads firm audit. |
| Webhook idempotency | Replay same event ID → no new account, no new audit row. |
| Provisioning atomicity | Force a failure mid-transaction → no orphan account, no flipped payment status. |
| `validateOrder` chain via real DB | Insert account in each status, call POST /api/orders, verify expected rejection. |
| Override merge | POST override with only `profitSplitPct` → existing `total_drawdown_pct` preserved. |
| Optimistic-lock conflict | Two concurrent payout approvals → one wins, one returns 409. |

## 4.3 API contract tests

**Real:** the Next.js handler. **Mocked:** Supabase auth (stub session), Stripe SDK, Polymarket fetch.

For each route, test:

- 401 when no session.
- 403 when wrong role or AAL1 (and DEMO_MODE=false).
- 400 on missing/invalid body fields.
- 200/201 happy path.
- Idempotency (where applicable: orders, payouts, webhook).

Particular high-leverage targets: `/api/orders`, `/api/payouts`, `/api/stripe/webhook`, `/api/admin/accounts/[id]/*`, `/api/admin/payouts/[id]/*`.

## 4.4 E2E tests — Playwright

**Real:** the running app against a local Supabase + a stubbed Stripe (use `stripe-mock` or intercept `/api/checkout`). **Mocked:** none on the app side.

Critical flows (5 specs):

1. **Sign-up → buy $1 challenge → place order → see fill → close position.** Single spec; ~30s. The cardinal smoke test.
2. **Admin sign-in → enable Google → impersonate admin → toggle config isActive → trader sees change.**
3. **Trader requests payout → admin approves → admin marks paid → trader sees status.**
4. **Force-breach flow.** Admin force-breaches an account with open positions; UI shows mark-to-floor, status=breached.
5. **MFA enforcement.** With DEMO_MODE=false, admin without AAL2 navigates to `/admin/firm` and is redirected to `/2fa-enrollment`. (Requires adding that redirect — see §5.)

## 4.5 Regression tests

Add a snapshot of the API contract: for each route, store the JSON shape on success. Re-run on every PR. Catches accidental shape changes that break the frontend.

Specifically:

- `/api/auth/me` (frontend depends on `user.firm.oneSidedThresholdPct`, `user.profile.fullName`)
- `/api/accounts` and `/api/accounts/[id]` (frontend depends on positions, currentPhase, ruleOverrides shape)
- `/api/markets` (Event/Market shape)

## 4.6 Smoke / monitoring

Production-runtime checks (run every 1 min via BetterStack or similar):

1. `GET /api/health` → 200.
2. Synthetic sign-in with a dedicated test account → fetches `/api/auth/me` → 200.
3. Cron tick heartbeat freshness: `/api/health` includes `worker_heartbeat_age_seconds` < 300.
4. Stripe webhook live: ping `/api/stripe/webhook` with a known test event ID; expect 200 (idempotent re-handling).

---

# 5. Missing Implementation Checklist

## 5.1 Backend

- [ ] **`/api/cron/payment-recovery`** — list pending payments older than N minutes, query Stripe session state, replay provisioning if confirmed.
- [ ] **`/api/cron/stuck-orders`** — orders in `pending` state >60s → mark `failed_system_error` or retry fillOrder.
- [ ] **`accounts.drawdown_floor_cents` persistence** in `evalTick` — currently recomputed only.
- [ ] **`price_history` writes** — worker (or `tick-all`) should sample current quote per active outcome on each tick.
- [ ] **FOR UPDATE lock inside `evalTick`** before reading account/positions, to prevent overlapping cron firings from double-breaching.
- [ ] **Cost-basis validation in `validateOrder`** — block buys that would push `current_balance_cents` negative.
- [ ] **Idempotent order replay** — POST `/api/orders` with a re-used `idempotencyKey` should return the original order, not a 500 constraint violation.
- [ ] **Kalshi venue** — REST + WebSocket adapter once API access granted (per §11 Day 8).
- [ ] **Upstash Redis hot price cache** — wrap `fetchProviderQuote` with cache lookup + TTL.
- [ ] **Distinct admin-impersonation audit entry shape** — currently audit log records `actorUserId` correctly, but consumers of audit log have no easy filter for "admin acted on trader's behalf."

## 5.2 Frontend

- [ ] Empty-state placeholders on `/dashboard/portfolio`, `/dashboard/analytics`, `/dashboard/history`, `/admin/signals`.
- [ ] "Market closed" banner on `/dashboard/markets/[ticker]` if the outcome is closed.
- [ ] Surface `rule_overrides` on `/dashboard/rules`.
- [ ] Real "Forgot password" flow on `/sign-in`.
- [ ] Account paused banner on trader pages when `firm.status === 'paused'`.
- [ ] AAL2 redirect: if admin lands on `/admin/*` with AAL1, push to `/2fa-enrollment?next=…`.
- [ ] News-block visualization on markets that match an active news cooldown.
- [ ] Risk-manager and Affiliate dashboards — not in the MVP plan and not in code; if the user wants them, this is a separate scoped piece.
- [ ] Mobile review pass for `/admin/*` (sidebar collapses but cards may not).

## 5.3 Auth + Security

- [ ] **Production deploy must set `NEXT_PUBLIC_DEMO_MODE=false`.** Add a build-time check: fail the build if `NODE_ENV=production` and DEMO_MODE is `true`.
- [ ] AAL2 redirect in `app/admin/layout.tsx` (see above).
- [ ] AAL2 hint in `/api/auth/me` response so the trader UI can warn admins their session is downgraded.
- [ ] CSP headers — currently absent; not catastrophic but adds defense for XSS.
- [ ] Email-password sign-in confirmed working (currently appears to work via Supabase Auth UI; needs E2E test).

## 5.4 Payments

- [ ] `/api/admin/payments/[id]/replay-webhook` — ops tool to safely re-fire provisioning.
- [ ] Email retry / DLQ — current `sendPayoutPaidEmail` is fire-and-forget.
- [ ] Refund-notice email to trader.
- [ ] Stripe-down resilience: retry-with-backoff on `/api/checkout` POST; surface friendly error.
- [ ] Webhook secret rotation runbook.

## 5.5 Risk Management / Anti-cheat

- [ ] `cheat_signals` writes from at least one detector (latency-arb is the simplest).
- [ ] Detection queries (deferred per spec to beta weeks 3–5).
- [ ] Risk-manager role (`FirmRole` enum + per-route guard) if planned.

## 5.6 Evaluation Engine

- [ ] Persist `drawdown_floor_cents` per tick.
- [ ] Honor expanded `rule_overrides` keys (profitSplit, position caps, minTradingDays) inside eval + validation.
- [ ] `breach_events` linked back to the snapshot that triggered.
- [ ] EOD email digest to traders ("you traded X days this week").
- [ ] **5 property tests are non-negotiable** before shipping.

## 5.7 Multi-tenancy

- [ ] RLS integration tests (see §4.2).
- [ ] Subdomain → firm slug — works in middleware but no production deploy yet uses subdomains; document the DNS/Vercel-domain config needed.
- [ ] Cross-firm onboarding (currently `/sign-up` hardcodes `firmSlug: "demo"`).
- [ ] `createScopedClient(firmId)` Prisma extension per Decision 9 — referenced for worker but not present in `oracle-funded`.

## 5.8 Analytics / Reporting

- [ ] `/admin/metrics` page (§10): DAU, trades/day, breaches/day, payouts $/day, MRR.
- [ ] CSV export on `/admin/audit`.
- [ ] Per-trader monthly statement (PDF or markdown).

## 5.9 Infrastructure / Ops

- [ ] CI/CD via GitHub Actions: typecheck + build + unit + integration on PR; deploy on merge.
- [ ] Vercel project env-var inventory documented; `.env.production` checklist file (not committed).
- [ ] BetterStack log shipping wired (token present, transport not configured).
- [ ] BetterStack Uptime monitor on `/api/health` with SMS escalation.
- [ ] `RUNBOOK.md` exists at repo root (verified) — needs concrete incident playbooks for: stuck payment, stale worker, double-breach, payout dispute.
- [ ] Sentry source maps actually uploaded in build (token is present; not confirmed in script).
- [ ] Worker process (Railway) — needed for Kalshi.

## 5.10 Compliance / Fraud

- [ ] KYC flow — completely absent. Required for any meaningful payout volume.
- [ ] Tax-form collection (W-9 / W-8BEN) on funded accounts.
- [ ] AML screening at payout time (sanctions list match on email/name).
- [ ] Account-velocity guardrails (one user buying 20 challenges in an hour = red flag).
- [ ] Terms of Service / Risk Disclosure / dispute resolution clause acceptance gate before first deposit.
- [ ] Geo-fencing: prediction-markets prop firms in certain jurisdictions (US for Polymarket) need careful gating.

---

# 6. Risk Register

| # | Risk | Why it matters | Impact | Likelihood | Fix |
|---|---|---|---|---|---|
| **R1** | `NEXT_PUBLIC_DEMO_MODE=true` in env file | If deployed as-is, MFA on admin routes is disabled. Any compromised admin = full firm takeover. | **Catastrophic** | **High** (env file is what gets copied to Vercel by default) | Set to `false` in Vercel project env; add build-time guard refusing prod builds with DEMO_MODE on. |
| **R2** | Zero automated tests | No safety net under any refactor. The eval engine has 100+ lines of BigInt arithmetic with no verification. | **Catastrophic** | **High** under change pressure | Ship `vitest` + the 5 property tests in §6 plus RLS tests before any further feature work. |
| **R3** | Eval cron has no per-account lock | Two overlapping firings → double breach events, double balance moves, audit log corruption. | **High** | **Medium** (Vercel does retry on transient failures) | Add `SELECT 1 FROM accounts WHERE id = $1 FOR UPDATE` at the top of `evalTick`. |
| **R4** | Stuck-payment recovery missing | Customer pays, webhook fails, no account ever created, no automated remediation. Manual SQL each time. | **High** | **Medium** (will hit eventually) | Add `/api/cron/payment-recovery` — hourly. |
| **R5** | `accounts.drawdown_floor_cents` never persisted | Trader disputes ("you breached me at the wrong floor") cannot be resolved from the accounts row. Have to recompute from snapshots. | **Medium** | **Low (forensic only)** but **High operational pain** when it happens | Persist in `evalTick`. |
| **R6** | Idempotent order replay returns 500 | Mobile network hiccups → client retries → duplicate UNIQUE violation surfaces as 500 instead of returning original order. | **Medium** | **Medium** | Pre-check `idempotency_key`, return original order if found. |
| **R7** | Rate limiting is in-process memory | DOS protection vanishes once on multi-instance Vercel. | **Medium** | **Low (limited audience for now)** | Move to Upstash Redis (already in env). |
| **R8** | Worker is a stub; Kalshi cannot run on Vercel | Once Kalshi enabled, no place for the stateful WebSocket. | **High** | Inevitable (post-§11 Day 8) | Stand up Railway worker before enabling Kalshi venue. |
| **R9** | RLS not tested in CI | Spec-mandated tenant isolation. A regression here = cross-firm data leak. | **Catastrophic** | **Low if untouched, High under refactor** | Add RLS test suite + block-on-fail in CI. |
| **R10** | `price_history` table never written | Anti-cheat detection backtesting impossible. No way to tune detectors before turning them on in beta. | **Medium** | **Inevitable for the anti-cheat phase** | Cron writes one row per active outcome per 30s. |
| **R11** | KYC / AML / geo-fencing absent | Regulatory exposure once real customer money flows. | **Catastrophic** (legal) | **High** at any non-trivial volume | Out-of-scope for MVP per spec, but **must** gate real money. |
| **R12** | Email failures swallowed | Payout-paid email lost → trader doesn't know → support burden. | **Low** | **Low** | Log failures; consider Resend's idempotency or DLQ. |
| **R13** | No CI/CD pipeline | Manual deploys; no PR gating on typecheck/lint. | **Medium** | **Inevitable** during team scale-up | GitHub Actions on PR + main. |
| **R14** | Dashboard fakes win rate / today's P&L / open positions | Looks like working numbers but they're hardcoded zeros. Looks dishonest in front of prospects. | **Low** technically; **Medium** for sales credibility | **High** during demos | Either render real values (trades + positions endpoints exist) or replace with explicit "—" placeholders. |

---

# 7. Recommended Build Order

Five-day stabilization pass to take this from "demo-ready" to "real-money-defensible." Day estimates assume one full-time engineer.

**Day 1 — Production-config hardening (4–6h)**

1. Flip `NEXT_PUBLIC_DEMO_MODE=false` on the Vercel project env (not the file).
2. Add build-time guard: error if `process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true'`.
3. AAL2 redirect in `app/admin/layout.tsx` — if `claims.aal !== 'aal2'`, redirect to `/2fa-enrollment?next=/admin/...`.
4. Enroll TOTP on the two real admin/owner accounts; verify the redirect flow.
5. Document `RUNBOOK.md` env checklist for prod.

**Day 2 — Test infrastructure + the 5 non-negotiable property tests (6–8h)**

1. Install `vitest` + `@vitest/coverage-v8`. Add `npm test` script.
2. Write 5 property tests for `eval.ts` (equity, static floor, trailing floor, daily floor, breach idempotency).
3. Add unit tests for `validateOrder` rejection reasons (one per reason).
4. GitHub Actions workflow: on PR, run `tsc --noEmit && vitest run`.

**Day 3 — RLS tests + recovery crons (8h)**

1. Spin up Supabase local; run migrations.
2. Write RLS test suite for `accounts`, `orders`, `trades`, `positions`, `payments`, `payouts`, `challenge_configs`, `audit_log`. Block-on-fail in CI.
3. Implement `/api/cron/payment-recovery`. Add to `vercel.json` (hourly).
4. Implement `/api/cron/stuck-orders`. Add to `vercel.json` (every 5 min).

**Day 4 — Eval engine hardening (6h)**

1. Add `SELECT 1 FROM accounts WHERE id = $1 FOR UPDATE` inside `evalTick` transaction.
2. Persist `drawdown_floor_cents` per tick.
3. Honor expanded `rule_overrides` keys in `evalTick` + `validateOrder` (profitSplit, position caps, minTradingDays).
4. Add cost-basis pre-check in `validateOrder`.
5. Idempotent order replay: check `idempotency_key` before validation; return original order on hit.

**Day 5 — Ops + polish (6h)**

1. Wire BetterStack log transport in Pino config.
2. Set up BetterStack Uptime monitor on `/api/health` with SMS.
3. Empty-state placeholders on `/dashboard/portfolio`, `/dashboard/analytics`, `/dashboard/history`.
4. Real values for dashboard KPIs (win rate, today's P&L, open positions, total trades) — pull from `/api/trades` and `/api/accounts/[id]`.
5. "Market closed" banner on `/dashboard/markets/[ticker]` for stale outcomes.
6. 1 Playwright spec: sign-up → buy $1 challenge → place order → close position.

**Week 2 — Kalshi + Redis (when API access lands)**

- Stand up Railway worker.
- Migrate eval loop out of Vercel cron into worker's loop; cron becomes a poke.
- Wire Upstash Redis for rate limiting + hot price cache.
- Build Kalshi WS adapter.
- Write the first anti-cheat detector (latency-arb) — start populating `cheat_signals`.

**Week 3+ — KYC + compliance (real-money gate)**

- KYC vendor integration (Persona, Sumsub, Veriff).
- Geo-fence at sign-up.
- Tax-form collection on funded accounts.
- Sanctions-list check at payout time.
- ToS + Risk Disclosure acceptance flow.

**Out of scope for this 5-day pass** (track but defer): risk-manager and affiliate dashboards if they're future scope, the full Polymarket Gamma cache, real-time push to traders via Supabase Realtime, custom email templates, multi-firm onboarding, business-metrics dashboard.

---

**Bottom line.** Five days of focused work between this audit and "real money can flow through it." The architecture is good; the gaps are concrete, named, and ordered. Start with Day 1 (config + AAL2 redirect) — that's the only one where doing nothing is actively dangerous. The rest is normal hardening work and can be sequenced as the team has bandwidth.
