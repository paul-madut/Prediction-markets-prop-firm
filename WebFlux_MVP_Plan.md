# WebFlux MVP Build Plan

**Author:** Paul Madut **Status:** Locked, ready for execution **Target:** Blueberry Funding pilot meeting in \~10 days **Build window:** 10 days, solo with Claude Code as parallel assistant

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)  
2. [Architecture Overview](#2-architecture-overview)  
3. [Data Model](#3-data-model)  
4. [Market Data Pipeline](#4-market-data-pipeline)  
5. [Order Engine](#5-order-engine)  
6. [Evaluation Engine](#6-evaluation-engine)  
7. [Anti-Cheat & Latency Arbitrage Prevention](#7-anti-cheat--latency-arbitrage-prevention)  
8. [Payments and Account Provisioning](#8-payments-and-account-provisioning)  
9. [Admin Dashboard](#9-admin-dashboard)  
10. [Observability](#10-observability)  
11. [Build Sequence](#11-build-sequence)  
12. [Branching Strategy & Claude Code Workflow](#12-branching-strategy--claude-code-workflow)  
13. [Blueberry Demo Prep](#13-blueberry-demo-prep)  
14. [Deferred Features (Post-MVP Roadmap)](#14-deferred-features-post-mvp-roadmap)  
15. [Risk Register](#15-risk-register)  
16. [Decision Log](#16-decision-log)

---

## 1\. Executive Summary

### What we're building

WebFlux is infrastructure for prop firms running prediction market challenges. Trader-facing UI, evaluation engine with breach detection, admin operational tools, payments via Stripe, and venue abstraction supporting Kalshi (primary, US-regulated) and Polymarket (secondary, non-US).

### MVP scope

The MVP is what's needed for the Blueberry Funding pilot conversation. It includes:

- Real Kalshi integration (WebSocket-based, real-time prices)  
- Polymarket integration (REST polling secondary)  
- Simulated trading: market orders, validated fills, atomic balance updates  
- Evaluation engine: static and trailing-EOD drawdown, daily floor, breach detection  
- Mark-to-floor breach close behavior  
- Stripe Checkout for challenge fees with webhook idempotency  
- Admin dashboard with manual actions, audit logging, payout queue  
- Multi-tenant via Supabase RLS  
- 2FA on admin/owner roles  
- Operational observability (Sentry, structured logging, health checks, uptime alerts)

### What's deferred

Limit orders, full anti-cheat detection queries (infrastructure ships, queries enabled in beta weeks 3+), automated payouts, Polymarket WebSocket parity, mobile-responsive admin, custom email templates, multi-firm onboarding flow, real-time push of eval state to traders.

### Build approach

Existing FE mock (\~70-80% complete) gets gap-filled to spec on days 1-2. Days 3-9 follow a branch-per-feature pattern: each backend feature lives in its own branch off main, where the FE has a mocked version of the same surface. When the BE branch merges, mocks are replaced with real wiring. This pattern enables Claude Code to work on FE polish and testing branches in parallel, while the founder owns critical-path correctness.

### Architectural pattern

Monorepo Next.js application. Single deployment, Supabase as backend (Postgres \+ Auth \+ RLS \+ Realtime), Upstash Redis for hot cache and queues, Railway for the long-running worker process (Kalshi WebSocket \+ evaluation tick loop \+ BullMQ consumer). Stripe for payments. No FE/BE split, no microservices, no infrastructure that doesn't earn its place at MVP scale.

---

## 2\. Architecture Overview

### The shape

┌─────────────────────────────────────────────────────────────┐

│  app.webflux.ca  (Next.js on Vercel)                        │

│  ─ Trader UI, admin UI, API routes, server actions          │

│  ─ Stripe webhook handler                                   │

│  ─ Subscribes to Supabase Realtime for price updates        │

└──────────────┬──────────────────────────────┬───────────────┘

               │                              │

               ▼                              ▼

   ┌────────────────────────┐    ┌────────────────────────┐

   │  Supabase              │    │  Upstash Redis         │

   │  ─ Postgres            │    │  ─ Hot price cache     │

   │  ─ Auth (with MFA)     │    │  ─ Rate limits         │

   │  ─ RLS policies        │    │  ─ BullMQ job queues   │

   │  ─ Realtime channels   │    │  ─ Heartbeat tracking  │

   └────────────────────────┘    └────────────────────────┘

               ▲                              ▲

               │                              │

   ┌───────────┴──────────────────────────────┴───────────────┐

   │  Worker process (Railway)                                │

   │  ─ Kalshi WebSocket client                               │

   │  ─ Polymarket REST poller                                │

   │  ─ Evaluation tick loop (1Hz per active account)         │

   │  ─ Writes to Supabase \+ Redis                            │

   │  ─ BullMQ consumer for deferred jobs                     │

   │  ─ /health endpoint for monitoring                       │

   └──────────────────────────────────────────────────────────┘

### Stack

| Layer | Choice | Why |
| :---- | :---- | :---- |
| App | Next.js 14 App Router on Vercel | Stateless, fast deploys, edge-capable |
| Auth | Supabase Auth with MFA TOTP | Integrated with RLS, free tier covers MVP |
| DB | Supabase Postgres | RLS for tenant scoping, branching for migrations |
| Cache/queue | Upstash Redis \+ BullMQ | Hot price cache, rate limits, durable job queue |
| Real-time | Supabase Realtime | Browser fan-out for price updates |
| Worker | Railway Node.js process | Persistent WS, eval loop, cron jobs |
| Payments | Stripe Checkout \+ webhooks | Industry standard, handles SCA/3DS |
| Errors | Sentry | Free tier sufficient |
| Logs | Axiom or BetterStack | Structured JSON ingestion |
| Uptime | BetterStack Uptime | 30-second monitoring of /health |

### Cost reality

At MVP scale (1 firm, \~50 traders):

- Vercel Pro: $0–$20/mo  
- Supabase Pro: $25/mo (free tier works initially; pay for production)  
- Upstash Redis: $0–$10/mo  
- Railway worker: \~$5–$10/mo  
- Stripe: 2.9% \+ $0.30 per transaction (no monthly fee)  
- Sentry, BetterStack: free tier  
- **Total: \~$30–$70/mo before first paying customer**

Compare to the original spec's $2-3K/mo idle infrastructure.

### Failure-mode boundaries

Three failure modes the architecture explicitly handles:

1. **Worker process death.** Railway restarts the worker; Kalshi WS reconnects on boot; eval loop resumes from current DB state; BullMQ jobs persist in Redis. Eval is idempotent; running the same tick twice produces the same result.  
     
2. **Kalshi WS silent failure.** Worker writes a "last message at" timestamp to Redis on every message. Vercel's `/api/health` reads it; if \>60s stale, returns 503\. BetterStack polls health and alerts.  
     
3. **Database goes down.** Vercel returns 503 from API routes. Worker pauses eval and retries. No partial writes possible because every mutation is in a single Postgres transaction.

### What's deliberately not here

No microservices, no Kubernetes, no Kafka or RabbitMQ, no ClickHouse/TimescaleDB/Elasticsearch/Neo4j, no HSM, no LaunchDarkly, no PagerDuty. Postgres handles everything for the foreseeable future. If specific scaling needs arise, address them then.

---

## 3\. Data Model

### Design principles

1. **Every table has `firm_id`.** Even tables that obviously belong to one firm (e.g., a trade row). Redundancy is intentional — uniform RLS policies, grep-able tenant scoping.  
2. **Money is integers (cents), never floats.** Use `BIGINT` for balances, `INT` for prices. Float arithmetic creates compounding rounding errors.  
3. **Mutations write history, not state.** Trades, orders, breach events — all append-only. Account balance is materialized for query speed but reconcilable from the trade ledger.  
4. **Soft deletes only.** No `DELETE` on financial records.  
5. **Every mutation has an audit row.** No exceptions for admin actions.

### The 14 tables

**Tenancy & users:**

- `firms` — one row per prop firm  
- `firm_members` — links auth.users to firms with role (trader, admin, owner)

**Challenge config:**

- `challenge_configs` — rule templates a firm offers  
- `challenge_phases` — phase-by-phase rules within a config

**Trading:**

- `accounts` — one trader's instance of a challenge  
- `orders` — submitted order intents  
- `trades` — actual fills  
- `positions` — derived: net exposure per market

**Risk & state:**

- `drawdown_snapshots` — periodic equity readings  
- `breach_events` — when an account breaches and why  
- `account_state_log` — every state transition  
- `cheat_signals` — flagged accounts for admin review (infrastructure ships in MVP, queries enabled in beta)

**Money & ops:**

- `payments` — Stripe Checkout sessions and fulfillment  
- `payouts` — funded trader payout requests

**Cross-cutting:**

- `audit_log` — every admin action and system state change  
- `news_events` — high-impact news periods with cooldowns  
- `price_history` — periodic price snapshots for detection backtesting

### Critical schema choices

**`firms` table:**

create table firms (

  id uuid primary key default gen\_random\_uuid(),

  name text not null,

  slug text unique not null,

  brand\_config jsonb not null default '{}'::jsonb,

  enabled\_venues text\[\] not null default array\['kalshi'\],

  status text not null default 'active' check (status in ('active','paused','disabled')),

  price\_history\_sample\_interval\_seconds int not null default 30,

  created\_at timestamptz not null default now()

);

`enabled_venues` controls which market data providers are active for this firm. Blueberry would default to `['kalshi']` (US-facing). FundingTraders might be `['polymarket']` or both.

**`accounts` table** (the most important):

create table accounts (

  id uuid primary key default gen\_random\_uuid(),

  firm\_id uuid not null references firms(id),

  user\_id uuid not null references auth.users(id),

  config\_id uuid not null references challenge\_configs(id),

  current\_phase\_id uuid not null references challenge\_phases(id),

  status text not null check (status in (

    'pending','active','passed\_phase','funded','breached','disabled'

  )),

  starting\_balance\_cents bigint not null,

  current\_balance\_cents bigint not null,

  highest\_eod\_balance\_cents bigint not null,

  highest\_eod\_equity\_cents bigint not null,

  drawdown\_floor\_cents bigint not null,

  daily\_loss\_floor\_cents bigint,

  day\_start\_equity\_cents bigint not null default 0,

  current\_trading\_day date,

  trading\_days\_count int not null default 0,

  first\_trade\_at timestamptz,

  breach\_at timestamptz,

  breach\_event\_id uuid,

  rule\_overrides jsonb not null default '{}'::jsonb,

  override\_reason text,

  override\_set\_by\_user\_id uuid,

  override\_set\_at timestamptz,

  override\_expires\_at timestamptz,

  last\_eod\_run\_at timestamptz,

  version int not null default 0,

  created\_at timestamptz not null default now()

);

create index idx\_accounts\_firm\_status on accounts(firm\_id, status);

create index idx\_accounts\_user\_firm on accounts(user\_id, firm\_id);

create index idx\_accounts\_with\_overrides on accounts(firm\_id) 

  where rule\_overrides \!= '{}'::jsonb;

Key fields:

- `current_balance_cents` is materialized for performance, reconciled nightly against `SUM(realized_pnl_cents) FROM trades`. Drift \= bug.  
- `highest_eod_balance_cents` and `highest_eod_equity_cents` are high-water marks; only update at EOD.  
- `version` is for optimistic locking against concurrent eval-loop and order-fill updates.  
- `rule_overrides` is jsonb for per-account flexibility without schema changes.

**`challenge_configs` schema choices:**

create table challenge\_configs (

  id uuid primary key default gen\_random\_uuid(),

  firm\_id uuid not null references firms(id),

  name text not null,

  account\_size\_cents bigint not null,

  challenge\_fee\_cents int not null,

  drawdown\_type text not null check (drawdown\_type in ('static','trailing\_eod')),

  trailing\_reference text not null default 'eod\_balance' check (

    trailing\_reference in ('eod\_balance', 'eod\_equity', 'eod\_max\_balance\_equity')

  ),

  total\_drawdown\_pct numeric(5,2) not null,

  daily\_drawdown\_pct numeric(5,2),

  min\_trading\_days int not null default 0,

  profit\_split\_pct numeric(5,2) not null,

  breach\_comparison text not null default 'lt' check (breach\_comparison in ('lt','lte')),

  breach\_close\_behavior text not null check (

    breach\_close\_behavior in ('mark\_to\_floor', 'close\_at\_market')

  ),

  refund\_disables\_account boolean not null default true,

  max\_positions\_per\_market int not null default 1,

  max\_positions\_total int not null default 5,

  max\_contracts\_per\_order int,

  is\_active boolean not null default true,

  created\_at timestamptz not null default now()

);

The configurability is intentional. Firms disagree on `<` vs `<=` for breach comparison; on whether trailing-EOD uses balance, equity, or max of both; on whether refunds disable accounts. Don't pick a default for these — force the firm to choose during config creation.

**`orders` and `trades`:**

create table orders (

  id uuid primary key default gen\_random\_uuid(),

  firm\_id uuid not null references firms(id),

  account\_id uuid not null references accounts(id),

  venue text not null check (venue in ('kalshi','polymarket')),

  external\_market\_id text not null,

  external\_market\_ticker text not null,

  side text not null check (side in ('yes','no')),

  size\_contracts int not null check (size\_contracts \> 0),

  order\_type text not null default 'market' check (order\_type in ('market','limit')),

  limit\_price\_cents int,

  time\_in\_force text default 'gtc' check (time\_in\_force in ('gtc','day','ioc','fok')),

  expires\_at timestamptz,

  idempotency\_key uuid not null,

  status text not null check (status in (

    'pending','filled','partially\_filled','rejected','cancelled'

  )),

  rejected\_reason text,

  submitted\_at timestamptz not null default now(),

  filled\_at timestamptz,

  unique (idempotency\_key)

);

create index idx\_orders\_venue\_market on orders(venue, external\_market\_id);

create table trades (

  id uuid primary key default gen\_random\_uuid(),

  firm\_id uuid not null references firms(id),

  account\_id uuid not null references accounts(id),

  order\_id uuid references orders(id),  \-- nullable for system-generated (breach close)

  venue text not null,

  external\_market\_id text not null,

  side text not null check (side in ('yes','no')),

  size\_contracts int not null,

  price\_cents int not null,

  fees\_cents int not null default 0,

  realized\_pnl\_cents bigint,

  is\_opening boolean not null,

  metadata jsonb,

  executed\_at timestamptz not null default now()

);

create index idx\_trades\_account\_executed on trades(account\_id, executed\_at);

`order_type`, `limit_price_cents`, `time_in_force`, `expires_at` exist on `orders` for v2 limit-order support. MVP rejects all non-market orders at validation.

`idempotency_key` is unique to prevent order replay.

`order_id` on `trades` is nullable so that system-generated trades (breach close, manual adjustment) can be inserted without a parent order.

**`positions`:**

create table positions (

  id uuid primary key default gen\_random\_uuid(),

  firm\_id uuid not null references firms(id),

  account\_id uuid not null references accounts(id),

  venue text not null,

  external\_market\_id text not null,

  side text not null check (side in ('yes','no')),

  net\_contracts int not null,

  avg\_entry\_price\_cents int not null,

  unrealized\_pnl\_cents bigint not null,

  last\_priced\_at timestamptz,

  unique (account\_id, venue, external\_market\_id, side)

);

The unique constraint is critical — exactly one position row per (account, venue, market, side). Opening trades update; closing trades zero out.

**`audit_log`:**

create table audit\_log (

  id uuid primary key default gen\_random\_uuid(),

  firm\_id uuid not null references firms(id),

  actor\_user\_id uuid,

  action text not null,

  entity\_type text not null,

  entity\_id uuid not null,

  before\_state jsonb,

  after\_state jsonb,

  metadata jsonb not null default '{}'::jsonb,

  created\_at timestamptz not null default now()

);

create index idx\_audit\_firm\_created on audit\_log(firm\_id, created\_at desc);

create index idx\_audit\_entity on audit\_log(entity\_type, entity\_id);

Every admin action and every system state change writes here. Defense in disputes.

### Multi-tenancy: RLS pattern

For trader-readable tables (own data only):

alter table accounts enable row level security;

create policy "traders see their own accounts"

on accounts for select

using (user\_id \= auth.uid());

create policy "admins see firm accounts"

on accounts for select

using (

  exists (

    select 1 from firm\_members

    where user\_id \= auth.uid()

      and firm\_id \= accounts.firm\_id

      and role in ('admin','owner')

  )

);

For write-restricted tables:

create policy "admins update accounts"

on accounts for update

using (

  exists (

    select 1 from firm\_members

    where user\_id \= auth.uid()

      and firm\_id \= accounts.firm\_id

      and role in ('admin','owner')

  )

);

The Railway worker bypasses RLS using the Supabase service role key. Worker code must manually scope by `firm_id` on every query. Treat the worker as the place where tenant safety lives in code, not policy.

### RLS test pattern (non-negotiable)

For every RLS policy, write a paired test:

test('trader from firm A cannot see firm B account', async () \=\> {

  const traderA \= await createUser({ firm: firmA, role: 'trader' });

  const accountB \= await createAccount({ firm: firmB, user: someUser });

  

  const supabase \= createClient(/\* with traderA's JWT \*/);

  const { data } \= await supabase

    .from('accounts')

    .select('\*')

    .eq('id', accountB.id);

  

  expect(data).toEqual(\[\]);  // RLS silently filters

});

Run in CI. A failing tenant test blocks deploy.

### Multi-tenancy deployment pattern

Shared database, RLS-isolated, single-tenant-ready architecture. For most customers, share infrastructure. If a regulated enterprise demands isolated DB, spin up a separate Supabase project and point a worker at it. Don't pre-build pattern 3 (per-tenant database) infrastructure.

---

## 4\. Market Data Pipeline

Venue abstraction with Kalshi as primary, Polymarket as secondary. Both providers conform to a common interface; downstream consumers (eval engine, order engine) are venue-agnostic.

### Provider interface

type MarketRef \= {

  venue: 'kalshi' | 'polymarket';

  externalId: string;

  ticker: string;

};

type PriceUpdate \= {

  ref: MarketRef;

  yesBid?: number;     // cents

  yesAsk?: number;

  noBid?: number;

  noAsk?: number;

  lastTrade?: number;

  volume?: number;

  receivedAt: number;  // ms timestamp

};

type ProviderHealth \= {

  status: 'connected' | 'connecting' | 'disconnected' | 'degraded';

  lastMessageMs: number | null;

  subscribedCount: number;

  errorRate: number;

};

interface MarketDataProvider {

  readonly venue: 'kalshi' | 'polymarket';

  start(): Promise\<void\>;

  stop(): Promise\<void\>;

  subscribe(externalIds: string\[\]): Promise\<void\>;

  unsubscribe(externalIds: string\[\]): Promise\<void\>;

  getCurrentPrice(externalId: string): Promise\<PriceUpdate | null\>;

  onPriceUpdate(handler: (update: PriceUpdate) \=\> void): () \=\> void;

  onHealthChange(handler: (health: ProviderHealth) \=\> void): () \=\> void;

  getHealth(): ProviderHealth;

}

### KalshiProvider

WebSocket-based at `wss://api.elections.kalshi.com/trade-api/ws/v2`.

**Authentication: RSA-PSS signed handshake.**

function signKalshiRequest(privateKeyPem: string, method: string, path: string) {

  const timestamp \= Date.now().toString();

  const message \= timestamp \+ method \+ path;

  

  const signer \= createSign('RSA-SHA256');

  signer.update(message);

  signer.end();

  

  return {

    timestamp,

    signature: signer.sign({

      key: privateKeyPem,

      padding: constants.RSA\_PKCS1\_PSS\_PADDING,

      saltLength: 32,

    }, 'base64'),

  };

}

Three things that bite: PSS padding (not PKCS1), timestamp drift (must be within 5s), private key handling (env vars only, never in logs).

**Connection lifecycle state machine:**

idle → connecting → authenticating → connected

                          ↓                ↓

                   disconnected  ←─────────┘

                          ↓

                   (exponential backoff with jitter, capped at 60s, then reconnect)

**Reconnect with exponential backoff and jitter:**

private scheduleReconnect() {

  this.state \= 'disconnected';

  const baseDelay \= Math.min(1000 \* Math.pow(2, this.reconnectAttempts), 60\_000);

  const jitter \= Math.random() \* 1000;

  const delay \= baseDelay \+ jitter;

  this.reconnectAttempts++;

  setTimeout(() \=\> this.connect(), delay);

}

On reconnect, re-subscribe to all markets. Subscriptions don't survive reconnect — Kalshi treats each connection as fresh.

**Subscribe only to markets in use.** Critical at scale. Subscribe set \= open positions ∪ recently-browsed markets (5-min TTL). Recompute when positions change or browsing changes.

**Heartbeat to Redis on every message:**

async function handleAnyKalshiMessage() {

  await redis.set('kalshi:heartbeat:last\_message\_ms', Date.now().toString(), { ex: 60 });

}

setInterval(async () \=\> {

  const lastMs \= parseInt(await redis.get('kalshi:heartbeat:last\_message\_ms') || '0');

  const ageMs \= Date.now() \- lastMs;

  if (ageMs \> 30\_000) {

    Sentry.captureMessage('kalshi-stale', 'error');

    wsClient.disconnect();  // force reconnect

  }

}, 5\_000);

**MVP simplification: skip sequence-number gap detection.** Use simpler "reconnect on close, full re-subscribe" pattern. Add gap detection in v2 if accuracy issues surface.

### PolymarketProvider (REST polling for MVP)

Polls Gamma API `/events` and per-market endpoints every 30 seconds. WebSocket via CLOB API is post-MVP.

Same interface, different implementation pattern. Normalizes Polymarket's decimal probabilities (0.0–1.0) to integer cents (1–99) internally. Downstream code never sees venue-specific formats.

### Hot price cache (Upstash Redis)

key: "price:\<venue\>:\<external\_id\>"

type: HASH

fields:

  yes\_bid:    int (cents)

  yes\_ask:    int

  no\_bid:     int

  no\_ask:     int

  last\_trade: int

  volume:     int

  updated\_at: timestamp\_ms

  venue:      string

TTL: 600 seconds

The eval loop and order engine read from Redis. Browsers read from Supabase Realtime fan-out (which the worker writes to on every price update).

### `/api/health` endpoint

export async function GET() {

  const kalshiHealth \= await getProviderHealth('kalshi');

  const polymarketHealth \= await getProviderHealth('polymarket');

  const dbHealthy \= await checkDbHealth();

  

  const allHealthy \= 

    kalshiHealth.status \=== 'connected' &&

    polymarketHealth.status \=== 'connected' &&

    dbHealthy;

  

  return Response.json({

    status: allHealthy ? 'ok' : 'degraded',

    venues: { kalshi: kalshiHealth, polymarket: polymarketHealth },

    db: dbHealthy ? 'ok' : 'unreachable',

  }, { status: allHealthy ? 200 : 503 });

}

External monitor (BetterStack Uptime, 30-second intervals) polls this and alerts on 503\.

### Per-firm venue configuration

`firms.enabled_venues` controls which providers are active for that firm's traders. Markets list query filters by `enabled_venues`. Order validation rejects orders for disabled venues.

### `price_history` table for detection backtesting

create table price\_history (

  id bigint generated always as identity primary key,

  venue text not null,

  external\_market\_id text not null,

  yes\_bid int,

  yes\_ask int,

  no\_bid int,

  no\_ask int,

  recorded\_at timestamptz not null default now()

);

create index idx\_price\_history\_market\_time on price\_history(venue, external\_market\_id, recorded\_at desc);

Worker writes a row every 30 seconds for any market with open positions or recent activity. Used for detection queries (when enabled in beta) and post-incident analysis.

### What to tell Blueberry

*"The Kalshi connection lives in a stateful worker with a defined state machine. Disconnects trigger reconnect with exponential backoff plus jitter, and full re-subscription on reconnect. We write a heartbeat to Redis on every message; if no messages for 30 seconds the worker force-reconnects, and 60 seconds triggers an external alert. Polymarket support is via REST polling currently, on the roadmap to upgrade to their CLOB WebSocket. Each firm's enabled venues are configurable, so US-facing customers like you only see Kalshi markets."*

---

## 5\. Order Engine

Simulated trading: orders are not sent to the venue. Fills are computed against real venue prices read from Redis. Every "trade" is a database record reflecting a hypothetical fill.

### Lifecycle

SUBMITTED → VALIDATING → FILLING → FILLED

                ↓

            REJECTED

No PENDING state for unfilled orders. All orders are market orders that fill immediately or reject. Limit orders are deferred (schema hooks present, validation rejects).

Total round-trip target: \<500ms from trader click to confirmation.

### Validation chain

In order, fail-fast:

1. Account in tradeable state (`active` or `funded`)  
2. Account belongs to requesting user  
3. Venue is enabled for the firm  
4. Market exists and is open  
5. Cached price is fresh (within 30 seconds)  
6. Order size within firm limits  
7. Account has sufficient cost basis for buy orders  
8. Position-stacking limits not exceeded  
9. Trader not in news cooldown

Each rejection inserts a row in `orders` with `status = 'rejected'` and `rejected_reason`. Audit trail when traders dispute.

### Fill computation

For binary markets:

- Buy YES at market: fill at current best YES ask  
- Buy NO at market: fill at current best NO ask  
- Sell YES (close long YES): fill at current best YES bid  
- Sell NO (close long NO): fill at current best NO bid

Cents-level precision. No rounding. Kalshi quotes in integer cents already; Polymarket prices are normalized in the provider.

**Position flip prohibition:** if a sell order would flip the position direction (e.g., closing 150 of a 100-contract position), reject with `order_too_large`. MVP simplification.

### The fill transaction

The heart of the engine. Atomic, idempotent, audited.

async function fillMarketOrder(orderId: string): Promise\<FillResult\> {

  return db.transaction(async (tx) \=\> {

    // 1\. Lock the account row

    const account \= await tx.queryOne(

      \`SELECT \* FROM accounts WHERE id \= $1 FOR UPDATE\`,

      \[order.account\_id\]

    );

    

    // 2\. Re-read market price inside the transaction

    const price \= await getCurrentPriceWithMaxStaleness(order.venue, order.external\_market\_id, 30\_000);

    if (\!price) {

      await tx.query(\`UPDATE orders SET status='rejected', rejected\_reason='stale\_price' WHERE id=$1\`, \[orderId\]);

      return { ok: false, reason: 'stale\_price' };

    }

    

    // 3\. Compute fill price

    const fillPrice \= computeFillPrice(price, order.side, order.action);

    

    // 4\. Re-validate with locked account state

    const validation \= await validateOrderInTx(tx, account, order, fillPrice);

    if (\!validation.ok) {

      await tx.query(\`UPDATE orders SET status='rejected', rejected\_reason=$1 WHERE id=$2\`, \[validation.reason, orderId\]);

      return { ok: false, reason: validation.reason };

    }

    

    // 5\. Insert trade

    const trade \= await tx.queryOne(\`INSERT INTO trades (...) VALUES (...) RETURNING \*\`, \[...\]);

    

    // 6\. Upsert position

    await tx.query(\`INSERT INTO positions (...) VALUES (...) 

                    ON CONFLICT (account\_id, venue, external\_market\_id, side)

                    DO UPDATE SET 

                      net\_contracts \= positions.net\_contracts \+ EXCLUDED.net\_contracts,

                      avg\_entry\_price\_cents \= ...\`, \[...\]);

    

    // 7\. Update account balance \+ version

    const newBalance \= account.current\_balance\_cents \+ positionDelta.balance\_change\_cents;

    await tx.query(\`UPDATE accounts SET current\_balance\_cents \= $1, version \= version \+ 1, 

                    first\_trade\_at \= COALESCE(first\_trade\_at, now()) WHERE id \= $2\`, \[newBalance, account.id\]);

    

    // 8\. Mark order filled

    await tx.query(\`UPDATE orders SET status='filled', filled\_at=now() WHERE id=$1\`, \[orderId\]);

    

    // 9\. Audit log

    await tx.query(\`INSERT INTO audit\_log (...) VALUES (...)\`, \[...\]);

    

    return { ok: true, trade };

  });

}

Every step matters:

1. `FOR UPDATE` exclusive lock prevents race with eval loop and other order fills  
2. Price re-read inside transaction (price you saw at validation might be slightly stale)  
3. Fill price uses explicit side semantics (ask for buys, bid for sells)  
4. Re-validate inside transaction (account state might have changed) 5-9. All atomic — partial failure rolls back everything

### Latency arbitrage prevention (three layers)

**Layer 1: Stale price rejection.** Validation rejects orders if cached price is \>30s old. Trading on stale data is worse than not trading.

**Layer 2: Transactional re-read.** Fill price comes from the price at execution moment, not at submission moment. Client cannot specify the fill price.

**Layer 3: Minimum-age cushion.** Orders submitted within 500ms of the latest price update wait for the next price tick. Configurable per firm (`min_order_age_ms`). Eliminates sub-millisecond arbitrage windows.

### Rate limiting

3 orders/sec burst, 5 orders/60s sustained per account, 100 orders/60s per firm. Upstash Ratelimit with sliding windows.

const accountBurst \= new Ratelimit({

  redis,

  limiter: Ratelimit.slidingWindow(3, '1 s'),

  prefix: 'order\_burst',

});

const accountSustained \= new Ratelimit({

  redis,

  limiter: Ratelimit.slidingWindow(5, '60 s'),

  prefix: 'order\_sustained',

});

// On every order submission:

const \[burst, sustained\] \= await Promise.all(\[

  accountBurst.limit(\`account:${accountId}\`),

  accountSustained.limit(\`account:${accountId}\`),

\]);

if (\!burst.success || \!sustained.success) {

  return new Response('rate limit exceeded', { status: 429 });

}

These limits feel unlimited to humans but block scripted bots.

### Order replay protection

`orders.idempotency_key` is unique. Client generates a UUID per order. Replays return the original order's status, not a new fill.

### Stuck order recovery

BullMQ cron every 30s finds orders in non-terminal states for \>60s and retries or marks `failed_system_error`. Rare in practice (transactions either commit or rollback).

---

## 6\. Evaluation Engine

The most domain-critical section. Computes equity, drawdown floor, and breach status for every active account, continuously.

### What we compute per tick

1. **Current equity** \= balance \+ sum(unrealized P\&L on open positions)  
2. **Drawdown floor** \= the equity threshold below which the account breaches  
3. **Daily floor** \= (where applicable) the threshold below which the account breaches the daily loss limit  
4. **Breach** if equity \< effective floor

`max(static_or_trailing_floor, daily_floor)` is the effective floor.

### Equity computation

function computeEquity(snapshot: AccountSnapshot): bigint {

  let equity \= snapshot.balanceCents;

  

  for (const pos of snapshot.positions) {

    if (pos.netContracts \=== 0\) continue;

    

    // Mark to closing price (conservative: best bid for longs)

    const markPrice \= pos.currentBidCents;

    const unrealizedPnl \= BigInt(

      (markPrice \- pos.avgEntryPriceCents) \* pos.netContracts

    );

    

    equity \+= unrealizedPnl;

  }

  

  return equity;

}

`bigint` everywhere money moves. JavaScript `number` loses precision above 2^53.

Stale price for an open position \= skip eval (better than evaluating against bad data). Trader UI uses last known price with "stale" indicator.

### Static drawdown floor

function computeStaticFloor(account, config): bigint {

  const totalDrawdownPct \= account.ruleOverrides.total\_drawdown\_pct ?? config.totalDrawdownPct;

  const startingBalance \= account.startingBalanceCents;

  const drawdownAmount \= (startingBalance \* BigInt(Math.round(totalDrawdownPct \* 100))) / 10000n;

  return startingBalance \- drawdownAmount;

}

Floor is fixed at challenge start. Doesn't move.

### Trailing-EOD drawdown floor

High-water mark variant. Floor moves up as the trader makes money, never moves down.

Three reference modes (configurable per firm):

- `eod_balance`: standard, high-water of EOD balance  
- `eod_equity`: high-water of EOD equity  
- `eod_max_balance_equity`: Blueberry's variant — high-water of `max(eod_balance, eod_equity)`

function computeTrailingFloor(account, config): bigint {

  let reference: bigint;

  switch (config.trailingReference) {

    case 'eod\_balance':

      reference \= account.highestEodBalanceCents;

      break;

    case 'eod\_equity':

      reference \= account.highestEodEquityCents;

      break;

    case 'eod\_max\_balance\_equity':

      reference \= bigintMax(account.highestEodBalanceCents, account.highestEodEquityCents);

      break;

  }

  

  const drawdownAmount \= (reference \* BigInt(Math.round(config.totalDrawdownPct \* 100))) / 10000n;

  return reference \- drawdownAmount;

}

The high-water marks update only at EOD (next layer). Intraday equity changes don't move the floor.

### Daily loss floor

function computeDailyFloor(account, config): bigint | null {

  if (\!config.dailyDrawdownPct) return null;

  

  const dailyPct \= account.ruleOverrides.daily\_drawdown\_pct ?? config.dailyDrawdownPct;

  const startOfDayEquity \= account.dayStartEquityCents;

  const lossAmount \= (startOfDayEquity \* BigInt(Math.round(dailyPct \* 100))) / 10000n;

  return startOfDayEquity \- lossAmount;

}

`day_start_equity_cents` is set at the start of each trading day. Updates only on the EOD boundary, not intraday.

### Trading day boundary

UTC date. 00:00:00 UTC starts; 00:01 UTC the EOD job runs.

Per-firm timezone configurability deferred to v2 (`trading_day_boundary_utc_offset_minutes` field exists but not exposed in admin UI for MVP).

Documented: "Trading day boundary is 00:00 UTC. Daily loss limits reset at this time. EOD calculations occur at 00:01 UTC."

### Breach comparison

`<` is the default. Exactly at floor is not a breach. Configurable per firm via `breach_comparison` (`'lt'` or `'lte'`).

### Eval tick loop

Runs at 1Hz per active account in the worker. Each tick:

1. Read account \+ config \+ open positions  
2. Read current prices for all open markets (skip if any stale)  
3. Compute equity  
4. Compute effective floor  
5. Check breach  
6. Write `drawdown_snapshots` row  
7. Update `accounts.drawdown_floor_cents` if changed (with optimistic locking via `version`)  
8. Trigger breach flow if needed (separate transaction, idempotent)

async function evalTickForAccount(accountId: string): Promise\<EvalResult\> {

  const account \= await db.queryOne('SELECT \* FROM accounts WHERE id \= $1', \[accountId\]);

  if (account.status \!== 'active' && account.status \!== 'funded') {

    return { skipped: true, reason: 'not\_tradeable\_state' };

  }

  

  const config \= await db.queryOne('SELECT \* FROM challenge\_configs WHERE id \= $1', \[account.config\_id\]);

  const positions \= await db.query(

    'SELECT \* FROM positions WHERE account\_id \= $1 AND net\_contracts \!= 0',

    \[accountId\]

  );

  

  // Read current prices for all open markets

  const positionsWithPrices \= \[\];

  for (const pos of positions) {

    const price \= await getCurrentPriceWithMaxStaleness(pos.venue, pos.external\_market\_id, 60\_000);

    if (\!price) return { skipped: true, reason: 'stale\_position\_price' };

    positionsWithPrices.push({ ...pos, currentBidCents: price.yesBid, currentAskCents: price.yesAsk });

  }

  

  const equity \= computeEquity({ balanceCents: account.current\_balance\_cents, positions: positionsWithPrices });

  const effectiveFloor \= computeEffectiveFloor(account, config);

  const isBreach \= config.breachComparison \=== 'lt' ? equity \< effectiveFloor : equity \<= effectiveFloor;

  

  // Write snapshot

  await db.query(\`INSERT INTO drawdown\_snapshots (...) VALUES (...)\`, \[...\]);

  

  // Update floor if changed (optimistic locking)

  if (effectiveFloor \!== account.drawdown\_floor\_cents) {

    const result \= await db.query(

      \`UPDATE accounts SET drawdown\_floor\_cents \= $1, version \= version \+ 1

       WHERE id \= $2 AND version \= $3\`,

      \[effectiveFloor, accountId, account.version\]

    );

    if (result.rowCount \=== 0\) return { skipped: true, reason: 'version\_conflict' };

  }

  

  // Trigger breach flow (separate transaction)

  if (isBreach) {

    await triggerBreach(accountId, equity, effectiveFloor);

  }

  

  return { ok: true, equity, floor: effectiveFloor, breached: isBreach };

}

Tick frequency: 1Hz per active account. At 50 traders, 50 evals/sec — trivial load. Mostly Redis reads.

### Breach detection with idempotency

Critical: running the same breach twice produces one breach\_event.

async function triggerBreach(accountId, equityAtBreach, floorAtBreach): Promise\<void\> {

  await db.transaction(async (tx) \=\> {

    const account \= await tx.queryOne('SELECT \* FROM accounts WHERE id \= $1 FOR UPDATE', \[accountId\]);

    

    // Idempotency: already breached?

    if (account.status \=== 'breached') return;

    

    // Re-validate breach inside transaction

    const positions \= await tx.query(/\* ... \*/);

    const currentEquity \= computeEquity(/\* ... \*/);

    const currentFloor \= computeEffectiveFloor(account, /\* ... \*/);

    if (currentEquity \>= currentFloor) return;  // recovered between detection and handling

    

    // Compute mark-to-floor close prices for all positions

    const positionsWithMark \= await markToFloor(positions, account, floorAtBreach);

    

    // Insert closing trades at mark prices

    for (const pos of positionsWithMark) {

      await tx.query(\`INSERT INTO trades (...) VALUES (...)\`, \[...\]);

      await tx.query(\`UPDATE positions SET net\_contracts \= 0 WHERE id \= $1\`, \[pos.id\]);

    }

    

    // Insert breach\_event

    const breachEvent \= await tx.queryOne(\`INSERT INTO breach\_events (...) VALUES (...) RETURNING \*\`, \[...\]);

    

    // Update account: balance \= floor, status \= breached

    await tx.query(\`UPDATE accounts SET 

                    current\_balance\_cents \= $1,

                    status \= 'breached', 

                    breach\_at \= now(), 

                    breach\_event\_id \= $2,

                    version \= version \+ 1

                    WHERE id \= $3\`, \[floorAtBreach, breachEvent.id, accountId\]);

    

    // Cancel open orders

    await tx.query(\`UPDATE orders SET status='cancelled', rejected\_reason='account\_breached' 

                    WHERE account\_id \= $1 AND status \= 'submitted'\`, \[accountId\]);

    

    // Audit \+ state log

    await tx.query(\`INSERT INTO audit\_log (...) VALUES (...)\`, \[...\]);

    await tx.query(\`INSERT INTO account\_state\_log (...) VALUES (...)\`, \[...\]);

  });

  

  // Out of transaction: queue notification

  await bullmq.add('breach.notify', { accountId });

}

Idempotency comes from checking `account.status === 'breached'` inside the locked transaction.

### Mark-to-floor breach close

Default close behavior. Configurable per firm (`mark_to_floor` or `close_at_market`).

The principle: at breach moment, the system has perfect information (equity \= X, contract violated). Mark each position to a price such that the *total* equity equals the floor exactly. Distribute the implied loss proportionally across open positions.

This produces consistency: breach moment \= floor, ledger \= floor, audit \= floor. No spread loss to the trader after breach. Cleaner audit, fewer disputes.

### EOD job

Runs at 00:01 UTC daily for every active account.

1. Compute final equity for the day  
2. Update `highest_eod_balance_cents` if current balance \> stored  
3. Update `highest_eod_equity_cents` if current equity \> stored  
4. Set `day_start_equity_cents` \= current equity  
5. Increment `trading_days_count` if any trades happened today  
6. Recompute `drawdown_floor_cents`

Idempotent via `last_eod_run_at` column. Runs in a single Postgres transaction per account.

### Phase transition logic

Runs after every trade fill (or on its own cron). When trader hits profit target \+ min trading days met:

- If a next phase exists: move to it, reset starting\_balance and high-water marks for the new phase  
- If no next phase: status → `funded`

State log \+ audit on every transition.

### Critical property tests (write before shipping)

The first 5 are non-negotiable. Without these, you can't ship.

1. Static drawdown floor never moves regardless of intraday equity changes  
2. Trailing EOD floor monotonically non-decreasing  
3. Daily floor resets at exactly 00:00 UTC, not before, not after  
4. Breach detection is idempotent — running twice produces one breach\_event row  
5. Equity \= balance \+ sum(unrealized\_pnl) at every moment

The next 10 are real-world scenario tests, write progressively as time allows.

---

## 7\. Anti-Cheat & Latency Arbitrage Prevention

Two layers: enforcement (hard rules at order time) and detection (pattern recognition that surfaces signals to admin).

### Architectural pattern

Order submission → Enforcement (hard rules) → Order fills → Trade row written

                                                                  ↓

                                                         Detection jobs (async, cron)

                                                                  ↓

                                                            Admin review queue

Enforcement is fast and certain (rejects orders). Detection is statistical and probabilistic (surfaces signals for human review, never auto-actions).

### Enforcement (active in MVP)

**Stale price rejection.** Validation rejects if cached price is \>30s old.

**Position concentration limits.** `max_positions_per_market` and `max_positions_total` per firm config. Enforced in order validation.

**News event cooldowns.** `news_events` table; admin populates manually. Order validation rejects orders during cooldown windows.

create table news\_events (

  id uuid primary key default gen\_random\_uuid(),

  firm\_id uuid,                          \-- nullable; null applies to all firms

  market\_filter text,                     \-- nullable; ticker pattern

  event\_name text not null,

  starts\_at timestamptz not null,

  ends\_at timestamptz not null,

  cooldown\_minutes int not null default 2,

  created\_at timestamptz not null default now()

);

### Detection infrastructure (ships in MVP, queries enabled in beta)

`cheat_signals` table exists from day 1\. `price_history` table populates. BullMQ cron jobs registered with stub handlers. Admin review UI exists with empty state.

The detection queries are deferred to beta weeks 3-5 when:

- 2-3 weeks of real trader data exist  
- Threshold tuning can happen against observed distributions  
- Admin team is trained on signal review workflow

Rollout sequence post-MVP:

- Week 3: Win-rate anomaly (simplest, lowest risk)  
- Week 4: Copy-trade detection  
- Week 5: Latency-arb and trade-timing pattern  
- Week 6+: Volume anomaly and any custom firm-specific detections

### `cheat_signals` schema

create table cheat\_signals (

  id uuid primary key default gen\_random\_uuid(),

  firm\_id uuid not null references firms(id),

  account\_id uuid not null references accounts(id),

  signal\_type text not null check (signal\_type in (

    'latency\_arb', 'copy\_trade', 'win\_rate\_anomaly', 

    'volume\_anomaly', 'position\_concentration', 'news\_violation',

    'trade\_timing\_pattern'

  )),

  severity text not null check (severity in ('low', 'medium', 'high')),

  score numeric,

  evidence jsonb not null default '{}'::jsonb,

  status text not null default 'pending' check (status in (

    'pending', 'reviewed\_legitimate', 'reviewed\_violating', 'auto\_actioned'

  )),

  reviewed\_by\_user\_id uuid,

  reviewed\_at timestamptz,

  reviewer\_notes text,

  detected\_at timestamptz not null default now()

);

`evidence` is jsonb — different signal types have different shapes. `status` flow: `pending → reviewed_legitimate` (no action) or `reviewed_violating` (admin took action). Every transition writes to audit\_log.

### Detection queries (deferred to beta)

Five queries to implement, each as a cron job:

1. **Latency arbitrage** (hourly): for each account, compute average "implied edge" — fill price vs post-fill 5-30s avg price. Systematic positive edge \= flag.  
2. **Copy-trade detection** (nightly): for pairs of accounts, count trades on same market+side within 60s window. \>30% similarity \= flag (unless same user).  
3. **Win-rate anomaly** (daily): rolling 50-trade win rate \>75% \= flag.  
4. **Trade-timing pattern** (weekly): coefficient of variation in inter-trade gaps. Low CV (\~bot-like) \= flag.  
5. **Volume anomaly** (weekly): this week's trade count vs 4-week historical avg. \>5x spike \= flag.

Detailed SQL for each query is in the build artifact. Threshold tuning happens during beta with admin review feedback.

### Admin review flow

Admin clicks signal → sees: score, threshold, evidence (sample trades, comparison data, charts), action buttons (Mark Legitimate, Mark Violating \+ Action). Every decision requires reviewer notes; goes to audit\_log. This is the wedge against the "banned for toxic trading with no explanation" pattern.

### What to tell Blueberry

*"Anti-cheat is built in two layers. Hard enforcement at order time — staleness checks, position limits, news cooldowns — is in place from day one. Statistical detection — copy-trade similarity, latency-arb edge analysis, win-rate anomalies — has the infrastructure deployed and the data being collected, but the detection rules will be tuned during the first month of beta against your actual trader population. I'd rather ship clean enforcement plus baseline data collection than ship aggressive detection that fires false positives on traders we don't yet understand. Detection rules will be enabled one at a time during weeks 3-5 of beta, with you reviewing signals together to validate before each is auto-running."*

---

## 8\. Payments and Account Provisioning

Stripe Checkout for one-time challenge fees. Webhook-based provisioning with idempotency. Manual payout processing for MVP.

### Payment flow

Trader clicks "Start Challenge"

      ↓

POST /api/checkout creates payments row (status='pending') and Stripe session

      ↓

Trader redirected to checkout.stripe.com, pays

      ↓

Stripe redirects to /payment/success

      ↓

Stripe sends webhook to /api/webhooks/stripe

      ↓

Webhook handler verifies signature, checks idempotency, provisions account in transaction

      ↓

Trader's success page polls /api/payments/:id, sees status='paid', redirects to dashboard

### Stripe Checkout creation

const session \= await stripe.checkout.sessions.create({

  mode: 'payment',

  payment\_method\_types: \['card'\],

  line\_items: \[{

    price\_data: {

      currency: 'usd',

      product\_data: { name: config.name },

      unit\_amount: config.challenge\_fee\_cents,

    },

    quantity: 1,

  }\],

  success\_url: \`${APP\_URL}/payment/success?payment\_id=${payment.id}\`,

  cancel\_url: \`${APP\_URL}/payment/cancelled?payment\_id=${payment.id}\`,

  customer\_email: userEmail,

  metadata: {

    payment\_id: payment.id,

    firm\_id, user\_id, config\_id,

  },

});

`metadata.payment_id` is critical — it's how the webhook handler finds the corresponding DB row.

### Webhook idempotency

export async function POST(req: Request) {

  const body \= await req.text();

  const signature \= req.headers.get('stripe-signature');

  

  // 1\. Verify signature

  let event;

  try {

    event \= stripe.webhooks.constructEvent(body, signature, STRIPE\_WEBHOOK\_SECRET);

  } catch (err) {

    return new Response('invalid signature', { status: 400 });

  }

  

  // 2\. Idempotency check — has this event already been processed?

  const existing \= await db.queryOne(

    'SELECT id FROM payments WHERE stripe\_event\_id \= $1',

    \[event.id\]

  );

  if (existing) return new Response('already processed', { status: 200 });

  

  // 3\. Route by event type

  try {

    switch (event.type) {

      case 'checkout.session.completed':

        await handleCheckoutCompleted(event);

        break;

      case 'charge.refunded':

        await handleRefund(event);

        break;

      case 'charge.dispute.created':

        await handleDispute(event);

        break;

      default:

        return new Response('event type not handled', { status: 200 });

    }

  } catch (err) {

    Sentry.captureException(err, { extra: { event\_id: event.id, event\_type: event.type } });

    return new Response('processing error', { status: 500 });

  }

  

  return new Response('ok', { status: 200 });

}

Three patterns that protect against retry storms:

- Verify signature first (rejects fake events)  
- Idempotency check via unique constraint on `stripe_event_id`  
- Return 200 on already-processed, 500 only on actual errors

### Provisioning transaction

async function handleCheckoutCompleted(event) {

  const session \= event.data.object;

  const paymentId \= session.metadata?.payment\_id;

  

  await db.transaction(async (tx) \=\> {

    const payment \= await tx.queryOne(

      'SELECT \* FROM payments WHERE id \= $1 FOR UPDATE',

      \[paymentId\]

    );

    

    if (payment.status \=== 'paid') return;  // already processed

    

    const account \= await provisionAccount(tx, payment);

    

    await tx.query(\`UPDATE payments SET 

                    status \= 'paid',

                    stripe\_event\_id \= $1,

                    account\_id \= $2,

                    paid\_at \= now()

                    WHERE id \= $3\`, \[event.id, account.id, paymentId\]);

    

    await tx.query(\`INSERT INTO audit\_log (...) VALUES (...)\`, \[...\]);

  });

  

  await bullmq.add('email.welcome', { paymentId });

}

### Recovery cron for stuck payments

Every 5 minutes. Finds payments pending \>10 minutes, queries Stripe directly, provisions if missed webhook.

### Refund and dispute handling

**Refund default: account is disabled.** The challenge fee is risk capital, not a service fee. A trader who pulled their risk capital can't keep trading. Configurable per firm via `refund_disables_account` (default `true`).

**Dispute always disables.** Charges claimed as unauthorized; can't let the account keep trading while you're proving the original charge was legitimate. Open positions stay until firm reviews.

### Payout request flow

Manual processing for MVP.

1. Trader requests payout (amount, method, destination)  
2. Backend validates: account is `funded`, amount ≤ profit, no recent breach  
3. Compute split (e.g., 80% to trader)  
4. Deduct from account balance immediately (prevents double-spending)  
5. Status `requested` → admin review  
6. Admin approves → status `approved`  
7. Admin processes externally (wire, RiseWorks, crypto)  
8. Admin marks `paid` with external reference

### What to tell Blueberry

*"Stripe Checkout for challenge fees. Webhook-based provisioning with idempotency on the event ID — duplicate webhooks can't double-provision accounts. There's a recovery job that catches any payments where the webhook didn't arrive within 10 minutes and reconciles directly with Stripe. Refunds and disputes disable the account by default — the challenge fee is risk capital. Payout requests come into a queue with profit-split computation at request time. Actual payout processing — wire, RiseWorks, crypto, whatever your existing flow is — stays in your hands."*

---

## 9\. Admin Dashboard

The screen Blueberry's team will live in 4 hours/day. Operator UX matters more than trader UX.

### Information architecture

/admin                                    Dashboard home

/admin/traders                            All traders, filterable

/admin/traders/\[id\]                       Trader detail

/admin/accounts/\[id\]                      Account detail

/admin/payouts                            Payout queue

/admin/payouts/\[id\]                       Payout detail \+ actions

/admin/signals                            Cheat signals queue (empty state in MVP)

/admin/signals/\[id\]                       Signal detail (post-beta)

/admin/configs                            Challenge configs

/admin/configs/new                        Create new config

/admin/configs/\[id\]/edit                  Edit config

/admin/news                               News events

/admin/audit                              Audit log search

/admin/firm                               Firm settings

### Dashboard home

Top: alerts row (Kalshi staleness, stuck payments, pending signals). Each is clickable, navigates to relevant screen.

Numbers row: active accounts, currently trading, within 2% of DD floor (deep links to filtered list), awaiting payout.

Bottom: action queues — payout requests, cheat signals (post-beta), recent breaches.

Freshness indicator in corner of every admin screen showing data age.

### Account detail

Header: status, phase, days remaining, balance vs starting, floor \+ current DD distance, daily floor.

Tabs: Overview (equity curve, KPIs), Positions, Trades, Drawdown, Activity, Audit.

Action menu top right: View as trader, Freeze/Unfreeze, Reset, Apply rule override, Force breach, Force close positions, Refund payment, Reach out to trader.

Every action requires a reason; goes to audit\_log.

### Payout review

Per-payout screen shows all info needed to decide:

- Amount: requested, profit-split-applied, fees, net  
- Account info: status, balance, profit, days since last payout  
- Risk indicators: closest to floor recently, current distance from floor  
- Cheat signals history  
- Banking info

Approve / Reject / Request More Info buttons. Approve creates `approved` status, admin processes externally, marks `paid` with external reference.

### Audit log search

Filters: entity type, entity ID, action, actor, date range.

Detail view shows full jsonb diff (`before_state`, `after_state`, `metadata`).

This is your dispute defense. Every admin action and state change is here.

### Challenge config builder

The form firms use to create new challenge types. Includes:

- Name, account size, fee  
- Phases with profit targets and min trading days  
- Drawdown type (static/trailing-EOD), trailing reference, total/daily DD percentages  
- Breach comparison (`<` or `<=`), breach close behavior (mark-to-floor or close-at-market)  
- Position limits (per-market, total, max contracts per order)  
- Profit split percentage  
- Refund disables account toggle

Tooltip explanations on every field. Preview shows what the config produces.

### 2FA enforcement

Required on admin/owner roles. Supabase Auth MFA TOTP. Middleware checks `aal` (assurance level) on every `/admin` route; redirects to enrollment or challenge as needed.

### Professional patterns (basic ones in MVP)

- Density (more info per screen than trader UI)  
- Keyboard shortcuts (j/k, enter, esc, cmd+k)  
- URL state for filters  
- Loading skeletons (not spinners)  
- Optimistic UI with rollback  
- Both relative and absolute timestamps  
- Copy-pasteable IDs  
- Empty states

Deferred to v2: recent activity sidebar, full bulk actions, search-everywhere.

### What to tell Blueberry

*"This is where your team lives. Dashboard surfaces alerts and queues at a glance — the things that need attention, sorted by urgency. Each row clicks through to the action. Account detail consolidates a trader's complete history — positions, trades, drawdown, every state change, every admin action. Every action requires a reason that goes to the audit log, so disputes have evidence. Manual actions are one click from where the issue surfaces. Cheat signals — when enabled — show the evidence inline so the decision is informed, not blind. The challenge config builder lets your owner team create new challenge types without engineering involvement."*

---

## 10\. Observability

Standard tooling, integrated from day 1\.

### Sentry for errors

Sentry.init({

  dsn: process.env.SENTRY\_DSN,

  environment: process.env.NODE\_ENV,

  release: process.env.VERCEL\_GIT\_COMMIT\_SHA,

  tracesSampleRate: 0.1,

  beforeSend(event) {

    delete event.request?.headers?.\['authorization'\];

    delete event.request?.headers?.\['cookie'\];

    return event;

  },

});

Tag every error with `firm_id` and `user_id` where available. Search by these to find a specific customer's issues fast.

### Pino for structured logging

logger.info({

  firm\_id, user\_id, account\_id,

  action: 'order.fill',

  trade\_id, fill\_price\_cents, size,

}, 'order filled');

Send to Axiom or BetterStack (free tier covers MVP). Request ID middleware propagates a UUID through every request lifecycle.

### Health endpoint \+ external monitoring

`/api/health` checks DB, Redis, Kalshi heartbeat, Polymarket heartbeat. Returns 503 on any failure.

BetterStack Uptime polls every 30 seconds. Two monitors: `/api/health` (backend integrity) and `/markets` (front-end reachability). Alerts to phone via SMS.

### Business metrics

Simple `/admin/metrics` page showing per-firm:

- Daily active accounts  
- New challenge purchases per day  
- Trades per day  
- Breaches per day  
- Payout requests  
- Cheat signals (post-beta)

SQL queries against Postgres. No analytics platform needed at MVP scale.

### On-call response SLA (solo founder)

- 30-min response on critical alerts during waking hours  
- Best-effort overnight  
- 2-hour response on degraded states  
- Next-business-day on warnings

Document this in the runbook. Honest framing for Blueberry beats fake "always on" claims.

### What to tell Blueberry

*"Health monitoring runs at 30-second intervals against an integrated check. Errors flow to Sentry tagged with firm\_id and user\_id. All operations are logged with request IDs for end-to-end tracing. Critical alerts page me within a minute. The standard response: under 30 minutes during the day, best-effort overnight."*

---

## 11\. Build Sequence

### Capacity

10 days × 7 hours focused \= **70 effective hours** (after sleep, meals, debugging detours).

Phase split:

- **Days 1-2:** Fill FE mock gaps \+ foundation on `main`  
- **Days 3-9:** Branch-per-feature cycles, real backend behind existing UI  
- **Day 10:** Demo prep \+ buffer

### Day 1 — Foundation \+ admin mock gap (8 hrs)

Goal: Skeleton runs. Auth works. Admin UI exists in mocked form.

- (3 hrs) Foundation in parallel with UI work: Supabase project, schema migration (all 14 tables \+ additions), RLS policies on critical tables, Sentry \+ pino logging, basic `/api/health`, deploy pipeline.  
- (5 hrs) Admin dashboard mock — biggest gap. Use shadcn/ui templates. Build the 6 admin screens with placeholder data: dashboard home, traders list, account detail, payouts queue, audit log, configs. Look complete, not real.

### Day 2 — Mock completion \+ adversarial data (8 hrs)

Goal: Complete-looking product on main. Safety net for demo.

- (3 hrs) Remaining mock gaps: news events page, signals queue (empty state), firm settings, 2FA enrollment placeholder.  
- (2 hrs) Adversarial mock data: edge cases, weird states, partial data, errors.  
- (2 hrs) Loading/error/empty states across the app.  
- (1 hr) Tag as `v0-mock-complete` and merge to `main`. This is your demo fallback.

### Day 3 — `be/kalshi-real` (8 hrs)

Branch off main. Build the real Kalshi provider.

- (1 hr) Provider abstraction interface, orchestrator skeleton.  
- (3 hrs) KalshiProvider: WebSocket auth (RSA-PSS), state machine, exponential backoff with jitter, message handlers.  
- (2 hrs) Subscription manager, dynamic subscriptions based on positions \+ browsing.  
- (1 hr) Heartbeat to Redis. 30s self-heal, 60s external alert.  
- (1 hr) Hot price cache writes, test against Kalshi demo, verify reconnection.

Merge to main: trader UI now shows real Kalshi prices.

### Day 4 — `be/order-engine-real` (8 hrs)

- (2 hrs) Order submission API: validation chain, idempotency keys, rate limiting.  
- (3 hrs) Fill transaction: FOR UPDATE lock, re-read price, validate again, insert trade, upsert position, update balance, mark order filled, audit log. All atomic.  
- (1 hr) 500ms minimum-age cushion.  
- (1 hr) Test end-to-end: order placed → filled → position visible → balance correct.  
- (1 hr) Limit-order schema columns added but rejected at validation (`feature_not_available`).

Merge to main: real order flow.

### Day 5 — `be/eval-engine-real` (9 hrs — long day)

Most domain-critical day. Don't push to day 6 until this is correct.

- (2 hrs) Eval tick handler: read account, compute equity (bigint), compute floor (static or trailing-EOD), write snapshot, optimistic-locking floor update.  
- (3 hrs) Breach detection with idempotency. Mark-to-floor close logic — compute closing trade prices such that final equity \= floor exactly.  
- (1 hr) Phase transition logic.  
- (2 hrs) EOD cron at 00:01 UTC. Updates high-water marks, sets day\_start\_equity, recomputes floor. Idempotent via `last_eod_run_at`.  
- (1 hr) Critical 5 property tests.

Merge to main: real eval engine. Manually induce breach, verify mark-to-floor.

### Day 6 — `be/payments-real` (7 hrs)

- (2 hrs) Stripe Checkout integration: API route, payment row pattern.  
- (3 hrs) Webhook handler: signature verification, idempotency, provisioning transaction.  
- (1 hr) Recovery cron for stuck payments.  
- (1 hr) Refund/dispute handlers (account disables on refund by default).

Merge to main: real payment flow.

### Day 7 — `be/admin-actions-real` \+ `be/audit-real` (8 hrs)

- (2 hrs) Manual actions infrastructure: action menu pattern, modal with required reason field, audit log on every action.  
- (2 hrs) Three core actions: freeze/unfreeze, apply rule override, force breach. Each goes through firm-scoped repository, locks account row, writes audit\_log \+ state\_log.  
- (2 hrs) Audit log search page with real DB queries.  
- (1 hr) 2FA enforcement middleware (Supabase MFA TOTP).  
- (1 hr) Reset account, force close positions, refund payment actions.

Merge to main: admin can run real operations.

### Day 8 — `be/payouts-real` \+ `be/polymarket-real` (8 hrs)

- (2 hrs) Payout request flow: validation, balance deduction, audit.  
- (2 hrs) Payout review: approve, reject, mark-paid actions.  
- (2 hrs) PolymarketProvider via Gamma REST polling (30s cadence).  
- (1 hr) Email templates: welcome, breach, payout-paid. Resend integration.  
- (1 hr) News events admin page with cooldown enforcement.

Merge to main: full feature parity with mock.

### Day 9 — Bug bash \+ integration testing (8 hrs)

- (2 hrs) End-to-end as trader: every screen, every action.  
- (2 hrs) End-to-end as admin: every screen, every action.  
- (2 hrs) Fix worst bugs.  
- (1 hr) Stress test: simulate 50 concurrent traders.  
- (1 hr) Reconciliation check on 5 random accounts.

### Day 10 — Demo prep \+ buffer (6 hrs)

- (1 hr) Configure Blueberry demo data: their challenge configs (PRO6, PRO10, Instant Funded), demo accounts in various states.  
- (2 hrs) Two demo dry-runs. Time them.  
- (1 hr) Write the runbook.  
- (2 hrs) Buffer. Do not fill with new features. Polish or rest.

---

## 12\. Branching Strategy & Claude Code Workflow

### Branch model

- `main` is always deployable  
- Feature branches named `be/<feature>` for backend work, `fe/<feature>` for frontend polish  
- Merge daily to main; long-lived branches accumulate conflicts  
- Each branch has a clear acceptance criteria written before work starts

### Tasks suitable for Claude Code

Bounded, spec-driven, test-checkable:

- Mock gap-filling (admin dashboard surfaces, signals queue UI, firm settings)  
- Loading/error/empty state polish  
- Email template design (welcome, breach, payout)  
- Test scaffolding (Vitest tests for repositories, API routes)  
- News events admin CRUD  
- Audit log search UI

### Tasks NOT suitable for Claude Code

Ambiguous, math-heavy, correctness-critical:

- Eval engine (drawdown math, breach detection)  
- Order fill transaction with concurrency  
- Stripe webhook idempotency  
- RLS policies and tenant scoping  
- Kalshi WebSocket integration

### Claude Code task template

When dispatching to Claude Code, include:

\#\# Task

Implement the trader list page at app/(admin)/traders/page.tsx.

\#\# Context

\- This page exists currently with mocked data from src/lib/mocks/admin.ts

\- The real backend exists in src/domains/accounts/accounts.repository.ts

\- Replace mock import with real repository call

\#\# Acceptance criteria

\- Page fetches from /api/admin/traders and displays the table per spec

\- Filters by status (active, breached, funded), phase, DD proximity

\- Each row links to /admin/traders/\[id\]

\- Loading skeleton during fetch

\- Empty state when no traders

\- Error state on fetch failure

\- Component tests in \_\_tests\_\_/

\#\# Files to modify

\- app/(admin)/traders/page.tsx (replace mock import)

\- app/api/admin/traders/route.ts (new — uses accountsRepository)

\#\# Don't touch

\- src/domains/accounts/\* (you don't need to modify the repository)

\- RLS policies

Spec-first, output-second.

### PR review pattern

1 hour/day budget for reviewing Claude Code's PRs. Look for:

- Tests that test the right thing (not just "doesn't crash")  
- Edge cases handled (null user, empty data, error states)  
- Pattern consistency with existing codebase  
- No unnecessary refactoring outside scope

### Daily flow

9:00am — Review yesterday's Claude Code PRs (30 min)

9:30am — Set up today's Claude Code task with spec

10:00am — Work on your branch (BE critical path)

12:00pm — Lunch

1:00pm — Continue your branch

4:00pm — Check Claude Code progress, course-correct if needed

6:00pm — Integration: merge ready branches to main

7:00pm — Set up tomorrow's task spec

---

## 13\. Blueberry Demo Prep

### Pre-meeting

Already covered in detail in this conversation. Key points:

**Position:** WebFlux is infrastructure for prediction market prop firms. Built specifically for the operator-grade workflow Blueberry's team needs. Multi-tenant, RLS-isolated, audit-trail-defensible.

**Brand wedge:** Blueberry's Trustpilot complaints are about "toxic trading" bans without evidence. The architecture answer: every action has audit log evidence \+ reviewer \+ reasoning.

**Technical credibility:** the architecture story (separated worker, atomic transactions, mark-to-floor breach close, idempotent webhooks, deferred detection with infrastructure-ready) demonstrates engineering judgment.

### Demo flow (\~10 min)

1. **Trader dashboard** — clean look, account header, KPIs, equity curve. "Same UX bar your traders are used to from forex platforms."  
2. **Markets browser** — Kalshi-native feel. Real data flowing.  
3. **Place a trade** — show the fill. "Real Kalshi market data, not mocked."  
4. **Portfolio \+ analytics** — proof of working state.  
5. **New challenge purchase** — Stripe-powered. "Configurable to mirror your existing rule structures."  
6. **Switch to admin view** — dashboard home, alerts, queues.  
7. **Account detail** — deep view, audit log, manual actions menu.  
8. **Stop. Ask: "What's your reaction?"**

### Tricky questions and answers

**"How does this scale?"** Per the Section 2 architecture answer: stateless app, managed services, Postgres handles 5K accounts before bottleneck shows up.

**"What about latency arbitrage?"** Three layers: 30s staleness rejection, transactional re-read, 500ms minimum-age cushion. Detection statistically post-beta.

**"What happens during Kalshi outage?"** Orders reject with `stale_price`. Eval pauses (can't compute equity safely). External monitor alerts within 60s. Auto-recovery on reconnect.

**"How do you handle drawdown calculation?"** Static, trailing-EOD with three reference modes (your specific `eod_max_balance_equity` is supported). Eval at 1Hz per account. Breach idempotent.

**"What happens to positions on breach?"** Mark-to-floor by default — final balance equals floor exactly. No spread loss to trader. Cleaner audit, fewer disputes than close-at-market. Configurable.

**"Multi-tenancy — how isolated is data?"** Postgres RLS at the database level. Every table has firm\_id. Even with an application bug, the database refuses cross-firm reads. Worker bypasses RLS but is the only code path doing so, audited.

**"What if I need a fully isolated database?"** I can spin up a dedicated Supabase project for you specifically. The architecture is single-tenant-ready. But shared-DB with RLS is what I'd recommend unless you have a specific compliance reason.

### Fallback positions

If asked about features not built:

- **Limit orders:** "Schema and API hooks are present. Implementing the matching engine is first on the v2 roadmap. For prediction market prop traders, market orders cover \~80% of typical trader behavior."  
- **Mobile admin:** "Desktop-only for MVP. Mobile-responsive trader UI exists; admin is desktop-only because admins live at desks."  
- **Advanced anti-cheat:** "Infrastructure deployed; queries enabled in beta weeks 3-5 with you reviewing signals together for threshold tuning."

### What to ask them

Discovery questions for the call:

1. What % of your trader base do you think would actually want a Kalshi-based challenge versus stay on forex?  
2. Walk me through the first 90 days if you launched a prediction-market vertical tomorrow.  
3. What's the part of running your existing challenges that eats the most ops time?  
4. How did you make build-vs-buy decisions for your forex stack?  
5. If you were going to do prediction markets, what's the bar a partner would need to clear?

### Closing the call

*"Look — I'm not going to pitch you on a contract today. What I'd like is this: in 30 days, I come back with \[a specific thing tied to what they engaged with\]. If that's interesting, we talk pilot. If not, I'm out of your hair. Fair?"*

### Do NOT do in this meeting

- Quote pricing or equity numbers  
- Volunteer "I don't have a backend team" — they don't need to know  
- Mention timeline pressure  
- Skip the demo to talk  
- Promise features that don't exist  
- Take a verbal commitment as a real one  
- Sign anything

### After the meeting

Within 4 hours:

- Write down everything they said  
- Score: pull (1-5), pain cluster, top objection, willingness to pilot  
- Call your debrief person

Within 24 hours:

- Send follow-up email referencing 1-2 specific things they said  
- Attach a one-page leave-behind  
- Propose specific next step

---

## 14\. Deferred Features (Post-MVP Roadmap)

Tell Blueberry these are on the roadmap. Don't apologize for not having them — frame as scope discipline.

### Beta weeks 1-3 (post-launch)

- Threshold tuning on enforcement rules with real trader data  
- Cheat detection: win-rate anomaly detection enabled  
- Welcome email template refinement based on actual trader response

### Beta weeks 3-5

- Cheat detection: copy-trade similarity, latency-arb edge analysis enabled  
- Polymarket WebSocket upgrade (CLOB API)  
- Per-firm timezone configuration for trading day boundary

### Beta weeks 5-8

- Cheat detection: trade-timing pattern, volume anomaly enabled  
- Limit order matching engine  
- IOC/FOK time-in-force support  
- Stop-loss orders  
- Automated payouts via Stripe Connect or RiseWorks API

### Beta weeks 8+

- Mobile-responsive admin dashboard  
- White-label custom domain support  
- API access for firms (programmatic data export)  
- Cross-firm pattern detection for identity-fraud signals  
- ML-based fraud scoring (when training data is sufficient)  
- Multi-currency support  
- Subscription pricing model for firms

### Never

- Real-money execution to venues (firms run simulated trading; this is by design)  
- Browser fingerprinting / device tracking (privacy/legal complexity)  
- Automated payouts before $X volume threshold (manual is correct at small scale)

---

## 15\. Risk Register

Realistic assessment of what can go wrong and what to do.

### Risk 1: Day 5 (eval engine) takes 12 hours instead of 9

**Probability:** High. The math is subtle and breach idempotency is fiddly. **Impact:** Critical. Everything depends on this. **Mitigation:** Eat into next morning. Don't push to day 6 until eval works correctly.

### Risk 2: Stripe webhook integration takes a full day instead of 4 hours

**Probability:** Medium. First-time webhook implementations have a "wait, why isn't this working" moment. **Impact:** Medium. Buffer in day 6 plus day 9 absorbs most slip. **Mitigation:** Use Stripe CLI to forward webhooks to localhost during development.

### Risk 3: Admin dashboard takes 3 days instead of 2

**Probability:** Medium-high. No design system \+ many screens. **Impact:** High. Cannot demo a credible product without admin view. **Mitigation:** Use shadcn/ui from the start; don't write custom CSS. If still behind, defer audit log search to post-MVP.

### Risk 4: Trader UI bugs from real data

**Probability:** High. Mock data hides edge cases. **Impact:** Medium. Day 9 specifically reserved for finding these. **Mitigation:** Adversarial mock data on day 2 to surface edge cases earlier.

### Risk 5: Kalshi API approval delay

**Probability:** Medium. Their review takes 1-2 weeks. **Impact:** Medium-low. Demo environment doesn't require approval. **Mitigation:** Apply this week. Develop against demo. Production credentials when ready.

### Risk 6: Founder burnout by day 7

**Probability:** Highest risk on this list. **Impact:** Critical. Mistakes compound and judgment degrades. **Mitigation:** Sleep 7+ hours. Real lunch every day. Take a 4-hour break on day 5\. Don't accept extending workdays past 9 hours.

### Risk 7: Claude Code ships broken code

**Probability:** Medium. Claude Code is good but not perfect at autonomous work. **Impact:** Medium. PR review catches most issues. **Mitigation:** Reserve 1 hour/day for review. Specific exclusion list of correctness-critical work that founder owns.

### Risk 8: Blueberry pivots the meeting to retainer/equity offer

**Probability:** High based on FT precedent. **Impact:** Variable. Could be opportunity, could be undermining the platform play. **Mitigation:** Use the negotiation playbook from earlier in conversation. Don't quote numbers. Get any proposal in writing. 48-72 hours before responding.

### Risk 9: Tenant scoping leak in production

**Probability:** Low if RLS is set up correctly. **Impact:** Catastrophic. Loses customer immediately. **Mitigation:** RLS tests on every table in CI. Block deploy on test failure. Manual audit of worker code paths.

### Risk 10: Eval loop misses a breach

**Probability:** Medium without testing. Low with tests. **Impact:** Catastrophic. Bogus payout to trader who should have failed. **Mitigation:** The critical 5 property tests are non-negotiable. Reconciliation cron checks balance drift. Audit log defensible if dispute arises.

---

## 16\. Decision Log

Architectural decisions made in conversation, locked in for the build.

### Stack decisions

- **Next.js monorepo, not split FE/BE.** Avoids 8-15 hours of architectural overhead, latency cost, auth complexity. Modularity achieved via domain folders within Next.js.  
- **Supabase, not Neon \+ Clerk \+ custom RLS.** Bundled Auth \+ Postgres \+ RLS \+ Realtime saves 3-4 days of integration work. RLS as primary tenant defense with paired tests in CI.  
- **Single worker process on Railway, not Kubernetes/multiple services.** Two services (Vercel \+ Railway worker) is the right shape at MVP scale.  
- **Upstash Redis for caching \+ queues.** Serverless, free tier covers MVP.

### Domain decisions

- **Simulated trading, not real Kalshi execution.** Prop firms always work this way (forex prop firms use simulated MetaTrader). Trader's skin \= challenge fee. Firm's skin \= funded payouts.  
- **Market orders only for MVP.** Limit-order schema hooks present but rejected at validation. Limit orders top of v2 roadmap.  
- **Static \+ trailing-EOD drawdown only.** No trailing intraday in MVP.  
- **UTC trading day boundary.** Per-firm timezone configurability deferred to v2.  
- **Mark-to-floor breach close as default.** Configurable per firm to close-at-market.  
- **Refund disables account by default.** Configurable per firm. Disputes always disable regardless of config.  
- **Detection deferred to beta weeks 3-5.** Infrastructure ships in MVP; queries enabled progressively with threshold tuning.  
- **Manual payouts.** Firm's ops team handles money movement; platform handles accounting.

### Architectural rules

- Every table has `firm_id`  
- Money is always integers (cents), never floats  
- Mutations write history, never overwrite state  
- Soft deletes only on financial records  
- Every admin action requires a reason and writes to `audit_log`  
- Eval loop is idempotent  
- Webhooks are idempotent via `stripe_event_id` unique constraint  
- All financial mutations happen in single Postgres transactions

### What was explicitly considered and rejected

- **Polymarket as v1 primary.** US-person exclusion, custodial USDC complications, brand mismatch with regulated firms.  
- **Auto-close on breach at market.** Generates more disputes; mark-to-floor is industry-cleaner.  
- **ML-based fraud detection.** No training data, premature.  
- **Browser fingerprinting.** Privacy/legal complexity.  
- **Per-tenant isolated databases by default.** Shared DB with RLS is sufficient unless customer specifically asks; charge premium for isolation.  
- **NestJS for the BE.** Modularity benefit smaller than network/auth/type-sharing cost. Achievable inside Next.js with domain folders.

---

## End of plan

Execute, ship, learn. Iterate based on what actually happens in the Blueberry meeting and what trader behavior looks like in the first weeks of beta.

Good luck.  
