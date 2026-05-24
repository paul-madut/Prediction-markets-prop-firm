// POST /api/authnet/webhook
//
// Authorize.net Webhook Notifications endpoint. Responsibilities:
//   1. Signature verification — HMAC-SHA512 with the Webhooks Signature Key.
//   2. Idempotency — `payments.stripe_event_id` is unique; replays no-op.
//   3. Provisioning — authcapture.created flips the payment to 'paid' and
//      creates the trader's account in a single Prisma transaction.
//
// Refunds: net.authorize.payment.refund.created marks the payment refunded
// and (per config) disables the underlying account.
//
// The route MUST consume the raw request body (not parsed JSON) for HMAC
// to verify byte-for-byte. Next.js App Router's req.text() returns the
// raw body string.

import { NextResponse } from "next/server";
import { prisma } from "@webflux/db";
import {
  parseWebhookEvent,
  verifyWebhookSignature,
  type AuthnetWebhookEvent,
} from "@/lib/payments/authnet";
import {
  provisionAccountFromPayment,
  applyRefund,
} from "@/lib/payments/provisioning";

const PROVISION_EVENTS = new Set([
  "net.authorize.payment.authcapture.created",
  "net.authorize.payment.capture.created",
]);

const REFUND_EVENTS = new Set([
  "net.authorize.payment.refund.created",
  "net.authorize.payment.void.created",
]);

export async function POST(req: Request) {
  const signature = req.headers.get("x-anet-signature");
  const rawBody = await req.text();

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: AuthnetWebhookEvent;
  try {
    event = parseWebhookEvent(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    if (PROVISION_EVENTS.has(event.eventType)) {
      await handleProvision(event);
    } else if (REFUND_EVENTS.has(event.eventType)) {
      await handleRefund(event);
    } else {
      return NextResponse.json({
        received: true,
        handled: false,
        eventType: event.eventType,
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
    console.error("[authnet.webhook]", event.eventType, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true, handled: true, eventType: event.eventType });
}

async function handleProvision(event: AuthnetWebhookEvent): Promise<void> {
  // Authorize.net only fires this event on successful authCapture, but
  // double-check the responseCode (1 = Approved) before we provision.
  if (event.payload.responseCode !== 1) return;

  const invoiceNumber = event.payload.invoiceNumber;
  if (!invoiceNumber) {
    throw new Error(`event ${event.notificationId} missing invoiceNumber`);
  }

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { stripeSessionId: invoiceNumber },
      select: {
        id: true,
        firmId: true,
        userId: true,
        configId: true,
        status: true,
      },
    });
    if (!payment) throw new Error(`no payment for invoiceNumber ${invoiceNumber}`);

    await provisionAccountFromPayment({
      tx,
      payment,
      externalEventId: event.notificationId,
      externalRef: `authnet txn ${event.payload.id}`,
    });
  });
}

async function handleRefund(event: AuthnetWebhookEvent): Promise<void> {
  const invoiceNumber = event.payload.invoiceNumber;
  if (!invoiceNumber) return;

  await prisma.$transaction(async (tx) => {
    await applyRefund({
      tx,
      externalSessionId: invoiceNumber,
      externalEventId: event.notificationId,
      externalRef: `authnet txn ${event.payload.id}`,
    });
  });
}
