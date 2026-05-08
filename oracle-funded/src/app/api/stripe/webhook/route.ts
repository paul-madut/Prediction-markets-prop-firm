// POST /api/stripe/webhook
//
// Stripe webhook handler. Three responsibilities:
//   1. Signature verification — reject anything not signed with our secret.
//   2. Idempotency — every successful event id is recorded on the payments
//      row's `stripe_event_id` (UNIQUE). A replayed event is a 200 no-op.
//   3. Provisioning — `checkout.session.completed` flips the payment to
//      'paid' and creates the trader's account in a single Prisma tx.
//
// Refund + dispute paths disable the underlying account by default
// (config.refundDisablesAccount).
//
// The route MUST receive the raw request body (not parsed JSON) so the
// Stripe SDK can verify the signature byte-for-byte. Next.js App Router's
// `req.text()` returns the raw body string; that's what we pass to
// `stripe.webhooks.constructEvent`.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@webflux/db";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event);
        break;
      case "charge.dispute.created":
        await handleDisputeCreated(event);
        break;
      default:
        // Unhandled event types are ack'd but not processed.
        return NextResponse.json({ received: true, handled: false, eventType: event.type });
    }
  } catch (err) {
    // Returning 5xx makes Stripe retry. We want that for transient failures
    // (DB blip) but NOT for "already processed" — those are returned 200.
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "already_processed") {
      return NextResponse.json({ received: true, handled: false, reason: "already_processed" });
    }
    console.error("[stripe.webhook]", event.type, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true, handled: true, eventType: event.type });
}

// ─── Provisioning: checkout.session.completed ───────────────────────────────
async function handleCheckoutCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const md = session.metadata ?? {};
  const firmId = md.firmId;
  const userId = md.userId;
  const configId = md.configId;
  if (!firmId || !userId || !configId) {
    throw new Error(`metadata missing on session ${session.id} (firmId/userId/configId)`);
  }

  await prisma.$transaction(async (tx) => {
    // Idempotency: if any row already carries this event id, this is a replay.
    const existing = await tx.payment.findUnique({
      where: { stripeEventId: event.id },
      select: { id: true },
    });
    if (existing) throw new Error("already_processed");

    // Find the pending payment row created by /api/checkout.
    const payment = await tx.payment.findFirst({
      where: { stripeSessionId: session.id, firmId },
      select: { id: true, status: true },
    });
    if (!payment) {
      throw new Error(`no payment row for session ${session.id}`);
    }
    if (payment.status === "paid") {
      // Already processed via a different code path (e.g. a previous tx).
      // Stamp the event id and exit.
      await tx.payment.update({
        where: { id: payment.id },
        data: { stripeEventId: event.id },
      });
      return;
    }

    const config = await tx.challengeConfig.findFirst({
      where: { id: configId, firmId, isActive: true },
      include: {
        phases: { orderBy: { phaseNumber: "asc" }, take: 1, select: { id: true } },
      },
    });
    if (!config || config.phases.length === 0) {
      throw new Error(`config ${configId} not found or has no phases`);
    }
    const firstPhase = config.phases[0];

    // Drawdown floor at provisioning time (matches POST /api/accounts logic).
    const startingBalance = config.accountSizeCents;
    const drawdownBps = BigInt(Math.round(Number(config.totalDrawdownPct) * 100));
    const drawdownAmount = (startingBalance * drawdownBps) / 10000n;
    const drawdownFloor = startingBalance - drawdownAmount;

    const account = await tx.account.create({
      data: {
        firmId,
        userId,
        configId: config.id,
        currentPhaseId: firstPhase.id,
        status: "active", // payment confirmed → active
        startingBalanceCents: startingBalance,
        currentBalanceCents: startingBalance,
        highestEodBalanceCents: startingBalance,
        highestEodEquityCents: startingBalance,
        drawdownFloorCents: drawdownFloor,
        dayStartEquityCents: startingBalance,
      },
      select: { id: true },
    });

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "paid",
        paidAt: new Date(),
        stripeEventId: event.id,
        accountId: account.id,
      },
    });

    await tx.accountStateLog.create({
      data: {
        firmId,
        accountId: account.id,
        fromStatus: null,
        toStatus: "active",
        reason: `provisioned via checkout session ${session.id}`,
      },
    });

    await tx.auditLog.create({
      data: {
        firmId,
        actorUserId: userId,
        action: "account.provision",
        entityType: "account",
        entityId: account.id,
        afterState: {
          configId: config.id,
          stripeSessionId: session.id,
          stripeEventId: event.id,
          startingBalanceCents: startingBalance.toString(),
        },
      },
    });
  });
}

