PHASE 1: MONOREPO + INFRA

[ ] Create monorepo using pnpm workspaces
[ ] Setup apps:
    - apps/web (Next.js 14)
    - apps/api-gateway
    - services/auth
    - services/user
    - services/account
[ ] Setup shared packages:
    - packages/db (Prisma)
    - packages/types
    - packages/utils

[ ] Setup PostgreSQL schema using Prisma:
    - tenants
    - users
    - trading_accounts
    - orders
    - positions
    - trades

[ ] Add tenant_id to all tables
[ ] Implement row-level security logic at app layer

----------------------------------

PHASE 2: AUTH

[ ] Implement JWT auth (access + refresh)
[ ] Add login endpoint
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