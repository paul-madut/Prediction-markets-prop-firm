/** Minimal position data needed for stored-PnL equity computation. */
export interface PositionPnlEntry {
    netContracts: number;
    unrealizedPnlCents: bigint;
}
/** Position data needed for live-price equity computation in the eval loop. */
export interface PositionWithPrice {
    netContracts: number;
    avgEntryPriceCents: number;
    /** Current best bid for the position's side (conservative mark). */
    currentBidCents: number;
}
/** Challenge config fields relevant to floor computation. */
export interface FloorConfig {
    /** 'static' | 'trailing_eod' */
    drawdownType: string;
    /** 'eod_balance' | 'eod_equity' | 'eod_max_balance_equity' */
    trailingReference: string;
    /** Total drawdown percentage, e.g. 10.00 for 10%. */
    totalDrawdownPct: number;
    /** Daily drawdown percentage, null if not configured. */
    dailyDrawdownPct: number | null;
}
/** Account state fields needed to compute floors. */
export interface AccountFloorState {
    startingBalanceCents: bigint;
    highestEodBalanceCents: bigint;
    highestEodEquityCents: bigint;
    /** Equity at start of current trading day; used for daily floor. */
    dayStartEquityCents: bigint;
    /** Per-account overrides; keys shadow the config fields when set. */
    ruleOverrides: Partial<{
        total_drawdown_pct: number;
        daily_drawdown_pct: number;
    }>;
}
/**
 * Computes equity from the stored unrealized PnL values on open positions.
 * Suitable for the API layer where live prices are not yet available.
 * equity = balance + Σ unrealizedPnlCents for positions with netContracts ≠ 0
 */
export declare function computeEquityFromStoredPnl(balanceCents: bigint, positions: PositionPnlEntry[]): bigint;
/**
 * Computes equity by marking open positions to live bid prices.
 * Used by the eval tick loop in the worker process.
 * equity = balance + Σ (currentBid - avgEntry) × netContracts
 */
export declare function computeEquityFromPrices(balanceCents: bigint, positions: PositionWithPrice[]): bigint;
/**
 * Static drawdown floor: startingBalance × (1 − totalDrawdownPct / 100).
 * Immutable after challenge creation; never moves intraday or EOD.
 */
export declare function computeStaticFloor(state: AccountFloorState, config: FloorConfig): bigint;
/**
 * Trailing-EOD drawdown floor: computed from the highest recorded EOD reference.
 * The reference value (balance, equity, or max of both) is determined by
 * config.trailingReference. The floor moves up with the trader's high-water mark
 * and never decreases.
 */
export declare function computeTrailingFloor(state: AccountFloorState, config: FloorConfig): bigint;
/**
 * Daily loss floor: dayStartEquity × (1 − dailyDrawdownPct / 100).
 * Returns null if no daily drawdown limit is configured on this challenge.
 * Resets at the start of each trading day (00:00 UTC) via the EOD job.
 */
export declare function computeDailyFloor(state: AccountFloorState, config: FloorConfig): bigint | null;
/**
 * Effective floor: max(overall drawdown floor, daily loss floor).
 * The account breaches if equity falls below this threshold.
 */
export declare function computeEffectiveFloor(state: AccountFloorState, config: FloorConfig): bigint;
/**
 * Returns true if equity has breached the floor.
 * comparison='lt'  → breach when equity  < floor (default, "strictly below")
 * comparison='lte' → breach when equity <= floor ("at or below")
 */
export declare function checkBreach(equity: bigint, floor: bigint, comparison: string): boolean;
//# sourceMappingURL=eval.d.ts.map