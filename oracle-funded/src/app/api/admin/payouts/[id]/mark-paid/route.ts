// POST /api/admin/payouts/[id]/mark-paid
//
// Final step: an 'approved' payout becomes 'paid'. Body accepts an optional
// externalReference (wire confirmation number, Interac e-Transfer ref, etc.)
// that's stored on the row for audit. Trader gets a "payout sent" email.

import { NextResponse } from "next/server";
import { prisma, type Prisma } from "@webflux/db";
import { requireAdmin } from "@/lib/admin-guard";
import { payoutPaidEmail, sendTransactional } from "@/lib/email";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const ctx = guard.ctx;
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as {
    externalReference?: string;
  };
  const externalRef =
    typeof body.externalReference === "string" && body.externalReference.trim()
      ? body.externalReference.trim()
      : null;

  // Capture data needed for the email send before the transaction returns.
  let emailData: { userId: string; firmName: string; traderAmountCents: bigint };
  try {
    emailData = await prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findFirst({
      where: { id, firmId: ctx.firmId },
      select: {
        status: true,
        userId: true,
        traderAmountCents: true,
        firm: { select: { name: true } },
      },
    });
    if (!payout) throw new Error("not_found");
    if (payout.status !== "approved") throw new Error(`bad_state:${payout.status}`);

    await tx.payout.update({
      where: { id },
      data: {
        status: "paid",
        paidAt: new Date(),
        externalReference: externalRef,
      },
    });

    await tx.auditLog.create({
      data: {
        firmId: ctx.firmId,
        actorUserId: ctx.userId,
        action: "payout.paid",
        entityType: "payout",
        entityId: id,
        beforeState: { status: "approved" } as Prisma.InputJsonValue,
        afterState: {
          status: "paid",
          externalReference: externalRef,
          traderAmountCents: payout.traderAmountCents.toString(),
        } as Prisma.InputJsonValue,
      },
    });

    return {
      userId: payout.userId,
      firmName: payout.firm.name,
      traderAmountCents: payout.traderAmountCents,
    };
  });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    if (msg === "not_found") return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    if (msg.startsWith("bad_state:")) {
      return NextResponse.json({ error: `Payout in wrong state: ${msg.slice(10)}` }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Email the trader (fire-and-forget — never fails the request). Resolve
  // their email through the Supabase admin API since auth.users isn't
  // joined into our Prisma schema.
  void sendPayoutPaidEmail(emailData.userId, {
    firmName: emailData.firmName,
    traderAmountCents: emailData.traderAmountCents,
    externalReference: externalRef,
  });

  return NextResponse.json({ ok: true });
}

async function sendPayoutPaidEmail(
  userId: string,
  args: { firmName: string; traderAmountCents: bigint; externalReference: string | null },
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return;
  try {
    const r = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
      headers: { apikey: secret, Authorization: `Bearer ${secret}` },
    });
    if (!r.ok) return;
    const u = (await r.json()) as { email?: string };
    if (!u.email) return;
    const tpl = payoutPaidEmail(args);
    await sendTransactional({ to: u.email, subject: tpl.subject, html: tpl.html });
  } catch {
    // swallow — already audit-logged, email is non-critical
  }
}
