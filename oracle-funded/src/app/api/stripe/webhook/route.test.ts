// Contract tests for POST /api/stripe/webhook.
//
// Strategy: mock the Stripe SDK (so signature verification is a stub) and
// stub prisma.$transaction so its callback receives a tx-shaped fake. Real
// Stripe signature verification is exercised by Stripe themselves; here we
// care that the route honors the contract — sig present, idempotency, three
// event types, audit logging.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@webflux/db", () => {
  const tx = {
    payment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    challengeConfig: { findFirst: vi.fn() },
    account: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    accountStateLog: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    prisma: {
      $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
      // expose for assertions
      __tx: tx,
    },
  };
});

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(),
}));

import { POST } from "./route";
import { prisma } from "@webflux/db";
import { getStripe } from "@/lib/stripe";

const mockGetStripe = getStripe as unknown as ReturnType<typeof vi.fn>;
const tx = (prisma as unknown as { __tx: Record<string, Record<string, ReturnType<typeof vi.fn>>> }).__tx;

const WEBHOOK_SECRET = "whsec_test";
const FIRM_ID = "firm-1";
const USER_ID = "user-1";
const CONFIG_ID = "config-1";
const SESSION_ID = "cs_test_abc";
const EVENT_ID = "evt_test_1";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
});

function req(rawBody: string, headers: Record<string, string> = {}) {
  return new Request("http://test.local/api/stripe/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: rawBody,
  });
}

function stripeWith(constructEventImpl: (...args: unknown[]) => unknown) {
  return {
    webhooks: { constructEvent: vi.fn(constructEventImpl) },
    checkout: { sessions: { list: vi.fn() } },
    charges: { retrieve: vi.fn() },
  };
}

// ─── Signature gate ──────────────────────────────────────────────────────────

describe("POST /api/stripe/webhook — signature gate", () => {
  it("400 when stripe-signature header is missing", async () => {
    mockGetStripe.mockReturnValue(stripeWith(() => null));
    const res = await POST(req("{}"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Missing stripe-signature/);
  });

  it("400 when constructEvent throws (bad signature)", async () => {
    mockGetStripe.mockReturnValue(
      stripeWith(() => {
        throw new Error("No signatures found matching the expected signature");
      }),
    );
    const res = await POST(req("{}", { "stripe-signature": "t=0,v1=bogus" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/signatures found/);
  });

  it("500 when STRIPE_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    mockGetStripe.mockReturnValue(stripeWith(() => null));
    const res = await POST(req("{}", { "stripe-signature": "t=0,v1=x" }));
    expect(res.status).toBe(500);
  });
});

// ─── Idempotency replay ──────────────────────────────────────────────────────

describe("POST /api/stripe/webhook — idempotency", () => {
  it("replayed event returns 200 with 'already_processed' reason", async () => {
    const event = {
      id: EVENT_ID,
      type: "checkout.session.completed",
      data: {
        object: {
          id: SESSION_ID,
          metadata: { firmId: FIRM_ID, userId: USER_ID, configId: CONFIG_ID },
        },
      },
    };
    mockGetStripe.mockReturnValue(stripeWith(() => event));
    // Idempotency hit on the very first findUnique inside the transaction
    tx.payment.findUnique.mockResolvedValueOnce({ id: "existing-payment" });

    const res = await POST(req("raw-body", { "stripe-signature": "ok" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.handled).toBe(false);
    expect(body.reason).toBe("already_processed");
    // We should NOT have proceeded to provision anything.
    expect(tx.account.create).not.toHaveBeenCalled();
  });
});

// ─── checkout.session.completed: provisioning ────────────────────────────────

describe("POST /api/stripe/webhook — checkout.session.completed", () => {
  it("provisions account + payment update + state log + audit log", async () => {
    const event = {
      id: EVENT_ID,
      type: "checkout.session.completed",
      data: {
        object: {
          id: SESSION_ID,
          metadata: { firmId: FIRM_ID, userId: USER_ID, configId: CONFIG_ID },
        },
      },
    };
    mockGetStripe.mockReturnValue(stripeWith(() => event));

    tx.payment.findUnique.mockResolvedValueOnce(null); // not a replay
    tx.payment.findFirst.mockResolvedValueOnce({
      id: "payment-1",
      status: "pending",
    });
    tx.challengeConfig.findFirst.mockResolvedValueOnce({
      id: CONFIG_ID,
      accountSizeCents: 500_000n,
      totalDrawdownPct: 10,
      phases: [{ id: "phase-1" }],
    });
    tx.account.create.mockResolvedValueOnce({ id: "account-1" });
    tx.payment.update.mockResolvedValueOnce({ id: "payment-1" });
    tx.accountStateLog.create.mockResolvedValueOnce({ id: "log-1" });
    tx.auditLog.create.mockResolvedValueOnce({ id: "audit-1" });

    const res = await POST(req("raw-body", { "stripe-signature": "ok" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.handled).toBe(true);
    expect(body.eventType).toBe("checkout.session.completed");

    // Account row created with status='active' and the right starting balance.
    expect(tx.account.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firmId: FIRM_ID,
          userId: USER_ID,
          configId: CONFIG_ID,
          currentPhaseId: "phase-1",
          status: "active",
          startingBalanceCents: 500_000n,
        }),
      }),
    );
    // Payment flipped to paid and stamped with the event id (idempotency anchor).
    expect(tx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "payment-1" },
        data: expect.objectContaining({
          status: "paid",
          stripeEventId: EVENT_ID,
          accountId: "account-1",
        }),
      }),
    );
    // Audit log created.
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firmId: FIRM_ID,
          actorUserId: USER_ID,
          action: "account.provision",
          entityType: "account",
          entityId: "account-1",
        }),
      }),
    );
  });

  it("500 when session metadata is missing required fields", async () => {
    const event = {
      id: EVENT_ID,
      type: "checkout.session.completed",
      data: { object: { id: SESSION_ID, metadata: {} } },
    };
    mockGetStripe.mockReturnValue(stripeWith(() => event));
    const res = await POST(req("raw", { "stripe-signature": "ok" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/metadata missing/);
  });
});

