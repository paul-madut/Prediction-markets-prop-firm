import Stripe from "stripe";

// Single Stripe client instance per Node process. The lazy init guards against
// missing keys during build (Vercel's collect-static phase doesn't have env).
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  _stripe = new Stripe(key, {
    // Pin the API version so a Stripe-side bump doesn't silently change response shapes.
    // Matches the SDK's bundled types (stripe@22.1.1 → dahlia).
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });
  return _stripe;
}
