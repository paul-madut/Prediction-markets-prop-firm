// POST /api/admin/accounts/[id]/reset
//
// Restart a challenge from scratch. Drops all open positions to 0, sets
// balance back to startingBalanceCents, clears breach state, restarts the
// trading-day counter, and stamps the original first trade time as null.
// Position rows are kept (zeroed) so historical trades retain their FK.
//
// Use cases: trader requests a re-run after a non-trading-related issue;
// admin grants a goodwill restart after a refund.

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
  if (!reason) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM accounts WHERE id = ${id}::uuid FOR UPDATE`;

    const a = await tx.account.findFirst({
      where: { id, firmId: ctx.firmId },
      select: {
        id: true,
        status: true,
        startingBalanceCents: true,
        version: true,
      },
    });
    if (!a) throw new Error("not_found");

    // Zero all positions (keeps row identity for FKs from trade history).
    await tx.position.updateMany({
      where: { accountId: id, netContracts: { not: 0 } },
      data: { netContracts: 0, unrealizedPnlCents: 0n },
    });

    // Reset account state.
    await tx.account.updateMany({
      where: { id, version: a.version },
      data: {
        status: "active",
        currentBalanceCents: a.startingBalanceCents,
        highestEodBalanceCents: a.startingBalanceCents,
        highestEodEquityCents: a.startingBalanceCents,
        dayStartEquityCents: a.startingBalanceCents,
        tradingDaysCount: 0,
        firstTradeAt: null,
        breachAt: null,
        breachEventId: null,
        version: { increment: 1 },
      },
    });

    await tx.accountStateLog.create({
      data: {
        firmId: ctx.firmId,
        accountId: id,
        fromStatus: a.status,
        toStatus: "active",
        reason: `admin reset: ${reason}`,
        actorUserId: ctx.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        firmId: ctx.firmId,
        actorUserId: ctx.userId,
        action: "account.reset",
        entityType: "account",
        entityId: id,
        beforeState: { status: a.status } as Prisma.InputJsonValue,
        afterState: { status: "active", balanceCents: a.startingBalanceCents.toString() } as Prisma.InputJsonValue,
        metadata: { reason },
      },
    });

    return { previousStatus: a.status };
  });

  return NextResponse.json({ ok: true, ...result });
}
