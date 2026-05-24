// POST /api/checkout
//
// Creates a pending Payment row and returns a redirect target for the
// caller. Two methods supported:
//
//   method=card    → Authorize.net Accept Hosted. We return the hosted form
//                    URL + a single-use token. The client builds an
//                    auto-submit POST form to deliver the user to the
//                    hosted payment page (PCI scope: SAQ-A).
//   method=crypto  → NOWPayments invoice. We return the invoice URL; the
//                    client does window.location.href = url.
//
// The webhook handlers (/api/authnet/webhook, /api/nowpayments/webhook) are
// the canonical provisioning paths — they verify HMAC, mark the payment
// "paid", and create the trader's account in a Prisma transaction. This
// route is just the "kick off purchase" half.
//
// See src/lib/payments/README.md for the architecture diagram and the
// rationale for switching off Stripe.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@webflux/db";
import { enrichSupabaseAuth } from "@webflux/auth";
import { createHostedPaymentToken, hostedFormUrl } from "@/lib/payments/authnet";
import { createInvoice } from "@/lib/payments/nowpayments";

type Method = "card" | "crypto";

function parseBody(body: unknown): { configId: string; method: Method } | null {
  if (body === null || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const configId = typeof o.configId === "string" ? o.configId.trim() : "";
  const method = o.method === "card" || o.method === "crypto" ? o.method : null;
  if (!configId || !method) return null;
  return { configId, method };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const ctx = await enrichSupabaseAuth(data.claims, prisma);
  if (!ctx) return NextResponse.json({ error: "No firm membership found" }, { status: 403 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = parseBody(raw);
  if (!parsed) {
    return NextResponse.json(
      { error: "configId and method ('card' | 'crypto') are required" },
      { status: 400 },
    );
  }

  const config = await prisma.challengeConfig.findFirst({
    where: { id: parsed.configId, firmId: ctx.firmId, isActive: true },
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
  const userEmail = typeof data.claims.email === "string" ? data.claims.email : undefined;

  // Insert the Payment row first so we have a stable id to thread through
  // the provider. Both providers echo it back on the webhook so we can
  // pair the eventual confirmation to the right row.
  const payment = await prisma.payment.create({
    data: {
      firmId: ctx.firmId,
      userId: ctx.userId,
      configId: config.id,
      amountCents: config.challengeFeeCents,
      status: "pending",
    },
    select: { id: true },
  });

  const description = `${config.name} — $${(
    Number(config.accountSizeCents) / 100
  ).toLocaleString()} evaluation`;

  try {
    if (parsed.method === "card") {
      // Authorize.net invoiceNumber is capped at 20 chars; we use the first
      // 16 hex chars of the UUID, prefixed with `bb` to make the column
      // collision-search trivial. Uniqueness within active payments is
      // sufficient — the webhook looks up by this value.
      const externalSessionId = `bb${payment.id.replace(/-/g, "").slice(0, 16)}`;

      await prisma.payment.update({
        where: { id: payment.id },
        data: { stripeSessionId: externalSessionId },
      });

      const { token } = await createHostedPaymentToken({
        amountCents: config.challengeFeeCents,
        invoiceNumber: externalSessionId,
        description,
        returnUrl: `${appUrl}/dashboard?checkout=success`,
        cancelUrl: `${appUrl}/dashboard?checkout=cancel`,
        customerEmail: userEmail,
      });

      await prisma.auditLog.create({
        data: {
          firmId: ctx.firmId,
          actorUserId: ctx.userId,
          action: "checkout.session.created",
          entityType: "payment",
          entityId: payment.id,
          afterState: {
            provider: "authnet",
            externalSessionId,
            configId: config.id,
            amountCents: config.challengeFeeCents,
          },
        },
      });

      return NextResponse.json({
        method: "card",
        formUrl: hostedFormUrl(),
        token,
        paymentId: payment.id,
      });
    }

    // crypto path
    const invoice = await createInvoice({
      priceAmount: config.challengeFeeCents / 100,
      priceCurrency: "USD",
      orderId: payment.id,
      orderDescription: description,
      ipnCallbackUrl: `${appUrl}/api/nowpayments/webhook`,
      successUrl: `${appUrl}/dashboard?checkout=success`,
      cancelUrl: `${appUrl}/dashboard?checkout=cancel`,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { stripeSessionId: invoice.id },
    });

    await prisma.auditLog.create({
      data: {
        firmId: ctx.firmId,
        actorUserId: ctx.userId,
        action: "checkout.session.created",
        entityType: "payment",
        entityId: payment.id,
        afterState: {
          provider: "nowpayments",
          externalSessionId: invoice.id,
          configId: config.id,
          amountCents: config.challengeFeeCents,
        },
      },
    });

    return NextResponse.json({
      method: "crypto",
      url: invoice.invoice_url,
      paymentId: payment.id,
    });
  } catch (err) {
    // Clean up the dangling pending row so the user can retry without
    // accumulating orphaned payments.
    await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    const msg = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
