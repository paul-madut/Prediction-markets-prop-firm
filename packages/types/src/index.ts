// ─── Venues ────────────────────────────────────────────────────────────────

export type Venue = 'kalshi' | 'polymarket';

export type MarketRef = {
  venue: Venue;
  externalId: string;
  ticker: string;
};

// ─── Market Data ────────────────────────────────────────────────────────────

export type PriceUpdate = {
  ref: MarketRef;
  yesBid?: number;   // cents
  yesAsk?: number;
  noBid?: number;
  noAsk?: number;
  lastTrade?: number;
  volume?: number;
  receivedAt: number; // ms timestamp
};

export type ProviderHealth = {
  status: 'connected' | 'connecting' | 'disconnected' | 'degraded';
  lastMessageMs: number | null;
  subscribedCount: number;
  errorRate: number;
};

// ─── Firm ───────────────────────────────────────────────────────────────────

export type FirmStatus = 'active' | 'paused' | 'disabled';

export type Firm = {
  id: string;
  name: string;
  slug: string;
  brandConfig: Record<string, unknown>;
  enabledVenues: Venue[];
  status: FirmStatus;
  priceHistorySampleIntervalSeconds: number;
  createdAt: Date;
};

export type FirmMemberRole = 'trader' | 'admin' | 'owner';

export type FirmMember = {
  id: string;
  firmId: string;
  userId: string;
  role: FirmMemberRole;
  createdAt: Date;
};

// ─── Challenge Config ────────────────────────────────────────────────────────

export type DrawdownType = 'static' | 'trailing_eod';
export type TrailingReference = 'eod_balance' | 'eod_equity' | 'eod_max_balance_equity';
export type BreachComparison = 'lt' | 'lte';
export type BreachCloseBehavior = 'mark_to_floor' | 'close_at_market';

export type ChallengeConfig = {
  id: string;
  firmId: string;
  name: string;
  accountSizeCents: bigint;
  challengeFeeCents: number;
  drawdownType: DrawdownType;
  trailingReference: TrailingReference;
  totalDrawdownPct: number;
  dailyDrawdownPct: number | null;
  minTradingDays: number;
  profitSplitPct: number;
  breachComparison: BreachComparison;
  breachCloseBehavior: BreachCloseBehavior;
  refundDisablesAccount: boolean;
  maxPositionsPerMarket: number;
  maxPositionsTotal: number;
  maxContractsPerOrder: number | null;
  isActive: boolean;
  createdAt: Date;
};

export type ChallengePhase = {
  id: string;
  configId: string;
  firmId: string;
  phaseNumber: number;
  profitTargetPct: number;
  minTradingDays: number;
  createdAt: Date;
};

// ─── Account ─────────────────────────────────────────────────────────────────

export type AccountStatus =
  | 'pending'
  | 'active'
  | 'passed_phase'
  | 'funded'
  | 'breached'
  | 'disabled';

export type Account = {
  id: string;
  firmId: string;
  userId: string;
  configId: string;
  currentPhaseId: string;
  status: AccountStatus;
  startingBalanceCents: bigint;
  currentBalanceCents: bigint;
  highestEodBalanceCents: bigint;
  highestEodEquityCents: bigint;
  drawdownFloorCents: bigint;
  dailyLossFloorCents: bigint | null;
  dayStartEquityCents: bigint;
  currentTradingDay: Date | null;
  tradingDaysCount: number;
  firstTradeAt: Date | null;
  breachAt: Date | null;
  breachEventId: string | null;
  ruleOverrides: Record<string, unknown>;
  overrideReason: string | null;
  overrideSetByUserId: string | null;
  overrideSetAt: Date | null;
  overrideExpiresAt: Date | null;
  lastEodRunAt: Date | null;
  version: number;
  createdAt: Date;
};

// ─── Orders & Trades ─────────────────────────────────────────────────────────

export type Side = 'yes' | 'no';
export type OrderAction = 'buy' | 'sell';
export type OrderType = 'market' | 'limit';
export type TimeInForce = 'gtc' | 'day' | 'ioc' | 'fok';

export type OrderRejectionReason =
  | 'not_tradeable_state'
  | 'account_not_owned'
  | 'venue_not_enabled'
  | 'size_exceeds_limit'
  | 'position_not_found'
  | 'order_too_large'
  | 'position_limit_exceeded'
  | 'position_market_limit_exceeded'
  | 'news_cooldown'
  | 'limit_orders_not_supported';

export type SubmitOrderRequest = {
  accountId: string;
  venue: Venue;
  externalMarketId: string;
  externalMarketTicker: string;
  side: Side;
  action: OrderAction;
  sizeContracts: number;
  idempotencyKey: string;
};

