// POST /api/admin/accounts/[id]/suspend
//
// Pause an account without breaching it. Flips status to "disabled" which
// the order endpoint and fill engine treat as non-tradeable (see fill-order.ts
// "account_not_tradeable" check), but leaves balance, positions, and
// drawdown floor untouched so the account can be resumed cleanly.
//
// Rejects if the account is breached or already disabled — those need
// reset or a status flip, not a suspend.

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

    if (a.status === "disabled") {
      throw new Error("already_disabled");
    }
    if (a.status === "breached") {
      throw new Error("cannot_suspend_breached");
    }

    const updated = await tx.account.updateMany({
      where: { id, version: a.version },
      data: { status: "disabled", version: { increment: 1 } },
    });
    if (updated.count === 0) throw new Error("lock_conflict");

    await tx.accountStateLog.create({
      data: {
        firmId: ctx.firmId,
        accountId: id,
        fromStatus: a.status,
        toStatus: "disabled",
        reason: `admin suspend: ${reason}`,
        actorUserId: ctx.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        firmId: ctx.firmId,
        actorUserId: ctx.userId,
        action: "account.suspend",
        entityType: "account",
        entityId: id,
        beforeState: { status: a.status } as Prisma.InputJsonValue,
        afterState: { status: "disabled" } as Prisma.InputJsonValue,
        metadata: { reason },
      },
    });

    return { previousStatus: a.status };
  }).catch((e: unknown) => {
    const code = e instanceof Error ? e.message : String(e);
    return { error: code };
  });

  if ("error" in result) {
    const map: Record<string, { status: number; msg: string }> = {
      not_found: { status: 404, msg: "Account not found" },
      already_disabled: { status: 409, msg: "Account is already disabled" },
      cannot_suspend_breached: {
        status: 409,
        msg: "Cannot suspend a breached account — reset it instead",
      },
      lock_conflict: { status: 409, msg: "Optimistic lock conflict" },
    };
    const m = map[result.error] ?? {
      status: 500,
      msg: `Suspend failed: ${result.error}`,
    };
    return NextResponse.json({ error: m.msg }, { status: m.status });
  }

  return NextResponse.json({ ok: true, ...result });
}
