// Contract tests for POST /api/payouts.
//
// Strategy: mock the module boundary (Supabase, Prisma, auth) and assert on
// HTTP shape. The effectiveRules helper is kept real so override behavior is
// exercised end-to-end. The Prisma $transaction mock invokes the callback
// with a stub `tx` that mirrors the real client's surface.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@webflux/db", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@webflux/auth", () => ({ enrichSupabaseAuth: vi.fn() }));

import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@webflux/db";
import { enrichSupabaseAuth } from "@webflux/auth";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const FIRM_ID = "22222222-2222-2222-2222-222222222222";
const ACCOUNT_ID = "33333333-3333-3333-3333-333333333333";

function authClient(sub: string | null) {
  return {
    auth: {
      getClaims: vi
        .fn()
        .mockResolvedValue({ data: { claims: sub ? { sub } : null } }),
    },
  };
}

function req(body: unknown) {
  return new Request("http://test.local/api/payouts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    accountId: ACCOUNT_ID,
    requestedCents: 100_000, // $1000 — well above the $50 floor
    ...overrides,
  };
}

// Stub tx that yields an account funded long ago, with profit, no prior payouts.
function makeStubTx(overrides: {
  account?: Record<string, unknown> | null;
  fundedSince?: Date | null;
  lastPayout?: { requestedAt: Date } | null;
  updatedCount?: number;
} = {}) {
  const account = overrides.account === undefined
    ? {
        id: ACCOUNT_ID,
        userId: USER_ID,
        firmId: FIRM_ID,
        status: "funded",
        currentBalanceCents: 110_000n,
        startingBalanceCents: 100_000n,
        version: 0,
        ruleOverrides: {},
        overrideExpiresAt: null,
        config: {
          profitSplitPct: "80",
          totalDrawdownPct: "10",
          dailyDrawdownPct: "5",
          maxPositionsPerMarket: 1,
          maxPositionsTotal: 5,
          maxContractsPerOrder: 100,
          minTradingDays: 0,
        },
      }
    : overrides.account;

  return {
    $executeRaw: vi.fn().mockResolvedValue(0),
    account: {
      findFirst: vi.fn().mockResolvedValue(account),
      updateMany: vi
        .fn()
        .mockResolvedValue({ count: overrides.updatedCount ?? 1 }),
    },
    accountStateLog: {
      findFirst: vi.fn().mockResolvedValue(
        overrides.fundedSince === undefined
          ? { createdAt: new Date("2026-01-01T00:00:00Z") } // ~4 months ago
          : overrides.fundedSince === null
            ? null
            : { createdAt: overrides.fundedSince },
      ),
    },
    payout: {
      findFirst: vi.fn().mockResolvedValue(overrides.lastPayout ?? null),
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: "payout-1",
        ...data,
      })),
    },
    auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
  };
}

const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
const mockEnrich = enrichSupabaseAuth as unknown as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.setSystemTime(new Date("2026-05-13T00:00:00Z"));
  mockCreateClient.mockResolvedValue(authClient(USER_ID));
  mockEnrich.mockResolvedValue({
    userId: USER_ID,
    firmId: FIRM_ID,
    role: "trader",
  });
  // Default: transaction succeeds with happy-path tx stub.
  mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn(makeStubTx()),
  );
});

