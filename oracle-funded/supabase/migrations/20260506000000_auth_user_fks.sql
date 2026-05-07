-- WebFlux MVP — Cross-schema FKs to auth.users
--
-- Resolves Decision 7 (deferred): the initial schema declared all auth-user
-- references as plain `uuid not null` because Prisma cannot model relations
-- across the `auth` schema. Now that a real Supabase project exists, we add
-- the FK constraints at the DB level.
--
-- ON DELETE behaviour:
--   - firm_members.user_id        → CASCADE   (deleting auth user removes memberships)
--   - accounts.user_id            → RESTRICT  (account state is too valuable to lose)
--   - payments.user_id            → RESTRICT  (financial record; preserve)
--   - payouts.user_id             → RESTRICT  (financial record; preserve)
--   - actor / reviewer / override → SET NULL  (preserve audit row, drop the actor)

alter table firm_members
  add constraint firm_members_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table accounts
  add constraint accounts_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete restrict;

alter table accounts
  add constraint accounts_override_set_by_user_id_fkey
  foreign key (override_set_by_user_id) references auth.users(id) on delete set null;

alter table account_state_log
  add constraint account_state_log_actor_user_id_fkey
  foreign key (actor_user_id) references auth.users(id) on delete set null;

alter table cheat_signals
  add constraint cheat_signals_reviewed_by_user_id_fkey
  foreign key (reviewed_by_user_id) references auth.users(id) on delete set null;

alter table payments
  add constraint payments_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete restrict;

alter table payouts
  add constraint payouts_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete restrict;

alter table payouts
  add constraint payouts_reviewed_by_user_id_fkey
  foreign key (reviewed_by_user_id) references auth.users(id) on delete set null;

alter table audit_log
  add constraint audit_log_actor_user_id_fkey
  foreign key (actor_user_id) references auth.users(id) on delete set null;
