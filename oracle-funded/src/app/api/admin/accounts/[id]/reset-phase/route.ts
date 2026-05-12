// POST /api/admin/accounts/[id]/reset-phase
//
// Move an account back to phase 1 of its current config. Does NOT zero
// positions or balance (that's /reset). Just sends the trader back to the
// first evaluation phase, resets firstTradeAt + tradingDaysCount so the
// phase clock starts fresh.
//
// Use case: trader was promoted by mistake, or admin wants them to
// re-evaluate after a goodwill rule change.

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

    const firstPhase = await tx.challengePhase.findFirst({
      where: { configId: a.configId },
      orderBy: { phaseNumber: "asc" },
      select: { id: true, phaseNumber: true, name: true },
    });
    if (!firstPhase) throw new Error("no_phases_on_config");

    if (firstPhase.id === a.currentPhaseId && a.status === "active") {
      throw new Error("already_at_phase_one");
    }

    const updated = await tx.account.updateMany({
      where: { id, version: a.version },
      data: {
        status: "active",
        currentPhaseId: firstPhase.id,
        firstTradeAt: null,
        tradingDaysCount: 0,
        version: { increment: 1 },
      },
    });
    if (updated.count === 0) throw new Error("lock_conflict");

    await tx.accountStateLog.create({
      data: {
        firmId: ctx.firmId,
        accountId: id,
        fromStatus: a.status,
        toStatus: "active",
        reason: `admin reset-phase: ${a.currentPhase.name} → ${firstPhase.name} (${reason})`,
        actorUserId: ctx.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        firmId: ctx.firmId,
        actorUserId: ctx.userId,
        action: "account.reset_phase",
        entityType: "account",
        entityId: id,
        beforeState: {
          status: a.status,
          phaseNumber: a.currentPhase.phaseNumber,
        } as Prisma.InputJsonValue,
        afterState: {
          status: "active",
          phaseNumber: firstPhase.phaseNumber,
        } as Prisma.InputJsonValue,
        metadata: { reason },
      },
    });

    return { previousStatus: a.status, previousPhase: a.currentPhase.phaseNumber };
  }).catch((e: unknown) => {
    const code = e instanceof Error ? e.message : String(e);
    return { error: code };
  });

  if ("error" in result) {
    const map: Record<string, { status: number; msg: string }> = {
      not_found: { status: 404, msg: "Account not found" },
      breached: { status: 409, msg: "Account is breached — reset (not reset-phase) is the right action" },
      disabled: { status: 409, msg: "Account is suspended — resume it first" },
      no_phases_on_config: { status: 500, msg: "Config has no phases — data integrity issue" },
      already_at_phase_one: { status: 409, msg: "Account is already at phase 1 and active" },
      lock_conflict: { status: 409, msg: "Optimistic lock conflict" },
    };
    const m = map[result.error] ?? { status: 500, msg: `Reset-phase failed: ${result.error}` };
    return NextResponse.json({ error: m.msg }, { status: m.status });
  }

  return NextResponse.json({ ok: true, ...result });
}
