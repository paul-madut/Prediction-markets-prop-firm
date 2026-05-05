PHASE 1: MONOREPO + INFRA

[x] Create monorepo using pnpm workspaces
    - pnpm-workspace.yaml at root; 6 workspace packages linked
    - oracle-funded kept at root (real product code; not moved)
    - apps/worker stub created (replaces microservices per MVP plan)
    - packages/types, packages/utils, packages/db stubs created
    - See docs/decisions.md for rationale
[x] Setup apps:
    - oracle-funded (existing Next.js 14 app, workspace member)
    - apps/worker (Railway worker stub; replaces api-gateway + services)
    Note: api-gateway, services/auth, services/user, services/account omitted —
    MVP plan explicitly rejects microservices (see docs/decisions.md Decision 1)
[x] Setup shared packages:
    - packages/db (Prisma stub; schema written in next task)
    - packages/types (all domain types from MVP plan Section 3)
    - packages/utils (money math, time, backoff, uuid helpers)

[x] Setup PostgreSQL schema using Prisma:
    - firms, firm_members (tenancy & users)
    - challenge_configs, challenge_phases
    - accounts (trading_accounts), orders, trades, positions
    - drawdown_snapshots, breach_events, account_state_log, cheat_signals
    - payments, payouts
    - audit_log, news_events, price_history
    - firm_id included on all tables (absorbed next task; see docs/decisions.md Decision 6)
    - Prisma client generated and validated

[x] Add tenant_id to all tables
[x] Implement row-level security logic at app layer
    - createScopedClient(firmId) in packages/db/src/index.ts via Prisma Client Extension
    - Injects firmId into all where clauses for firm-scoped models (excludes PriceHistory, NewsEvent)
    - ScopedClient type exported for use in worker and API routes
    - DB-level Supabase RLS policies in packages/db/migrations/001_rls_policies.sql
    - See docs/decisions.md Decision 9

----------------------------------

PHASE 2: AUTH

[x] Implement JWT auth (access + refresh)
    - packages/auth created: verifyToken, getAuthContext, withAuth, enrichClerkAuth
    - Uses @clerk/backend for server-side JWT verification (Clerk, not Supabase Auth)
    - See docs/decisions.md Decision 10
[x] Add login endpoint
    - GET /api/auth/me in oracle-funded/src/app/api/auth/me/route.ts
    - Uses Clerk auth() + enrichClerkAuth from @webflux/auth to resolve firmId/role
    - Built packages/db and packages/auth (dist/ folders created)
    - See docs/decisions.md Decision 11
[ ] Add register endpoint (tenant-scoped)
[ ] Add middleware for tenant extraction

----------------------------------

PHASE 3: ACCOUNT SERVICE

[ ] Create account CRUD endpoints
[ ] Implement balance + equity logic
[ ] Stub PnL calculation

----------------------------------

PHASE 4: TRADING CORE (STUBBED)

[ ] Create order service interface
[ ] Implement mock order execution (no real API yet)
[ ] Store orders + trades

----------------------------------

RULES:

- Do NOT ask questions
- Make reasonable assumptions
- Log all assumptions in /docs/decisions.md
- Always keep app runnable
- Always complete ONE task fully before moving on