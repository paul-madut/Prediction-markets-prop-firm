// POST /api/admin/accounts/[id]/promote-phase
//
// Manually advance an account to the next phase of its challenge. Looks up
// the next ChallengePhase by phase_number on the same config; if none
// exists, flips status to "funded" (this is the final-phase pass behavior).
//
// Use case: a trader hit profit target but the eval engine hasn't ticked
// yet, or admin grants a goodwill promotion after support escalation.
//
// Refuses on breached / disabled — those need reset/resume first.

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
        configId: true,
        currentPhaseId: true,
        version: true,
        currentPhase: { select: { phaseNumber: true, name: true } },
      },
    });
    if (!a) throw new Error("not_found");
    if (a.status === "breached") throw new Error("breached");
    if (a.status === "disabled") throw new Error("disabled");
    if (a.status === "funded") throw new Error("already_funded");

    // Find the next phase by phase_number on the same config.
    const next = await tx.challengePhase.findFirst({
      where: {
        configId: a.configId,
        phaseNumber: { gt: a.currentPhase.phaseNumber },
      },
      orderBy: { phaseNumber: "asc" },
      select: { id: true, phaseNumber: true, name: true },
    });

    const toStatus = next ? "active" : "funded";
    const data: Prisma.AccountUpdateManyMutationInput = {
      status: toStatus,
      version: { increment: 1 },
    };
    if (next) {
      // Move to next phase; reset firstTradeAt so the new phase starts its
      // own trading-day clock.
      (data as Record<string, unknown>).currentPhaseId = next.id;
      (data as Record<string, unknown>).firstTradeAt = null;
      (data as Record<string, unknown>).tradingDaysCount = 0;
    }

    const updated = await tx.account.updateMany({
      where: { id, version: a.version },
      data,
    });
    if (updated.count === 0) throw new Error("lock_conflict");

    await tx.accountStateLog.create({
      data: {
        firmId: ctx.firmId,
        accountId: id,
        fromStatus: a.status,
        toStatus,
        reason: next
          ? `admin promote: ${a.currentPhase.name} → ${next.name} (${reason})`
          : `admin promote: ${a.currentPhase.name} → funded (${reason})`,
        actorUserId: ctx.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        firmId: ctx.firmId,
        actorUserId: ctx.userId,
        action: "account.promote_phase",
        entityType: "account",
        entityId: id,
        beforeState: {
          status: a.status,
          phaseNumber: a.currentPhase.phaseNumber,
        } as Prisma.InputJsonValue,
        afterState: {
          status: toStatus,
          phaseNumber: next?.phaseNumber ?? null,
        } as Prisma.InputJsonValue,
        metadata: { reason },
      },
    });

    return { previousStatus: a.status, nextStatus: toStatus, nextPhaseNumber: next?.phaseNumber ?? null };
  }).catch((e: unknown) => {
    const code = e instanceof Error ? e.message : String(e);
    return { error: code };
  });

  if ("error" in result) {
    const map: Record<string, { status: number; msg: string }> = {
      not_found: { status: 404, msg: "Account not found" },
      breached: { status: 409, msg: "Account is breached — reset it first" },
      disabled: { status: 409, msg: "Account is suspended — resume it first" },
      already_funded: { status: 409, msg: "Account is already funded" },
      lock_conflict: { status: 409, msg: "Optimistic lock conflict" },
    };
    const m = map[result.error] ?? { status: 500, msg: `Promote failed: ${result.error}` };
    return NextResponse.json({ error: m.msg }, { status: m.status });
  }

  return NextResponse.json({ ok: true, ...result });
}
