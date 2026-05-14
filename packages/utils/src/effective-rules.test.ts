// Unit tests for effectiveRules() — verifies that per-account overrides shadow
// the challenge config correctly, that expired overrides are dropped, and that
// malformed override values fall back to config rather than poisoning callers.

import { describe, it, expect } from "vitest";
import {
  effectiveRules,
  type EffectiveRulesConfig,
} from "./effective-rules.js";

function baseConfig(): EffectiveRulesConfig {
  return {
    totalDrawdownPct: 10,
    dailyDrawdownPct: 5,
    profitSplitPct: 80,
    maxPositionsPerMarket: 1,
    maxPositionsTotal: 5,
    maxContractsPerOrder: 100,
    minTradingDays: 0,
  };
}

describe("effectiveRules — no overrides", () => {
  it("returns config unchanged when overrides are null/undefined/empty", () => {
    const c = baseConfig();
    expect(
      effectiveRules({ config: c, ruleOverrides: null, overrideExpiresAt: null }),
    ).toEqual(c);
    expect(
      effectiveRules({ config: c, ruleOverrides: undefined, overrideExpiresAt: null }),
    ).toEqual(c);
    expect(
      effectiveRules({ config: c, ruleOverrides: {}, overrideExpiresAt: null }),
    ).toEqual(c);
  });
});

describe("effectiveRules — overrides shadow config", () => {
  it("tightens position/size caps and profit split", () => {
    const r = effectiveRules({
      config: baseConfig(),
      ruleOverrides: {
        max_positions_per_market: 2,
        max_positions_total: 3,
        max_contracts_per_order: 50,
        profit_split_pct: 50,
        min_trading_days: 7,
      },
      overrideExpiresAt: null,
    });
    expect(r.maxPositionsPerMarket).toBe(2);
    expect(r.maxPositionsTotal).toBe(3);
    expect(r.maxContractsPerOrder).toBe(50);
    expect(r.profitSplitPct).toBe(50);
    expect(r.minTradingDays).toBe(7);
  });

  it("overrides drawdown values", () => {
    const r = effectiveRules({
      config: baseConfig(),
      ruleOverrides: { total_drawdown_pct: 8, daily_drawdown_pct: 3 },
      overrideExpiresAt: null,
    });
    expect(r.totalDrawdownPct).toBe(8);
    expect(r.dailyDrawdownPct).toBe(3);
  });

  it("absence of daily_drawdown_pct key keeps the config value", () => {
    // The admin override route deletes the key to "clear" — but until then,
    // a missing key should fall back to config, not to null.
    const r = effectiveRules({
      config: baseConfig(), // dailyDrawdownPct: 5
      ruleOverrides: { total_drawdown_pct: 8 }, // daily absent
      overrideExpiresAt: null,
    });
    expect(r.dailyDrawdownPct).toBe(5);
  });
});

describe("effectiveRules — expiry", () => {
  it("expired overrides are ignored (entire object treated as absent)", () => {
    const past = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-05-13T00:00:00Z");
    const r = effectiveRules({
      config: baseConfig(),
      ruleOverrides: { max_positions_per_market: 10, profit_split_pct: 99 },
      overrideExpiresAt: past,
      now,
    });
    expect(r).toEqual(baseConfig());
  });

  it("future expiry still applies the overrides", () => {
    const future = new Date("2027-01-01T00:00:00Z");
    const now = new Date("2026-05-13T00:00:00Z");
    const r = effectiveRules({
      config: baseConfig(),
      ruleOverrides: { profit_split_pct: 90 },
      overrideExpiresAt: future,
      now,
    });
    expect(r.profitSplitPct).toBe(90);
  });

  it("null expiry = perpetual override", () => {
    const r = effectiveRules({
      config: baseConfig(),
      ruleOverrides: { profit_split_pct: 90 },
      overrideExpiresAt: null,
    });
    expect(r.profitSplitPct).toBe(90);
  });

  it("expiry exactly at now counts as expired (boundary)", () => {
    const t = new Date("2026-05-13T00:00:00Z");
    const r = effectiveRules({
      config: baseConfig(),
      ruleOverrides: { profit_split_pct: 90 },
      overrideExpiresAt: t,
      now: t,
    });
    expect(r.profitSplitPct).toBe(baseConfig().profitSplitPct);
  });
});

describe("effectiveRules — malformed values fall back to config", () => {
  it("non-number override falls through to config", () => {
    const r = effectiveRules({
      config: baseConfig(),
      ruleOverrides: { profit_split_pct: "80" as unknown as number },
      overrideExpiresAt: null,
    });
    expect(r.profitSplitPct).toBe(baseConfig().profitSplitPct);
  });

  it("negative non-int for position cap is rejected", () => {
    const r = effectiveRules({
      config: baseConfig(),
      ruleOverrides: { max_positions_per_market: -1 },
      overrideExpiresAt: null,
    });
    expect(r.maxPositionsPerMarket).toBe(baseConfig().maxPositionsPerMarket);
  });
});
