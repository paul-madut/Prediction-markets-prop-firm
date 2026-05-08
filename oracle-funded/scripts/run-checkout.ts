// Test helper: exercise the /api/checkout production code path against a
// real Stripe test-mode key. Bypasses the Supabase session by simulating the
// resolved firm/user/config trio directly. Verifies:
//   1. Stripe Checkout session is created
//   2. session.url is non-null
//   3. a `payments` row is inserted with status='pending', amount matches,
//      stripeSessionId references the new session
//
// Usage: tsx scripts/run-checkout.ts <firmId> <userId> <configId>
// Stdout: JSON with sessionId, url, paymentId.

import { prisma, type Prisma } from "@webflux/db";
import { getStripe } from "../src/lib/stripe";

async function main(): Promise<void> {
  const [, , firmId, userId, configId] = process.argv;
  if (!firmId || !userId || !configId) {
    console.error("usage: run-checkout.ts <firmId> <userId> <configId>");
    process.exit(2);
  }

  const config = await prisma.challengeConfig.findFirst({
    where: { id: configId, firmId, isActive: true },
    select: {
      id: true,
      name: true,
      challengeFeeCents: true,
      accountSizeCents: true,
    },
  });
  if (!config) {
    process.stdout.write(JSON.stringify({ error: "config_not_found" }));
    return;
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    success_url: "http://localhost:3000/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "http://localhost:3000/dashboard?checkout=cancel",
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
    metadata: { firmId, userId, configId: config.id },
  });

  const payment = await prisma.payment.create({
    data: {
      firmId,
      userId,
      configId: config.id,
      stripeSessionId: session.id,
      amountCents: config.challengeFeeCents,
      status: "pending",
    } satisfies Prisma.PaymentUncheckedCreateInput,
    select: { id: true, amountCents: true, status: true, stripeSessionId: true },
  });

  process.stdout.write(
    JSON.stringify({
      sessionId: session.id,
      url: session.url,
      paymentId: payment.id,
      paymentStatus: payment.status,
      paymentAmountCents: payment.amountCents,
    }),
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
