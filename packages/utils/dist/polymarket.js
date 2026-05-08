"use strict";
// Polymarket Gamma REST provider — read-only market data, no auth required.
// Per Decision 20, Polymarket is the MVP-primary venue.
//
// The provider's fetchQuote returns null for any condition that should reject
// the fill (market closed, no top-of-book, network error). Callers treat null
// as "cannot fill right now" and surface a recoverable error to the user.
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPolymarketQuote = fetchPolymarketQuote;
// The Gamma host is fixed for all environments; if a future tenant needs an
// override, take it via a function parameter rather than env to keep this
// package free of Node-runtime assumptions.
const POLYMARKET_BASE = 'https://gamma-api.polymarket.com';
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
async function fetchPolymarketQuote(externalMarketId, signal) {
    const url = `${POLYMARKET_BASE}/markets/${encodeURIComponent(externalMarketId)}`;
    let res;
    try {
        res = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal,
        });
    }
    catch {
        return null;
    }
    if (!res.ok)
        return null;
    let market;
    try {
        market = (await res.json());
    }
    catch {
        return null;
    }
    if (market.closed === true || market.active === false)
        return null;
    if (market.bestBid == null || market.bestAsk == null)
        return null;
    // Polymarket returns decimal prices in [0, 1]. Round to cents.
    const yesBid = Math.round(market.bestBid * 100);
    const yesAsk = Math.round(market.bestAsk * 100);
    // Sanity: a degenerate quote (crossed book or out of range) is unusable.
    if (yesBid < 0 || yesAsk > 100 || yesBid > yesAsk)
        return null;
    return {
        yesBid,
        yesAsk,
        noBid: 100 - yesAsk,
        noAsk: 100 - yesBid,
    };
}
//# sourceMappingURL=polymarket.js.map