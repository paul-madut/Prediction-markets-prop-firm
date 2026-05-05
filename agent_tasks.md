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
[x] Add register endpoint (tenant-scoped)
    - POST /api/auth/register in oracle-funded/src/app/api/auth/register/route.ts
    - Accepts { firmSlug } body; requires active Clerk session
    - Looks up firm by slug, enforces one-firm-per-user (409 on duplicate)
    - Creates firm_members row with role='trader', writes audit_log
    - Returns AuthContext (same shape as GET /api/auth/me), status 201
    - See docs/decisions.md Decision 12
[x] Add middleware for tenant extraction
    - oracle-funded/src/middleware.ts: strips x-webflux-* headers first, then injects
      x-webflux-user-id, x-webflux-session-id from Clerk JWT; x-webflux-firm-slug from subdomain
    - packages/auth/src/headers.ts: readTenantHeaders(headers) helper for route handlers
    - packages/auth/src/context.ts: getAuthContext now accepts optional firmSlug to scope
      firm_members lookup to a specific firm (multi-tenant URL routing)
    - No DB call in middleware (Prisma/edge incompatibility); lookup deferred to route handler
    - See docs/decisions.md Decision 13

----------------------------------

PHASE 3: ACCOUNT SERVICE

[x] Create account CRUD endpoints
    - GET /api/accounts — list (trader: own accounts; admin/owner: all firm accounts)
    - POST /api/accounts — admin/owner only; provisions account directly (bypasses payment)
    - GET /api/accounts/[id] — single account with config, phase, open positions
    - PATCH /api/accounts/[id] — admin/owner only; status update (active ↔ disabled)
    - BigInt cent values serialized as strings in JSON responses
    - State log + audit log written on every PATCH
    - See docs/decisions.md Decision 14
[x] Implement balance + equity logic
    - computeEquityFromStoredPnl / computeEquityFromPrices in packages/utils/src/eval.ts
    - computeStaticFloor, computeTrailingFloor (all 3 reference modes), computeDailyFloor,
      computeEffectiveFloor, checkBreach — all bigint, no floats
    - GET /api/accounts/[id]/equity returns equity snapshot, effective floor, distanceToFloor, isBreach
    - See docs/decisions.md Decision 15
[x] Stub PnL calculation
    - computeFillPrice, computeBalanceChange, computeNewAvgEntryPrice,
      computeRealizedPnl, computeUnrealizedPnl, computePositionDelta in packages/utils/src/pnl.ts
    - All bigint money; fill price returns null on missing quote side
    - See docs/decisions.md Decision 16

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