export type OrderStatus =
  | 'pending'
  | 'filled'
  | 'partially_filled'
  | 'rejected'
  | 'cancelled';

export type Order = {
  id: string;
  firmId: string;
  accountId: string;
  venue: Venue;
  externalMarketId: string;
  externalMarketTicker: string;
  side: Side;
  action: OrderAction;
  sizeContracts: number;
  orderType: OrderType;
  limitPriceCents: number | null;
  timeInForce: TimeInForce | null;
  expiresAt: Date | null;
  idempotencyKey: string;
  status: OrderStatus;
  rejectedReason: string | null;
  submittedAt: Date;
  filledAt: Date | null;
};

export type Trade = {
  id: string;
  firmId: string;
  accountId: string;
  orderId: string | null;
  venue: Venue;
  externalMarketId: string;
  side: Side;
  sizeContracts: number;
  priceCents: number;
  feesCents: number;
  realizedPnlCents: bigint | null;
  isOpening: boolean;
  metadata: Record<string, unknown> | null;
  executedAt: Date;
};

export type Position = {
  id: string;
  firmId: string;
  accountId: string;
  venue: Venue;
  externalMarketId: string;
  side: Side;
  netContracts: number;
  avgEntryPriceCents: number;
  unrealizedPnlCents: bigint;
  lastPricedAt: Date | null;
};

// ─── Evaluation ──────────────────────────────────────────────────────────────

export type DrawdownSnapshot = {
  id: string;
  firmId: string;
  accountId: string;
  equityCents: bigint;
  balanceCents: bigint;
  drawdownFloorCents: bigint;
  unrealizedPnlCents: bigint;
  recordedAt: Date;
};

export type BreachEvent = {
  id: string;
  firmId: string;
  accountId: string;
  equityAtBreachCents: bigint;
  floorAtBreachCents: bigint;
  closingTradeIds: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
};

export type AccountStateLog = {
  id: string;
  firmId: string;
  accountId: string;
  fromStatus: AccountStatus | null;
  toStatus: AccountStatus;
  reason: string | null;
  actorUserId: string | null;
  createdAt: Date;
};

// ─── Payments ────────────────────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'disputed' | 'failed';

export type Payment = {
  id: string;
  firmId: string;
  userId: string;
  configId: string;
  accountId: string | null;
  stripeSessionId: string | null;
  stripeEventId: string | null;
  amountCents: number;
  status: PaymentStatus;
  paidAt: Date | null;
  createdAt: Date;
};

export type PayoutStatus = 'requested' | 'approved' | 'paid' | 'rejected';

export type Payout = {
  id: string;
  firmId: string;
  accountId: string;
  userId: string;
  requestedAmountCents: bigint;
  traderNetCents: bigint;
  profitSplitPct: number;
  status: PayoutStatus;
  externalReference: string | null;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  reviewerNotes: string | null;
  createdAt: Date;
};

// ─── Audit ───────────────────────────────────────────────────────────────────

export type AuditLog = {
  id: string;
  firmId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

// ─── Anti-cheat ──────────────────────────────────────────────────────────────

export type CheatSignalType =
  | 'latency_arb'
  | 'copy_trade'
  | 'win_rate_anomaly'
  | 'volume_anomaly'
  | 'position_concentration'
  | 'news_violation'
  | 'trade_timing_pattern';

export type CheatSignalSeverity = 'low' | 'medium' | 'high';
export type CheatSignalStatus =
  | 'pending'
  | 'reviewed_legitimate'
  | 'reviewed_violating'
  | 'auto_actioned';

export type CheatSignal = {
  id: string;
  firmId: string;
  accountId: string;
  signalType: CheatSignalType;
  severity: CheatSignalSeverity;
  score: number | null;
  evidence: Record<string, unknown>;
  status: CheatSignalStatus;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  reviewerNotes: string | null;
  detectedAt: Date;
};

export type NewsEvent = {
  id: string;
  firmId: string | null;
  marketFilter: string | null;
  eventName: string;
  startsAt: Date;
  endsAt: Date;
  cooldownMinutes: number;
  createdAt: Date;
};

// ─── Eval result (internal, not persisted) ───────────────────────────────────

export type EvalResult =
  | { ok: true; equity: bigint; floor: bigint; breached: boolean }
  | { skipped: true; reason: string };

// ─── Fill result ─────────────────────────────────────────────────────────────

export type FillResult =
  | { ok: true; trade: Trade }
  | { ok: false; reason: string };
