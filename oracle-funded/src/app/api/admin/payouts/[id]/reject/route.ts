// POST /api/admin/payouts/[id]/reject
//
// Reject a 'requested' payout: refund the debited amount back to the
// account balance, mark the payout 'rejected' with required reason.
// Admin must provide reason — appears in the trader's audit/history.

import { NextResponse } from "next/server";
import { prisma, type Prisma } from "@webflux/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const ctx = guard.ctx;
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) return NextResponse.json({ error: "reason is required" }, { status: 400 });

  try {
  const result = await prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findFirst({
      where: { id, firmId: ctx.firmId },
      select: {
        status: true,
        accountId: true,
        requestedCents: true,
      },
    });
    if (!payout) throw new Error("not_found");
    if (payout.status !== "requested") throw new Error(`bad_state:${payout.status}`);

    // Lock + refund the account.
    await tx.$executeRaw`SELECT 1 FROM accounts WHERE id = ${payout.accountId}::uuid FOR UPDATE`;
    const account = await tx.account.findUniqueOrThrow({
      where: { id: payout.accountId },
      select: { currentBalanceCents: true, version: true },
    });

    const updated = await tx.account.updateMany({
      where: { id: payout.accountId, version: account.version },
      data: {
        currentBalanceCents: account.currentBalanceCents + payout.requestedCents,
        version: { increment: 1 },
      },
    });
    if (updated.count === 0) throw new Error("version_conflict");

    await tx.payout.update({
      where: { id },
      data: {
        status: "rejected",
        reviewedByUserId: ctx.userId,
        reviewedAt: new Date(),
        reviewerNotes: reason,
      },
    });

    await tx.auditLog.create({
      data: {
        firmId: ctx.firmId,
        actorUserId: ctx.userId,
        action: "payout.rejected",
        entityType: "payout",
        entityId: id,
        beforeState: { status: "requested" } as Prisma.InputJsonValue,
        afterState: {
          status: "rejected",
          refundedCents: payout.requestedCents.toString(),
        } as Prisma.InputJsonValue,
        metadata: { reason },
      },
    });
    return { ok: true };
  });

  return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    if (msg === "not_found") return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    if (msg.startsWith("bad_state:")) {
      return NextResponse.json({ error: `Payout in wrong state: ${msg.slice(10)}` }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
