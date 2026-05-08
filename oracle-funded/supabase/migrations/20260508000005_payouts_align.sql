-- WebFlux MVP — replace payouts table with the Prisma-aligned shape.
--
-- The original SQL was designed with a different financial model
-- (gross_profit_cents / firm_share_cents / trader_share_cents +
-- processing_fee_cents) than the Prisma schema, which uses requested_cents
-- + profit_split_pct + trader_amount_cents. Prisma has been the working
-- contract for every payout API route, so we align SQL to it.
--
-- DROP TABLE is acceptable here because no production data exists yet
-- (Phase 6/7 tests provisioned synthetic rows that were cleaned up at
-- end of run). If this migration runs against a DB with real payout
-- history, snapshot first via `pg_dump --data-only -t payouts`.

drop table if exists payouts cascade;

create table payouts (
  id                    uuid primary key default gen_random_uuid(),
  firm_id               uuid not null references firms(id),
  account_id            uuid not null references accounts(id),
  user_id               uuid not null references auth.users(id) on delete restrict,
  requested_cents       bigint not null,
  profit_split_pct      numeric(5,2) not null,
  trader_amount_cents   bigint not null,
  status                text not null default 'requested' check (status in (
                          'requested','approved','processing','paid','rejected','failed'
                        )),
  payment_method        text,
  payment_destination   text,
  external_reference    text,
  reviewed_by_user_id   uuid references auth.users(id) on delete set null,
  reviewed_at           timestamptz,
  reviewer_notes        text,
  requested_at          timestamptz not null default now(),
  paid_at               timestamptz
);

create index idx_payouts_firm_status on payouts(firm_id, status);
create index idx_payouts_user_requested on payouts(user_id, requested_at desc);
