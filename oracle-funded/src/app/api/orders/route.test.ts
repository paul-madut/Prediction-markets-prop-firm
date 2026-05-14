// Contract tests for POST /api/orders.
//
// Strategy: mock the module boundary (Supabase, Prisma, the fillOrder/evalTick
// engine), keep @webflux/utils real so validateOrder + checkRateLimit run for
// real. Assertions target HTTP shape, not internal behaviour — the engine has
// its own unit tests under packages/utils/src/*.test.ts.
//
// Rate limiter state is module-scoped; we reset it between tests so test order
// doesn't leak budget.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetRateLimitForTests } from "@webflux/utils";

// ─── Module mocks (hoisted by vitest) ────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@webflux/db", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
    },
    account: { findFirst: vi.fn() },
    position: { findFirst: vi.fn(), count: vi.fn() },
    newsEvent: { findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@webflux/auth", () => ({
  enrichSupabaseAuth: vi.fn(),
}));

vi.mock("@/lib/order-engine/fill-order", () => ({
  fillOrder: vi.fn(),
}));

vi.mock("@/lib/eval-engine/tick", () => ({
  evalTick: vi.fn(),
}));

// Now import the route + the mocked modules.
import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@webflux/db";
import { enrichSupabaseAuth } from "@webflux/auth";
import { fillOrder } from "@/lib/order-engine/fill-order";
import { evalTick } from "@/lib/eval-engine/tick";

// ─── Test helpers ────────────────────────────────────────────────────────────

const USER_ID = "11111111-1111-1111-1111-111111111111";
const FIRM_ID = "22222222-2222-2222-2222-222222222222";
const ACCOUNT_ID = "33333333-3333-3333-3333-333333333333";
const IDEMPOTENCY_KEY = "44444444-4444-4444-4444-444444444444";

function authClient(sub: string | null) {
  return {
    auth: {
      getClaims: vi
        .fn()
        .mockResolvedValue({ data: { claims: sub ? { sub } : null } }),
    },
  };
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    accountId: ACCOUNT_ID,
    venue: "polymarket",
    externalMarketId: "m1",
    externalMarketTicker: "m1",
    side: "yes",
    action: "buy",
    sizeContracts: 10,
    idempotencyKey: IDEMPOTENCY_KEY,
    ...overrides,
  };
}

function req(body: unknown) {
  return new Request("http://test.local/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function stubTraderAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: ACCOUNT_ID,
    userId: USER_ID,
    status: "active",
    config: {
      maxContractsPerOrder: 100,
      maxPositionsPerMarket: 1,
      maxPositionsTotal: 5,
    },
    firm: { enabledVenues: ["polymarket"] },
    ...overrides,
  };
}

const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
const mockEnrich = enrichSupabaseAuth as unknown as ReturnType<typeof vi.fn>;
const mockFill = fillOrder as unknown as ReturnType<typeof vi.fn>;
const mockEvalTick = evalTick as unknown as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as unknown as {
  order: {
    findUnique: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  account: { findFirst: ReturnType<typeof vi.fn> };
  position: {
    findFirst: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  newsEvent: { findFirst: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  // Reset all mocks (call history + impls) and the rate-limiter bucket.
  vi.clearAllMocks();
  resetRateLimitForTests();

  // Sensible defaults — happy-path-ready. Tests override per scenario.
  mockCreateClient.mockResolvedValue(authClient(USER_ID));
  mockEnrich.mockResolvedValue({
    userId: USER_ID,
    firmId: FIRM_ID,
    role: "trader",
  });
  mockPrisma.order.findUnique.mockResolvedValue(null);
  mockPrisma.account.findFirst.mockResolvedValue(stubTraderAccount());
  mockPrisma.position.findFirst.mockResolvedValue(null);
  mockPrisma.position.count.mockResolvedValue(0);
  mockPrisma.newsEvent.findFirst.mockResolvedValue(null);
  mockPrisma.order.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: "ord-1",
      ...data,
    }),
  );
  mockPrisma.auditLog.create.mockResolvedValue({ id: "audit-1" });
  mockPrisma.order.findUniqueOrThrow.mockResolvedValue({
    id: "ord-1",
    status: "filled",
    filledAt: new Date(),
  });
  mockFill.mockResolvedValue({
    ok: true,
    tradeId: "trade-1",
    fillPriceCents: 45,
  });
  mockEvalTick.mockResolvedValue({ ok: true });
});

// ─── Auth ────────────────────────────────────────────────────────────────────

describe("POST /api/orders — auth", () => {
  it("401 when no session", async () => {
    mockCreateClient.mockResolvedValue(authClient(null));
    const res = await POST(req(validBody()));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Not authenticated");
  });

  it("403 when session has no firm membership", async () => {
    mockEnrich.mockResolvedValue(null);
    const res = await POST(req(validBody()));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("No firm membership found");
  });
});

