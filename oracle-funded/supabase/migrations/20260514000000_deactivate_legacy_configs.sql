-- Deactivate legacy / dev-only challenge configs that were leaking into the
-- trader-facing Buy Challenge page.
--
--   * "TEST $1 Stripe" ($5K, $1 fee) — Stripe sandbox config; not a real
--     product. Should never appear in the catalog traders see.
--   * "Demo $50K Evaluation" — original demo-firm seed that was replaced
--     by PRO6 at the same $50K size. Keeping both produces a duplicate
--     entry whose 8% target conflicts with PRO6's 6%.
--
-- The API layer (src/app/api/configs/route.ts) also filters these defensively
-- in case the migration isn't applied, but flipping is_active=false here is
-- the durable fix.

update challenge_configs
   set is_active = false
 where name ilike 'TEST%';

update challenge_configs
   set is_active = false
 where id = '00000000-0000-0000-0000-000000000002';
