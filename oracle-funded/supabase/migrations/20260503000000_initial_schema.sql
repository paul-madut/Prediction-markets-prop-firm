-- WebFlux MVP — Initial schema
-- Source of truth: WebFlux_MVP_Plan.md §3 (Data Model)
--
-- Conventions enforced here:
--   - Every table has firm_id (nullable only on news_events for cross-firm events)
--   - Money is bigint (cents) for balances, int (cents) for prices — never floats
--   - Append-only history (trades, breach_events, audit_log, account_state_log)
--   - All financial mutations expected to run in single transactions
--   - accounts.version is for optimistic locking against concurrent eval/order updates
--   - orders.idempotency_key prevents replay; payments.stripe_event_id prevents webhook double-processing
--   - positions has unique (account_id, venue, external_market_id, side) — exactly one row per side
--
-- Order of CREATEs respects FK dependencies. accounts.breach_event_id has a circular ref to
-- breach_events; the FK is added at the end via ALTER TABLE.

create extension if not exists "pgcrypto";

-- ============================================================
-- Tenancy
-- ============================================================

create table firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  brand_config jsonb not null default '{}'::jsonb,
  enabled_venues text[] not null default array['kalshi'],
  status text not null default 'active' check (status in ('active','paused','disabled')),
  price_history_sample_interval_seconds int not null default 30,
  created_at timestamptz not null default now()
);

create table firm_members (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id),
  user_id uuid not null,
  role text not null check (role in ('trader','admin','owner')),
  created_at timestamptz not null default now(),
  unique (firm_id, user_id)
);

-- ============================================================
-- Challenge configuration
-- ============================================================

create table challenge_configs (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id),
  name text not null,
  account_size_cents bigint not null,
  challenge_fee_cents int not null,
  drawdown_type text not null check (drawdown_type in ('static','trailing_eod')),
  trailing_reference text not null default 'eod_balance' check (
    trailing_reference in ('eod_balance', 'eod_equity', 'eod_max_balance_equity')
  ),
  total_drawdown_pct numeric(5,2) not null,
  daily_drawdown_pct numeric(5,2),
  min_trading_days int not null default 0,
  profit_split_pct numeric(5,2) not null,
  breach_comparison text not null default 'lt' check (breach_comparison in ('lt','lte')),
  breach_close_behavior text not null check (
    breach_close_behavior in ('mark_to_floor', 'close_at_market')
  ),
  refund_disables_account boolean not null default true,
  max_positions_per_market int not null default 1,
  max_positions_total int not null default 5,
  max_contracts_per_order int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table challenge_phases (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id),
  config_id uuid not null references challenge_configs(id),
  phase_index int not null,
  name text not null,
  profit_target_pct numeric(5,2) not null,
  min_trading_days int not null default 0,
  next_phase_id uuid,
  created_at timestamptz not null default now(),
  unique (config_id, phase_index)
);

-- ============================================================
-- Trading: accounts, orders, trades, positions
-- ============================================================

create table accounts (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id),
  user_id uuid not null,
  config_id uuid not null references challenge_configs(id),
  current_phase_id uuid not null references challenge_phases(id),
  status text not null check (status in (
    'pending','active','passed_phase','funded','breached','disabled'
  )),
  starting_balance_cents bigint not null,
  current_balance_cents bigint not null,
  highest_eod_balance_cents bigint not null,
  highest_eod_equity_cents bigint not null,
  drawdown_floor_cents bigint not null,
  daily_loss_floor_cents bigint,
  day_start_equity_cents bigint not null default 0,
  current_trading_day date,
  trading_days_count int not null default 0,
  first_trade_at timestamptz,
  breach_at timestamptz,
  breach_event_id uuid, -- FK added below (circular ref to breach_events)
  rule_overrides jsonb not null default '{}'::jsonb,
  override_reason text,
  override_set_by_user_id uuid,
  override_set_at timestamptz,
  override_expires_at timestamptz,
  last_eod_run_at timestamptz,
  version int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_accounts_firm_status on accounts(firm_id, status);
create index idx_accounts_user_firm on accounts(user_id, firm_id);
create index idx_accounts_with_overrides on accounts(firm_id)
  where rule_overrides != '{}'::jsonb;

create table orders (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id),
  account_id uuid not null references accounts(id),
  venue text not null check (venue in ('kalshi','polymarket')),
  external_market_id text not null,
  external_market_ticker text not null,
  side text not null check (side in ('yes','no')),
  size_contracts int not null check (size_contracts > 0),
  order_type text not null default 'market' check (order_type in ('market','limit')),
  limit_price_cents int,
  time_in_force text default 'gtc' check (time_in_force in ('gtc','day','ioc','fok')),
  expires_at timestamptz,
  idempotency_key uuid not null,
  status text not null check (status in (
    'pending','filled','partially_filled','rejected','cancelled'
  )),
  rejected_reason text,
  submitted_at timestamptz not null default now(),
  filled_at timestamptz,
  unique (idempotency_key)
);

