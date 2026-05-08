// POST /api/checkout
//
// Creates a Stripe Checkout Session for a challenge purchase, persists a
// pending `payments` row with the session id, and returns the redirect URL.
//
// The webhook handler (POST /api/stripe/webhook) is the canonical
// provisioning path — `checkout.session.completed` flips the payment to
// 'paid' and creates the trader's account. This route is just the
// "kick off purchase" half.
//
// Auth: caller must be a registered firm member. The trader UI shows
// available challenge_configs and posts the chosen configId here.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@webflux/db";
import { enrichSupabaseAuth } from "@webflux/auth";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const ctx = await enrichSupabaseAuth(data.claims, prisma);
  if (!ctx) return NextResponse.json({ error: "No firm membership found" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const configId =
    body !== null && typeof body === "object" && "configId" in body && typeof (body as Record<string, unknown>).configId === "string"
      ? ((body as Record<string, unknown>).configId as string).trim()
      : "";
  if (!configId) {
    return NextResponse.json({ error: "configId is required" }, { status: 400 });
  }

  const config = await prisma.challengeConfig.findFirst({
    where: { id: configId, firmId: ctx.firmId, isActive: true },
    select: {
      id: true,
      name: true,
      challengeFeeCents: true,
      accountSizeCents: true,
    },
  });
  if (!config) {
    return NextResponse.json({ error: "Challenge config not found or inactive" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    success_url: `${appUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard?checkout=cancel`,
    customer_email: data.claims.email as string | undefined,
    // Single line item for the challenge fee. Stripe expects amount in the
    // currency's smallest unit; the firm's challenge_fee_cents is already cents.
    line_items: [
      {
        price_data: {
          currency: "cad",
          unit_amount: config.challengeFeeCents,
          product_data: {
            name: config.name,
            description: `$${(Number(config.accountSizeCents) / 100).toLocaleString()} evaluation challenge`,
          },
        },
        quantity: 1,
      },
    ],
    // Echo identity through metadata so the webhook can pair the session
    // back to the right firm/user/config without re-auth.
    metadata: {
      firmId: ctx.firmId,
      userId: ctx.userId,
      configId: config.id,
    },
  });

  // Insert the payment row in 'pending' state. The webhook handler will flip
  // it to 'paid' (or leave it as evidence of an abandoned cart).
  const payment = await prisma.payment.create({
    data: {
      firmId: ctx.firmId,
      userId: ctx.userId,
      configId: config.id,
      stripeSessionId: session.id,
      amountCents: config.challengeFeeCents,
      status: "pending",
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      firmId: ctx.firmId,
      actorUserId: ctx.userId,
      action: "checkout.session.created",
      entityType: "payment",
      entityId: payment.id,
      afterState: {
        stripeSessionId: session.id,
        configId: config.id,
        amountCents: config.challengeFeeCents,
      },
    },
  });

  return NextResponse.json({ url: session.url, sessionId: session.id, paymentId: payment.id });
}
