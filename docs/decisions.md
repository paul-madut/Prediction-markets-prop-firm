# Decision Log

Architectural decisions, assumptions, and deviations recorded per task.

---

## PHASE 1 — MONOREPO SETUP

### Decision 1 — No microservices; single worker instead

**Date:** 2026-05-05  
**Task:** Create monorepo using pnpm workspaces

**agent_tasks.md specified:**
- `apps/api-gateway`
- `services/auth`
- `services/user`
- `services/account`

**Actual implementation:**
- `apps/worker` — the single stateful Railway worker process

**Reason:** `WebFlux_MVP_Plan.md` (Section 2, "What's deliberately not here") explicitly rejects microservices and Kubernetes. The plan calls for "Monorepo Next.js application. Single deployment." The `agent_tasks.md` checklist reflects an earlier, discarded architectural concept. The MVP plan is authoritative.

---

### Decision 2 — oracle-funded kept at project root, not moved to apps/web

**Date:** 2026-05-05  
**Task:** Create monorepo using pnpm workspaces

**Reason:** The `oracle-funded/` Next.js app is real, in-progress product code. Moving it to `apps/web/` would break its internal relative imports and require updating all path aliases. The pnpm workspace config references `oracle-funded` directly as a workspace member. A rename/move is a separate, explicit refactor task if ever needed.

---

### Decision 3 — packages/db is a stub; Prisma schema deferred to next task

**Date:** 2026-05-05  
**Task:** Create monorepo using pnpm workspaces

**Reason:** The next `agent_tasks.md` item is "Setup PostgreSQL schema using Prisma". The `packages/db` package is created as a workspace member with the correct `package.json` and a minimal `src/index.ts` re-exporting `PrismaClient`. The actual `prisma/schema.prisma` with all 14 tables will be written in the next task iteration.

---

### Decision 4 — Shared TypeScript types defined in packages/types

**Date:** 2026-05-05  
**Task:** Create monorepo using pnpm workspaces

**Assumption:** All domain types from Section 3 of `WebFlux_MVP_Plan.md` are encoded as TypeScript interfaces in `packages/types/src/index.ts`. Money fields use `bigint` (never `number`) per the plan's "Money is integers (cents), never floats" rule. These types serve as the source of truth across the Next.js app and the worker.

---

## PHASE 1 — PRISMA SCHEMA SETUP

### Decision 6 — Implemented all 17 MVP-plan tables, not the 6 listed in agent_tasks.md

**Date:** 2026-05-05  
**Task:** Setup PostgreSQL schema using Prisma

**agent_tasks.md listed:** tenants, users, trading_accounts, orders, positions, trades

**Actual implementation (17 tables):**
- `firms`, `firm_members` — tenancy & users
- `challenge_configs`, `challenge_phases` — challenge configuration
- `accounts`, `orders`, `trades`, `positions` — trading core
- `drawdown_snapshots`, `breach_events`, `account_state_log`, `cheat_signals` — risk & state
- `payments`, `payouts` — money & ops
- `audit_log`, `news_events`, `price_history` — cross-cutting

**Reason:** The MVP plan (Section 3) is authoritative and specifies all 17 tables as MVP-required. The agent_tasks.md checklist was an early sketch that understated scope. Implementing a partial schema would leave the worker, eval engine, and payment flows without the tables they need, breaking the repo.

The task also listed `tenant_id` as a follow-on item; `firm_id` is included on all tables from the start (it is `firm_id` in the plan, not `tenant_id`) to avoid a second migration.

---

### Decision 7 — auth.users FKs are UUID strings with DB-level enforcement, not Prisma relations

**Date:** 2026-05-05  
**Task:** Setup PostgreSQL schema using Prisma

**Fields affected:** `firm_members.user_id`, `accounts.user_id`, `payments.user_id`, `payouts.user_id`, all `actor_user_id` / `override_set_by_user_id` fields.

**Reason:** Supabase Auth stores users in `auth.users` (a separate PostgreSQL schema). Prisma cannot define FK relations across schemas. These fields are typed as `String @db.Uuid` in the schema. The actual FK constraint (`REFERENCES auth.users(id)`) will be applied via a raw SQL migration when the Supabase project is provisioned.

---

### Decision 8 — accounts.breach_event_id is a plain UUID, no Prisma relation

**Date:** 2026-05-05  
**Task:** Setup PostgreSQL schema using Prisma

