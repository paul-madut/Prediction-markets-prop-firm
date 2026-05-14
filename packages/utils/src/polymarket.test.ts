// Tests for fetchPolymarketQuote. Network is mocked via vi.stubGlobal('fetch').
// The function MUST return null on every degenerate case — a bad parse here
// leads to a bad fill price, which corrupts money.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchPolymarketQuote } from "./polymarket.js";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("fetchPolymarketQuote", () => {
  it("happy path: bid 0.40 / ask 0.45 ⇒ cents 40/45 with NO complements", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse({ id: "m1", bestBid: 0.4, bestAsk: 0.45 }),
    );
    const q = await fetchPolymarketQuote("m1");
    expect(q).toEqual({ yesBid: 40, yesAsk: 45, noBid: 55, noAsk: 60 });
  });

  it("rounds decimal prices to nearest cent", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse({ id: "m1", bestBid: 0.301, bestAsk: 0.359 }),
    );
    const q = await fetchPolymarketQuote("m1");
    expect(q).toEqual({ yesBid: 30, yesAsk: 36, noBid: 64, noAsk: 70 });
  });

  it("returns null when HTTP errors", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse({}, false, 500),
    );
    expect(await fetchPolymarketQuote("m1")).toBeNull();
  });

  it("returns null on network throw", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("ECONNRESET"));
    expect(await fetchPolymarketQuote("m1")).toBeNull();
  });

  it("returns null on JSON parse error", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("bad json");
      },
    } as unknown as Response);
    expect(await fetchPolymarketQuote("m1")).toBeNull();
  });

  it("returns null when market is closed", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse({ id: "m1", closed: true, bestBid: 0.4, bestAsk: 0.45 }),
    );
    expect(await fetchPolymarketQuote("m1")).toBeNull();
  });

  it("returns null when market is inactive", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse({ id: "m1", active: false, bestBid: 0.4, bestAsk: 0.45 }),
    );
    expect(await fetchPolymarketQuote("m1")).toBeNull();
  });

  it("returns null when bestBid or bestAsk is missing", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse({ id: "m1", bestBid: 0.4 }),
    );
    expect(await fetchPolymarketQuote("m1")).toBeNull();

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse({ id: "m1", bestAsk: 0.45 }),
    );
    expect(await fetchPolymarketQuote("m1")).toBeNull();
  });

  it("returns null on crossed book (yesBid > yesAsk)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse({ id: "m1", bestBid: 0.6, bestAsk: 0.4 }),
    );
    expect(await fetchPolymarketQuote("m1")).toBeNull();
  });

  it("encodes the market id into the URL", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(
      mockResponse({ id: "m1", bestBid: 0.4, bestAsk: 0.45 }),
    );
    await fetchPolymarketQuote("ab cd/ef");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://gamma-api.polymarket.com/markets/ab%20cd%2Fef",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("passes the abort signal through to fetch", async () => {
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(
      mockResponse({ id: "m1", bestBid: 0.4, bestAsk: 0.45 }),
    );
    const controller = new AbortController();
    await fetchPolymarketQuote("m1", controller.signal);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
