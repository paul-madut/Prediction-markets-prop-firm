import { AdminTraderView, AuditLogEntry } from "@/types/admin";
import { Position, Trade } from "@/types";

// Drawdown / equity-vs-floor chart point.
// All values cents. floor reflects the configured DD floor at that time.
// dailyFloor optional — only present on configs with daily DD.
export interface AccountEquityPoint {
  date: string;
  equity: number;
  balance: number;
  floor: number;
  dailyFloor?: number;
}

// One row in the account_state_log timeline (plan §3 / §6).
export interface AccountActivityEntry {
  id: string;
  occurredAt: string;
  fromStatus: string | null;
  toStatus: string;
  reason?: string;
  actor?: string;
  metadata?: Record<string, unknown>;
}

// Per-account audit entry — narrower view of the cross-firm audit_log.
export interface AccountAuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AdminAccountFull {
  // Snapshot — trader-list view, used for the page header
  snapshot: AdminTraderView;

  // Domain fields not in AdminTraderView
  configName: string;
  phaseLabel: string;
  daysRemaining: number;

  // Computed eval-engine state (cents)
  drawdownFloorCents: number;
  dailyFloorCents: number | null;
  distanceToFloorPct: number;

  // Active overrides (jsonb on accounts.rule_overrides)
  ruleOverrides: Record<string, unknown> | null;

  // Tabs
  positions: Position[];
  recentTrades: Trade[];
  drawdown: AccountEquityPoint[];
  activity: AccountActivityEntry[];
  audit: AccountAuditEntry[];
}

// ============================================================
// Helpers — generate ~24 days of equity history for the chart
// ============================================================

function makeEquityHistory(opts: {
  accountId: string;
  days: number;
  startingBalance: number;
  finalEquity: number;
  floor: number;
  shape: "steady_climb" | "near_floor_dip" | "breach_drop";
  dailyFloor?: number;
}): AccountEquityPoint[] {
  const points: AccountEquityPoint[] = [];
  const now = new Date("2026-05-02T00:00:00Z").getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = opts.days - 1; i >= 0; i--) {
    const t = now - i * dayMs;
    const date = new Date(t).toISOString().slice(0, 10);
    const progress = (opts.days - 1 - i) / Math.max(1, opts.days - 1);

    let equity: number;
    if (opts.shape === "steady_climb") {
      equity =
        opts.startingBalance +
        (opts.finalEquity - opts.startingBalance) * progress +
        Math.sin(i * 0.7) * 30000;
    } else if (opts.shape === "near_floor_dip") {
      // Climb early, dip near end so the last point sits 1¢ above floor
      const mid = opts.startingBalance + (opts.finalEquity - opts.startingBalance) * 0.6;
      if (progress < 0.6) {
        equity = opts.startingBalance + (mid - opts.startingBalance) * (progress / 0.6);
      } else {
        equity = mid + (opts.finalEquity - mid) * ((progress - 0.6) / 0.4);
      }
    } else {
      // breach_drop — climb, then sharp fall on last day to/below floor
      const peak = opts.startingBalance * 1.06;
      if (progress < 0.85) {
        equity = opts.startingBalance + (peak - opts.startingBalance) * (progress / 0.85);
      } else {
        equity = peak + (opts.finalEquity - peak) * ((progress - 0.85) / 0.15);
      }
    }

    points.push({
      date,
      equity: Math.round(equity),
      balance: Math.round(equity - Math.sin(i * 0.4) * 15000),
      floor: opts.floor,
      dailyFloor: opts.dailyFloor,
    });
  }

  return points;
}

// ============================================================
// Fixtures
// ============================================================