// ─── charge.refunded: status flip + optional account disable ─────────────────

describe("POST /api/stripe/webhook — charge.refunded", () => {
  it("flips payment to refunded and disables account when config says so", async () => {
    const event = {
      id: EVENT_ID,
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_test_1",
          payment_intent: null,
          metadata: { stripe_session_id: SESSION_ID },
        },
      },
    };
    mockGetStripe.mockReturnValue(stripeWith(() => event));

    tx.payment.findUnique.mockResolvedValueOnce(null);
    tx.payment.findFirst.mockResolvedValueOnce({
      id: "payment-1",
      firmId: FIRM_ID,
      accountId: "account-1",
      config: { refundDisablesAccount: true },
    });
    tx.account.findUnique.mockResolvedValueOnce({ status: "active" });

    const res = await POST(req("raw", { "stripe-signature": "ok" }));
    expect(res.status).toBe(200);
    expect((await res.json()).eventType).toBe("charge.refunded");

    expect(tx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "payment-1" },
        data: expect.objectContaining({
          status: "refunded",
          stripeEventId: EVENT_ID,
        }),
      }),
    );
    expect(tx.account.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "account-1" },
        data: expect.objectContaining({ status: "disabled" }),
      }),
    );
  });

  it("does NOT disable account when refundDisablesAccount is false", async () => {
    const event = {
      id: EVENT_ID,
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_test_2",
          payment_intent: null,
          metadata: { stripe_session_id: SESSION_ID },
        },
      },
    };
    mockGetStripe.mockReturnValue(stripeWith(() => event));

    tx.payment.findUnique.mockResolvedValueOnce(null);
    tx.payment.findFirst.mockResolvedValueOnce({
      id: "payment-1",
      firmId: FIRM_ID,
      accountId: "account-1",
      config: { refundDisablesAccount: false },
    });

    const res = await POST(req("raw", { "stripe-signature": "ok" }));
    expect(res.status).toBe(200);
    expect(tx.account.update).not.toHaveBeenCalled();
    expect(tx.payment.update).toHaveBeenCalled();
  });
});

// ─── charge.dispute.created: mark for review ─────────────────────────────────

describe("POST /api/stripe/webhook — charge.dispute.created", () => {
  it("marks payment as disputed + writes audit log", async () => {
    const event = {
      id: EVENT_ID,
      type: "charge.dispute.created",
      data: { object: { id: "dp_test_1", charge: "ch_test_1" } },
    };
    const stripeStub = {
      webhooks: { constructEvent: vi.fn(() => event) },
      charges: {
        retrieve: vi.fn().mockResolvedValue({
          id: "ch_test_1",
          payment_intent: "pi_test_1",
        }),
      },
      checkout: {
        sessions: {
          list: vi.fn().mockResolvedValue({ data: [{ id: SESSION_ID }] }),
        },
      },
    };
    mockGetStripe.mockReturnValue(stripeStub);

    tx.payment.findUnique.mockResolvedValueOnce(null);
    tx.payment.findFirst.mockResolvedValueOnce({
      id: "payment-1",
      firmId: FIRM_ID,
      accountId: "account-1",
    });

    const res = await POST(req("raw", { "stripe-signature": "ok" }));
    expect(res.status).toBe(200);
    expect((await res.json()).eventType).toBe("charge.dispute.created");

    expect(tx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "disputed",
          stripeEventId: EVENT_ID,
        }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "payment.disputed",
          entityType: "payment",
        }),
      }),
    );
  });
});

// ─── Unhandled event types ───────────────────────────────────────────────────

describe("POST /api/stripe/webhook — unhandled events", () => {
  it("acks unhandled event types as { handled: false }", async () => {
    const event = { id: EVENT_ID, type: "invoice.paid", data: { object: {} } };
    mockGetStripe.mockReturnValue(stripeWith(() => event));
    const res = await POST(req("raw", { "stripe-signature": "ok" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.handled).toBe(false);
    expect(body.eventType).toBe("invoice.paid");
  });
});