describe("POST /api/payouts — happy path", () => {
  it("201 + profit split honors per-account override", async () => {
    // Override raises split from 80% to 90% — we should see 0.9 * 100k = 90k.
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(
        makeStubTx({
          account: {
            id: ACCOUNT_ID,
            userId: USER_ID,
            firmId: FIRM_ID,
            status: "funded",
            currentBalanceCents: 200_000n,
            startingBalanceCents: 100_000n,
            version: 0,
            ruleOverrides: { profit_split_pct: 90 },
            overrideExpiresAt: null,
            config: {
              profitSplitPct: "80",
              totalDrawdownPct: "10",
              dailyDrawdownPct: "5",
              maxPositionsPerMarket: 1,
              maxPositionsTotal: 5,
              maxContractsPerOrder: 100,
              minTradingDays: 0,
            },
          },
        }),
      ),
    );
    const res = await POST(req(validBody()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.traderAmountCents).toBe("90000");
    expect(body.profitSplitPct).toBe("90");
  });

  it("expired override falls back to config split", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(
        makeStubTx({
          account: {
            id: ACCOUNT_ID,
            userId: USER_ID,
            firmId: FIRM_ID,
            status: "funded",
            currentBalanceCents: 200_000n,
            startingBalanceCents: 100_000n,
            version: 0,
            ruleOverrides: { profit_split_pct: 90 },
            overrideExpiresAt: new Date("2026-01-01T00:00:00Z"), // past
            config: {
              profitSplitPct: "80",
              totalDrawdownPct: "10",
              dailyDrawdownPct: "5",
              maxPositionsPerMarket: 1,
              maxPositionsTotal: 5,
              maxContractsPerOrder: 100,
              minTradingDays: 0,
            },
          },
        }),
      ),
    );
    const res = await POST(req(validBody()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.traderAmountCents).toBe("80000"); // 80% of 100k
  });
});

describe("POST /api/payouts — eligibility gates", () => {
  it("422 below_min_payout when request is under the floor", async () => {
    const res = await POST(req(validBody({ requestedCents: 100 })));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("below_min_payout");
  });

  it("422 min_funded_days_not_met when funded < 7 days", async () => {
    // Default stub has profit=10k cents; request 8k (above $50 floor, within profit).
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(
        makeStubTx({
          fundedSince: new Date("2026-05-10T00:00:00Z"), // 3 days before frozen "now"
        }),
      ),
    );
    const res = await POST(req(validBody({ requestedCents: 8000 })));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("min_funded_days_not_met");
    expect(body.minDaysFunded).toBe(7);
  });

  it("422 payout_cooldown_active when last payout < 14 days ago", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(
        makeStubTx({
          lastPayout: { requestedAt: new Date("2026-05-05T00:00:00Z") }, // 8 days ago
        }),
      ),
    );
    const res = await POST(req(validBody({ requestedCents: 8000 })));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("payout_cooldown_active");
    expect(body.cooldownDays).toBe(14);
  });

  it("422 no_profit when balance ≤ starting", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(
        makeStubTx({
          account: {
            id: ACCOUNT_ID,
            userId: USER_ID,
            firmId: FIRM_ID,
            status: "funded",
            currentBalanceCents: 100_000n,
            startingBalanceCents: 100_000n,
            version: 0,
            ruleOverrides: {},
            overrideExpiresAt: null,
            config: {
              profitSplitPct: "80",
              totalDrawdownPct: "10",
              dailyDrawdownPct: "5",
              maxPositionsPerMarket: 1,
              maxPositionsTotal: 5,
              maxContractsPerOrder: 100,
              minTradingDays: 0,
            },
          },
        }),
      ),
    );
    const res = await POST(req(validBody()));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("no_profit");
  });

  it("422 account_not_funded when status is anything else", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(
        makeStubTx({
          account: {
            id: ACCOUNT_ID,
            userId: USER_ID,
            firmId: FIRM_ID,
            status: "active",
            currentBalanceCents: 110_000n,
            startingBalanceCents: 100_000n,
            version: 0,
            ruleOverrides: {},
            overrideExpiresAt: null,
            config: {
              profitSplitPct: "80",
              totalDrawdownPct: "10",
              dailyDrawdownPct: "5",
              maxPositionsPerMarket: 1,
              maxPositionsTotal: 5,
              maxContractsPerOrder: 100,
              minTradingDays: 0,
            },
          },
        }),
      ),
    );
    const res = await POST(req(validBody()));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("account_not_funded");
  });

  it("404 when account doesn't exist for this trader", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(makeStubTx({ account: null })),
    );
    const res = await POST(req(validBody()));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/payouts — auth", () => {
  it("401 when no session", async () => {
    mockCreateClient.mockResolvedValue(authClient(null));
    const res = await POST(req(validBody()));
    expect(res.status).toBe(401);
  });

  it("403 when session has no firm membership", async () => {
    mockEnrich.mockResolvedValue(null);
    const res = await POST(req(validBody()));
    expect(res.status).toBe(403);
  });
});