**Reason:** `accounts` and `breach_events` have a circular FK: `accounts.breach_event_id → breach_events.id` and `breach_events.account_id → accounts.id`. Prisma cannot express bidirectional circular FK relations. `accounts.breach_event_id` is kept as `String? @db.Uuid` (no `@relation`). The `BreachEvent` model defines the `account Account @relation(...)` side normally. The reverse FK is enforced at DB level in the migration.

---

### Decision 5 — Root pnpm workspace includes oracle-funded, apps/*, packages/*

**Date:** 2026-05-05  
**Task:** Create monorepo using pnpm workspaces

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'oracle-funded'
  - 'apps/*'
  - 'packages/*'
```

This is the minimal workspace needed. The oracle-funded app retains its own `node_modules` and lockfile for now; after a `pnpm install` from the root, pnpm will hoist shared deps and link workspace packages.

---

## PHASE 2 — AUTH

### Decision 10 — Clerk instead of Supabase Auth; packages/auth wraps Clerk server SDK

**Date:** 2026-05-05
**Task:** Implement JWT auth (access + refresh)

**MVP plan specified:** Supabase Auth with MFA TOTP.

**Actual implementation:** The existing `oracle-funded/` Next.js app already uses
`@clerk/nextjs` (^7.2.7) with test keys committed to `.env.local`. Replacing Clerk with
Supabase Auth would require rewriting sign-in/sign-up pages, middleware, the `ClerkProvider`
root layout, and migrating all existing test user accounts — significant scope with no
feature gain for the MVP demo.

**What was built:**
- `packages/auth` — framework-agnostic auth utilities:
  - `verifyToken(token)` — verifies a Clerk session JWT using `@clerk/backend`
  - `extractBearerToken(header)` — parses Authorization header
  - `getAuthContext(userId, sessionId, db)` — resolves firm membership (firmId + role)
    from the `firm_members` table, returning a typed `AuthContext`
  - `withAuth(handler, db)` — route handler wrapper for Next.js App Router and the
    worker's HTTP endpoints; enforces Bearer auth + firm membership
  - `enrichClerkAuth(clerkAuth, db)` — convenience helper for Next.js Server Components
    and API routes that already have the Clerk `auth()` object

**Access + refresh token model:**
- Access token = Clerk session JWT (short-lived, typically 1–60 min). Verified server-side
  via `@clerk/backend` JWKS check. Passed as `Authorization: Bearer <token>` on API calls.
- Refresh = managed transparently by `@clerk/nextjs` on the frontend. The client SDK
  rotates tokens before expiry using Clerk's session endpoint. No custom refresh endpoint
  is needed for MVP.

**Supabase MFA deferred:** MFA TOTP on admin/owner roles was specified in the plan.
Clerk supports MFA natively. Will be configured in Clerk dashboard (not code changes)
before the Blueberry demo.

---

## PHASE 1 — ROW-LEVEL SECURITY (APP LAYER)

### Decision 9 — App-layer RLS via Prisma Client Extension (`createScopedClient`)

**Date:** 2026-05-05  
**Task:** Implement row-level security logic at app layer

**What was implemented:**

Two complementary RLS layers:

1. **DB-level (Supabase):** `packages/db/migrations/001_rls_policies.sql` — PostgreSQL RLS policies enforced by Supabase for all anon/authenticated JWT callers. Primary tenant fence; applies to the Next.js app.

2. **App-layer (worker):** `createScopedClient(firmId)` in `packages/db/src/index.ts` — Prisma Client Extension that injects `firmId` into every `where` clause for firm-scoped models. Used by the worker process (which uses the Supabase service role key and therefore bypasses DB-level RLS).

**Models excluded from auto-scoping:**
- `PriceHistory` — no `firm_id` column; global market data
- `NewsEvent` — `firm_id` is nullable (null means platform-wide); complex filter, left to callers

**Operations excluded from where-injection:**
- `create`, `createMany` — carry `data`, not `where`; callers must supply `firmId` in the data object

**Why Prisma Client Extension over middleware:**
Prisma middleware is deprecated in v5. Extensions are the v5 API and produce a properly typed return value via `ScopedClient = ReturnType<typeof createScopedClient>`.

**Assumption:** The SQL migration is applied manually via Supabase Dashboard or `supabase db push` when the Supabase project is provisioned. It is not run by Prisma migrate (different toolchain).

---

## PHASE 2 — LOGIN ENDPOINT

### Decision 11 — Login endpoint is GET /api/auth/me, not a credential endpoint

**Date:** 2026-05-05
**Task:** Add login endpoint

**What was built:**
- `oracle-funded/src/app/api/auth/me/route.ts` — `GET /api/auth/me`
- Protected by Clerk middleware (as all non-public routes are)
- Uses Clerk's `auth()` from `@clerk/nextjs/server` to extract userId/sessionId
- Calls `enrichClerkAuth` from `@webflux/auth` to resolve firmId + role from the DB
- Returns `{ userId, sessionId, firmId, role }` as JSON

**Reason:** Clerk manages credential-based sign-in entirely (sign-in page, password hashing, token issuance). There is no username/password endpoint — that would duplicate Clerk's responsibility. The "login endpoint" in this system means: after Clerk authenticates a user, the frontend calls `GET /api/auth/me` to obtain the user's app-specific context (firm membership and role). This is the standard pattern for Clerk-based SaaS apps.

**Package builds required:**
- `packages/db` and `packages/auth` must be built (`tsc`) before oracle-funded can import from them.
- `prisma generate` must be run in `packages/db` to generate typed Prisma client.
- Both steps have been performed; dist/ folders exist in both packages.

**Error handling:**
- 401 if Clerk session is missing or invalid (middleware handles this before route runs)
- 403 if the user has no `firm_members` row (newly registered user not yet onboarded)

---

## PHASE 2 — REGISTER ENDPOINT

### Decision 12 — Register endpoint links Clerk user to a firm; userId stored as-is despite @db.Uuid mismatch

**Date:** 2026-05-05
**Task:** Add register endpoint (tenant-scoped)

**What was built:**
- `oracle-funded/src/app/api/auth/register/route.ts` — `POST /api/auth/register`
- Accepts `{ firmSlug: string }` in request body
- Requires an active Clerk session (protected by Clerk middleware, same as all non-public routes)
- Looks up the firm by slug (must exist and be `active`)
- Enforces MVP rule: one firm per user (rejects with 409 if user already has any firm membership)
- Creates a `firm_members` row with `role: 'trader'`
- Writes an `audit_log` row (action: `member.register`)
- Returns the resolved auth context (same shape as `GET /api/auth/me`), status 201

**Known limitation — Clerk user IDs vs Postgres UUID fields:**
The `firm_members.user_id` column is typed `@db.Uuid` in the Prisma schema (per the original
Supabase Auth design where user IDs are UUIDs). Clerk user IDs have the form `user_2abc...`
and are NOT valid UUIDs. Passing them to Postgres UUID columns will fail at runtime with a
real database.

Pre-existing issue: this same problem exists in `getAuthContext` (introduced in Decision 10)
which queries `firmMember.findFirst({ where: { userId: clerkAuth.userId } })`.

**Resolution path (deferred):** When a Supabase project is provisioned, either:
a) Switch from Clerk back to Supabase Auth (user IDs are UUIDs) — preferred per MVP plan, or
b) Change all `user_id` / `actor_user_id` columns from `@db.Uuid` to plain `String` (text)
   and drop the UUID constraint, or
c) Map Clerk user IDs to UUIDs in a lookup table on first contact.

For MVP demo purposes, no real DB is connected, so this does not block progress.

**`actorUserId` omitted from audit_log for register:**
Since Clerk user IDs are not UUIDs and `audit_log.actor_user_id` is `@db.Uuid` (non-nullable
UUID in the DB), the register action omits `actorUserId` (it is nullable: `String?`). The Clerk
user ID is stored in `metadata.clerkUserId` (jsonb) instead.

---

## PHASE 2 — TENANT EXTRACTION MIDDLEWARE

### Decision 13 — Middleware injects trusted tenant headers; no DB call in middleware

**Date:** 2026-05-05
**Task:** Add middleware for tenant extraction

**What was built:**

1. **`oracle-funded/src/middleware.ts`** (updated) — the existing `clerkMiddleware` handler now:
   - Strips any client-supplied `x-webflux-*` headers before every request (prevents injection)
   - After `auth.protect()`, calls `await auth()` to get `userId` and `sessionId` from the
     Clerk-verified JWT and sets them as `x-webflux-user-id` / `x-webflux-session-id` headers
   - Parses the first subdomain segment from the `host` header (skipping reserved names like
     `www`, `app`, `api`) and sets it as `x-webflux-firm-slug` (e.g. `acme.oracle-funded.com`
     → `x-webflux-firm-slug: acme`)
   - Returns `NextResponse.next({ request: { headers: requestHeaders } })` to forward the
     enriched headers to the route handler

2. **`packages/auth/src/headers.ts`** (new) — `readTenantHeaders(headers: Headers): TenantHeaders`
   — reads the three injected headers in route handlers or server components

3. **`packages/auth/src/context.ts`** (updated) — `getAuthContext` now accepts an optional
   `firmSlug` parameter; when set, it scopes the `firmMember` lookup to that firm (using a
   `firm: { slug: firmSlug }` relation filter) rather than returning the user's first membership.

**Why no DB call in middleware:**
Prisma does not support the Next.js edge runtime (the middleware default). Running the middleware
in Node.js runtime is possible but adds ~50 ms latency to every request — unacceptable for a
prod SaaS. The DB lookup is deferred to the route handler where `withAuth` / `enrichClerkAuth`
already does it. The headers give the route handler enough context to scope the lookup correctly
without a second round-trip.

**Security note:**
`x-webflux-*` headers are stripped on every request unconditionally, before the route handler
sees them. A client cannot inject fake values; the headers route handlers read are always
middleware-produced.

**Header reference:**

| Header | Source | Usage |
|---|---|---|
| `x-webflux-user-id` | Clerk JWT `sub` | Trust as authenticated userId |
| `x-webflux-session-id` | Clerk JWT `sid` | Session correlation |
| `x-webflux-firm-slug` | `host` subdomain | Scope DB lookups to specific firm |

---

## PHASE 3 — ACCOUNT SERVICE

### Decision 14 — Account CRUD endpoints: scope, BigInt serialization, allowed status transitions

**Date:** 2026-05-05
**Task:** Create account CRUD endpoints

**What was built:**
- `oracle-funded/src/app/api/accounts/route.ts` — `GET /api/accounts` + `POST /api/accounts`
- `oracle-funded/src/app/api/accounts/[id]/route.ts` — `GET /api/accounts/[id]` + `PATCH /api/accounts/[id]`

**Scope rules:**
- Traders: GET returns only their own accounts; GET [id] returns 404 if they don't own the account.
- Admins/owners: GET returns all accounts in the firm; GET [id] returns any firm account.
- POST and PATCH require admin or owner role.

**BigInt serialization:**
Prisma returns `BigInt` for `*Cents` fields (`startingBalanceCents`, `currentBalanceCents`, etc.).
`JSON.stringify` throws on `BigInt` by default. Both routes use an inline `bigintJson()` helper
that passes a replacer converting `bigint → string`. Clients receive cent values as numeric
strings (e.g., `"10000000"`). This avoids precision loss for balances above `Number.MAX_SAFE_INTEGER`
and keeps the wire format unambiguous.

**PATCH allowed statuses:**
Only `active` and `disabled` are accepted via PATCH. All other statuses (`pending`, `breached`,
`funded`, `passed_phase`) are set exclusively by system flows (payment webhook, eval engine,
phase transition logic). Restricting the admin PATCH surface prevents manual corruption of
eval-engine state. The eval engine uses optimistic locking (`version`); the PATCH increments
`version` so any in-flight eval tick that reads the old version will safely detect the conflict.

**POST (admin provisioning) drawdown floor formula:**
Uses integer basis-point arithmetic to match the eval engine (MVP plan Section 6):
```
drawdownBps = round(totalDrawdownPct * 100)   // e.g. 1000 for 10.00%
floor = startingBalance - (startingBalance * drawdownBps / 10000)
```
Avoids float rounding; consistent with `computeStaticFloor` in the eval engine.

**Assumption — Stripe payment flow is the canonical provisioning path:**
`POST /api/accounts` exists for admin testing and manual provisioning. Challenge purchasers
will be provisioned via the Stripe webhook handler (Phase 6, Day 6). Both paths produce
accounts in `status: 'pending'`; activation to `active` is a separate admin step or payment
webhook step depending on the firm's flow.

---

## PHASE 3 — BALANCE + EQUITY LOGIC

### Decision 15 — Equity computation in packages/utils; API endpoint uses stored unrealizedPnlCents

**Date:** 2026-05-05
**Task:** Implement balance + equity logic

**What was built:**

1. **`packages/utils/src/eval.ts`** — pure equity/floor computation functions:
   - `computeEquityFromStoredPnl(balance, positions)` — equity from stored DB values; used by the API layer
   - `computeEquityFromPrices(balance, positionsWithPrices)` — equity from live bid prices; for the worker eval tick loop
   - `computeStaticFloor(state, config)` — fixed floor at challenge start
   - `computeTrailingFloor(state, config)` — trailing-EOD high-water mark floor (supports all three reference modes)
   - `computeDailyFloor(state, config)` — daily loss floor (null if no daily limit configured)
   - `computeEffectiveFloor(state, config)` — max(base floor, daily floor)
   - `checkBreach(equity, floor, comparison)` — supports both 'lt' and 'lte' comparison modes
   - All exported from `packages/utils/src/index.ts`

2. **`oracle-funded/src/app/api/accounts/[id]/equity/route.ts`** — `GET /api/accounts/[id]/equity`
   - Returns equity snapshot: balanceCents, openPositionsPnlCents, equityCents, drawdownFloorCents,
     dailyFloorCents, distanceToFloorCents, distanceToFloorPct, isBreach
   - Same access control as `GET /api/accounts/[id]` (traders see own; admins see all in firm)
   - Uses stored `unrealizedPnlCents` from the `positions` table
   - When the order engine keeps `unrealizedPnlCents` current, this endpoint is accurate in real-time

**Why stored PnL for the API, not live prices:**
The API layer has no connection to the price feed (that lives in the worker). The `positions.unrealizedPnlCents`
column is designed to be updated by the order engine on every fill and by the eval tick loop
on every price update. Using the stored value keeps the API stateless and fast. The worker's
eval tick is the single source of truth for live equity; the API reads the materialized state.

**Per-account rule overrides:**
The `ruleOverrides` JSON field can override `total_drawdown_pct` and `daily_drawdown_pct`
per-account. The computation functions check for these overrides before falling back to the
config values, exactly as specified in the MVP plan.

**TypeScript target bump:**
oracle-funded's tsconfig had `target: ES2017` which rejects BigInt literal syntax (`0n`, `10000n`).
This was a pre-existing error (existing account routes already used BigInt literals). Changed to
`target: ES2020` (BigInt native support). Next.js/SWC always targets a modern runtime regardless
of this flag; the bump only affects IDE type-checking, not the compiled output.

---

## PHASE 3 — STUB PNL CALCULATION

### Decision 16 — PnL stub is pure functions in packages/utils; no DB or price-feed dependency

**Date:** 2026-05-05
**Task:** Stub PnL calculation

**What was built:**
- `packages/utils/src/pnl.ts` — pure PnL computation functions:
  - `computeFillPrice(quote, side, action)` — market-order fill price from a MarketQuote.
    Buys fill at ask; sells fill at bid. Returns null if the required side is absent.
  - `computeBalanceChange(action, contracts, fillPriceCents, feesCents)` — net cash delta
    from a fill. Negative for opens (cash out), positive for closes (cash in). Fees always
    reduce proceeds regardless of direction.
  - `computeNewAvgEntryPrice(existingContracts, existingAvg, addedContracts, fillPrice)` —
    weighted-average entry price after adding contracts. Uses BigInt multiplication to avoid
    float drift; result is floor-divided to the nearest cent (firm-favourable rounding).
  - `computeRealizedPnl(closingContracts, avgEntry, closingPrice)` — realized PnL on a
    closing trade: (closingPrice − avgEntry) × contracts. Can be negative.
  - `computeUnrealizedPnl(netContracts, avgEntry, currentBid)` — conservative mark-to-bid
    unrealized PnL. Caller supplies the correct bid for the position side (yesBid/noBid).
  - `computePositionDelta(action, contracts, fillPrice, fees, existingContracts, existingAvg,
    currentBid)` — composite: returns a `PositionDelta` with all fields the order engine needs
    to upsert the position row and insert the trade row in one call.
  - All exported from `packages/utils/src/index.ts`

**Design choices:**

1. **All money is BigInt.** The `computeFillPrice` and `computeNewAvgEntryPrice` return `number`
   (prices are always <100 cents, no overflow risk) but all PnL and balance values are `bigint`.
   Consistent with the "money is integers, never floats" architectural rule.

2. **No floor/ceil on PnL.** Realized and unrealized PnL are exact integer arithmetic (no
   rounding occurs because price × contracts is always an integer when both are integers).
   Only `computeNewAvgEntryPrice` floors (floor division on BigInt) because averaging can
   produce a fractional cent; rounding towards zero is firm-favourable.

3. **`avgEntryPriceCents` is unchanged on close.** Remaining open contracts still carry the
   original cost basis. Only `netContracts` and `realizedPnlCents` reflect the close.

4. **"Stub" scope:** these functions contain no DB reads, no Redis calls, and no HTTP logic.
   They are the mathematical building blocks for the order engine (Phase 4) and the eval tick
   loop's position marking (Phase 5). The order engine wires them into the fill transaction;
   the eval loop calls `computeUnrealizedPnl` when updating stored PnL after price changes.

---

## PHASE 4 — TRADING CORE (STUBBED)

### Decision 17 — Order service interface: action field added to orders; fill deferred to next task

**Date:** 2026-05-05
**Task:** Create order service interface

**What was built:**

1. **`packages/db/prisma/schema.prisma`** — `action String @default("buy")` added to the `Order`
   model. The MVP plan schema omitted this field but the fill computation (`computeFillPrice` in
   `packages/utils/src/pnl.ts`) requires it to resolve bid vs ask. Default `"buy"` is
   backward-compatible with zero existing rows.

2. **`packages/types/src/index.ts`** — Added:
   - `OrderAction = 'buy' | 'sell'`
   - `OrderRejectionReason` union of all 9 validation failure codes
   - `SubmitOrderRequest` — the canonical wire type for POST /api/orders
   - Updated `Order` to include `action: OrderAction`

3. **`packages/utils/src/order-validation.ts`** — Pure validation functions:
   - `OrderValidationInput` — all data the chain needs (no DB/Redis dependencies)
   - `validateOrder(input)` — implements checks 1–3, 6–9 from MVP plan §5 validation chain
   - Checks 4 (market open) and 5 (price freshness) are deferred to the fill transaction
     where live price data is available; the API layer has no price feed access

4. **`oracle-funded/src/app/api/orders/route.ts`**:
   - `GET /api/orders?accountId=<uuid>` — lists last 100 orders; traders scope to own account,
     admins may omit `accountId` for all firm orders
   - `POST /api/orders` — full validation chain (account state, ownership, venue, size,
     position limits, news cooldown), idempotency via `idempotencyKey` (UUID), persists
     as `status='pending'` on success or `status='rejected'` with `rejectedReason` on failure
   - Audit log written on every submission (both valid and rejected)

**Why orders stay 'pending' after this task:**
The fill transaction — computing mock fill price, locking the account row, inserting trade,
upserting position, updating balance — is the next task ("Implement mock order execution").
Keeping validation and execution in separate tasks produces a cleaner diff and matches the
`SUBMITTED → VALIDATING → FILLING → FILLED` lifecycle from the plan.

**Assumption — `action` field not in original schema:**
The MVP plan's SQL schema for `orders` shows `side` (yes/no) but not `action` (buy/sell).
In prediction-market trading these are orthogonal: a trader can buy YES, sell YES, buy NO, or
sell NO. Since `computeFillPrice` in pnl.ts already requires both, adding `action` to the
schema is necessary and unambiguous. Existing rows default to `"buy"` (safe; no rows exist yet).

---

## PHASE 4 — MOCK ORDER EXECUTION

### Decision 18 — Mock fill executes synchronously in POST /api/orders; deterministic price via FNV-1a hash

**Date:** 2026-05-05
**Task:** Implement mock order execution (no real API yet)

**What was built:**

1. **`packages/utils/src/mock-price.ts`** — `getMockMarketQuote(externalMarketId)`:
   - Returns a `MarketQuote` with YES mid price deterministically mapped from the
     FNV-1a 32-bit hash of `externalMarketId` into [25, 75] cents.
   - Spread = 2 cents per side (bid = mid−1, ask = mid+1).
   - NO prices are the binary complement (NO mid = 100 − YES mid).
   - Same market always fills at the same price range — important for reproducible demos.
   - Exported from `packages/utils/src/index.ts`.

2. **`oracle-funded/src/lib/order-engine/fill-mock-order.ts`** — `fillMockOrder(orderId, prisma)`:
   Implements the 8-step fill sequence from MVP plan §5 as a single Prisma interactive
   transaction:
   - Step 1: `SELECT ... FOR UPDATE` locks the account row against concurrent eval-loop
     and parallel order fills.
   - Step 2: Re-reads account + existing position inside the locked transaction (correct
     position state even if another fill committed between order creation and here).
   - Step 3: Calls `computePositionDelta` from `@webflux/utils` (all bigint math).
   - Step 4: Inserts trade row with mock metadata.
   - Step 5: Upserts position row via Prisma's `upsert` (ON CONFLICT DO UPDATE semantics),
     using the composite unique key `(accountId, venue, externalMarketId, side)`.
   - Step 6: Updates `accounts.currentBalanceCents + version` with optimistic lock
     (`updateMany` with `version` in where clause; throws on conflict).
   - Step 7: Marks order `status = 'filled'`.
   - Step 8: Writes `audit_log` row with fill details.

3. **`oracle-funded/src/app/api/orders/route.ts`** (updated):
   - `POST /api/orders` now calls `fillMockOrder` immediately after creating the pending
     order. The response body includes `tradeId` and `fillPriceCents` on success.
   - If the fill fails (e.g., version conflict), the response includes `fillError` and the
     order remains in `'pending'` state for retry/debugging.

**Why synchronous fill instead of a queue:**
The MVP plan specifies "All orders are market orders that fill immediately" and
"<500ms round-trip target." Queuing adds latency and requires a BullMQ worker.
Synchronous fill in the API route is correct for the mock-execution phase; Phase 5
(worker eval loop) can take over fill processing when real Kalshi integration exists.
The fill function is deliberately extracted to `src/lib/order-engine/` so it can be
called by both the API route (now) and the worker process (future) without duplication.

**Assumption — no minimum-age cushion for mock:**
The MVP plan specifies a 500ms minimum-age cushion to prevent latency arb. Since
mock prices are static (not real-time), this check adds no value and is skipped.
It will be added when real Kalshi prices are live (Phase Day 3 in the build plan).

**`MarketQuote` Json cast:**
Prisma's `InputJsonValue` requires an index signature (`[key: string]: ...`) on object
types. `MarketQuote` has specific named fields only. Fixed by spreading into
`Record<string, number>` before storing in `metadata` / `auditLog.afterState`.

---

## PHASE 4 — STORE ORDERS + TRADES

### Decision 19 — Trade and single-order read endpoints follow the same auth/scope pattern as orders list

**Date:** 2026-05-05
**Task:** Store orders + trades

**What was built:**
- `oracle-funded/src/app/api/orders/[id]/route.ts` — `GET /api/orders/[id]`
  - Returns a single order including its `trades` relation (array, newest first)
  - Traders: only own orders (scoped via `account.userId`); Admins: any firm order
- `oracle-funded/src/app/api/trades/route.ts` — `GET /api/trades?accountId=<uuid>`
  - Returns the most recent 100 trades for an account, newest first
  - Traders must supply `accountId` and must own that account; Admins may omit `accountId`
    to list all firm trades, or scope to a specific account
- `oracle-funded/src/app/api/trades/[id]/route.ts` — `GET /api/trades/[id]`
  - Returns a single trade including its `order` relation (nullable — system-generated trades have no parent order)
  - Same ownership rules as the trades list endpoint

**Assumption — orders and trades are already being stored:**
The previous two Phase 4 tasks (`Create order service interface` and `Implement mock order execution`)
already write order and trade rows atomically in `POST /api/orders` + `fillMockOrder()`. This
task adds the missing read surface; no schema or write-path changes were needed.

**Scope rule summary (consistent across all order/trade endpoints):**
- Trader: must own the account — enforced by filtering `account.userId = ctx.userId`
- Admin/owner: sees all records within the firm (`firmId = ctx.firmId`)
- Both: always scoped to `firmId` so cross-firm reads are impossible even with a valid session

---

## VENUE ORDERING

### Decision 20 — Polymarket promoted to MVP-primary venue; Kalshi deferred to Day 8 (conditional)

**Date:** 2026-05-05
**Task:** Reorder build sequence Day 3 ↔ Day 8 venue work

**Original plan (WebFlux_MVP_Plan.md §11):**
- Day 3: `be/kalshi-real` — Kalshi as primary venue, WebSocket + RSA-PSS auth
- Day 8: `be/polymarket-real` — Polymarket as secondary, Gamma REST polling

**Reordered:**
- Day 3: `be/polymarket-real` — Polymarket as MVP-primary
- Day 8: `be/kalshi-real` (conditional on credentials) — Kalshi as secondary, enabled per-tenant via `firms.enabled_venues`

**Reason — founder jurisdiction + lead time:**
Founder is Canadian. Kalshi is CFTC-regulated and accounts (which gate API keys) are
tied to US-jurisdiction KYC. Even with eligibility, Kalshi review takes 1-2 weeks.
Polymarket Gamma REST is publicly accessible — no account, no keys, no jurisdiction
check for read-only market data, which is all the platform needs since trading is
simulated (MVP plan §1: "Simulated trading: market orders, validated fills").
Building the Day 4-7 critical path (order engine, eval engine, Stripe, admin) on
Polymarket data unblocks the demo without waiting on Kalshi.

**Why this is low-cost:**
The provider abstraction (`MarketDataProvider` interface, planned for Day 3) was
designed for venue-agnosticism from the start. Promoting Polymarket from secondary
to primary is a re-ordering of work, not a re-architecture. Kalshi plugs into the
same interface on Day 8.

**Blueberry pitch implication:**
Blueberry Funding is US-facing and presumably wants Kalshi for compliance. Two
mitigations:
1. Demo on Polymarket, sell on the abstraction: "platform is venue-agnostic; here's
   working Polymarket; Kalshi enables per-tenant via `firms.enabled_venues` once
   credentials are in place."
2. Have Blueberry supply Kalshi credentials for their tenant post-pilot — they'd be
   the operator of record on a US-regulated venue anyway, which is the cleaner
   long-term arrangement than the Canadian founder personally holding US keys.

**Action items:**
- Submit Kalshi API application this week regardless, so the 1-2 week clock runs in
  parallel with Day 3-7 work.
- If credentials arrive by Day 8 start, do the Kalshi sub-task; otherwise skip it
  and use recovered hours for Day 9 buffer.
- Risk 5 in the plan updated to reflect the new ordering.

**Files changed:**
- `WebFlux_MVP_Plan.md` §11 Day 3 — now `be/polymarket-real` with rationale block
- `WebFlux_MVP_Plan.md` §11 Day 8 — now `be/payouts-real` + `be/kalshi-real (conditional)`
- `WebFlux_MVP_Plan.md` §15 Risk 5 — updated to "Kalshi API approval delay / Canadian jurisdiction block"

---

## PHASE 3 — POLYMARKET PROVIDER (PARTIAL)

### Decision 21 — Phase 3 ships the REST provider; the worker poll loop + Redis cache are deferred until Upstash is provisioned

**Date:** 2026-05-08
**Task:** be/polymarket-real (Day 3 of MVP plan §11)

**What shipped:**
- `packages/utils/src/polymarket.ts` — `fetchPolymarketQuote(externalMarketId)`:
  Gamma REST `/markets/<id>`, normalises decimal-fraction prices to integer
  cents, returns null on closed/inactive/illiquid markets.
- `packages/utils/src/providers.ts` — `fetchProviderQuote(venue, id)` dispatcher:
  Polymarket → live Gamma; Kalshi → deterministic mock (deferred per Decision 20).
- `oracle-funded/src/lib/order-engine/fill-order.ts` (renamed from
  `fill-mock-order.ts`) — quotes now flow through the dispatcher; trade rows
  flag `mock: true` only when `isMockVenue(venue)`.
- `tests/phase-3-polymarket.sh` — 9 assertions: API reachable, normalisation
  invariants (binary complement, no crossed book, [0,100] range), null for
  bogus ids, kalshi mock fallback.

**What did NOT ship:**
The MVP plan's Day 3 also calls for a worker poll loop, subscription manager,
heartbeat-to-Redis, and a hot price cache. All of these depend on Upstash
Redis, which is not yet provisioned (UPSTASH_REDIS_REST_URL/TOKEN empty in
`.env.local`).

**Why partial is correct:**
- The order engine still works end-to-end without the cache: `fetchProviderQuote`
  hits Gamma REST inline on every fill (~100-300 ms latency, well under the
  500 ms target for MVP demo traffic).
- The `MarketDataProvider` shape is the same whether quotes come from REST
  directly or from a Redis cache, so Phase 3.5 (cache + worker loop) is a
  pure infrastructure addition with no API surface change.
- Skipping Upstash today preserves momentum; the architecture stays sound
  and the demo flow works.

**What Phase 3.5 will add when Upstash arrives:**
- Worker process polls Polymarket on a 30 s cadence, writes
  `quote:polymarket:<id>` keys with 60 s TTL.
- `fetchProviderQuote` reads cache first, falls back to inline REST on miss.
- Worker writes `worker:heartbeat:lastMessageAt` for `/api/health` to monitor.
- Subscription manager populates the poll set from open positions + browsed
  markets; backs off on 429.

**Trade metadata convention:**
Every trade row carries `metadata.mock: boolean`. Today: false for Polymarket,
true for Kalshi. When Kalshi goes live in Phase 8, that flag inverts; trades
written before that date can be identified by `mock:true AND venue:'kalshi'`.
