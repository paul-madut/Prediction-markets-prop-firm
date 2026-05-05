"use strict";
// ─── PnL Calculation (simulated binary prediction market trading) ──────────────
//
// Pure functions for computing fill prices, position deltas, and realized/
// unrealized P&L. Used by the order engine (Phase 4) and the eval tick loop.
// All prices are integer cents; all money values are bigint cents.
// No floats cross the boundary — multiplications use BigInt arithmetic.
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeFillPrice = computeFillPrice;
exports.computeBalanceChange = computeBalanceChange;
exports.computeNewAvgEntryPrice = computeNewAvgEntryPrice;
exports.computeRealizedPnl = computeRealizedPnl;
exports.computeUnrealizedPnl = computeUnrealizedPnl;
exports.computePositionDelta = computePositionDelta;
/**
 * Compute the fill price for a market order.
 * Buys fill at the ask (best offer); sells fill at the bid (best bid).
 * Returns null if the required side of the book is absent in the quote.
 */
function computeFillPrice(quote, side, action) {
    if (side === 'yes') {
        return action === 'buy' ? (quote.yesAsk ?? null) : (quote.yesBid ?? null);
    }
    return action === 'buy' ? (quote.noAsk ?? null) : (quote.noBid ?? null);
}
/**
 * Compute the cash balance change caused by a fill.
 * Opening buys reduce balance (negative); closing sells increase it (positive).
 * Fees are always subtracted regardless of direction.
 */
function computeBalanceChange(action, contracts, fillPriceCents, feesCents = 0) {
    const gross = BigInt(contracts) * BigInt(fillPriceCents);
    return action === 'buy'
        ? -(gross + BigInt(feesCents))
        : gross - BigInt(feesCents);
}
/**
 * Compute the new weighted-average entry price after adding contracts.
 * Uses BigInt multiplication to avoid float drift; result is floored to
 * the nearest cent (rounds in favour of the firm, never the trader).
 */
function computeNewAvgEntryPrice(existingContracts, existingAvgPriceCents, addedContracts, fillPriceCents) {
    const totalCost = BigInt(existingContracts) * BigInt(existingAvgPriceCents) +
        BigInt(addedContracts) * BigInt(fillPriceCents);
    const totalContracts = BigInt(existingContracts + addedContracts);
    // Floor division — consistent with cent precision, no rounding artifacts
    return Number(totalCost / totalContracts);
}
/**
 * Compute realized PnL when closing (selling) contracts from a position.
 * realizedPnl = (closingPrice − avgEntry) × closingContracts
 * Can be negative if the position closed at a loss.
 */
function computeRealizedPnl(closingContracts, avgEntryPriceCents, closingPriceCents) {
    return BigInt(closingContracts) * BigInt(closingPriceCents - avgEntryPriceCents);
}
/**
 * Compute unrealized PnL for an open position marked to the current bid.
 * Conservative mark: uses bid (not mid or ask) — what you'd receive if closing now.
 * unrealizedPnl = (currentBid − avgEntry) × netContracts
 * The caller must pass the correct bid for the position's side
 * (yesBid for a YES position, noBid for a NO position).
 */
function computeUnrealizedPnl(netContracts, avgEntryPriceCents, currentBidCents) {
    if (netContracts === 0)
        return 0n;
    return BigInt(netContracts) * BigInt(currentBidCents - avgEntryPriceCents);
}
/**
 * Compute the full position delta for a single market-order fill.
 *
 * Preconditions (enforced by order validation before this is called):
 * - action='sell' never exceeds existingContracts (no position flips in MVP).
 * - fillPriceCents is a fresh price from the hot cache (≤30s stale).
 * - currentBidCents is the conservative mark for the position's side.
 */
function computePositionDelta(action, contracts, fillPriceCents, feesCents, existingContracts, existingAvgPriceCents, currentBidCents) {
    const balanceChangeCents = computeBalanceChange(action, contracts, fillPriceCents, feesCents);
    if (action === 'buy') {
        const newAvg = computeNewAvgEntryPrice(existingContracts, existingAvgPriceCents, contracts, fillPriceCents);
        const newTotal = existingContracts + contracts;
        return {
            netContracts: newTotal,
            avgEntryPriceCents: newAvg,
            unrealizedPnlCents: computeUnrealizedPnl(newTotal, newAvg, currentBidCents),
            balanceChangeCents,
            realizedPnlCents: null,
            isOpening: true,
        };
    }
    // Closing trade (sell)
    const realizedPnlCents = computeRealizedPnl(contracts, existingAvgPriceCents, fillPriceCents);
    const newTotal = existingContracts - contracts;
    return {
        netContracts: newTotal,
        // avgEntry is unchanged — remaining contracts still carry the original basis
        avgEntryPriceCents: existingAvgPriceCents,
        unrealizedPnlCents: newTotal === 0
            ? 0n
            : computeUnrealizedPnl(newTotal, existingAvgPriceCents, currentBidCents),
        balanceChangeCents,
        realizedPnlCents,
        isOpening: false,
    };
}
//# sourceMappingURL=pnl.js.map