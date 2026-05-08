// Test helper: render every email template once and emit a summary
// (subject length, html length, presence of expected interpolated fields).
// Pure function check — no network — so this is safe in CI.

import { breachEmail, payoutPaidEmail, sendTransactional, welcomeEmail } from "../src/lib/email";

async function main(): Promise<void> {
  const w = welcomeEmail({ firmName: "Demo Prop Firm" });
  const b = breachEmail({
    firmName: "Demo Prop Firm",
    accountId: "a-1",
    equityCents: 4500000n,
    floorCents: 4800000n,
  });
  const p = payoutPaidEmail({
    firmName: "Demo Prop Firm",
    traderAmountCents: 80000n,
    externalReference: "WIRE-1",
  });
  const ok = (x: { subject: string; html: string }) =>
    typeof x.subject === "string" && x.subject.length > 0 && typeof x.html === "string" && x.html.length > 100;

  // Also confirm sendTransactional respects EMAIL_DRY_RUN.
  const dry = await sendTransactional({ to: "test@example.com", subject: "x", html: "<p>x</p>" });

  process.stdout.write(
    JSON.stringify({
      welcome: ok(w),
      breach: ok(b),
      payout: ok(p),
      breach_includes_amount: b.html.includes("45,000.00"),
      payout_includes_ref: p.html.includes("WIRE-1"),
      send_dry_run_ok: dry.ok && dry.id === "dry-run",
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
