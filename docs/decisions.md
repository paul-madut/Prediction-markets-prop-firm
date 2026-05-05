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
