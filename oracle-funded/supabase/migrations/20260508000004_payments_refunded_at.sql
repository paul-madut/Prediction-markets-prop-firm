-- WebFlux MVP — add payments.refunded_at to match Prisma schema.
-- Phase 6 (Stripe webhook handler) writes this column on charge.refunded;
-- the initial SQL migration omitted it.

alter table payments
  add column if not exists refunded_at timestamptz;
