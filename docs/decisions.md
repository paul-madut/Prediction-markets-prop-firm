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
