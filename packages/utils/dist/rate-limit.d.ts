export interface RateLimitDecision {
    allowed: boolean;
    /** Number of remaining allowed requests in the current window. */
    remaining: number;
    /** ms until the oldest in-window timestamp falls out (0 if allowed). */
    retryAfterMs: number;
}
/**
 * Check whether a request keyed by `key` is permitted under the given budget.
 *
 * Sliding window: timestamps older than `windowMs` are evicted on every call,
 * so memory stays bounded by `max` entries per key.
 *
 * Returns `{ allowed: false, retryAfterMs: N }` when blocked. Callers should
 * forward `retryAfterMs` to the client via a `Retry-After` header.
 */
export declare function checkRateLimit(key: string, max: number, windowMs: number): RateLimitDecision;
/** Test helper. Drops all rate-limit state. */
export declare function resetRateLimitForTests(): void;
//# sourceMappingURL=rate-limit.d.ts.map