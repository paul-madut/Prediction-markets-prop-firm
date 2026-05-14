// Property tests for the evaluation engine. These five are flagged
// "non-negotiable" by the WebFlux MVP plan §6 — they are the contract the
// prop firm trades on: get any of them wrong and trader disputes become
// unwinnable.
//
//   1. Equity composition         — equity = balance + cost_basis + unrealized
//   2. Static floor immutability  — never moves once the challenge starts
//   3. Trailing-EOD monotonicity  — only goes up as the high-water mark grows
//   4. Daily floor                — null when unconfigured; correct otherwise
//   5. Breach detection           — lt vs lte boundary + repeated calls match

import { describe, it, expect } from "vitest";
import {
  computeEquityFromStoredPnl,
  computeEquityFromPrices,
  computeStaticFloor,
  computeTrailingFloor,
  computeDailyFloor,
  computeEffectiveFloor,
  checkBreach,
  type AccountFloorState,
  type FloorConfig,
  type PositionPnlEntry,
  type PositionWithPrice,
} from "./eval.js";

// ─── Fixture builders ────────────────────────────────────────────────────────

function mkState(overrides: Partial<AccountFloorState> = {}): AccountFloorState {
  return {
    startingBalanceCents: 5_000_000n, // $50,000
    highestEodBalanceCents: 5_000_000n,
    highestEodEquityCents: 5_000_000n,
    dayStartEquityCents: 5_000_000n,
    ruleOverrides: {},
    ...overrides,
  };
}

function mkConfig(overrides: Partial<FloorConfig> = {}): FloorConfig {
  return {
    drawdownType: "static",
    trailingReference: "eod_balance",
    totalDrawdownPct: 10,
    dailyDrawdownPct: null,
    ...overrides,
  };
}

// Deterministic PRNG so "random" properties are reproducible.
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ─── 1. Equity composition ───────────────────────────────────────────────────

describe("Property 1: equity = balance + position value", () => {
  it("zero positions ⇒ equity == balance", () => {
    const balance = 5_000_000n;
    expect(computeEquityFromStoredPnl(balance, [])).toBe(balance);
    expect(computeEquityFromPrices(balance, [])).toBe(balance);
  });

  it("computeEquityFromStoredPnl folds cost basis + unrealized P&L per position", () => {
    // Position: 100 contracts × 30¢ entry, current bid 35¢ ⇒ unrealized = +$5
    const pos: PositionPnlEntry = {
      netContracts: 100,
      avgEntryPriceCents: 30,
      unrealizedPnlCents: 500n, // +5¢ × 100 contracts
    };
    const balance = 5_000_000n;
    // Expected: balance + (100 × 30) + 500 = 5,000,000 + 3,000 + 500 = 5,003,500
    expect(computeEquityFromStoredPnl(balance, [pos])).toBe(5_003_500n);
  });

  it("computeEquityFromPrices = balance + Σ(currentBid × netContracts)", () => {
    const positions: PositionWithPrice[] = [
      { netContracts: 100, avgEntryPriceCents: 30, currentBidCents: 35 },
      { netContracts: 50, avgEntryPriceCents: 50, currentBidCents: 48 },
    ];
    const balance = 5_000_000n;
    // 5,000,000 + (100 × 35) + (50 × 48) = 5,000,000 + 3,500 + 2,400 = 5,005,900
    expect(computeEquityFromPrices(balance, positions)).toBe(5_005_900n);
  });

  it("zero netContracts positions are skipped (closed positions)", () => {
    const closed: PositionPnlEntry = {
      netContracts: 0,
      avgEntryPriceCents: 30,
      unrealizedPnlCents: 9999n, // stale data, should be ignored
    };
    const balance = 5_000_000n;
    expect(computeEquityFromStoredPnl(balance, [closed])).toBe(balance);
  });

  it("property: equity is invariant under permutation of positions", () => {
    const rand = rng(42);
    const positions: PositionPnlEntry[] = Array.from({ length: 20 }, () => ({
      netContracts: Math.floor(rand() * 200) + 1,
      avgEntryPriceCents: Math.floor(rand() * 99) + 1,
      unrealizedPnlCents: BigInt(Math.floor((rand() - 0.5) * 10000)),
    }));
    const e1 = computeEquityFromStoredPnl(5_000_000n, positions);
    const e2 = computeEquityFromStoredPnl(5_000_000n, [...positions].reverse());
    expect(e1).toBe(e2);
  });
});

