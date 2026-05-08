"use strict";
// ─── Equity & Floor Computation ───────────────────────────────────────────────
//
// Pure functions used by the eval tick loop (worker) and the /equity API route.
// All money is bigint cents; no floats. Percentages are decimal numbers (e.g. 10.00
// means 10%). Arithmetic uses integer basis-point math to avoid rounding drift.
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeEquityFromStoredPnl = computeEquityFromStoredPnl;
exports.computeEquityFromPrices = computeEquityFromPrices;
exports.computeStaticFloor = computeStaticFloor;
exports.computeTrailingFloor = computeTrailingFloor;
exports.computeDailyFloor = computeDailyFloor;
exports.computeEffectiveFloor = computeEffectiveFloor;
exports.checkBreach = checkBreach;
// Private helpers — avoid importing from index.ts to prevent circular imports.
function _applyPct(amount, pct) {
    return (amount * BigInt(Math.round(pct * 100))) / 10000n;
}
function _bigintMax(a, b) {
    return a > b ? a : b;
}
// ─── Equity ──────────────────────────────────────────────────────────────────
/**
 * Computes equity from stored unrealized P&L on open positions.
 *
 *   equity = balance + Σ position_market_value
 *          = balance + Σ (avgEntry × N + unrealizedPnl)
 *          = balance + Σ (avgEntry × N + (currentBid − avgEntry) × N)
 *          = balance + Σ (currentBid × N)
 *
 * The cost basis was already subtracted from `balance` when the position was
 * opened (computeBalanceChange returns -gross on a buy), so the position
 * market value, not the P&L delta, is what gets added back. Adding only the
 * P&L would double-count the cost basis as a loss.
 */
function computeEquityFromStoredPnl(balanceCents, positions) {
    return positions.reduce((acc, pos) => {
        if (pos.netContracts === 0)
            return acc;
        const costBasis = BigInt(pos.netContracts) * BigInt(pos.avgEntryPriceCents);
        return acc + costBasis + pos.unrealizedPnlCents;
    }, balanceCents);
}
/**
 * Computes equity by marking open positions to live bid prices.
 * Used by the eval tick loop when fresh quotes are available.
 *
 *   equity = balance + Σ (currentBid × netContracts)
 *
 * Conservative: bid (not mid or ask) — what the trader would receive if they
 * closed every open position right now.
 */
function computeEquityFromPrices(balanceCents, positions) {
    return positions.reduce((acc, pos) => {
        if (pos.netContracts === 0)
            return acc;
        const positionValue = BigInt(pos.netContracts) * BigInt(pos.currentBidCents);
        return acc + positionValue;
    }, balanceCents);
}
// ─── Floor Computation ───────────────────────────────────────────────────────
/**
 * Static drawdown floor: startingBalance × (1 − totalDrawdownPct / 100).
 * Immutable after challenge creation; never moves intraday or EOD.
 */
function computeStaticFloor(state, config) {
    const pct = state.ruleOverrides.total_drawdown_pct ?? config.totalDrawdownPct;
    return state.startingBalanceCents - _applyPct(state.startingBalanceCents, pct);
}
/**
 * Trailing-EOD drawdown floor: computed from the highest recorded EOD reference.
 * The reference value (balance, equity, or max of both) is determined by
 * config.trailingReference. The floor moves up with the trader's high-water mark
 * and never decreases.
 */
function computeTrailingFloor(state, config) {
    let reference;
    switch (config.trailingReference) {
        case 'eod_equity':
            reference = state.highestEodEquityCents;
            break;
        case 'eod_max_balance_equity':
            reference = _bigintMax(state.highestEodBalanceCents, state.highestEodEquityCents);
            break;
        default: // 'eod_balance'
            reference = state.highestEodBalanceCents;
    }
    const pct = state.ruleOverrides.total_drawdown_pct ?? config.totalDrawdownPct;
    return reference - _applyPct(reference, pct);
}
/**
 * Daily loss floor: dayStartEquity × (1 − dailyDrawdownPct / 100).
 * Returns null if no daily drawdown limit is configured on this challenge.
 * Resets at the start of each trading day (00:00 UTC) via the EOD job.
 */
function computeDailyFloor(state, config) {
    const pct = state.ruleOverrides.daily_drawdown_pct ?? config.dailyDrawdownPct;
    if (pct == null)
        return null;
    return state.dayStartEquityCents - _applyPct(state.dayStartEquityCents, pct);
}
/**
 * Effective floor: max(overall drawdown floor, daily loss floor).
 * The account breaches if equity falls below this threshold.
 */
function computeEffectiveFloor(state, config) {
    const baseFloor = config.drawdownType === 'static'
        ? computeStaticFloor(state, config)
        : computeTrailingFloor(state, config);
    const dailyFloor = computeDailyFloor(state, config);
    return dailyFloor != null ? _bigintMax(baseFloor, dailyFloor) : baseFloor;
}
// ─── Breach Detection ────────────────────────────────────────────────────────
/**
 * Returns true if equity has breached the floor.
 * comparison='lt'  → breach when equity  < floor (default, "strictly below")
 * comparison='lte' → breach when equity <= floor ("at or below")
 */
function checkBreach(equity, floor, comparison) {
    return comparison === 'lte' ? equity <= floor : equity < floor;
}
//# sourceMappingURL=eval.js.map