// Healthy mid-evaluation account
const alex: AdminAccountFull = {
  snapshot: {
    accountId: "acct_alex_phase1",
    userId: "acct_alex_phase1",
    username: "Alex Thompson",
    email: "alex.thompson@email.com",
    avatar: "",
    accountPhase: "evaluation_1",
    accountSize: 10000000, // $100,000
    accountBalance: 10620000, // $106,200
    startingBalance: 10000000,
    profitTarget: 0.08,
    currentProfit: 0.062,
    dailyDrawdownLimit: 0.05,
    currentDailyDrawdown: 0.011,
    maxDrawdownLimit: 0.1,
    currentMaxDrawdown: 0.022,
    peakBalance: 10720000,
    tradingDaysCompleted: 14,
    tradingDaysRequired: 10,
    challengeStartDate: "2026-04-18",
    challengeEndDate: "2026-06-18",
    status: "active",
    winRate: 0.64,
    createdAt: "2026-04-15T09:30:00Z",
    lastActiveAt: "2026-05-02T15:42:00Z",
    kycStatus: "approved",
    accountStatus: "active",
    totalPaidOut: 0,
    totalFeesPaid: 9600,
    challengesPurchased: 1,
    challengesPassed: 0,
    challengesFailed: 0,
    riskScore: 28,
    notes: [],
    tags: ["promising"],
  },
  configName: "PRO10 — $100k Trailing EOD",
  phaseLabel: "Phase 1 of 2",
  daysRemaining: 47,
  drawdownFloorCents: 9000000, // 10% from starting
  dailyFloorCents: 10100000, // 5% off today's start equity (~10.6M)
  distanceToFloorPct: 15.3,
  ruleOverrides: null,
  positions: [
    {
      accountId: "acct_alex_phase1",
      ticker: "KXFEDDECISION-26JUN-CUT25",
      market_title: "Will the Fed cut rates 25bps at the June 2026 FOMC?",
      side: "yes",
      position: 250,
      total_traded: 250,
      market_exposure: 1450000,
      realized_pnl: 0,
      unrealized_pnl: 87500,
      fees_paid: 1250,
      avg_entry_price: 58,
      current_price: 61,
      opened_at: "2026-05-01T13:22:00Z",
    },
    {
      accountId: "acct_alex_phase1",
      ticker: "KXNFLSB-26-CHIEFS",
      market_title: "Will the Chiefs win Super Bowl LXI?",
      side: "no",
      position: 100,
      total_traded: 100,
      market_exposure: 720000,
      realized_pnl: 0,
      unrealized_pnl: -12000,
      fees_paid: 500,
      avg_entry_price: 72,
      current_price: 71,
      opened_at: "2026-04-30T18:05:00Z",
    },
  ],
  recentTrades: [
    {
      accountId: "acct_alex_phase1",
      tradeId: "trd_alex_005",
      ticket: "00005",
      ticker: "KXPRES-28-DEM",
      market_title: "Will a Democrat win the 2028 US presidential election?",
      side: "yes",
      shares: 200,
      entryPrice: 47,
      exitPrice: 52,
      entryDate: "2026-04-28T14:00:00Z",
      exitDate: "2026-05-01T10:14:00Z",
      pnl: 100000,
      pnlPercent: 0.106,
      fees: 800,
      result: "won",
      exitType: "manual_sell",
    },
    {
      accountId: "acct_alex_phase1",
      tradeId: "trd_alex_004",
      ticket: "00004",
      ticker: "KXBTCPRICE-MAY26",
      market_title: "Will BTC close above $90k on May 30 2026?",
      side: "no",
      shares: 150,
      entryPrice: 38,
      exitPrice: 31,
      entryDate: "2026-04-26T09:30:00Z",
      exitDate: "2026-04-29T16:00:00Z",
      pnl: 105000,
      pnlPercent: 0.184,
      fees: 600,
      result: "won",
      exitType: "manual_sell",
    },
  ],
  drawdown: makeEquityHistory({
    accountId: "acct_alex_phase1",
    days: 24,
    startingBalance: 10000000,
    finalEquity: 10620000,
    floor: 9000000,
    shape: "steady_climb",
    dailyFloor: 10100000,
  }),
  activity: [
    {
      id: "state_alex_3",
      occurredAt: "2026-04-28T14:00:00Z",
      fromStatus: "active",
      toStatus: "active",
      reason: "First profitable week milestone",
      metadata: { milestone: "+5% equity" },
    },
    {
      id: "state_alex_2",
      occurredAt: "2026-04-19T09:15:00Z",
      fromStatus: "pending",
      toStatus: "active",
      reason: "First trade placed",
      actor: "system",
    },
    {
      id: "state_alex_1",
      occurredAt: "2026-04-18T08:00:00Z",
      fromStatus: null,
      toStatus: "pending",
      reason: "Account provisioned via Stripe checkout",
      actor: "system",
      metadata: { paymentId: "pay_alex_initial" },
    },
  ],
  audit: [
    {
      id: "aud_alex_1",
      timestamp: "2026-04-18T08:00:00Z",
      action: "account.create",
      actor: "system",
      after: { status: "pending", config: "PRO10" },
    },
  ],
};

