"use strict";
// Merge per-account rule overrides over a challenge config, honoring expiry.
//
// Overrides live on accounts.rule_overrides (JSON, snake_case keys) and on
// accounts.override_expires_at. They are written by the admin
// POST /api/admin/accounts/[id]/override route. Until this helper landed only
// the eval engine consumed overrides — the orders and payouts routes silently
// ignored them, so admins who tightened an individual trader's caps via the
// override UI saw no effect on order validation or payout splits.
//
// Pure, no I/O. Callers convert Prisma Decimals to numbers before invoking.
Object.defineProperty(exports, "__esModule", { value: true });
exports.effectiveRules = effectiveRules;
function asNumber(v) {
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
function asNonNegInt(v) {
    return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : undefined;
}
/**
 * Resolve the effective rule set for an account.
 *
 * Overrides shadow config values key-by-key. An override key whose value fails
 * its type guard is treated as absent (falls back to config) — this protects
 * downstream callers from accidentally enforcing a non-numeric override.
 *
 * If overrideExpiresAt is set and ≤ now, the entire overrides object is
 * ignored. The DB row stays intact for history; only enforcement stops.
 */
function effectiveRules(input) {
    const now = input.now ?? new Date();
    const expired = input.overrideExpiresAt != null && input.overrideExpiresAt.getTime() <= now.getTime();
    const ov = expired || !input.ruleOverrides ? {} : input.ruleOverrides;
    const totalDD = asNumber(ov.total_drawdown_pct);
    const profitSplit = asNumber(ov.profit_split_pct);
    const maxPerMkt = asNonNegInt(ov.max_positions_per_market);
    const maxTotal = asNonNegInt(ov.max_positions_total);
    const maxContracts = asNonNegInt(ov.max_contracts_per_order);
    const minDays = asNonNegInt(ov.min_trading_days);
    // daily_drawdown_pct uses key presence to distinguish "use config" from
    // "explicitly null" — the override route deletes the key to clear. So a
    // missing key means: keep config. A present number means: use that number.
    let dailyDD = input.config.dailyDrawdownPct;
    if ('daily_drawdown_pct' in ov) {
        const candidate = asNumber(ov.daily_drawdown_pct);
        if (candidate !== undefined)
            dailyDD = candidate;
    }
    return {
        totalDrawdownPct: totalDD ?? input.config.totalDrawdownPct,
        dailyDrawdownPct: dailyDD,
        profitSplitPct: profitSplit ?? input.config.profitSplitPct,
        maxPositionsPerMarket: maxPerMkt ?? input.config.maxPositionsPerMarket,
        maxPositionsTotal: maxTotal ?? input.config.maxPositionsTotal,
        maxContractsPerOrder: maxContracts !== undefined ? maxContracts : input.config.maxContractsPerOrder,
        minTradingDays: minDays ?? input.config.minTradingDays,
    };
}
//# sourceMappingURL=effective-rules.js.map