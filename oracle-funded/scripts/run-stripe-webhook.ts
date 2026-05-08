// Test helper: construct a real Stripe Event, sign it with our webhook
// secret using stripe.webhooks.generateTestHeaderString (the SDK's official
// test signer), and invoke POST /api/stripe/webhook directly.
//
// Avoids spinning up a dev server. Same code path the production handler
// runs — full signature verification + idempotency + DB writes.
//
// Usage:
//   tsx oracle-funded/scripts/run-stripe-webhook.ts <event-fixture-path>
// where the JSON file contains a complete Stripe.Event object.

import { readFileSync } from "node:fs";
import { POST } from "../src/app/api/stripe/webhook/route";
import { getStripe } from "../src/lib/stripe";

async function main(): Promise<void> {
  const fixturePath = process.argv[2];
  if (!fixturePath) {
    console.error("usage: tsx run-stripe-webhook.ts <event-fixture-path>");
    process.exit(2);
  }
  // Test override: when STRIPE_TEST_SIGNING_SECRET is set, sign with that.
  // Lets the bad-signature test use a different secret for signing vs verifying.
  const secret =
    process.env.STRIPE_TEST_SIGNING_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

  const eventJson = readFileSync(fixturePath, "utf8");
  const stripe = getStripe();
  const sig = stripe.webhooks.generateTestHeaderString({
    payload: eventJson,
    secret,
  });

  const req = new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": sig,
    },
    body: eventJson,
  });

  const res = await POST(req);
  const body = await res.text();
  process.stdout.write(JSON.stringify({ status: res.status, body: tryParse(body) }));
}

function tryParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
