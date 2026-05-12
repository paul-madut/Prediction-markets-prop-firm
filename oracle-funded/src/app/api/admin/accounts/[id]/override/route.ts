// POST /api/admin/accounts/[id]/override
//
// Apply per-account rule overrides. The eval engine reads these from
// accounts.rule_overrides — it shadows the config defaults.
//
// Today the engine only honors drawdown overrides (total/daily). The other
// keys here (profit split, position caps, min trading days) are written
// into the same JSON for forward-compat — admins should not be surprised
// when they later go live as the eval engine learns to read them.
//
// Body: any subset of the keys below + required `reason`. Partial updates
// merge into the existing rule_overrides object. Pass `null` to clear a
// previously-set key (drawdown only; the others are non-nullable scalars).
//
//   {
//     totalDrawdownPct?:       number      // 0..100
//     dailyDrawdownPct?:       number|null // 0..100 ; null clears
//     profitSplitPct?:         number      // 0..100
//     maxPositionsPerMarket?:  number      // >= 0 integer
//     maxPositionsTotal?:      number      // >= 0 integer
//     maxContractsPerOrder?:   number      // >= 0 integer
//     minTradingDays?:         number      // >= 0 integer
//     reason:                  string      // required
//     expiresAt?:              string|null // ISO 8601
//   }

import { NextResponse } from "next/server";
import { prisma, type Prisma } from "@webflux/db";
import { requireAdmin } from "@/lib/admin-guard";

interface OverrideBody {
  totalDrawdownPct?: number;
  dailyDrawdownPct?: number | null;
  profitSplitPct?: number;
  maxPositionsPerMarket?: number;
  maxPositionsTotal?: number;
  maxContractsPerOrder?: number;
  minTradingDays?: number;
  reason: string;
  expiresAt?: string | null;
}

function inRange(n: unknown, min: number, max: number): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
}

function isNonNegInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0;
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

  // Drawdown: nullable (null clears), numeric in [0,100].
  const totalPct = typeof b.totalDrawdownPct === "number" ? b.totalDrawdownPct : null;
  const dailyPct =
    b.dailyDrawdownPct === null
      ? null
      : typeof b.dailyDrawdownPct === "number"
        ? b.dailyDrawdownPct
        : undefined;

  // Profit split: numeric in [0,100], non-nullable. Optional.
  const profitSplit = "profitSplitPct" in b ? b.profitSplitPct : undefined;

  // Position caps: non-negative integers, non-nullable.
  const maxPerMarket = "maxPositionsPerMarket" in b ? b.maxPositionsPerMarket : undefined;
  const maxTotal = "maxPositionsTotal" in b ? b.maxPositionsTotal : undefined;
  const maxContracts = "maxContractsPerOrder" in b ? b.maxContractsPerOrder : undefined;
  const minDays = "minTradingDays" in b ? b.minTradingDays : undefined;

  const anyKeyPresent =
    totalPct !== null ||
    dailyPct !== undefined ||
    profitSplit !== undefined ||
    maxPerMarket !== undefined ||
    maxTotal !== undefined ||
    maxContracts !== undefined ||
    minDays !== undefined;
  if (!anyKeyPresent) {
    return NextResponse.json(
      { error: "Provide at least one override key" },
      { status: 400 },
    );
  }

  // Range checks
  if (totalPct !== null && !inRange(totalPct, 0, 100)) {
    return NextResponse.json({ error: "totalDrawdownPct out of range [0,100]" }, { status: 400 });
  }
  if (typeof dailyPct === "number" && !inRange(dailyPct, 0, 100)) {
    return NextResponse.json({ error: "dailyDrawdownPct out of range [0,100]" }, { status: 400 });
  }
  if (profitSplit !== undefined && !inRange(profitSplit, 0, 100)) {
    return NextResponse.json({ error: "profitSplitPct out of range [0,100]" }, { status: 400 });
  }
  if (maxPerMarket !== undefined && !isNonNegInt(maxPerMarket)) {
    return NextResponse.json(
      { error: "maxPositionsPerMarket must be a non-negative integer" },
      { status: 400 },
    );
  }
  if (maxTotal !== undefined && !isNonNegInt(maxTotal)) {
    return NextResponse.json(
      { error: "maxPositionsTotal must be a non-negative integer" },
      { status: 400 },
    );
  }
  if (maxContracts !== undefined && !isNonNegInt(maxContracts)) {
    return NextResponse.json(
      { error: "maxContractsPerOrder must be a non-negative integer" },
      { status: 400 },
    );
  }
  if (minDays !== undefined && !isNonNegInt(minDays)) {
    return NextResponse.json(
      { error: "minTradingDays must be a non-negative integer" },
      { status: 400 },
    );
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
  if (profitSplit !== undefined) next.profit_split_pct = profitSplit;
  if (maxPerMarket !== undefined) next.max_positions_per_market = maxPerMarket;
  if (maxTotal !== undefined) next.max_positions_total = maxTotal;
  if (maxContracts !== undefined) next.max_contracts_per_order = maxContracts;
  if (minDays !== undefined) next.min_trading_days = minDays;

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
      afterState: {
        ruleOverrides: next,
        expiresAt: expiresAt?.toISOString() ?? null,
      } as Prisma.InputJsonValue,
      metadata: { reason },
    },
  });

  return NextResponse.json({ ok: true, ruleOverrides: next });
}
