export type Side = 'yes' | 'no';
export type OrderAction = 'buy' | 'sell';
/** Minimal quote needed to compute a market-order fill price. */
export interface MarketQuote {
    yesBid: number;
    yesAsk: number;
    noBid: number;
    noAsk: number;
}
/**
 * Compute the fill price for a market order.
 * Buys fill at the ask (best offer); sells fill at the bid (best bid).
 * Returns null if the required side of the book is absent in the quote.
 */
export declare function computeFillPrice(quote: Partial<MarketQuote>, side: Side, action: OrderAction): number | null;
/**
 * Compute the cash balance change caused by a fill.
 * Opening buys reduce balance (negative); closing sells increase it (positive).
 * Fees are always subtracted regardless of direction.
 */
export declare function computeBalanceChange(action: OrderAction, contracts: number, fillPriceCents: number, feesCents?: number): bigint;
/**
 * Compute the new weighted-average entry price after adding contracts.
 * Uses BigInt multiplication to avoid float drift; result is floored to
 * the nearest cent (rounds in favour of the firm, never the trader).
 */
export declare function computeNewAvgEntryPrice(existingContracts: number, existingAvgPriceCents: number, addedContracts: number, fillPriceCents: number): number;
/**
 * Compute realized PnL when closing (selling) contracts from a position.
 * realizedPnl = (closingPrice − avgEntry) × closingContracts
 * Can be negative if the position closed at a loss.
 */
export declare function computeRealizedPnl(closingContracts: number, avgEntryPriceCents: number, closingPriceCents: number): bigint;
/**
 * Compute unrealized PnL for an open position marked to the current bid.
 * Conservative mark: uses bid (not mid or ask) — what you'd receive if closing now.
 * unrealizedPnl = (currentBid − avgEntry) × netContracts
 * The caller must pass the correct bid for the position's side
 * (yesBid for a YES position, noBid for a NO position).
 */
export declare function computeUnrealizedPnl(netContracts: number, avgEntryPriceCents: number, currentBidCents: number): bigint;
/** Everything the order engine needs to upsert the position and trade rows. */
export interface PositionDelta {
    /** New net_contracts value after this fill. */
    netContracts: number;
    /** New avg_entry_price_cents after this fill (unchanged on close). */
    avgEntryPriceCents: number;
    /** Updated unrealized_pnl_cents to write to the positions row. */
    unrealizedPnlCents: bigint;
    /** Net cash balance change; add to accounts.current_balance_cents. */
    balanceChangeCents: bigint;
    /** Realized PnL to record on the trade row; null for opening trades. */
    realizedPnlCents: bigint | null;
    /** True for opening (buy) trades; false for closing (sell) trades. */
    isOpening: boolean;
}
/**
 * Compute the full position delta for a single market-order fill.
 *
 * Preconditions (enforced by order validation before this is called):
 * - action='sell' never exceeds existingContracts (no position flips in MVP).
 * - fillPriceCents is a fresh price from the hot cache (≤30s stale).
 * - currentBidCents is the conservative mark for the position's side.
 */
export declare function computePositionDelta(action: OrderAction, contracts: number, fillPriceCents: number, feesCents: number, existingContracts: number, existingAvgPriceCents: number, currentBidCents: number): PositionDelta;
//# sourceMappingURL=pnl.d.ts.map