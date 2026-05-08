// Market data provider dispatcher.
//
// Single entry point for the order engine and eval loop to fetch a live quote
// regardless of venue. Polymarket is wired to real Gamma REST data;
// Kalshi falls back to deterministic mock prices until credentials and the
// WebSocket client land in Day 8 (per Decision 20).
//
// When Upstash is provisioned, this module gains a Redis-backed cache layer
// in front of the venue calls — the public signature stays the same.

import type { MarketQuote } from './pnl.js';
import { getMockMarketQuote } from './mock-price.js';
import { fetchPolymarketQuote } from './polymarket.js';

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
export async function fetchProviderQuote(
  venue: MarketVenue,
  externalMarketId: string,
  options: FetchQuoteOptions = {},
): Promise<MarketQuote | null> {
  const { signal, mockFallback = false } = options;

  if (venue === 'polymarket') {
    const quote = await fetchPolymarketQuote(externalMarketId, signal);
    if (quote) return quote;
    return mockFallback ? getMockMarketQuote(externalMarketId) : null;
  }

  // Kalshi is deferred to Phase 8. Use mock prices in the interim so the
  // order engine still has a fill source; flagged in trade.metadata so we
  // can grep for mock-priced trades when Kalshi goes live.
  if (venue === 'kalshi') {
    return getMockMarketQuote(externalMarketId);
  }

  return null;
}

/**
 * Returns true when the quote for this venue/market would be sourced from
 * mock data rather than a real price feed. Used by the order engine to flag
 * trades that did not transact at a real top-of-book.
 */
export function isMockVenue(venue: MarketVenue): boolean {
  return venue === 'kalshi';
}
