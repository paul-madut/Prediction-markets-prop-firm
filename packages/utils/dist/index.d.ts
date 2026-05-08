export * from './eval.js';
export * from './mock-price.js';
export * from './order-validation.js';
export * from './pnl.js';
export * from './polymarket.js';
export * from './providers.js';
/** Convert cents (bigint) to a display string: 1050n → "$10.50" */
export declare function formatCents(cents: bigint): string;
/** Apply a percentage to a bigint amount using integer math. */
export declare function applyPct(amountCents: bigint, pct: number): bigint;
export declare function bigintMax(a: bigint, b: bigint): bigint;
export declare function bigintMin(a: bigint, b: bigint): bigint;
/** Returns the UTC date string (YYYY-MM-DD) for a given timestamp. */
export declare function utcDateString(date?: Date): string;
/** True if two dates fall on the same UTC calendar day. */
export declare function isSameUtcDay(a: Date, b: Date): boolean;
/**
 * Exponential backoff with jitter, capped at maxMs.
 * attempt=0 → ~1s, attempt=5 → ~32s, capped at maxMs.
 */
export declare function exponentialBackoffMs(attempt: number, maxMs?: number): number;
/** Generates a RFC-4122 v4 UUID using the built-in crypto module. */
export declare function generateUuid(): string;
/** Parse an integer safely; returns null if the value is NaN. */
export declare function safeParseInt(value: string | null | undefined): number | null;
//# sourceMappingURL=index.d.ts.map