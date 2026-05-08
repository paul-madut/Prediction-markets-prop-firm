import type { MarketQuote } from './pnl.js';
export type MarketVenue = 'polymarket' | 'kalshi';
export interface FetchQuoteOptions {
    signal?: AbortSignal;
    /** When true, fall back to the deterministic mock for any venue that returns null. */
    mockFallback?: boolean;
}
/**
 * Fetch the live top-of-book for a market on the given venue.
 *
 * Returns null when the venue cannot price the market right now (market
 * closed, illiquid, network error). Callers should treat null as a
 * recoverable rejection and surface a `no_quote_for_market` error to the user.
 *
 * Set `mockFallback: true` only for environments where price accuracy is not
 * required — e.g., during demo mode with `NEXT_PUBLIC_DEMO_MODE=true`.
 */
export declare function fetchProviderQuote(venue: MarketVenue, externalMarketId: string, options?: FetchQuoteOptions): Promise<MarketQuote | null>;
/**
 * Returns true when the quote for this venue/market would be sourced from
 * mock data rather than a real price feed. Used by the order engine to flag
 * trades that did not transact at a real top-of-book.
 */
export declare function isMockVenue(venue: MarketVenue): boolean;
//# sourceMappingURL=providers.d.ts.map