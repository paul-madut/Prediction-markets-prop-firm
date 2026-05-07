-- WebFlux MVP — Demo seed data
--
-- One firm + one challenge_config + one challenge_phase so the
-- POST /api/auth/register endpoint has a target firm to attach
-- newly registered Supabase users to as 'trader' members.
--
-- Deterministic UUIDs are used so re-runs and downstream references
-- (e.g. test fixtures, demo deep links) remain stable.
--
-- Venue defaults to ['polymarket'] per Decision 20 (Polymarket is the
-- MVP-primary venue; Kalshi enables per-tenant once credentials exist).

-- ----------------------------------------------------------------
-- Demo firm: slug 'demo' → app accessible at demo.<root-domain>
-- ----------------------------------------------------------------
insert into firms (id, name, slug, enabled_venues, status)
values (
  '00000000-0000-0000-0000-000000000001',
  'Demo Prop Firm',
  'demo',
  array['polymarket'],
  'active'
)
on conflict (slug) do nothing;

-- ----------------------------------------------------------------
-- Demo challenge config: $50K account, trailing-EOD drawdown,
-- 10% total / 5% daily, 80% profit split, mark-to-floor breach close.
-- Mirrors the kind of config Blueberry's "PRO" challenges use.
-- ----------------------------------------------------------------
insert into challenge_configs (
  id,
  firm_id,
  name,
  account_size_cents,
  challenge_fee_cents,
  drawdown_type,
  trailing_reference,
  total_drawdown_pct,
  daily_drawdown_pct,
  min_trading_days,
  profit_split_pct,
  breach_comparison,
  breach_close_behavior,
  refund_disables_account,
  max_positions_per_market,
  max_positions_total,
  max_contracts_per_order,
  is_active
)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Demo $50K Evaluation',
  5000000,        -- $50,000.00
  29900,          -- $299.00
  'trailing_eod',
  'eod_max_balance_equity',
  10.00,
  5.00,
  3,
  80.00,
  'lt',
  'mark_to_floor',
  true,
  1,
  5,
  100,
  true
)
on conflict (id) do nothing;

-- ----------------------------------------------------------------
-- Demo phase 1 of 1: 8% profit target, 3 minimum trading days.
-- For a single-phase challenge this is also the funded gate.
-- ----------------------------------------------------------------
insert into challenge_phases (
  id,
  firm_id,
  config_id,
  phase_index,
  name,
  profit_target_pct,
  min_trading_days,
  next_phase_id
)
values (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  1,
  'Evaluation',
  8.00,
  3,
  null
)
on conflict (config_id, phase_index) do nothing;
