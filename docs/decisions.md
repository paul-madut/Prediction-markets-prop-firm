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
