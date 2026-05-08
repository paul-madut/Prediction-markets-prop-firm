// POST /api/admin/accounts/[id]/override
//
// Apply per-account rule overrides (drawdown percentages). The eval engine
// reads these from accounts.rule_overrides — it shadows the config defaults.
// Common use: temporarily relax drawdown for a trader after a goodwill
// adjustment, or tighten it as a discipline measure. Always logs to
// audit_log + account_state_log with the required reason.

import { NextResponse } from "next/server";
import { prisma, type Prisma } from "@webflux/db";
import { requireAdmin } from "@/lib/admin-guard";

interface OverrideBody {
  totalDrawdownPct?: number;
  dailyDrawdownPct?: number | null;
  reason: string;
  // ISO 8601 string; null/undefined leaves the override permanent until cleared.
  expiresAt?: string | null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const ctx = guard.ctx;
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = body as Partial<OverrideBody>;

  const reason = typeof b.reason === "string" ? b.reason.trim() : "";
  if (!reason) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const totalPct = typeof b.totalDrawdownPct === "number" ? b.totalDrawdownPct : null;
  const dailyPct =
    b.dailyDrawdownPct === null
      ? null
      : typeof b.dailyDrawdownPct === "number"
        ? b.dailyDrawdownPct
        : undefined;

  if (totalPct === null && dailyPct === undefined) {
    return NextResponse.json(
      { error: "Provide totalDrawdownPct and/or dailyDrawdownPct" },
      { status: 400 },
    );
  }
  if (totalPct !== null && (totalPct < 0 || totalPct > 100)) {
    return NextResponse.json({ error: "totalDrawdownPct out of range" }, { status: 400 });
  }
  if (typeof dailyPct === "number" && (dailyPct < 0 || dailyPct > 100)) {
    return NextResponse.json({ error: "dailyDrawdownPct out of range" }, { status: 400 });
  }

  const expiresAt =
    typeof b.expiresAt === "string" && b.expiresAt
      ? new Date(b.expiresAt)
      : null;
  if (expiresAt && Number.isNaN(expiresAt.valueOf())) {
    return NextResponse.json({ error: "expiresAt must be ISO 8601" }, { status: 400 });
  }

  const account = await prisma.account.findFirst({
    where: { id, firmId: ctx.firmId },
    select: { id: true, ruleOverrides: true, version: true, status: true },
  });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  // Merge into existing overrides — partial updates are normal.
  const before = (account.ruleOverrides ?? {}) as Record<string, unknown>;
  const next: Record<string, unknown> = { ...before };
  if (totalPct !== null) next.total_drawdown_pct = totalPct;
  if (dailyPct !== undefined) {
    if (dailyPct === null) delete next.daily_drawdown_pct;
    else next.daily_drawdown_pct = dailyPct;
  }

  const updated = await prisma.account.updateMany({
    where: { id, version: account.version },
    data: {
      ruleOverrides: next as Prisma.InputJsonValue,
      overrideReason: reason,
      overrideSetByUserId: ctx.userId,
      overrideSetAt: new Date(),
      overrideExpiresAt: expiresAt,
      version: { increment: 1 },
    },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "Optimistic lock conflict" }, { status: 409 });
  }

  await prisma.auditLog.create({
    data: {
      firmId: ctx.firmId,
      actorUserId: ctx.userId,
      action: "account.override",
      entityType: "account",
      entityId: id,
      beforeState: { ruleOverrides: before } as Prisma.InputJsonValue,
      afterState: { ruleOverrides: next, expiresAt: expiresAt?.toISOString() ?? null } as Prisma.InputJsonValue,
      metadata: { reason },
    },
  });

  return NextResponse.json({ ok: true, ruleOverrides: next });
}