// ─── Shape validation ────────────────────────────────────────────────────────

describe("POST /api/orders — body validation", () => {
  it("400 on missing accountId / venue / externalMarketId / ticker", async () => {
    const res = await POST(req(validBody({ accountId: "" })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/accountId, venue/);
  });

  it("400 on invalid side", async () => {
    const res = await POST(req(validBody({ side: "maybe" })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/side must be/);
  });

  it("400 on invalid action", async () => {
    const res = await POST(req(validBody({ action: "hodl" })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/action must be/);
  });

  it("400 on zero or negative size", async () => {
    const r1 = await POST(req(validBody({ sizeContracts: 0 })));
    expect(r1.status).toBe(400);
    const r2 = await POST(req(validBody({ sizeContracts: -5 })));
    expect(r2.status).toBe(400);
  });

  it("400 on non-UUID idempotency key", async () => {
    const res = await POST(req(validBody({ idempotencyKey: "not-a-uuid" })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/idempotencyKey/);
  });

  it("400 on unsupported orderType (not market/limit)", async () => {
    const res = await POST(req(validBody({ orderType: "stop-loss" })));
    expect(res.status).toBe(400);
  });

  it("422 on orderType=limit (rejected, not supported in MVP)", async () => {
    const res = await POST(req(validBody({ orderType: "limit" })));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.rejectedReason).toBe("limit_orders_not_supported");
  });
});

// ─── Idempotency + access control ────────────────────────────────────────────

describe("POST /api/orders — idempotency + access control", () => {
  it("replay returns the original order without re-running the chain", async () => {
    const original = { id: "ord-original", firmId: FIRM_ID, status: "filled" };
    mockPrisma.order.findUnique.mockResolvedValue(original);
    const res = await POST(req(validBody()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("ord-original");
    // The fill engine should not have been invoked on a replay.
    expect(mockFill).not.toHaveBeenCalled();
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
  });

  it("409 when idempotency key was used by a different firm", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "ord-other",
      firmId: "different-firm",
      status: "filled",
    });
    const res = await POST(req(validBody()));
    expect(res.status).toBe(409);
  });

  it("404 when account is not in caller's firm", async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);
    const res = await POST(req(validBody()));
    expect(res.status).toBe(404);
  });

  it("403 when trader submits on someone else's account", async () => {
    mockPrisma.account.findFirst.mockResolvedValue(
      stubTraderAccount({ userId: "other-user" }),
    );
    const res = await POST(req(validBody()));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/not your account/);
  });
});

// ─── validateOrder rejection surface ─────────────────────────────────────────

describe("POST /api/orders — validateOrder rejections", () => {
  it("422 + 'Order rejected: <reason>' when validateOrder rejects (account disabled)", async () => {
    mockPrisma.account.findFirst.mockResolvedValue(
      stubTraderAccount({ status: "disabled" }),
    );
    const res = await POST(req(validBody()));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.validationError).toBe("not_tradeable_state");
    expect(body.error).toBe("Order rejected: not_tradeable_state");
    // The handler still persists the rejected order for audit purposes.
    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "rejected" }),
      }),
    );
  });

  it("422 on position-limit when adding a new market past the cap", async () => {
    mockPrisma.position.count.mockResolvedValue(5);
    mockPrisma.account.findFirst.mockResolvedValue(
      stubTraderAccount({
        config: {
          maxContractsPerOrder: 100,
          maxPositionsPerMarket: 1,
          maxPositionsTotal: 5,
        },
      }),
    );
    const res = await POST(req(validBody()));
    expect(res.status).toBe(422);
    expect((await res.json()).validationError).toBe("position_limit_exceeded");
  });
});

// ─── Happy path ──────────────────────────────────────────────────────────────

describe("POST /api/orders — happy path", () => {
  it("201 with fillPriceCents + tradeId + invokes fillOrder + evalTick", async () => {
    const res = await POST(req(validBody()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.fillPriceCents).toBe(45);
    expect(body.tradeId).toBe("trade-1");
    expect(mockFill).toHaveBeenCalledOnce();
    expect(mockEvalTick).toHaveBeenCalledWith(ACCOUNT_ID);
  });

  it("201 with fillError when the fill cannot complete (e.g. no quote)", async () => {
    mockFill.mockResolvedValue({ ok: false, reason: "no_quote_for_market" });
    const res = await POST(req(validBody()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.fillError).toBe("no_quote_for_market");
    // evalTick should NOT run when fill failed — order stays pending.
    expect(mockEvalTick).not.toHaveBeenCalled();
  });

  it("the post-fill evalTick failing does NOT fail the order", async () => {
    mockEvalTick.mockRejectedValue(new Error("eval blew up"));
    const res = await POST(req(validBody()));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.fillPriceCents).toBe(45);
  });
});
