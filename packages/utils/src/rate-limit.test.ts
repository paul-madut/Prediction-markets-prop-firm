// Tests for the sliding-window rate limiter. Bucket state is module-scoped,
// so each test resets via resetRateLimitForTests() to stay independent.

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit, resetRateLimitForTests } from "./rate-limit.js";

beforeEach(() => {
  resetRateLimitForTests();
  vi.useFakeTimers();
  // Anchor "now" deterministically so the window math is exact.
  vi.setSystemTime(new Date("2026-05-13T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("first call under limit is allowed; remaining decrements", () => {
    const r1 = checkRateLimit("user-A", 3, 1000);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r1.retryAfterMs).toBe(0);

    const r2 = checkRateLimit("user-A", 3, 1000);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit("user-A", 3, 1000);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("call at the cap is rejected; retryAfterMs = oldest timestamp + window − now", () => {
    checkRateLimit("user-A", 2, 1000); // t=0
    vi.advanceTimersByTime(200);
    checkRateLimit("user-A", 2, 1000); // t=200 — at cap

    vi.advanceTimersByTime(100); // t=300
    const blocked = checkRateLimit("user-A", 2, 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    // Oldest timestamp t=0, window 1000ms → retryAfter = 0 + 1000 − 300 = 700
    expect(blocked.retryAfterMs).toBe(700);
  });

  it("recovers after the window slides", () => {
    checkRateLimit("user-A", 1, 1000);
    expect(checkRateLimit("user-A", 1, 1000).allowed).toBe(false);
    vi.advanceTimersByTime(1001); // window has fully elapsed
    expect(checkRateLimit("user-A", 1, 1000).allowed).toBe(true);
  });

  it("buckets are independent per key", () => {
    checkRateLimit("user-A", 1, 1000);
    expect(checkRateLimit("user-A", 1, 1000).allowed).toBe(false);
    // Different key — fresh bucket
    expect(checkRateLimit("user-B", 1, 1000).allowed).toBe(true);
  });

  it("retryAfterMs is never negative", () => {
    checkRateLimit("user-A", 1, 100);
    vi.advanceTimersByTime(500); // long past the window
    // Even though oldest is well outside, a fresh call should be allowed
    // (the limiter evicts on every call before checking).
    const r = checkRateLimit("user-A", 1, 100);
    expect(r.allowed).toBe(true);
    expect(r.retryAfterMs).toBe(0);
  });
});
