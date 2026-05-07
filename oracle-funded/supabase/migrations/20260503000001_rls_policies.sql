-- ============================================================
-- Supabase Row-Level Security Policies
-- Apply via Supabase Dashboard SQL editor or `supabase db push`
-- ============================================================
-- These policies are the DB-level tenant fence (primary defense).
-- The Railway worker uses the service role key (bypasses RLS) and
-- enforces firm_id in application code via createScopedClient().

-- ----------------------------------------------------------------
-- Helper: is caller an admin/owner of a given firm?
-- ----------------------------------------------------------------
create or replace function is_firm_admin(p_firm_id uuid)
  returns boolean
  language sql
  stable
  security definer
as $$
  select exists (
    select 1 from firm_members
    where user_id  = auth.uid()
      and firm_id  = p_firm_id
      and role in ('admin', 'owner')
  )
$$;

-- ================================================================
-- ACCOUNTS
-- ================================================================
alter table accounts enable row level security;

-- Traders see only their own accounts
create policy "traders_see_own_accounts"
  on accounts for select
  using (user_id = auth.uid());

-- Admins/owners see all accounts in their firm
create policy "admins_see_firm_accounts"
  on accounts for select
  using (is_firm_admin(firm_id));

-- Only admins may update accounts
create policy "admins_update_accounts"
  on accounts for update
  using (is_firm_admin(firm_id));

-- ================================================================
-- ORDERS
-- ================================================================
alter table orders enable row level security;

create policy "traders_see_own_orders"
  on orders for select
  using (
    account_id in (
      select id from accounts where user_id = auth.uid()
    )
  );

create policy "admins_see_firm_orders"
  on orders for select
  using (is_firm_admin(firm_id));

create policy "admins_update_orders"
  on orders for update
  using (is_firm_admin(firm_id));

-- ================================================================
-- TRADES
-- ================================================================
alter table trades enable row level security;

create policy "traders_see_own_trades"
  on trades for select
  using (
    account_id in (
      select id from accounts where user_id = auth.uid()
    )
  );

create policy "admins_see_firm_trades"
  on trades for select
  using (is_firm_admin(firm_id));

-- ================================================================
-- POSITIONS
-- ================================================================
alter table positions enable row level security;

create policy "traders_see_own_positions"
  on positions for select
  using (
    account_id in (
      select id from accounts where user_id = auth.uid()
    )
  );

create policy "admins_see_firm_positions"
  on positions for select
  using (is_firm_admin(firm_id));

-- ================================================================
-- PAYMENTS
-- ================================================================
alter table payments enable row level security;

create policy "traders_see_own_payments"
  on payments for select
  using (user_id = auth.uid());

create policy "admins_see_firm_payments"
  on payments for select
  using (is_firm_admin(firm_id));

-- ================================================================
-- PAYOUTS
-- ================================================================
alter table payouts enable row level security;

create policy "traders_see_own_payouts"
  on payouts for select
  using (user_id = auth.uid());

create policy "admins_see_firm_payouts"
  on payouts for select
  using (is_firm_admin(firm_id));

-- ================================================================
-- CHALLENGE CONFIGS (read-only for traders)
-- ================================================================
alter table challenge_configs enable row level security;

create policy "traders_read_firm_configs"
  on challenge_configs for select
  using (
    exists (
      select 1 from firm_members
      where user_id = auth.uid()
        and firm_id = challenge_configs.firm_id
    )
  );

-- ================================================================
-- FIRM MEMBERS (traders see self, admins see firm)
-- ================================================================
alter table firm_members enable row level security;

create policy "members_see_self"
  on firm_members for select
  using (user_id = auth.uid());

create policy "admins_see_firm_members"
  on firm_members for select
  using (is_firm_admin(firm_id));

-- ================================================================
-- AUDIT LOG (admin read-only)
-- ================================================================
alter table audit_log enable row level security;

create policy "admins_read_audit_log"
  on audit_log for select
  using (is_firm_admin(firm_id));

-- ================================================================
-- RISK TABLES (admin read-only)
-- ================================================================
alter table drawdown_snapshots enable row level security;
create policy "admins_read_drawdown_snapshots"
  on drawdown_snapshots for select
  using (is_firm_admin(firm_id));

alter table breach_events enable row level security;
create policy "admins_read_breach_events"
  on breach_events for select
  using (is_firm_admin(firm_id));

alter table account_state_log enable row level security;
create policy "admins_read_account_state_log"
  on account_state_log for select
  using (is_firm_admin(firm_id));

alter table cheat_signals enable row level security;
create policy "admins_read_cheat_signals"
  on cheat_signals for select
  using (is_firm_admin(firm_id));

-- ================================================================
-- PRICE HISTORY + NEWS EVENTS (global, no RLS needed)
-- ================================================================
-- price_history: public market data, no firm_id
-- news_events: firm_id nullable (null = platform-wide), open read

alter table news_events enable row level security;
create policy "everyone_reads_news_events"
  on news_events for select
  using (
    firm_id is null
    or exists (
      select 1 from firm_members
      where user_id = auth.uid()
        and firm_id = news_events.firm_id
    )
  );
