// Unit tests for the order validation chain. The MVP plan §5 calls this a
// 9-step chain; the implementation merges steps 4 and 5 (market open, price
// freshness) into the fill transaction where live prices exist, so this
// pure-function chain covers 7 distinct rejection reasons + the happy path.

import { describe, it, expect } from "vitest";
import {
  validateOrder,
  type OrderValidationInput,
} from "./order-validation.js";

// Helper: a valid input that passes all checks. Each test then mutates one
// field to trigger a specific rejection reason — that way the failure
// reason is unambiguous and the test reads as a single-axis property.
function baseInput(): OrderValidationInput {
  return {
    action: "buy",
    side: "yes",
    venue: "polymarket",
    sizeContracts: 10,
    accountStatus: "active",
    accountUserId: "user-A",
    requestingUserId: "user-A",
    enabledVenues: ["polymarket"],
    maxContractsPerOrder: 100,
    maxPositionsPerMarket: 1,
    maxPositionsTotal: 5,
    existingPositionContracts: 0,
    openPositionsCount: 0,
    openPositionsInMarketCount: 0,
    newsCooldownActiveUntil: null,
  };
}

describe("validateOrder — happy path", () => {
  it("a clean buy passes", () => {
    const r = validateOrder(baseInput());
    expect(r.ok).toBe(true);
  });

  it("a clean sell against an existing position passes", () => {
    const r = validateOrder({
      ...baseInput(),
      action: "sell",
      sizeContracts: 5,
      existingPositionContracts: 10,
    });
    expect(r.ok).toBe(true);
  });

  it("buy at exactly maxPositionsTotal − 1 passes (opening one more is allowed)", () => {
    const r = validateOrder({
      ...baseInput(),
      openPositionsCount: 4, // < 5 limit
      existingPositionContracts: 0,
    });
    expect(r.ok).toBe(true);
  });

  it("maxContractsPerOrder=null bypasses the size check", () => {
    const r = validateOrder({
      ...baseInput(),
      maxContractsPerOrder: null,
      sizeContracts: 1_000_000,
    });
    expect(r.ok).toBe(true);
  });
});

