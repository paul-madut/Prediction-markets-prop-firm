// Transactional email — Resend client + minimal templates.
//
// Send is fire-and-forget: every callsite uses sendTransactional() which
// catches and logs errors instead of failing the surrounding request.
// Email is non-critical for state correctness (audit_log already records
// the underlying state transition) so a delivery failure must never roll
// back the parent transaction.
//
// Templates are deliberately bare HTML — no React Email, no MJML — so the
// MVP demo doesn't need extra build tooling. Replace with proper templates
// post-launch.

import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

export interface EmailResult {
  ok: boolean;
  reason?: string;
  id?: string;
}

/**
 * Fire-and-forget email send. Returns { ok: false } on any failure but
 * never throws. Callers should log but not propagate.
 */
export async function sendTransactional(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  const resend = getResend();
  if (!resend) return { ok: false, reason: "resend_not_configured" };
  // In tests, an env flag suppresses the actual network call.
  if (process.env.EMAIL_DRY_RUN === "true") {
    return { ok: true, id: "dry-run" };
  }
  try {
    const result = await resend.emails.send({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    });
    if (result.error) return { ok: false, reason: result.error.message };
    return { ok: true, id: result.data?.id };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown_error" };
  }
}

// ─── Templates ──────────────────────────────────────────────────────────────
function shell(content: string): string {
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; color: #111827;">${content}</div>`;
}
function fmtUsd(cents: bigint | number): string {
  const c = typeof cents === "bigint" ? Number(cents) : cents;
  return `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function welcomeEmail(args: { firmName: string }): { subject: string; html: string } {
  return {
    subject: `Welcome to ${args.firmName}`,
    html: shell(`
      <h1 style="font-size: 22px; margin: 0 0 12px;">Welcome to ${args.firmName}</h1>
      <p>Your account is now active. You can start a challenge from the dashboard whenever you're ready.</p>
      <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">If this wasn't you, contact support.</p>
    `),
  };
}

export function breachEmail(args: {
  firmName: string;
  accountId: string;
  equityCents: bigint;
  floorCents: bigint;
}): { subject: string; html: string } {
  return {
    subject: `Your ${args.firmName} account has been breached`,
    html: shell(`
      <h1 style="font-size: 22px; margin: 0 0 12px;">Account breached</h1>
      <p>Your account hit the drawdown floor. All open positions were closed automatically.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Equity at breach</td><td>${fmtUsd(args.equityCents)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Drawdown floor</td><td>${fmtUsd(args.floorCents)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Account ID</td><td><code style="font-size: 12px;">${args.accountId}</code></td></tr>
      </table>
      <p>You can purchase a new evaluation from the dashboard.</p>
    `),
  };
}

export function payoutPaidEmail(args: {
  firmName: string;
  traderAmountCents: bigint;
  externalReference: string | null;
}): { subject: string; html: string } {
  const ref = args.externalReference ?? "(not provided)";
  return {
    subject: `Payout sent — ${fmtUsd(args.traderAmountCents)}`,
    html: shell(`
      <h1 style="font-size: 22px; margin: 0 0 12px;">Payout on its way</h1>
      <p>${args.firmName} has issued your payout for <strong>${fmtUsd(args.traderAmountCents)}</strong>.</p>
      <p>Reference: <code style="font-size: 12px;">${ref}</code></p>
    `),
  };
}
