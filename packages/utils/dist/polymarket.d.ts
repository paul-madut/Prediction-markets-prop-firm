import type { MarketQuote } from './pnl.js';
/**
 * Fetch the live top-of-book for a Polymarket market by Gamma `id`.
 *
 * Returns null when:
 *   - HTTP error / non-200
 *   - Market is closed or inactive
 *   - bestBid or bestAsk is missing (illiquid market)
 *
 * Polymarket prices are decimal in [0, 1]; we convert to integer cents.
 * NO side is the binary complement of YES (NO ask = 1 - YES bid, etc.).
 */
export declare function fetchPolymarketQuote(externalMarketId: string, signal?: AbortSignal): Promise<MarketQuote | null>;
//# sourceMappingURL=polymarket.d.ts.map