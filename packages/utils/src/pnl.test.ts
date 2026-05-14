// Tests for fill-price + position-delta math. Every order that clears the
// engine goes through these — a regression here corrupts balances.

import { describe, it, expect } from "vitest";
import {
  computeFillPrice,
  computeBalanceChange,
  computeNewAvgEntryPrice,
  computeRealizedPnl,
  computeUnrealizedPnl,
  computePositionDelta,
  type MarketQuote,
} from "./pnl.js";

const quote: MarketQuote = { yesBid: 40, yesAsk: 45, noBid: 55, noAsk: 60 };

// ─── computeFillPrice ────────────────────────────────────────────────────────

describe("computeFillPrice", () => {
  it("YES buy fills at yes_ask", () => {
    expect(computeFillPrice(quote, "yes", "buy")).toBe(45);
  });
  it("YES sell fills at yes_bid", () => {
    expect(computeFillPrice(quote, "yes", "sell")).toBe(40);
  });
  it("NO buy fills at no_ask", () => {
    expect(computeFillPrice(quote, "no", "buy")).toBe(60);
  });
  it("NO sell fills at no_bid", () => {
    expect(computeFillPrice(quote, "no", "sell")).toBe(55);
  });
  it("returns null when the required side is missing", () => {
    expect(computeFillPrice({ yesBid: 40 }, "yes", "buy")).toBeNull();
    expect(computeFillPrice({ yesAsk: 45 }, "yes", "sell")).toBeNull();
    expect(computeFillPrice({}, "no", "buy")).toBeNull();
  });
});

// ─── computeBalanceChange ────────────────────────────────────────────────────

describe("computeBalanceChange", () => {
  it("buy debits balance by contracts × price", () => {
    // 10 contracts × 45¢ = 450¢ debit
    expect(computeBalanceChange("buy", 10, 45)).toBe(-450n);
  });
  it("sell credits balance by contracts × price", () => {
    expect(computeBalanceChange("sell", 10, 60)).toBe(600n);
  });
  it("fees always subtract — buy", () => {
    // -(450 + 5) = -455
    expect(computeBalanceChange("buy", 10, 45, 5)).toBe(-455n);
  });
  it("fees always subtract — sell", () => {
    // 600 - 5 = 595
    expect(computeBalanceChange("sell", 10, 60, 5)).toBe(595n);
  });
  it("zero fees default", () => {
    expect(computeBalanceChange("buy", 1, 50)).toBe(-50n);
  });
});

// ─── computeNewAvgEntryPrice ─────────────────────────────────────────────────

describe("computeNewAvgEntryPrice", () => {
  it("opening from zero ⇒ avg = fill price", () => {
    expect(computeNewAvgEntryPrice(0, 0, 100, 45)).toBe(45);
  });
  it("topping up: weighted by contracts", () => {
    // 100 @ 30¢ + 100 @ 50¢ = 200 @ 40¢
    expect(computeNewAvgEntryPrice(100, 30, 100, 50)).toBe(40);
  });
  it("uneven sizes: 50 @ 30 + 150 @ 50 = 200 @ 45", () => {
    expect(computeNewAvgEntryPrice(50, 30, 150, 50)).toBe(45);
  });
  it("floor division rounds toward zero (never the trader's favor)", () => {
    // 1 @ 30 + 1 @ 31 = 2 @ 30.5 → floored to 30
    expect(computeNewAvgEntryPrice(1, 30, 1, 31)).toBe(30);
  });
});

// ─── computeRealizedPnl ──────────────────────────────────────────────────────

describe("computeRealizedPnl", () => {
  it("profitable close: + per contract", () => {
    // 10 contracts, entry 30, close 50 ⇒ +20¢ × 10 = 200
    expect(computeRealizedPnl(10, 30, 50)).toBe(200n);
  });
  it("losing close: negative", () => {
    // 10, entry 50, close 30 ⇒ -200
    expect(computeRealizedPnl(10, 50, 30)).toBe(-200n);
  });
  it("scratch close: zero", () => {
    expect(computeRealizedPnl(10, 40, 40)).toBe(0n);
  });
});

// ─── computeUnrealizedPnl ────────────────────────────────────────────────────

describe("computeUnrealizedPnl", () => {
  it("netContracts=0 ⇒ 0n (no double-counting closed position)", () => {
    expect(computeUnrealizedPnl(0, 30, 50)).toBe(0n);
  });
  it("(currentBid − avgEntry) × netContracts", () => {
    expect(computeUnrealizedPnl(100, 30, 35)).toBe(500n); // +5¢ × 100
    expect(computeUnrealizedPnl(100, 30, 25)).toBe(-500n); // -5¢ × 100
  });
});

// ─── computePositionDelta — composite ────────────────────────────────────────

describe("computePositionDelta — buy (open / top up)", () => {
  it("opening buy from flat", () => {
    const d = computePositionDelta("buy", 100, 45, 0, 0, 0, 40);
    expect(d.isOpening).toBe(true);
    expect(d.netContracts).toBe(100);
    expect(d.avgEntryPriceCents).toBe(45);
    expect(d.realizedPnlCents).toBeNull();
    expect(d.balanceChangeCents).toBe(-4500n);
    // unrealized = (currentBid - avg) × net = (40 - 45) × 100 = -500
    expect(d.unrealizedPnlCents).toBe(-500n);
  });

  it("top-up buy averages basis", () => {
    // Existing: 100 @ 30; adding 100 @ 50 ⇒ 200 @ 40 avg
    const d = computePositionDelta("buy", 100, 50, 0, 100, 30, 45);
    expect(d.netContracts).toBe(200);
    expect(d.avgEntryPriceCents).toBe(40);
    expect(d.balanceChangeCents).toBe(-5000n); // 100 × 50
    // unrealized = (45 - 40) × 200 = 1000
    expect(d.unrealizedPnlCents).toBe(1000n);
  });
});

describe("computePositionDelta — sell (close / partial)", () => {
  it("partial close keeps avgEntry unchanged on remaining", () => {
    // Existing 100 @ 30; sell 40 @ 50 ⇒ remaining 60 @ 30 (avg unchanged)
    const d = computePositionDelta("sell", 40, 50, 0, 100, 30, 45);
    expect(d.isOpening).toBe(false);
    expect(d.netContracts).toBe(60);
    expect(d.avgEntryPriceCents).toBe(30);
    // realized = (50 - 30) × 40 = 800
    expect(d.realizedPnlCents).toBe(800n);
    expect(d.balanceChangeCents).toBe(2000n); // 40 × 50
    // unrealized on remaining = (45 - 30) × 60 = 900
    expect(d.unrealizedPnlCents).toBe(900n);
  });

  it("full close zeroes unrealized", () => {
    const d = computePositionDelta("sell", 100, 50, 0, 100, 30, 45);
    expect(d.netContracts).toBe(0);
    expect(d.unrealizedPnlCents).toBe(0n);
    expect(d.realizedPnlCents).toBe(2000n); // (50-30) × 100
  });

  it("close at a loss: realizedPnl < 0", () => {
    // Existing 100 @ 50; sell 100 @ 30 ⇒ -2000
    const d = computePositionDelta("sell", 100, 30, 0, 100, 50, 30);
    expect(d.realizedPnlCents).toBe(-2000n);
    expect(d.balanceChangeCents).toBe(3000n); // proceeds: 100 × 30
  });

  it("fees on close subtract from balance change", () => {
    const d = computePositionDelta("sell", 10, 50, 5, 10, 30, 50);
    expect(d.balanceChangeCents).toBe(495n); // 500 - 5
  });
});
