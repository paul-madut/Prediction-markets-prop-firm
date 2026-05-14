export interface EffectiveRulesConfig {
    totalDrawdownPct: number;
    dailyDrawdownPct: number | null;
    profitSplitPct: number;
    maxPositionsPerMarket: number;
    maxPositionsTotal: number;
    maxContractsPerOrder: number | null;
    minTradingDays: number;
}
export interface EffectiveRulesInput {
    config: EffectiveRulesConfig;
    ruleOverrides: Record<string, unknown> | null | undefined;
    overrideExpiresAt: Date | null | undefined;
    /** Injectable clock for tests. Defaults to `new Date()`. */
    now?: Date;
}
export type EffectiveRules = EffectiveRulesConfig;
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
export declare function effectiveRules(input: EffectiveRulesInput): EffectiveRules;
//# sourceMappingURL=effective-rules.d.ts.map