describe("validateOrder — rejection reasons (one per axis)", () => {
  it("not_tradeable_state when status is not active|funded", () => {
    for (const status of ["pending", "passed_phase", "breached", "disabled"]) {
      const r = validateOrder({ ...baseInput(), accountStatus: status });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("not_tradeable_state");
    }
  });

  it("active|funded both tradeable", () => {
    for (const status of ["active", "funded"]) {
      const r = validateOrder({ ...baseInput(), accountStatus: status });
      expect(r.ok).toBe(true);
    }
  });

  it("account_not_owned when requesting user ≠ account owner", () => {
    const r = validateOrder({
      ...baseInput(),
      accountUserId: "user-A",
      requestingUserId: "user-B",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("account_not_owned");
  });

  it("venue_not_enabled when venue is not in firm's enabledVenues", () => {
    const r = validateOrder({
      ...baseInput(),
      venue: "kalshi",
      enabledVenues: ["polymarket"],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("venue_not_enabled");
  });

  it("size_exceeds_limit when sizeContracts > maxContractsPerOrder", () => {
    const r = validateOrder({
      ...baseInput(),
      sizeContracts: 101,
      maxContractsPerOrder: 100,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("size_exceeds_limit");
  });

  it("size at exactly the limit is allowed", () => {
    const r = validateOrder({
      ...baseInput(),
      sizeContracts: 100,
      maxContractsPerOrder: 100,
    });
    expect(r.ok).toBe(true);
  });

  it("position_limit_exceeded when opening a NEW market would exceed total", () => {
    const r = validateOrder({
      ...baseInput(),
      action: "buy",
      existingPositionContracts: 0, // new market
      openPositionsCount: 5, // at the cap
      maxPositionsTotal: 5,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("position_limit_exceeded");
  });

  it("topping up an existing position does NOT count against position cap", () => {
    const r = validateOrder({
      ...baseInput(),
      action: "buy",
      existingPositionContracts: 50, // already in this market
      openPositionsCount: 5, // at the cap, but this isn't a new market
      maxPositionsTotal: 5,
    });
    expect(r.ok).toBe(true);
  });

  it("position_market_limit_exceeded when opening a new side on a market at the per-market cap", () => {
    // Trader holds YES on market m1; attempts to open NO on same market.
    // maxPositionsPerMarket=1, market already has one open side → reject.
    const r = validateOrder({
      ...baseInput(),
      action: "buy",
      side: "no",
      existingPositionContracts: 0, // no NO position yet
      openPositionsInMarketCount: 1, // YES side already counts
      maxPositionsPerMarket: 1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("position_market_limit_exceeded");
  });

  it("opening a second side passes when maxPositionsPerMarket allows it", () => {
    const r = validateOrder({
      ...baseInput(),
      action: "buy",
      side: "no",
      existingPositionContracts: 0,
      openPositionsInMarketCount: 1,
      maxPositionsPerMarket: 2, // explicitly permits both sides
    });
    expect(r.ok).toBe(true);
  });

  it("topping up the same side does NOT trip the per-market cap", () => {
    // Already at the per-market cap because we hold this side; adding more
    // contracts to the same side row doesn't open a new row.
    const r = validateOrder({
      ...baseInput(),
      action: "buy",
      side: "yes",
      existingPositionContracts: 10, // same-side top-up
      openPositionsInMarketCount: 1,
      maxPositionsPerMarket: 1,
    });
    expect(r.ok).toBe(true);
  });

  it("per-market cap fires before total cap when both would reject", () => {
    // Defense-in-depth ordering: per-market check is more specific.
    const r = validateOrder({
      ...baseInput(),
      action: "buy",
      existingPositionContracts: 0,
      openPositionsInMarketCount: 1,
      openPositionsCount: 5,
      maxPositionsPerMarket: 1,
      maxPositionsTotal: 5,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("position_market_limit_exceeded");
  });

  it("position_not_found when selling without an open position", () => {
    const r = validateOrder({
      ...baseInput(),
      action: "sell",
      existingPositionContracts: 0,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("position_not_found");
  });

  it("order_too_large when sell size > existing position", () => {
    const r = validateOrder({
      ...baseInput(),
      action: "sell",
      sizeContracts: 11,
      existingPositionContracts: 10,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("order_too_large");
  });

  it("selling exactly the held quantity is allowed (full close)", () => {
    const r = validateOrder({
      ...baseInput(),
      action: "sell",
      sizeContracts: 10,
      existingPositionContracts: 10,
    });
    expect(r.ok).toBe(true);
  });

  it("news_cooldown when newsCooldownActiveUntil is in the future", () => {
    const futureMs = Date.now() + 60_000;
    const r = validateOrder({
      ...baseInput(),
      newsCooldownActiveUntil: new Date(futureMs),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("news_cooldown");
  });

  it("just-ended cooldown is not enforced (boundary)", () => {
    const pastMs = Date.now() - 1_000;
    const r = validateOrder({
      ...baseInput(),
      newsCooldownActiveUntil: new Date(pastMs),
    });
    expect(r.ok).toBe(true);
  });
});

describe("validateOrder — ordering of checks (defense in depth)", () => {
  // The chain has a specific order: tradeable state first, then ownership,
  // then venue, etc. Test that earlier checks fire when later ones would
  // also fail — this catches accidental reordering.
  it("not_tradeable_state fires before venue check", () => {
    const r = validateOrder({
      ...baseInput(),
      accountStatus: "breached",
      venue: "kalshi", // would also fail venue check
      enabledVenues: ["polymarket"],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not_tradeable_state");
  });

  it("account_not_owned fires before size check", () => {
    const r = validateOrder({
      ...baseInput(),
      requestingUserId: "user-B",
      sizeContracts: 999, // would also fail size check
      maxContractsPerOrder: 100,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("account_not_owned");
  });
});