// ─── 2. Static floor immutability ────────────────────────────────────────────

describe("Property 2: static floor is immutable across ticks", () => {
  it("returns the same value across many calls", () => {
    const state = mkState();
    const config = mkConfig({ drawdownType: "static", totalDrawdownPct: 10 });
    const floor = computeStaticFloor(state, config);
    // Run 100 times with the same input — must never drift.
    for (let i = 0; i < 100; i++) {
      expect(computeStaticFloor(state, config)).toBe(floor);
    }
  });

  it("static floor depends only on starting balance + percentage", () => {
    // Same starting balance + same percentage ⇒ same floor, regardless of
    // any intra-day movement (peak balance, day-start equity, etc.).
    const baseConfig = mkConfig({ drawdownType: "static", totalDrawdownPct: 10 });
    const s1 = mkState({
      startingBalanceCents: 5_000_000n,
      highestEodBalanceCents: 5_000_000n,
      highestEodEquityCents: 5_000_000n,
      dayStartEquityCents: 5_000_000n,
    });
    const s2 = mkState({
      startingBalanceCents: 5_000_000n,
      // Profitable trader: peak way above starting balance
      highestEodBalanceCents: 8_000_000n,
      highestEodEquityCents: 9_000_000n,
      dayStartEquityCents: 7_500_000n,
    });
    expect(computeStaticFloor(s1, baseConfig)).toBe(
      computeStaticFloor(s2, baseConfig),
    );
  });

  it("$50K @ 10% TDD ⇒ floor = $45,000", () => {
    const state = mkState({ startingBalanceCents: 5_000_000n });
    const config = mkConfig({ drawdownType: "static", totalDrawdownPct: 10 });
    expect(computeStaticFloor(state, config)).toBe(4_500_000n);
  });

  it("override shadows config totalDrawdownPct", () => {
    const state = mkState({
      startingBalanceCents: 5_000_000n,
      ruleOverrides: { total_drawdown_pct: 5 }, // relaxed: 5% instead of 10%
    });
    const config = mkConfig({ drawdownType: "static", totalDrawdownPct: 10 });
    // 5% of 5M = 250,000 ⇒ floor = 4,750,000
    expect(computeStaticFloor(state, config)).toBe(4_750_000n);
  });
});

// ─── 3. Trailing-EOD floor monotonicity ──────────────────────────────────────

describe("Property 3: trailing-EOD floor is monotonic non-decreasing", () => {
  it("rising EOD balance ⇒ rising floor (never decreases)", () => {
    const config = mkConfig({
      drawdownType: "trailing_eod",
      trailingReference: "eod_balance",
      totalDrawdownPct: 10,
    });
    // Simulate a profitable sequence: peak balance climbs each day.
    const peakSeries = [
      5_000_000n, 5_100_000n, 5_100_000n, 5_400_000n, 5_400_000n, 5_900_000n,
    ];
    let prevFloor = -1n;
    for (const peak of peakSeries) {
      const state = mkState({ highestEodBalanceCents: peak });
      const floor = computeTrailingFloor(state, config);
      expect(floor).toBeGreaterThanOrEqual(prevFloor);
      prevFloor = floor;
    }
  });

  it("falling intraday equity never decreases the trailing floor", () => {
    // Peak balance unchanged ⇒ floor unchanged, even if equity craters.
    const config = mkConfig({ drawdownType: "trailing_eod", totalDrawdownPct: 10 });
    const peakOnly = mkState({ highestEodBalanceCents: 5_500_000n });
    const stressed = mkState({
      highestEodBalanceCents: 5_500_000n,
      dayStartEquityCents: 4_800_000n, // big intraday loss start
    });
    expect(computeTrailingFloor(peakOnly, config)).toBe(
      computeTrailingFloor(stressed, config),
    );
  });

  it("trailingReference variants — eod_equity / eod_max_balance_equity", () => {
    const state = mkState({
      highestEodBalanceCents: 5_500_000n,
      highestEodEquityCents: 5_700_000n,
    });

    const floorByBalance = computeTrailingFloor(
      state,
      mkConfig({ drawdownType: "trailing_eod", trailingReference: "eod_balance", totalDrawdownPct: 10 }),
    );
    const floorByEquity = computeTrailingFloor(
      state,
      mkConfig({ drawdownType: "trailing_eod", trailingReference: "eod_equity", totalDrawdownPct: 10 }),
    );
    const floorByMax = computeTrailingFloor(
      state,
      mkConfig({ drawdownType: "trailing_eod", trailingReference: "eod_max_balance_equity", totalDrawdownPct: 10 }),
    );

    expect(floorByEquity).toBeGreaterThan(floorByBalance); // higher peak
    expect(floorByMax).toBe(floorByEquity); // max of both = equity (the higher one)
  });

  it("property: monotone under 100 random monotone EOD sequences", () => {
    const rand = rng(7);
    for (let trial = 0; trial < 20; trial++) {
      let peak = 5_000_000n + BigInt(Math.floor(rand() * 500_000));
      let prevFloor = -1n;
      for (let day = 0; day < 30; day++) {
        peak += BigInt(Math.floor(rand() * 100_000)); // strictly non-decreasing
        const state = mkState({ highestEodBalanceCents: peak });
        const floor = computeTrailingFloor(
          state,
          mkConfig({ drawdownType: "trailing_eod", totalDrawdownPct: 10 }),
        );
        expect(floor).toBeGreaterThanOrEqual(prevFloor);
        prevFloor = floor;
      }
    }
  });
});

