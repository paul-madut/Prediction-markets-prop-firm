-- WebFlux MVP — orders.action column (resolves schema drift Decision 17).
--
-- The Prisma schema added `action: 'buy' | 'sell'` to Order in Phase 4 task 1
-- (so the fill engine can resolve bid vs ask) but the SQL migration was never
-- updated. This adds the column with a default of 'buy', matching the Prisma
-- generator's expectation. Existing pending/filled rows are zero so a default
-- backfill is safe.

alter table orders
  add column if not exists action text not null default 'buy'
    check (action in ('buy', 'sell'));
