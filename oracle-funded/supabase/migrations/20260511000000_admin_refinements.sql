-- WebFlux — admin refinements (2026-05-11)
--
-- Adds firms.one_sided_threshold_pct so admins can hide and block markets
-- whose YES price is within N cents of 0 or 100. Default 0 = no filter
-- (preserves current behavior). Range constraint 0..49 — any higher would
-- block the entire market.
--
-- Per-account control endpoints (suspend / resume / promote-phase /
-- reset-phase / expanded override keys) operate entirely through existing
-- columns (status, current_phase_id, rule_overrides JSON). No DDL needed
-- for those.

ALTER TABLE firms
  ADD COLUMN one_sided_threshold_pct INTEGER NOT NULL DEFAULT 0
    CHECK (one_sided_threshold_pct >= 0 AND one_sided_threshold_pct <= 49);
