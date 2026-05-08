-- WebFlux MVP — Blueberry-style challenge configs for the demo.
--
-- Three configs that cover the shapes Blueberry markets to traders:
--   - PRO6   — single-phase $50K eval, 6% profit target, 5% trailing-EOD
--              drawdown, $299 fee, 80% profit split.
--   - PRO10  — single-phase $100K eval, 10% profit target, 8% trailing-EOD
--              drawdown, $599 fee, 80% profit split.
--   - INSTANT — instant-funded $25K, 12% profit target before first payout,
--              4% static drawdown, $399 fee, 70% profit split, NO eval phase
--              (status flips straight to 'funded' on payment).
--
-- Idempotent: re-running this migration leaves rows in their current state
-- (ON CONFLICT DO NOTHING).

-- ── PRO6 ───────────────────────────────────────────────────────────────────
insert into challenge_configs (
  id, firm_id, name, account_size_cents, challenge_fee_cents,
  drawdown_type, trailing_reference, total_drawdown_pct, daily_drawdown_pct,
  min_trading_days, profit_split_pct, breach_comparison, breach_close_behavior,
  refund_disables_account, max_positions_per_market, max_positions_total,
  max_contracts_per_order, is_active
) values (
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-000000000001',
  'PRO6 — $50K Evaluation',
  5000000, 29900,
  'trailing_eod', 'eod_max_balance_equity', 5.00, 3.00,
  3, 80.00, 'lt', 'mark_to_floor',
  true, 1, 5, 100, true
)
on conflict (id) do nothing;

insert into challenge_phases (
  id, firm_id, config_id, phase_number, name, profit_target_pct,
  min_trading_days, next_phase_id
) values (
  '00000000-0000-0000-0000-0000000000a2',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000a1',
  1, 'Evaluation', 6.00, 3, null
)
on conflict (config_id, phase_number) do nothing;

-- ── PRO10 ──────────────────────────────────────────────────────────────────
insert into challenge_configs (
  id, firm_id, name, account_size_cents, challenge_fee_cents,
  drawdown_type, trailing_reference, total_drawdown_pct, daily_drawdown_pct,
  min_trading_days, profit_split_pct, breach_comparison, breach_close_behavior,
  refund_disables_account, max_positions_per_market, max_positions_total,
  max_contracts_per_order, is_active
) values (
  '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-000000000001',
  'PRO10 — $100K Evaluation',
  10000000, 59900,
  'trailing_eod', 'eod_max_balance_equity', 8.00, 5.00,
  5, 80.00, 'lt', 'mark_to_floor',
  true, 2, 10, 250, true
)
on conflict (id) do nothing;

insert into challenge_phases (
  id, firm_id, config_id, phase_number, name, profit_target_pct,
  min_trading_days, next_phase_id
) values (
  '00000000-0000-0000-0000-0000000000b2',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000b1',
  1, 'Evaluation', 10.00, 5, null
)
on conflict (config_id, phase_number) do nothing;

-- ── INSTANT FUNDED ─────────────────────────────────────────────────────────
-- Static drawdown (no high-water mark trailing); no min trading days; the
-- profit-target-pct on the phase is the gate for the first payout, not for a
-- transition. The eval engine still runs and breaches at the floor — it just
-- starts at status='funded' rather than 'active'.
insert into challenge_configs (
  id, firm_id, name, account_size_cents, challenge_fee_cents,
  drawdown_type, trailing_reference, total_drawdown_pct, daily_drawdown_pct,
  min_trading_days, profit_split_pct, breach_comparison, breach_close_behavior,
  refund_disables_account, max_positions_per_market, max_positions_total,
  max_contracts_per_order, is_active
) values (
  '00000000-0000-0000-0000-0000000000c1',
  '00000000-0000-0000-0000-000000000001',
  'Instant Funded — $25K',
  2500000, 39900,
  'static', 'eod_balance', 4.00, 2.00,
  0, 70.00, 'lt', 'mark_to_floor',
  true, 1, 5, 50, true
)
on conflict (id) do nothing;

insert into challenge_phases (
  id, firm_id, config_id, phase_number, name, profit_target_pct,
  min_trading_days, next_phase_id
) values (
  '00000000-0000-0000-0000-0000000000c2',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000c1',
  1, 'Funded', 12.00, 0, null
)
on conflict (config_id, phase_number) do nothing;
