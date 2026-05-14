// Tests for pure helpers re-exported from the package root. Small, surgical
// cases — these helpers are used everywhere so a regression has wide blast.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatCents,
  applyPct,
  bigintMax,
  bigintMin,
  utcDateString,
  isSameUtcDay,
  exponentialBackoffMs,
  safeParseInt,
} from "./index.js";

// ─── formatCents ─────────────────────────────────────────────────────────────

describe("formatCents", () => {
  it("zero", () => {
    expect(formatCents(0n)).toBe("$0.00");
  });
  it("whole dollars", () => {
    expect(formatCents(1000n)).toBe("$10.00");
  });
  it("dollars + cents", () => {
    expect(formatCents(1050n)).toBe("$10.50");
  });
  it("pads single-digit cents", () => {
    expect(formatCents(1005n)).toBe("$10.05");
  });
  it("negative amounts use leading minus", () => {
    expect(formatCents(-2500n)).toBe("-$25.00");
    expect(formatCents(-105n)).toBe("-$1.05");
  });
  it("large amounts (no thousands separator, but precise)", () => {
    expect(formatCents(1_234_567n)).toBe("$12345.67");
  });
});

// ─── applyPct ────────────────────────────────────────────────────────────────

describe("applyPct", () => {
  it("10% of 5,000,000 = 500,000", () => {
    expect(applyPct(5_000_000n, 10)).toBe(500_000n);
  });
  it("fractional percent uses basis-point math", () => {
    // 2.5% of 10,000 = 250
    expect(applyPct(10_000n, 2.5)).toBe(250n);
  });
  it("0% ⇒ 0", () => {
    expect(applyPct(5_000_000n, 0)).toBe(0n);
  });
  it("100% ⇒ same amount", () => {
    expect(applyPct(5_000_000n, 100)).toBe(5_000_000n);
  });
  it("rounds to nearest basis point internally (floor on division)", () => {
    // 0.01% of 9,999 = 0.9999 → integer math: (9999 * 1) / 10000 = 0
    expect(applyPct(9_999n, 0.01)).toBe(0n);
    // 0.01% of 10,000 = 1 exactly
    expect(applyPct(10_000n, 0.01)).toBe(1n);
  });
});

// ─── bigintMin / bigintMax ───────────────────────────────────────────────────

describe("bigintMin / bigintMax", () => {
  it("max picks the larger", () => {
    expect(bigintMax(5n, 3n)).toBe(5n);
    expect(bigintMax(3n, 5n)).toBe(5n);
  });
  it("max handles equal", () => {
    expect(bigintMax(5n, 5n)).toBe(5n);
  });
  it("max handles negatives", () => {
    expect(bigintMax(-5n, -10n)).toBe(-5n);
  });
  it("min picks the smaller", () => {
    expect(bigintMin(5n, 3n)).toBe(3n);
    expect(bigintMin(3n, 5n)).toBe(3n);
  });
  it("min handles negatives", () => {
    expect(bigintMin(-5n, -10n)).toBe(-10n);
  });
});

// ─── utcDateString / isSameUtcDay ────────────────────────────────────────────

describe("utcDateString", () => {
  it("returns YYYY-MM-DD in UTC", () => {
    expect(utcDateString(new Date("2026-05-13T00:00:00Z"))).toBe("2026-05-13");
  });
  it("crosses midnight UTC correctly", () => {
    // 23:59 in UTC-5 = 04:59 UTC the next day
    expect(utcDateString(new Date("2026-05-13T04:59:00Z"))).toBe("2026-05-13");
    expect(utcDateString(new Date("2026-05-12T23:59:00Z"))).toBe("2026-05-12");
  });
  it("defaults to current time", () => {
    const out = utcDateString();
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("isSameUtcDay", () => {
  it("true for same UTC day across timezones", () => {
    expect(
      isSameUtcDay(
        new Date("2026-05-13T00:00:01Z"),
        new Date("2026-05-13T23:59:59Z"),
      ),
    ).toBe(true);
  });
  it("false across UTC midnight", () => {
    expect(
      isSameUtcDay(
        new Date("2026-05-12T23:59:59Z"),
        new Date("2026-05-13T00:00:01Z"),
      ),
    ).toBe(false);
  });
});

// ─── exponentialBackoffMs ────────────────────────────────────────────────────

describe("exponentialBackoffMs", () => {
  beforeEach(() => {
    // Pin jitter to a known value so the math is exact.
    vi.spyOn(Math, "random").mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("attempt 0 ⇒ ~1s base", () => {
    expect(exponentialBackoffMs(0)).toBe(1000);
  });
  it("attempt 5 ⇒ ~32s base", () => {
    expect(exponentialBackoffMs(5)).toBe(32_000);
  });
  it("caps at maxMs", () => {
    // attempt 20 ⇒ 1000 * 2^20 ≫ default 60s cap
    expect(exponentialBackoffMs(20)).toBe(60_000);
  });
  it("respects custom maxMs", () => {
    expect(exponentialBackoffMs(10, 5_000)).toBe(5_000);
  });
  it("jitter adds 0–1000ms", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    // attempt 0: base 1000 + jitter 500 = 1500
    expect(exponentialBackoffMs(0)).toBe(1500);
  });
});

// ─── safeParseInt ────────────────────────────────────────────────────────────

describe("safeParseInt", () => {
  it("parses valid integer string", () => {
    expect(safeParseInt("42")).toBe(42);
    expect(safeParseInt("-7")).toBe(-7);
    expect(safeParseInt("0")).toBe(0);
  });
  it("returns null on null/undefined", () => {
    expect(safeParseInt(null)).toBeNull();
    expect(safeParseInt(undefined)).toBeNull();
  });
  it("returns null on non-numeric", () => {
    expect(safeParseInt("abc")).toBeNull();
  });
  it("parseInt-style: leading numeric prefix is accepted (not strict)", () => {
    // This documents existing behaviour — parseInt('42abc', 10) === 42
    expect(safeParseInt("42abc")).toBe(42);
  });
});
