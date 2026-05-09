// GET / PATCH /api/admin/configs/[id]
//
// GET — fetch a single config (active or inactive) for the firm. Used to
// pre-fill the edit form.
// PATCH — update mutable fields. Activating/deactivating via { isActive }.
// Phase rebuilds: pass { phases: [...] } to replace the phase list atomically.
//
// Admin/owner only, AAL2 enforced.

import { NextResponse } from "next/server";
import { prisma, type Prisma } from "@webflux/db";
import { requireAdmin } from "@/lib/admin-guard";

function bigintJson(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const ctx = guard.ctx;
  const { id } = await params;

  const config = await prisma.challengeConfig.findFirst({
    where: { id, firmId: ctx.firmId },
    include: {
      phases: {
        orderBy: { phaseNumber: "asc" },
        select: { phaseNumber: true, name: true, profitTargetPct: true, minTradingDays: true },
      },
    },
  });
  if (!config) return NextResponse.json({ error: "Config not found" }, { status: 404 });
  return bigintJson(config);
}

interface PhaseInput {
  phaseNumber: number;
  name: string;
  profitTargetPct: number;
  minTradingDays?: number;
}

interface PatchBody {
  name?: string;
  challengeFeeCents?: number;
  totalDrawdownPct?: number;
  dailyDrawdownPct?: number | null;
  profitSplitPct?: number;
  breachComparison?: string;
  breachCloseBehavior?: string;
  refundDisablesAccount?: boolean;
  maxPositionsPerMarket?: number;
  maxPositionsTotal?: number;
  maxContractsPerOrder?: number | null;
  isActive?: boolean;
  phases?: PhaseInput[];
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const ctx = guard.ctx;
  const { id } = await params;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.challengeConfig.findFirst({
    where: { id, firmId: ctx.firmId },
    include: { phases: true },
  });
  if (!existing) return NextResponse.json({ error: "Config not found" }, { status: 404 });

  // Validate the fields that were supplied.
  const data: Prisma.ChallengeConfigUpdateInput = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    data.name = name;
  }
  if (body.challengeFeeCents !== undefined) {
    if (typeof body.challengeFeeCents !== "number" || body.challengeFeeCents < 0) {
      return NextResponse.json(
        { error: "challengeFeeCents must be a non-negative number" },
        { status: 400 },
      );
    }
    data.challengeFeeCents = body.challengeFeeCents;
  }
  if (body.totalDrawdownPct !== undefined) {
    if (
      typeof body.totalDrawdownPct !== "number" ||
      body.totalDrawdownPct <= 0 ||
      body.totalDrawdownPct >= 100
    ) {
      return NextResponse.json(
        { error: "totalDrawdownPct must be a number between 0 and 100" },
        { status: 400 },
      );
    }
    data.totalDrawdownPct = body.totalDrawdownPct.toString();
  }
  if (body.dailyDrawdownPct !== undefined) {
    if (body.dailyDrawdownPct === null) {
      data.dailyDrawdownPct = null;
    } else if (
      typeof body.dailyDrawdownPct !== "number" ||
      body.dailyDrawdownPct <= 0 ||
      body.dailyDrawdownPct >= 100
    ) {
      return NextResponse.json(
        { error: "dailyDrawdownPct must be null or a number between 0 and 100" },
        { status: 400 },
      );
    } else {
      data.dailyDrawdownPct = body.dailyDrawdownPct.toString();
    }
  }
  if (body.profitSplitPct !== undefined) {
    if (
      typeof body.profitSplitPct !== "number" ||
      body.profitSplitPct < 0 ||
      body.profitSplitPct > 100
    ) {
      return NextResponse.json(
        { error: "profitSplitPct must be a number between 0 and 100" },
        { status: 400 },
      );
    }
    data.profitSplitPct = body.profitSplitPct.toString();
  }
  if (body.breachComparison !== undefined) {
    if (body.breachComparison !== "lt" && body.breachComparison !== "lte") {
      return NextResponse.json(
        { error: "breachComparison must be 'lt' or 'lte'" },
        { status: 400 },
      );
    }
    data.breachComparison = body.breachComparison;
  }
  if (body.breachCloseBehavior !== undefined) {
    if (
      body.breachCloseBehavior !== "mark_to_floor" &&
      body.breachCloseBehavior !== "close_at_market"
    ) {
      return NextResponse.json(
        { error: "breachCloseBehavior must be 'mark_to_floor' or 'close_at_market'" },
        { status: 400 },
      );
    }
    data.breachCloseBehavior = body.breachCloseBehavior;
  }
  if (body.refundDisablesAccount !== undefined) {
    data.refundDisablesAccount = !!body.refundDisablesAccount;
  }
  if (body.maxPositionsPerMarket !== undefined) {
    if (typeof body.maxPositionsPerMarket !== "number" || body.maxPositionsPerMarket < 1) {
      return NextResponse.json(
        { error: "maxPositionsPerMarket must be >= 1" },
        { status: 400 },
      );
    }
    data.maxPositionsPerMarket = body.maxPositionsPerMarket;
  }
  if (body.maxPositionsTotal !== undefined) {
    if (typeof body.maxPositionsTotal !== "number" || body.maxPositionsTotal < 1) {
      return NextResponse.json(
        { error: "maxPositionsTotal must be >= 1" },
        { status: 400 },
      );
    }
    data.maxPositionsTotal = body.maxPositionsTotal;
  }
  if (body.maxContractsPerOrder !== undefined) {
    if (body.maxContractsPerOrder === null) {
      data.maxContractsPerOrder = null;
    } else if (
      typeof body.maxContractsPerOrder !== "number" ||
      body.maxContractsPerOrder < 1
    ) {
      return NextResponse.json(
        { error: "maxContractsPerOrder must be null or >= 1" },
        { status: 400 },
      );
    } else {
      data.maxContractsPerOrder = body.maxContractsPerOrder;
    }
  }
  if (body.isActive !== undefined) {
    data.isActive = !!body.isActive;
  }

  // Phase replacement
  let phases: PhaseInput[] | null = null;
  if (Array.isArray(body.phases)) {
    if (body.phases.length === 0) {
      return NextResponse.json({ error: "at least one phase required" }, { status: 400 });
    }
    for (const p of body.phases) {
      if (
        typeof p.phaseNumber !== "number" ||
        typeof p.name !== "string" ||
        typeof p.profitTargetPct !== "number"
      ) {
        return NextResponse.json(
          { error: "each phase needs phaseNumber, name, profitTargetPct" },
          { status: 400 },
        );
      }
    }
    phases = body.phases;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const config = await tx.challengeConfig.update({
      where: { id },
      data,
    });
    if (phases !== null) {
      await tx.challengePhase.deleteMany({ where: { configId: id } });
      await tx.challengePhase.createMany({
        data: phases.map((p) => ({
          configId: id,
          phaseNumber: p.phaseNumber,
          name: p.name,
          profitTargetPct: p.profitTargetPct.toString(),
          minTradingDays: p.minTradingDays ?? 0,
        })),
      });
    }
    await tx.auditLog.create({
      data: {
        firmId: ctx.firmId,
        actorUserId: ctx.userId,
        action: "config.update",
        entityType: "challenge_config",
        entityId: id,
        beforeState: {
          name: existing.name,
          isActive: existing.isActive,
          phaseCount: existing.phases.length,
        } as Prisma.InputJsonValue,
        afterState: {
          name: config.name,
          isActive: config.isActive,
          phaseCount: phases !== null ? phases.length : existing.phases.length,
        } as Prisma.InputJsonValue,
      },
    });
    return config;
  });

  return bigintJson(updated);
}
