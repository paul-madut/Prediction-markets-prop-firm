// Authorize.net REST client.
//
// We use Accept Hosted (server-generated form token → user is redirected to
// authorize.net's hosted form → on success they're redirected back to our
// success URL → Authorize.net also POSTs a webhook to our notification URL).
//
// PCI scope: SAQ-A. Card details never touch our server.
//
// Two flows live here:
//   1. createHostedPaymentToken — POST getHostedPaymentPageRequest to the
//      JSON API, returns { token } which the browser submits to authorize.net.
//      Caller wraps the token in an HTML form auto-submit.
//   2. verifyWebhookSignature — verifies the x-anet-signature header on the
//      Webhook Notifications API. HMAC-SHA512 of the raw request body using
//      the Signature Key (NOT the transaction key — distinct credential
//      managed in the Webhooks console).

import crypto from "crypto";

type Env = "sandbox" | "production";

const SANDBOX_API = "https://apitest.authorize.net/xml/v1/request.api";
const PRODUCTION_API = "https://api.authorize.net/xml/v1/request.api";

const SANDBOX_HOSTED_FORM = "https://test.authorize.net/payment/payment";
const PRODUCTION_HOSTED_FORM = "https://accept.authorize.net/payment/payment";

function env(): Env {
  return (process.env.AUTHNET_ENVIRONMENT ?? "sandbox") === "production"
    ? "production"
    : "sandbox";
}

function apiUrl(): string {
  return env() === "production" ? PRODUCTION_API : SANDBOX_API;
}

export function hostedFormUrl(): string {
  return env() === "production" ? PRODUCTION_HOSTED_FORM : SANDBOX_HOSTED_FORM;
}

function getCredentials(): { name: string; transactionKey: string } {
  const name = process.env.AUTHNET_API_LOGIN_ID;
  const transactionKey = process.env.AUTHNET_TRANSACTION_KEY;
  if (!name || !transactionKey) {
    throw new Error("AUTHNET_API_LOGIN_ID and AUTHNET_TRANSACTION_KEY must be set");
  }
  return { name, transactionKey };
}

export interface HostedPaymentTokenArgs {
  /** Amount in the smallest currency unit (cents). */
  amountCents: number;
  /** Our payment row id, echoed back via invoiceNumber for the webhook. Max 20 chars. */
  invoiceNumber: string;
  /** Human description shown on the hosted form. */
  description: string;
  /** Where authorize.net redirects after a successful or cancelled transaction. */
  returnUrl: string;
  /** Where the user is sent if they click "Cancel" on the hosted page. */
  cancelUrl: string;
  /** Customer email, prefilled on the form. */
  customerEmail?: string;
}

interface HostedPaymentTokenResponse {
  token: string;
}

/**
 * Create a one-shot hosted-payment form token. The caller submits a small
 * auto-submit HTML form (action=hostedFormUrl, method=POST, body: token)
 * to deliver the user to the hosted payment page.
 */
export async function createHostedPaymentToken(
  args: HostedPaymentTokenArgs,
): Promise<HostedPaymentTokenResponse> {
  const { name, transactionKey } = getCredentials();

  // The request body is JSON (despite the URL saying "xml/v1") — that's the
  // Authorize.net AIM JSON API. Field names use camelCase.
  const body = {
    getHostedPaymentPageRequest: {
      merchantAuthentication: { name, transactionKey },
      transactionRequest: {
        transactionType: "authCaptureTransaction",
        amount: (args.amountCents / 100).toFixed(2),
        order: {
          invoiceNumber: args.invoiceNumber.slice(0, 20),
          description: args.description.slice(0, 255),
        },
        ...(args.customerEmail
          ? { customer: { email: args.customerEmail } }
          : {}),
      },
      hostedPaymentSettings: {
        setting: [
          {
            settingName: "hostedPaymentReturnOptions",
            settingValue: JSON.stringify({
              showReceipt: true,
              url: args.returnUrl,
              urlText: "Continue",
              cancelUrl: args.cancelUrl,
              cancelUrlText: "Cancel",
            }),
          },
          {
            settingName: "hostedPaymentButtonOptions",
            settingValue: JSON.stringify({ text: "Pay" }),
          },
          {
            settingName: "hostedPaymentStyleOptions",
            // Brand-purple primary button on the hosted form.
            settingValue: JSON.stringify({ bgColor: "#7F24FF" }),
          },
          {
            settingName: "hostedPaymentPaymentOptions",
            settingValue: JSON.stringify({
              cardCodeRequired: true,
              showCreditCard: true,
              showBankAccount: false,
            }),
          },
          {
            settingName: "hostedPaymentSecurityOptions",
            settingValue: JSON.stringify({ captcha: false }),
          },
          {
            settingName: "hostedPaymentBillingAddressOptions",
            settingValue: JSON.stringify({ show: true, required: false }),
          },
          {
            settingName: "hostedPaymentCustomerOptions",
            settingValue: JSON.stringify({ showEmail: true, requiredEmail: false }),
          },
        ],
      },
    },
  };

  const res = await fetch(apiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // Authorize.net responds with a BOM-prefixed JSON body. Strip it before parse.
  const text = (await res.text()).replace(/^﻿/, "");
  const parsed = JSON.parse(text) as {
    token?: string;
    messages?: { resultCode?: string; message?: { code: string; text: string }[] };
  };

  if (parsed.messages?.resultCode !== "Ok" || !parsed.token) {
    const msg = parsed.messages?.message?.[0]?.text ?? "Unknown authnet error";
    throw new Error(`authnet getHostedPaymentPage failed: ${msg}`);
  }

  return { token: parsed.token };
}

/**
 * Verify a Webhook Notifications request.
 *
 * Authorize.net sends `x-anet-signature: sha512=<HEX>` where HEX is
 * HMAC-SHA512(SIGNATURE_KEY, rawBody). Note: SIGNATURE_KEY is the
 * 128-character Webhooks key from the merchant interface — NOT the
 * transaction key. The key is HEX-encoded; we use Buffer.from(key, "hex")
 * to derive the HMAC secret.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader) return false;
  const signatureKey = process.env.AUTHNET_SIGNATURE_KEY;
  if (!signatureKey) {
    throw new Error("AUTHNET_SIGNATURE_KEY is not set");
  }

  // Header format: "sha512=<UPPERCASE_HEX>"
  const match = /^sha512=([0-9a-f]+)$/i.exec(signatureHeader.trim());
  if (!match) return false;
  const provided = match[1].toLowerCase();

  const expected = crypto
    .createHmac("sha512", Buffer.from(signatureKey, "hex"))
    .update(rawBody, "utf8")
    .digest("hex")
    .toLowerCase();

  // Constant-time compare to avoid timing oracles.
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Shape of the webhook payload we care about. Authorize.net sends many event
 * types; we only act on auth+capture creation events.
 */
export interface AuthnetWebhookEvent {
  notificationId: string;
  eventType: string;
  eventDate: string;
  webhookId: string;
  payload: {
    responseCode: number;
    authCode?: string;
    authAmount?: number;
    invoiceNumber?: string;
    entityName: string;
    id: string;
  };
}

export function parseWebhookEvent(rawBody: string): AuthnetWebhookEvent {
  return JSON.parse(rawBody) as AuthnetWebhookEvent;
}
