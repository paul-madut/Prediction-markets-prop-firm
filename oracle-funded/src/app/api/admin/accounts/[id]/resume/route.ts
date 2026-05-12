// POST /api/admin/accounts/[id]/resume
//
// Re-activate a suspended account. Inverse of /suspend. Only allowed when
// the account is currently "disabled" — refuses on breached / funded /
// passed_phase / pending, which need a different action (reset, force-close,
// promote-phase).

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
      select: { id: true, status: true, version: true },
    });
    if (!a) throw new Error("not_found");

    if (a.status !== "disabled") {
      throw new Error(`cannot_resume:${a.status}`);
    }

    const updated = await tx.account.updateMany({
      where: { id, version: a.version },
      data: { status: "active", version: { increment: 1 } },
    });
    if (updated.count === 0) throw new Error("lock_conflict");

    await tx.accountStateLog.create({
      data: {
        firmId: ctx.firmId,
        accountId: id,
        fromStatus: "disabled",
        toStatus: "active",
        reason: `admin resume: ${reason}`,
        actorUserId: ctx.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        firmId: ctx.firmId,
        actorUserId: ctx.userId,
        action: "account.resume",
        entityType: "account",
        entityId: id,
        beforeState: { status: "disabled" } as Prisma.InputJsonValue,
        afterState: { status: "active" } as Prisma.InputJsonValue,
        metadata: { reason },
      },
    });

    return { previousStatus: "disabled" };
  }).catch((e: unknown) => {
    const code = e instanceof Error ? e.message : String(e);
    return { error: code };
  });

  if ("error" in result) {
    if (result.error === "not_found") {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    if (result.error.startsWith("cannot_resume:")) {
      const status = result.error.split(":")[1];
      return NextResponse.json(
        { error: `Account is "${status}" — only disabled accounts can be resumed` },
        { status: 409 },
      );
    }
    if (result.error === "lock_conflict") {
      return NextResponse.json({ error: "Optimistic lock conflict" }, { status: 409 });
    }
    return NextResponse.json({ error: `Resume failed: ${result.error}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...result });
}