create index idx_orders_venue_market on orders(venue, external_market_id);

create table trades (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id),
  account_id uuid not null references accounts(id),
  order_id uuid references orders(id), -- nullable for system-generated (breach close)
  venue text not null,
  external_market_id text not null,
  side text not null check (side in ('yes','no')),
  size_contracts int not null,
  price_cents int not null,
  fees_cents int not null default 0,
  realized_pnl_cents bigint,
  is_opening boolean not null,
  metadata jsonb,
  executed_at timestamptz not null default now()
);

create index idx_trades_account_executed on trades(account_id, executed_at);

create table positions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id),
  account_id uuid not null references accounts(id),
  venue text not null,
  external_market_id text not null,
  side text not null check (side in ('yes','no')),
  net_contracts int not null,
  avg_entry_price_cents int not null,
  unrealized_pnl_cents bigint not null,
  last_priced_at timestamptz,
  unique (account_id, venue, external_market_id, side)
);

-- ============================================================
-- Risk & state
-- ============================================================

create table drawdown_snapshots (
  id bigint generated always as identity primary key,
  firm_id uuid not null references firms(id),
  account_id uuid not null references accounts(id),
  equity_cents bigint not null,
  balance_cents bigint not null,
  floor_cents bigint not null,
  daily_floor_cents bigint,
  recorded_at timestamptz not null default now()
);

create table breach_events (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id),
  account_id uuid not null references accounts(id),
  breach_type text not null check (breach_type in ('total_drawdown','daily_drawdown','rule_violation')),
  equity_at_breach_cents bigint not null,
  floor_at_breach_cents bigint not null,
  close_behavior text not null check (close_behavior in ('mark_to_floor','close_at_market')),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table account_state_log (
  id bigint generated always as identity primary key,
  firm_id uuid not null references firms(id),
  account_id uuid not null references accounts(id),
  from_status text,
  to_status text not null,
  reason text,
  actor_user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table cheat_signals (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id),
  account_id uuid not null references accounts(id),
  signal_type text not null check (signal_type in (
    'latency_arb', 'copy_trade', 'win_rate_anomaly',
    'volume_anomaly', 'position_concentration', 'news_violation',
    'trade_timing_pattern'
  )),
  severity text not null check (severity in ('low', 'medium', 'high')),
  score numeric,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in (
    'pending', 'reviewed_legitimate', 'reviewed_violating', 'auto_actioned'
  )),
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  reviewer_notes text,
  detected_at timestamptz not null default now()
);

create index idx_cheat_signals_firm_status on cheat_signals(firm_id, status);

-- ============================================================
-- Money & ops
-- ============================================================

create table payments (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id),
  user_id uuid not null,
  config_id uuid not null references challenge_configs(id),
  account_id uuid references accounts(id),
  amount_cents int not null,
  currency text not null default 'usd',
  status text not null default 'pending' check (status in (
    'pending','paid','refunded','disputed','failed'
  )),
  stripe_session_id text,
  stripe_event_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_payments_firm_created on payments(firm_id, created_at desc);

create table payouts (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id),
  account_id uuid not null references accounts(id),
  user_id uuid not null,
  gross_profit_cents bigint not null,
  firm_share_cents bigint not null,
  trader_share_cents bigint not null,
  processing_fee_cents int not null default 0,
  payment_method text not null check (payment_method in ('bank_transfer','crypto','paypal','wire')),
  payment_details jsonb not null default '{}'::jsonb,
  status text not null default 'requested' check (status in (
    'requested','approved','processing','paid','rejected','failed'
  )),
  external_reference text,
  rejection_reason text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid,
  paid_at timestamptz
);

create index idx_payouts_firm_status on payouts(firm_id, status);

-- ============================================================
-- Cross-cutting
-- ============================================================

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id),
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_firm_created on audit_log(firm_id, created_at desc);
create index idx_audit_entity on audit_log(entity_type, entity_id);

create table news_events (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid, -- nullable; null applies to all firms
  market_filter text, -- nullable; ticker pattern
  event_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  cooldown_minutes int not null default 2,
  created_at timestamptz not null default now()
);

create table price_history (
  id bigint generated always as identity primary key,
  venue text not null,
  external_market_id text not null,
  yes_bid int,
  yes_ask int,
  no_bid int,
  no_ask int,
  recorded_at timestamptz not null default now()
);

create index idx_price_history_market_time on price_history(venue, external_market_id, recorded_at desc);

-- ============================================================
-- Close circular FK: accounts.breach_event_id → breach_events.id
-- ============================================================

alter table accounts
  add constraint accounts_breach_event_fk
  foreign key (breach_event_id) references breach_events(id);
