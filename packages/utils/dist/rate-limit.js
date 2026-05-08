"use strict";
// In-process sliding-window rate limiter.
//
// Used by the order submission route to cap order rate per-account, blocking
// pathological loops or compromised clients before they hit the DB. State is
// process-local: each Next.js instance has its own counters, which is fine for
// the MVP single-deployment model. When Upstash is provisioned (Phase 3.5),
// callers can swap to a distributed limiter — public signature unchanged.
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRateLimit = checkRateLimit;
exports.resetRateLimitForTests = resetRateLimitForTests;
const buckets = new Map();
/**
 * Check whether a request keyed by `key` is permitted under the given budget.
 *
 * Sliding window: timestamps older than `windowMs` are evicted on every call,
 * so memory stays bounded by `max` entries per key.
 *
 * Returns `{ allowed: false, retryAfterMs: N }` when blocked. Callers should
 * forward `retryAfterMs` to the client via a `Retry-After` header.
 */
function checkRateLimit(key, max, windowMs) {
    const now = Date.now();
    const cutoff = now - windowMs;
    const bucket = (buckets.get(key) ?? []).filter((t) => t > cutoff);
    if (bucket.length >= max) {
        const oldest = bucket[0];
        return {
            allowed: false,
            remaining: 0,
            retryAfterMs: Math.max(0, oldest + windowMs - now),
        };
    }
    bucket.push(now);
    buckets.set(key, bucket);
    return {
        allowed: true,
        remaining: max - bucket.length,
        retryAfterMs: 0,
    };
}
/** Test helper. Drops all rate-limit state. */
function resetRateLimitForTests() {
    buckets.clear();
}
//# sourceMappingURL=rate-limit.js.map