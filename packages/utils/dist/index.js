"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCents = formatCents;
exports.applyPct = applyPct;
exports.bigintMax = bigintMax;
exports.bigintMin = bigintMin;
exports.utcDateString = utcDateString;
exports.isSameUtcDay = isSameUtcDay;
exports.exponentialBackoffMs = exponentialBackoffMs;
exports.generateUuid = generateUuid;
exports.safeParseInt = safeParseInt;
__exportStar(require("./eval.js"), exports);
__exportStar(require("./order-validation.js"), exports);
__exportStar(require("./pnl.js"), exports);
// ─── Money ────────────────────────────────────────────────────────────────────
/** Convert cents (bigint) to a display string: 1050n → "$10.50" */
function formatCents(cents) {
    const abs = cents < 0n ? -cents : cents;
    const dollars = abs / 100n;
    const remainder = abs % 100n;
    const sign = cents < 0n ? '-' : '';
    return `${sign}$${dollars}.${String(remainder).padStart(2, '0')}`;
}
/** Apply a percentage to a bigint amount using integer math. */
function applyPct(amountCents, pct) {
    return (amountCents * BigInt(Math.round(pct * 100))) / 10000n;
}
function bigintMax(a, b) {
    return a > b ? a : b;
}
function bigintMin(a, b) {
    return a < b ? a : b;
}
// ─── Time ─────────────────────────────────────────────────────────────────────
/** Returns the UTC date string (YYYY-MM-DD) for a given timestamp. */
function utcDateString(date = new Date()) {
    return date.toISOString().slice(0, 10);
}
/** True if two dates fall on the same UTC calendar day. */
function isSameUtcDay(a, b) {
    return utcDateString(a) === utcDateString(b);
}
// ─── Backoff ──────────────────────────────────────────────────────────────────
/**
 * Exponential backoff with jitter, capped at maxMs.
 * attempt=0 → ~1s, attempt=5 → ~32s, capped at maxMs.
 */
function exponentialBackoffMs(attempt, maxMs = 60_000) {
    const base = Math.min(1000 * Math.pow(2, attempt), maxMs);
    const jitter = Math.random() * 1000;
    return base + jitter;
}
// ─── Idempotency ──────────────────────────────────────────────────────────────
/** Generates a RFC-4122 v4 UUID using the built-in crypto module. */
function generateUuid() {
    return crypto.randomUUID();
}
// ─── Safe parse ───────────────────────────────────────────────────────────────
/** Parse an integer safely; returns null if the value is NaN. */
function safeParseInt(value) {
    if (value == null)
        return null;
    const n = parseInt(value, 10);
    return isNaN(n) ? null : n;
}
//# sourceMappingURL=index.js.map