// 1¢ from drawdown floor — adversarial fixture for distance-to-floor UI
const jordan: AdminAccountFull = {
  snapshot: {
    accountId: "acct_jordan_close_to_floor",
    userId: "acct_jordan_close_to_floor",
    username: "Jordan Reyes",
    email: "jreyes@email.com",
    avatar: "",
    accountPhase: "evaluation_2",
    accountSize: 5000000, // $50k
    accountBalance: 4500001, // $45,000.01 — exactly 1¢ above 10% floor
    startingBalance: 5000000,
    profitTarget: 0.05,
    currentProfit: -0.0999998,
    dailyDrawdownLimit: 0.05,
    currentDailyDrawdown: 0.048,
    maxDrawdownLimit: 0.1,
    currentMaxDrawdown: 0.0999998,
    peakBalance: 5180000,
    tradingDaysCompleted: 22,
    tradingDaysRequired: 15,
    challengeStartDate: "2026-04-04",
    challengeEndDate: "2026-06-04",
    status: "active",
    winRate: 0.41,
    createdAt: "2026-04-01T11:00:00Z",
    lastActiveAt: "2026-05-02T22:18:00Z",
    kycStatus: "approved",
    accountStatus: "active",
    totalPaidOut: 0,
    totalFeesPaid: 4800,
    challengesPurchased: 1,
    challengesPassed: 1,
    challengesFailed: 0,
    riskScore: 88,
    notes: [],
    tags: ["near-breach"],
  },
  configName: "PRO5 — $50k Static DD",
  phaseLabel: "Phase 2 of 2",
  daysRemaining: 33,
  drawdownFloorCents: 4500000, // 10% static from $50k
  dailyFloorCents: 4500000,
  distanceToFloorPct: 0.0000222, // ~1¢ on $45k
  ruleOverrides: null,
  positions: [
    {
      accountId: "acct_jordan_close_to_floor",
      ticker: "KXFEDDECISION-26JUN-HOLD",
      market_title: "Will the Fed hold rates at the June 2026 FOMC?",
      side: "yes",
      position: 800,
      total_traded: 800,
      market_exposure: 3200000,
      realized_pnl: 0,
      unrealized_pnl: -84000,
      fees_paid: 2400,
      avg_entry_price: 40,
      current_price: 39,
      opened_at: "2026-05-02T08:30:00Z",
    },
  ],
  recentTrades: [
    {
      accountId: "acct_jordan_close_to_floor",
      tradeId: "trd_jordan_007",
      ticket: "00007",
      ticker: "KXSPX-MAY02",
      market_title: "Will SPX close above 6,000 on May 2 2026?",
      side: "yes",
      shares: 500,
      entryPrice: 55,
      exitPrice: 38,
      entryDate: "2026-05-02T10:00:00Z",
      exitDate: "2026-05-02T15:45:00Z",
      pnl: -85000,
      pnlPercent: -0.309,
      fees: 1500,
      result: "lost",
      exitType: "manual_sell",
    },
    {
      accountId: "acct_jordan_close_to_floor",
      tradeId: "trd_jordan_006",
      ticket: "00006",
      ticker: "KXBTCPRICE-MAY02",
      market_title: "Will BTC close above $95k on May 2 2026?",
      side: "yes",
      shares: 400,
      entryPrice: 62,
      exitPrice: 41,
      entryDate: "2026-05-01T22:00:00Z",
      exitDate: "2026-05-02T13:10:00Z",
      pnl: -84000,
      pnlPercent: -0.339,
      fees: 1200,
      result: "lost",
      exitType: "manual_sell",
    },
  ],
  drawdown: makeEquityHistory({
    accountId: "acct_jordan_close_to_floor",
    days: 24,
    startingBalance: 5000000,
    finalEquity: 4500001,
    floor: 4500000,
    shape: "near_floor_dip",
    dailyFloor: 4500000,
  }),
  activity: [
    {
      id: "state_jordan_3",
      occurredAt: "2026-05-02T15:46:00Z",
      fromStatus: "active",
      toStatus: "active",
      reason: "Drawdown alert tripped — within 0.001% of floor",
      actor: "system",
      metadata: { distanceCents: 1 },
    },
    {
      id: "state_jordan_2",
      occurredAt: "2026-04-25T11:30:00Z",
      fromStatus: "passed_phase",
      toStatus: "active",
      reason: "Promoted to Phase 2",
      actor: "system",
    },
    {
      id: "state_jordan_1",
      occurredAt: "2026-04-04T08:00:00Z",
      fromStatus: null,
      toStatus: "pending",
      reason: "Account provisioned",
      actor: "system",
    },
  ],
  audit: [
    {
      id: "aud_jordan_2",
      timestamp: "2026-05-02T15:46:00Z",
      action: "risk.alert.fire",
      actor: "system",
      metadata: { signal: "approaching_dd_floor", thresholdPct: 1 },
    },
    {
      id: "aud_jordan_1",
      timestamp: "2026-04-25T11:30:00Z",
      action: "account.phase_advance",
      actor: "system",
      before: { phase: 1 },
      after: { phase: 2 },
    },
  ],
};

