// Tests for the deterministic mock-price generator. Used as a fill source
// for Kalshi (deferred) and as a `mockFallback` for any venue in demo mode.
// Determinism + bounded output are the contract.

import { describe, it, expect } from "vitest";
import { getMockMarketQuote } from "./mock-price.js";

describe("getMockMarketQuote", () => {
  it("deterministic: same id ⇒ same quote across calls", () => {
    const a = getMockMarketQuote("market-abc");
    const b = getMockMarketQuote("market-abc");
    expect(a).toEqual(b);
  });

  it("different ids produce a spread of mids (FNV-1a distribution)", () => {
    const mids = new Set<number>();
    for (let i = 0; i < 50; i++) {
      mids.add(getMockMarketQuote(`m-${i}`).yesBid);
    }
    // Not a strict guarantee, but FNV across 50 inputs should hit ≥20 distinct mids.
    expect(mids.size).toBeGreaterThanOrEqual(20);
  });

  it("yesBid in [24, 74] and yesAsk in [26, 76] across 200 inputs", () => {
    for (let i = 0; i < 200; i++) {
      const q = getMockMarketQuote(`m-${i}`);
      expect(q.yesBid).toBeGreaterThanOrEqual(24);
      expect(q.yesBid).toBeLessThanOrEqual(74);
      expect(q.yesAsk).toBeGreaterThanOrEqual(26);
      expect(q.yesAsk).toBeLessThanOrEqual(76);
    }
  });

  it("YES spread is exactly 2¢", () => {
    for (let i = 0; i < 50; i++) {
      const q = getMockMarketQuote(`m-${i}`);
      expect(q.yesAsk - q.yesBid).toBe(2);
    }
  });

  it("NO side is the binary complement of YES with the same 2¢ spread", () => {
    for (let i = 0; i < 50; i++) {
      const q = getMockMarketQuote(`m-${i}`);
      const mid = q.yesBid + 1; // bid = mid - 1
      expect(q.noBid).toBe(100 - mid - 1);
      expect(q.noAsk).toBe(100 - mid + 1);
      expect(q.noAsk - q.noBid).toBe(2);
    }
  });

  it("accepts empty string", () => {
    const q = getMockMarketQuote("");
    expect(q.yesBid).toBeGreaterThanOrEqual(24);
    expect(q.yesAsk).toBeLessThanOrEqual(76);
  });
});
