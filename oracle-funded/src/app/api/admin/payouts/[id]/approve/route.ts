// POST /api/admin/payouts/[id]/approve
//
// Move a payout from 'requested' → 'approved'. The balance was already
// debited at request time, so there's no money movement here — just an
// auditable signal that ops will release the wire / interac next.

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
  const body = (await req.json().catch(() => ({}))) as { notes?: string };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const payout = await tx.payout.findFirst({
        where: { id, firmId: ctx.firmId },
        select: { status: true },
      });
      if (!payout) throw new Error("not_found");
      if (payout.status !== "requested") throw new Error(`bad_state:${payout.status}`);

      await tx.payout.update({
        where: { id },
        data: {
          status: "approved",
          reviewedByUserId: ctx.userId,
          reviewedAt: new Date(),
          reviewerNotes: body.notes ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          firmId: ctx.firmId,
          actorUserId: ctx.userId,
          action: "payout.approved",
          entityType: "payout",
          entityId: id,
          beforeState: { status: "requested" } as Prisma.InputJsonValue,
          afterState: { status: "approved" } as Prisma.InputJsonValue,
          metadata: { notes: body.notes ?? null },
        },
      });
      return { ok: true };
    });
    return NextResponse.json(result);
  } catch (err) {
    return mapPayoutError(err);
  }
}

function mapPayoutError(err: unknown): Response {
  const msg = err instanceof Error ? err.message : "unknown_error";
  if (msg === "not_found") return NextResponse.json({ error: "Payout not found" }, { status: 404 });
  if (msg.startsWith("bad_state:")) {
    return NextResponse.json({ error: `Payout in wrong state: ${msg.slice(10)}` }, { status: 409 });
  }
  return NextResponse.json({ error: msg }, { status: 500 });
}
