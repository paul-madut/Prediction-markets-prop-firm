// NOWPayments REST client.
//
// Flow:
//   1. createInvoice — POST /v1/invoice with our order_id (= payment.id),
//      price_amount, price_currency, ipn_callback_url, success_url, cancel_url.
//      Response includes invoice_url; we redirect the user there.
//   2. User picks a coin on the NOWPayments page, sends crypto.
//   3. NOWPayments POSTs IPN to our callback at each state change. We verify
//      the HMAC-SHA512 signature in the x-nowpayments-sig header against
//      our IPN_SECRET. On payment_status === "finished", we provision.
//
// IPN signature spec (NOWPayments docs):
//   sig = HMAC-SHA512(IPN_SECRET, JSON.stringify(body, keys-sorted-alphabetically))
//
// Note: NOWPayments sorts top-level keys before signing. Nested objects are
// also sorted. We replicate that with a deterministic stringifier.

import crypto from "crypto";

type Env = "sandbox" | "production";

const SANDBOX_API = "https://api-sandbox.nowpayments.io/v1";
const PRODUCTION_API = "https://api.nowpayments.io/v1";

function env(): Env {
  return (process.env.NOWPAYMENTS_ENVIRONMENT ?? "sandbox") === "production"
    ? "production"
    : "sandbox";
}

function apiBase(): string {
  return env() === "production" ? PRODUCTION_API : SANDBOX_API;
}

function getApiKey(): string {
  const key = process.env.NOWPAYMENTS_API_KEY;
  if (!key) throw new Error("NOWPAYMENTS_API_KEY is not set");
  return key;
}

export interface CreateInvoiceArgs {
  /** Amount in fiat units (NOT cents). */
  priceAmount: number;
  /** ISO 4217 code: "USD", "CAD", "EUR". */
  priceCurrency: string;
  /** Our payment row id; echoed back on every IPN. */
  orderId: string;
  /** Optional one-liner shown on the NOWPayments invoice page. */
  orderDescription?: string;
  /** Webhook URL — receives state-change IPNs. */
  ipnCallbackUrl: string;
  /** Where the user is sent after a successful payment. */
  successUrl: string;
  /** Where the user is sent if they cancel. */
  cancelUrl: string;
}

export interface NowInvoiceResponse {
  id: string;
  invoice_url: string;
  order_id: string;
  price_amount: number;
  price_currency: string;
  created_at: string;
}

export async function createInvoice(args: CreateInvoiceArgs): Promise<NowInvoiceResponse> {
  const res = await fetch(`${apiBase()}/invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
    },
    body: JSON.stringify({
      price_amount: args.priceAmount,
      price_currency: args.priceCurrency.toLowerCase(),
      order_id: args.orderId,
      order_description: args.orderDescription,
      ipn_callback_url: args.ipnCallbackUrl,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`nowpayments createInvoice failed (${res.status}): ${errText}`);
  }
  return (await res.json()) as NowInvoiceResponse;
}

/**
 * Deterministic JSON stringify with sorted keys at every depth. Matches
 * NOWPayments' canonicalization rule for IPN signatures.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const parts = keys.map((k) => {
    const v = (value as Record<string, unknown>)[k];
    return `${JSON.stringify(k)}:${stableStringify(v)}`;
  });
  return `{${parts.join(",")}}`;
}

/**
 * Verify an IPN body against the x-nowpayments-sig header.
 * Returns true if the signature matches our IPN secret.
 */
export function verifyIpnSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader) return false;
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) {
    throw new Error("NOWPAYMENTS_IPN_SECRET is not set");
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return false;
  }

  const canonical = stableStringify(body);
  const expected = crypto
    .createHmac("sha512", secret)
    .update(canonical, "utf8")
    .digest("hex")
    .toLowerCase();

  const provided = signatureHeader.trim().toLowerCase();
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
}

export type NowPaymentStatus =
  | "waiting"
  | "confirming"
  | "confirmed"
  | "sending"
  | "partially_paid"
  | "finished"
  | "failed"
  | "refunded"
  | "expired";

export interface NowIpnPayload {
  payment_id: string | number;
  payment_status: NowPaymentStatus;
  order_id: string;
  price_amount: number;
  price_currency: string;
  pay_amount?: number;
  pay_currency?: string;
  actually_paid?: number;
  outcome_amount?: number;
  outcome_currency?: string;
}

export function parseIpnPayload(rawBody: string): NowIpnPayload {
  return JSON.parse(rawBody) as NowIpnPayload;
}
