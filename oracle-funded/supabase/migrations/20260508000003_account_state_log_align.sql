-- WebFlux MVP — align account_state_log column names with Prisma.
-- Prisma uses `created_at`; SQL had `occurred_at`. Same semantics, rename only.

alter table account_state_log rename column occurred_at to created_at;
