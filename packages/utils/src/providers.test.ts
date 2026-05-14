// Tests for the venue dispatcher. The Polymarket adapter is mocked at the
// module boundary so these tests don't hit the network — see polymarket.test.ts
// for the adapter's own coverage.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted: must be declared before importing providers so the mock is
// registered first.
vi.mock("./polymarket.js", () => ({
  fetchPolymarketQuote: vi.fn(),
}));

import { fetchProviderQuote, isMockVenue } from "./providers.js";
import { fetchPolymarketQuote } from "./polymarket.js";
import { getMockMarketQuote } from "./mock-price.js";

const polyMock = fetchPolymarketQuote as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  polyMock.mockReset();
});

describe("isMockVenue", () => {
  it("kalshi is the mock-priced venue (deferred per Decision 20)", () => {
    expect(isMockVenue("kalshi")).toBe(true);
  });
  it("polymarket is live", () => {
    expect(isMockVenue("polymarket")).toBe(false);
  });
});

describe("fetchProviderQuote — polymarket", () => {
  it("returns the live quote when available", async () => {
    const live = { yesBid: 40, yesAsk: 45, noBid: 55, noAsk: 60 };
    polyMock.mockResolvedValue(live);
    expect(await fetchProviderQuote("polymarket", "m1")).toEqual(live);
  });

  it("returns null when polymarket can't price the market and mockFallback is off", async () => {
    polyMock.mockResolvedValue(null);
    expect(await fetchProviderQuote("polymarket", "m1")).toBeNull();
    expect(
      await fetchProviderQuote("polymarket", "m1", { mockFallback: false }),
    ).toBeNull();
  });

  it("falls back to the deterministic mock when mockFallback is on", async () => {
    polyMock.mockResolvedValue(null);
    const result = await fetchProviderQuote("polymarket", "m1", {
      mockFallback: true,
    });
    expect(result).toEqual(getMockMarketQuote("m1"));
  });

  it("forwards abort signal to the polymarket adapter", async () => {
    polyMock.mockResolvedValue(null);
    const controller = new AbortController();
    await fetchProviderQuote("polymarket", "m1", { signal: controller.signal });
    expect(polyMock).toHaveBeenCalledWith("m1", controller.signal);
  });
});

describe("fetchProviderQuote — kalshi", () => {
  it("always uses the deterministic mock (no network call)", async () => {
    const result = await fetchProviderQuote("kalshi", "k1");
    expect(result).toEqual(getMockMarketQuote("k1"));
    expect(polyMock).not.toHaveBeenCalled();
  });

  it("kalshi is unaffected by mockFallback flag (already mocked)", async () => {
    const a = await fetchProviderQuote("kalshi", "k1", { mockFallback: false });
    const b = await fetchProviderQuote("kalshi", "k1", { mockFallback: true });
    expect(a).toEqual(b);
  });
});

describe("fetchProviderQuote — unknown venue", () => {
  it("returns null on an unrecognized venue string", async () => {
    const result = await fetchProviderQuote(
      "binance" as unknown as Parameters<typeof fetchProviderQuote>[0],
      "x",
    );
    expect(result).toBeNull();
  });
});
