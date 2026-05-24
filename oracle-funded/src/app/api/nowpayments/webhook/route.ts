// POST /api/nowpayments/webhook
//
// NOWPayments IPN endpoint. NOWPayments POSTs a state-change notification at
// every status transition (waiting → confirming → confirmed → finished).
// We only provision on "finished" — at that point the trader's crypto has
// been swapped to our settlement currency and credited to our balance.
//
// Responsibilities:
//   1. Signature verification — HMAC-SHA512 of canonical (sorted-keys) JSON
//      using the IPN secret.
//   2. Idempotency — `payments.stripe_event_id` is unique; replays no-op.
//      Because NOWPayments may fire "finished" once but other terminal
//      states (refunded, expired) once each, we use payment_id + status
//      as the idempotency token so each terminal state is recorded once.
//   3. Provisioning — on "finished", flip Payment to paid + provision
//      account in a single transaction.

import { NextResponse } from "next/server";
import { prisma } from "@webflux/db";
import {
  parseIpnPayload,
  verifyIpnSignature,
  type NowIpnPayload,
} from "@/lib/payments/nowpayments";
import {
  provisionAccountFromPayment,
  applyRefund,
} from "@/lib/payments/provisioning";

export async function POST(req: Request) {
  const signature = req.headers.get("x-nowpayments-sig");
  const rawBody = await req.text();

  if (!verifyIpnSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: NowIpnPayload;
  try {
    payload = parseIpnPayload(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Compose the idempotency token. NOWPayments fires multiple IPNs per
  // invoice (one per status change); we want each terminal state to land
  // exactly once.
  const externalEventId = `now_${payload.payment_id}_${payload.payment_status}`;

  try {
    switch (payload.payment_status) {
      case "finished":
        await handleFinished(payload, externalEventId);
        break;
      case "refunded":
        await handleRefunded(payload, externalEventId);
        break;
      // Non-terminal states (waiting, confirming, confirmed, sending,
      // partially_paid) are just ack'd. Terminal failure states (failed,
      // expired) are also acked — the Payment row stays "pending" forever,
      // which is fine; the trader will simply not get provisioned.
      default:
        return NextResponse.json({
          received: true,
          handled: false,
          status: payload.payment_status,
        });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "already_processed") {
      return NextResponse.json({
        received: true,
        handled: false,
        reason: "already_processed",
      });
    }
    console.error("[nowpayments.webhook]", payload.payment_status, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    received: true,
    handled: true,
    status: payload.payment_status,
  });
}

async function handleFinished(
  payload: NowIpnPayload,
  externalEventId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // order_id is our internal payment.id (set on invoice creation).
    const payment = await tx.payment.findUnique({
      where: { id: payload.order_id },
      select: {
        id: true,
        firmId: true,
        userId: true,
        configId: true,
        status: true,
      },
    });
    if (!payment) throw new Error(`no payment for order_id ${payload.order_id}`);

    await provisionAccountFromPayment({
      tx,
      payment,
      externalEventId,
      externalRef: `nowpayments invoice ${payload.payment_id}`,
    });
  });
}

async function handleRefunded(
  payload: NowIpnPayload,
  externalEventId: string,
): Promise<void> {
  // Look up the payment by order_id (our internal id) → grab the external
  // session id (NOWPayments invoice id) to thread into the shared refund
  // helper, which expects to find the payment by externalSessionId.
  const payment = await prisma.payment.findUnique({
    where: { id: payload.order_id },
    select: { stripeSessionId: true },
  });
  if (!payment?.stripeSessionId) return;

  await prisma.$transaction(async (tx) => {
    await applyRefund({
      tx,
      externalSessionId: payment.stripeSessionId!,
      externalEventId,
      externalRef: `nowpayments invoice ${payload.payment_id}`,
    });
  });
}
