-- WebFlux MVP — align breach_events with Prisma schema.
-- Prisma uses `breached_at`; SQL had `occurred_at`. Same semantics, rename only.

alter table breach_events rename column occurred_at to breached_at;
