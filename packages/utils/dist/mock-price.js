"use strict";
// Deterministic mock market quote generator for Phase 4 simulated order execution.
// Uses FNV-1a hash of the externalMarketId to produce a consistent mid price in
// [25, 75] cents with a fixed 2-cent spread per side.
// The same market always gets the same quote; different markets get different quotes.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMockMarketQuote = getMockMarketQuote;
// FNV-1a 32-bit hash — deterministic, cheap, good distribution.
function fnv32a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0; // unsigned 32-bit
}
/**
 * Returns a deterministic mock MarketQuote for a given market ID.
 *
 * YES mid price ∈ [25, 75] cents; spread = 2 cents (bid = mid-1, ask = mid+1).
 * NO prices are the binary complement: NO mid = 100 - YES mid.
 * Calling with the same externalMarketId always returns the same quote.
 */
function getMockMarketQuote(externalMarketId) {
    const hash = fnv32a(externalMarketId);
    const mid = 25 + (hash % 51); // 25..75 inclusive
    return {
        yesBid: mid - 1,
        yesAsk: mid + 1,
        noBid: 100 - mid - 1,
        noAsk: 100 - mid + 1,
    };
}
//# sourceMappingURL=mock-price.js.map