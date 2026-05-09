// POST /api/admin/configs
//
// Create a new ChallengeConfig with phases for the caller's firm.
// Admin/owner only, AAL2 enforced via requireAdmin().
//
// Body:
//   {
//     name: string,
//     accountSizeCents: number | string,         // bigint via string accepted
//     challengeFeeCents: number,
//     drawdownType: 'static' | 'trailing_eod',
//     trailingReference?: 'eod_balance' | 'eod_equity' | 'eod_max_balance_equity',
//     totalDrawdownPct: number,
//     dailyDrawdownPct?: number | null,
//     profitSplitPct: number,
//     breachComparison?: 'lt' | 'lte',
//     breachCloseBehavior: 'mark_to_floor' | 'close_at_market',
//     refundDisablesAccount?: boolean,
//     maxPositionsPerMarket?: number,
//     maxPositionsTotal?: number,
//     maxContractsPerOrder?: number | null,
//     phases: Array<{ phaseNumber: number, name: string, profitTargetPct: number, minTradingDays?: number }>,
//   }

import { NextResponse } from "next/server";
import { prisma, type Prisma } from "@webflux/db";
import { requireAdmin } from "@/lib/admin-guard";

function bigintJson(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

interface PhaseInput {
  phaseNumber: number;
  name: string;
  profitTargetPct: number;
  minTradingDays?: number;
}

interface CreateBody {
  name?: string;
  accountSizeCents?: number | string;
  challengeFeeCents?: number;
  drawdownType?: string;
  trailingReference?: string;
  totalDrawdownPct?: number;
  dailyDrawdownPct?: number | null;
  profitSplitPct?: number;
  breachComparison?: string;
  breachCloseBehavior?: string;
  refundDisablesAccount?: boolean;
  maxPositionsPerMarket?: number;
  maxPositionsTotal?: number;
  maxContractsPerOrder?: number | null;
  phases?: PhaseInput[];
}

export async function POST(req: Request): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const ctx = guard.ctx;

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Required fields
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  let accountSizeCents: bigint;
  try {
    if (body.accountSizeCents === undefined || body.accountSizeCents === null) {
      throw new Error("missing");
    }
    accountSizeCents = BigInt(body.accountSizeCents);
    if (accountSizeCents <= 0n) throw new Error("non-positive");
  } catch {
    return NextResponse.json(
      { error: "accountSizeCents must be a positive integer" },
      { status: 400 },
    );
  }

  const challengeFeeCents = body.challengeFeeCents;
  if (typeof challengeFeeCents !== "number" || challengeFeeCents < 0) {
    return NextResponse.json(
      { error: "challengeFeeCents must be a non-negative number" },
      { status: 400 },
    );
  }

  const drawdownType = body.drawdownType;
  if (drawdownType !== "static" && drawdownType !== "trailing_eod") {
    return NextResponse.json(
      { error: "drawdownType must be 'static' or 'trailing_eod'" },
      { status: 400 },
    );
  }

  const totalDrawdownPct = body.totalDrawdownPct;
  if (typeof totalDrawdownPct !== "number" || totalDrawdownPct <= 0 || totalDrawdownPct >= 100) {
    return NextResponse.json(
      { error: "totalDrawdownPct must be a number between 0 and 100" },
      { status: 400 },
    );
  }

  const profitSplitPct = body.profitSplitPct;
  if (typeof profitSplitPct !== "number" || profitSplitPct < 0 || profitSplitPct > 100) {
    return NextResponse.json(
      { error: "profitSplitPct must be a number between 0 and 100" },
      { status: 400 },
    );
  }

  const breachCloseBehavior = body.breachCloseBehavior;
  if (
    breachCloseBehavior !== "mark_to_floor" &&
    breachCloseBehavior !== "close_at_market"
  ) {
    return NextResponse.json(
      { error: "breachCloseBehavior must be 'mark_to_floor' or 'close_at_market'" },
      { status: 400 },
    );
  }

  const phases = body.phases;
  if (!Array.isArray(phases) || phases.length === 0) {
    return NextResponse.json(
      { error: "at least one phase is required" },
      { status: 400 },
    );
  }
  for (const p of phases) {
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

  const dailyDrawdownPct =
    body.dailyDrawdownPct === null || body.dailyDrawdownPct === undefined
      ? null
      : body.dailyDrawdownPct;
  if (
    dailyDrawdownPct !== null &&
    (typeof dailyDrawdownPct !== "number" || dailyDrawdownPct <= 0 || dailyDrawdownPct >= 100)
  ) {
    return NextResponse.json(
      { error: "dailyDrawdownPct must be null or a number between 0 and 100" },
      { status: 400 },
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const config = await tx.challengeConfig.create({
      data: {
        firmId: ctx.firmId,
        name,
        accountSizeCents,
        challengeFeeCents,
        drawdownType,
        trailingReference: body.trailingReference ?? "eod_balance",
        totalDrawdownPct: totalDrawdownPct.toString(),
        dailyDrawdownPct: dailyDrawdownPct === null ? null : dailyDrawdownPct.toString(),
        profitSplitPct: profitSplitPct.toString(),
        breachComparison: body.breachComparison ?? "lt",
        breachCloseBehavior,
        refundDisablesAccount: body.refundDisablesAccount ?? true,
        maxPositionsPerMarket: body.maxPositionsPerMarket ?? 1,
        maxPositionsTotal: body.maxPositionsTotal ?? 5,
        maxContractsPerOrder:
          body.maxContractsPerOrder === null || body.maxContractsPerOrder === undefined
            ? null
            : body.maxContractsPerOrder,
        isActive: true,
      },
    });
    await tx.challengePhase.createMany({
      data: phases.map((p) => ({
        configId: config.id,
        phaseNumber: p.phaseNumber,
        name: p.name,
        profitTargetPct: p.profitTargetPct.toString(),
        minTradingDays: p.minTradingDays ?? 0,
      })),
    });
    await tx.auditLog.create({
      data: {
        firmId: ctx.firmId,
        actorUserId: ctx.userId,
        action: "config.create",
        entityType: "challenge_config",
        entityId: config.id,
        afterState: {
          name,
          accountSizeCents: accountSizeCents.toString(),
          drawdownType,
          phaseCount: phases.length,
        } as Prisma.InputJsonValue,
      },
    });
    return config;
  });

  return bigintJson(created, 201);
}