// Breached account with system-generated mark-to-floor close trade
const sam: AdminAccountFull = {
  snapshot: {
    accountId: "acct_sam_breached",
    userId: "acct_sam_breached",
    username: "Sam Patel",
    email: "spatel@email.com",
    avatar: "",
    accountPhase: "evaluation_1",
    accountSize: 2500000,
    accountBalance: 2250000, // exactly equals floor (10% from $25k)
    startingBalance: 2500000,
    profitTarget: 0.08,
    currentProfit: -0.1,
    dailyDrawdownLimit: 0.05,
    currentDailyDrawdown: 0.062,
    maxDrawdownLimit: 0.1,
    currentMaxDrawdown: 0.1,
    peakBalance: 2580000,
    tradingDaysCompleted: 6,
    tradingDaysRequired: 5,
    challengeStartDate: "2026-04-25",
    challengeEndDate: "2026-06-25",
    status: "failed",
    winRate: 0.33,
    createdAt: "2026-04-22T16:00:00Z",
    lastActiveAt: "2026-05-01T14:22:00Z",
    kycStatus: "approved",
    accountStatus: "closed",
    totalPaidOut: 0,
    totalFeesPaid: 4800,
    challengesPurchased: 1,
    challengesPassed: 0,
    challengesFailed: 1,
    riskScore: 95,
    notes: [],
    tags: ["breached"],
  },
  configName: "PRO Blitz — $25k",
  phaseLabel: "Phase 1 of 1",
  daysRemaining: 0,
  drawdownFloorCents: 2250000,
  dailyFloorCents: null,
  distanceToFloorPct: 0,
  ruleOverrides: null,
  positions: [],
  recentTrades: [
    {
      accountId: "acct_sam_breached",
      tradeId: "trd_sam_breach_close",
      ticket: "SYS-BREACH-001",
      ticker: "KXNFLSB-26-CHIEFS",
      market_title: "Will the Chiefs win Super Bowl LXI?",
      side: "yes",
      shares: 300,
      entryPrice: 64,
      exitPrice: 56, // mark-to-floor price — final equity = floor exactly
      entryDate: "2026-04-30T20:00:00Z",
      exitDate: "2026-05-01T14:22:00Z",
      pnl: -24000,
      pnlPercent: -0.125,
      fees: 0, // system-generated, no fees
      result: "lost",
      exitType: "manual_sell",
    },
    {
      accountId: "acct_sam_breached",
      tradeId: "trd_sam_004",
      ticket: "00004",
      ticker: "KXSPX-APR30",
      market_title: "Will SPX close above 5,950 on Apr 30 2026?",
      side: "yes",
      shares: 400,
      entryPrice: 71,
      exitPrice: 48,
      entryDate: "2026-04-30T09:30:00Z",
      exitDate: "2026-04-30T15:45:00Z",
      pnl: -92000,
      pnlPercent: -0.324,
      fees: 1600,
      result: "lost",
      exitType: "manual_sell",
    },
  ],
  drawdown: makeEquityHistory({
    accountId: "acct_sam_breached",
    days: 24,
    startingBalance: 2500000,
    finalEquity: 2250000,
    floor: 2250000,
    shape: "breach_drop",
  }),
  activity: [
    {
      id: "state_sam_3",
      occurredAt: "2026-05-01T14:22:00Z",
      fromStatus: "active",
      toStatus: "breached",
      reason: "Total drawdown floor reached; positions closed mark-to-floor",
      actor: "system",
      metadata: {
        equityAtBreachCents: 2250000,
        floorCents: 2250000,
        closeBehavior: "mark_to_floor",
        positionsClosedCount: 1,
      },
    },
    {
      id: "state_sam_2",
      occurredAt: "2026-04-26T10:30:00Z",
      fromStatus: "pending",
      toStatus: "active",
      reason: "First trade placed",
      actor: "system",
    },
    {
      id: "state_sam_1",
      occurredAt: "2026-04-25T08:00:00Z",
      fromStatus: null,
      toStatus: "pending",
      reason: "Account provisioned",
      actor: "system",
    },
  ],
  audit: [
    {
      id: "aud_sam_2",
      timestamp: "2026-05-01T14:22:00Z",
      action: "account.breach",
      actor: "system",
      before: { status: "active", balance: 2250000 },
      after: { status: "breached", balance: 2250000 },
      metadata: { closeBehavior: "mark_to_floor" },
    },
    {
      id: "aud_sam_1",
      timestamp: "2026-04-25T08:00:00Z",
      action: "account.create",
      actor: "system",
    },
  ],
};

export const mockAdminAccounts: Record<string, AdminAccountFull> = {
  acct_alex_phase1: alex,
  acct_jordan_close_to_floor: jordan,
  acct_sam_breached: sam,
};

export function getAdminAccount(accountId: string): AdminAccountFull | undefined {
  return mockAdminAccounts[accountId];
}

// Surface for the recent-breaches widget on /admin home
export function getRecentBreaches(): AdminAccountFull[] {
  return Object.values(mockAdminAccounts).filter(
    (a) => a.snapshot.status === "failed" || a.snapshot.accountStatus === "closed"
  );
}

// Used to flag the "near-floor" widget on /admin home
export function getAccountsNearFloor(thresholdPct = 2): AdminAccountFull[] {
  return Object.values(mockAdminAccounts).filter(
    (a) => a.distanceToFloorPct < thresholdPct && a.snapshot.accountStatus === "active"
  );
}

// Re-export for /admin/audit table augmentation
export const mockAdminAccountAuditEntries: AuditLogEntry[] = [];
