-- WebFlux MVP — align challenge_phases column names with the Prisma schema.
--
-- Resolves schema drift: the SQL migration named the column `phase_index`
-- and used a unique constraint on (config_id, phase_index), while Prisma
-- maps `phaseNumber` → `phase_number` and uniques on (config_id, phase_number).
-- This caused P2022 ("column challenge_phases.phase_number does not exist")
-- on every Prisma read of the model.
--
-- Renaming the column is safer than touching callers: the value semantics
-- are identical (1, 2, 3, ...).

alter table challenge_phases rename column phase_index to phase_number;

-- The constraint name carries the old column name; rebuild it.
alter table challenge_phases drop constraint if exists challenge_phases_config_id_phase_index_key;
alter table challenge_phases add constraint challenge_phases_config_id_phase_number_key
  unique (config_id, phase_number);