// ─── Refund: charge.refunded → disable account by default ───────────────────
async function handleChargeRefunded(event: Stripe.Event): Promise<void> {
  const charge = event.data.object as Stripe.Charge;
  const sessionId = charge.metadata?.stripe_session_id ?? null;
  // Charges from Checkout sessions: the session id is on the related
  // PaymentIntent, fetched lazily.
  let resolvedSessionId = sessionId;
  if (!resolvedSessionId && charge.payment_intent) {
    const stripe = getStripe();
    const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent.id;
    const sessions = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 });
    resolvedSessionId = sessions.data[0]?.id ?? null;
  }
  if (!resolvedSessionId) {
    // Charge wasn't from a Checkout session we tracked. Ack and exit.
    return;
  }

  await prisma.$transaction(async (tx) => {
    const dup = await tx.payment.findUnique({
      where: { stripeEventId: event.id },
      select: { id: true },
    });
    if (dup) throw new Error("already_processed");

    const payment = await tx.payment.findFirst({
      where: { stripeSessionId: resolvedSessionId },
      include: { config: { select: { refundDisablesAccount: true } } },
    });
    if (!payment) return;

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "refunded",
        refundedAt: new Date(),
        stripeEventId: event.id,
      },
    });

    if (payment.config.refundDisablesAccount && payment.accountId) {
      const before = await tx.account.findUnique({
        where: { id: payment.accountId },
        select: { status: true },
      });
      if (before && before.status !== "disabled") {
        await tx.account.update({
          where: { id: payment.accountId },
          data: { status: "disabled", version: { increment: 1 } },
        });
        await tx.accountStateLog.create({
          data: {
            firmId: payment.firmId,
            accountId: payment.accountId,
            fromStatus: before.status,
            toStatus: "disabled",
            reason: `disabled by refund (charge ${charge.id})`,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        firmId: payment.firmId,
        action: "payment.refunded",
        entityType: "payment",
        entityId: payment.id,
        afterState: {
          chargeId: charge.id,
          stripeEventId: event.id,
          accountDisabled: payment.config.refundDisablesAccount,
        },
      },
    });
  });
}

// ─── Dispute: charge.dispute.created → mark account for admin review ────────
async function handleDisputeCreated(event: Stripe.Event): Promise<void> {
  const dispute = event.data.object as Stripe.Dispute;
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;

  await prisma.$transaction(async (tx) => {
    const dup = await tx.payment.findUnique({
      where: { stripeEventId: event.id },
      select: { id: true },
    });
    if (dup) throw new Error("already_processed");

    // Look up the payment via the charge → PaymentIntent → session chain.
    const stripe = getStripe();
    const charge = await stripe.charges.retrieve(chargeId, {
      expand: ["payment_intent"],
    });
    const piId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (!piId) return;
    const sessions = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 });
    const sessionId = sessions.data[0]?.id;
    if (!sessionId) return;

    const payment = await tx.payment.findFirst({
      where: { stripeSessionId: sessionId },
      select: { id: true, firmId: true, accountId: true },
    });
    if (!payment) return;

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "disputed",
        stripeEventId: event.id,
      },
    });

    await tx.auditLog.create({
      data: {
        firmId: payment.firmId,
        action: "payment.disputed",
        entityType: "payment",
        entityId: payment.id,
        afterState: {
          disputeId: dispute.id,
          chargeId,
          stripeEventId: event.id,
        },
      },
    });
  });
}
