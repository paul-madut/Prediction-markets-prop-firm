export * from './effective-rules.js';
export * from './eval.js';
export * from './mock-price.js';
export * from './order-validation.js';
export * from './pnl.js';
export * from './polymarket.js';
export * from './providers.js';
export * from './rate-limit.js';

// ─── Money ────────────────────────────────────────────────────────────────────

/** Convert cents (bigint) to a display string: 1050n → "$10.50" */
export function formatCents(cents: bigint): string {
  const abs = cents < 0n ? -cents : cents;
  const dollars = abs / 100n;
  const remainder = abs % 100n;
  const sign = cents < 0n ? '-' : '';
  return `${sign}$${dollars}.${String(remainder).padStart(2, '0')}`;
}

/** Apply a percentage to a bigint amount using integer math. */
export function applyPct(amountCents: bigint, pct: number): bigint {
  return (amountCents * BigInt(Math.round(pct * 100))) / 10000n;
}

export function bigintMax(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

export function bigintMin(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

// ─── Time ─────────────────────────────────────────────────────────────────────

/** Returns the UTC date string (YYYY-MM-DD) for a given timestamp. */
export function utcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** True if two dates fall on the same UTC calendar day. */
export function isSameUtcDay(a: Date, b: Date): boolean {
  return utcDateString(a) === utcDateString(b);
}

// ─── Backoff ──────────────────────────────────────────────────────────────────

/**
 * Exponential backoff with jitter, capped at maxMs.
 * attempt=0 → ~1s, attempt=5 → ~32s, capped at maxMs.
 */
export function exponentialBackoffMs(attempt: number, maxMs = 60_000): number {
  const base = Math.min(1000 * Math.pow(2, attempt), maxMs);
  const jitter = Math.random() * 1000;
  return base + jitter;
}

// ─── Idempotency ──────────────────────────────────────────────────────────────

/** Generates a RFC-4122 v4 UUID using the built-in crypto module. */
export function generateUuid(): string {
  return crypto.randomUUID();
}

// ─── Safe parse ───────────────────────────────────────────────────────────────

/** Parse an integer safely; returns null if the value is NaN. */
export function safeParseInt(value: string | null | undefined): number | null {
  if (value == null) return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}
