import type { MarketQuote } from './pnl.js';
/**
 * Returns a deterministic mock MarketQuote for a given market ID.
 *
 * YES mid price ∈ [25, 75] cents; spread = 2 cents (bid = mid-1, ask = mid+1).
 * NO prices are the binary complement: NO mid = 100 - YES mid.
 * Calling with the same externalMarketId always returns the same quote.
 */
export declare function getMockMarketQuote(externalMarketId: string): MarketQuote;
//# sourceMappingURL=mock-price.d.ts.map