// ─── 4. Daily loss floor ─────────────────────────────────────────────────────

describe("Property 4: daily loss floor", () => {
  it("returns null when dailyDrawdownPct is unconfigured", () => {
    const state = mkState();
    const config = mkConfig({ dailyDrawdownPct: null });
    expect(computeDailyFloor(state, config)).toBeNull();
  });

  it("returns null when override also clears it", () => {
    const state = mkState({
      ruleOverrides: { daily_drawdown_pct: undefined },
    });
    const config = mkConfig({ dailyDrawdownPct: null });
    expect(computeDailyFloor(state, config)).toBeNull();
  });

  it("$50K dayStart @ 5% DLP ⇒ floor = $47,500", () => {
    const state = mkState({ dayStartEquityCents: 5_000_000n });
    const config = mkConfig({ dailyDrawdownPct: 5 });
    expect(computeDailyFloor(state, config)).toBe(4_750_000n);
  });

  it("effective floor is max(base, daily) when both apply", () => {
    // Static base floor at 10% TDD ⇒ $45K. Daily at 5% of $48K start ⇒ $45.6K.
    // The tighter one wins ⇒ effective floor = $45.6K.
    const state = mkState({
      startingBalanceCents: 5_000_000n,
      dayStartEquityCents: 4_800_000n,
    });
    const config = mkConfig({
      drawdownType: "static",
      totalDrawdownPct: 10,
      dailyDrawdownPct: 5,
    });
    expect(computeEffectiveFloor(state, config)).toBe(4_560_000n);
  });

  it("override on daily shadows the config value", () => {
    const state = mkState({
      dayStartEquityCents: 5_000_000n,
      ruleOverrides: { daily_drawdown_pct: 3 }, // tighter than config
    });
    const config = mkConfig({ dailyDrawdownPct: 5 });
    // 3% of $50K = 150,000 ⇒ floor = $48,500
    expect(computeDailyFloor(state, config)).toBe(4_850_000n);
  });
});

// ─── 5. Breach detection ─────────────────────────────────────────────────────

describe("Property 5: breach detection (boundary + idempotency)", () => {
  it("lt: breach iff equity < floor strictly", () => {
    expect(checkBreach(4_499_999n, 4_500_000n, "lt")).toBe(true);
    expect(checkBreach(4_500_000n, 4_500_000n, "lt")).toBe(false);
    expect(checkBreach(4_500_001n, 4_500_000n, "lt")).toBe(false);
  });

  it("lte: breach iff equity <= floor", () => {
    expect(checkBreach(4_499_999n, 4_500_000n, "lte")).toBe(true);
    expect(checkBreach(4_500_000n, 4_500_000n, "lte")).toBe(true);
    expect(checkBreach(4_500_001n, 4_500_000n, "lte")).toBe(false);
  });

  it("unknown comparison string defaults to lt", () => {
    expect(checkBreach(4_500_000n, 4_500_000n, "garbage")).toBe(false);
    expect(checkBreach(4_499_999n, 4_500_000n, "garbage")).toBe(true);
  });

  it("idempotent: repeated calls on the same equity/floor return the same answer", () => {
    const equity = 4_499_999n;
    const floor = 4_500_000n;
    const first = checkBreach(equity, floor, "lt");
    for (let i = 0; i < 50; i++) {
      expect(checkBreach(equity, floor, "lt")).toBe(first);
    }
  });
});
