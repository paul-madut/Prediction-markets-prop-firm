// GET /api/configs
//
// Lists active challenge configs for the caller's firm. Public to any
// authenticated firm member (traders need this to render the Buy
// Challenge page). BigInt cent fields serialized as numeric strings.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@webflux/db";
import { enrichSupabaseAuth } from "@webflux/auth";

function bigintJson(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const ctx = await enrichSupabaseAuth(data.claims, prisma);
  if (!ctx) return NextResponse.json({ error: "No firm membership found" }, { status: 403 });

  const allConfigs = await prisma.challengeConfig.findMany({
    where: { firmId: ctx.firmId, isActive: true },
    orderBy: { accountSizeCents: "asc" },
    include: {
      phases: {
        orderBy: { phaseNumber: "asc" },
        select: { phaseNumber: true, name: true, profitTargetPct: true, minTradingDays: true },
      },
    },
  });

  // Filter dev-only "TEST …" payment-testing configs out of the trader-facing
  // catalog. They live in the same table as production products so the admin
  // CLI can reuse the same code paths; the buy-challenge UI must not show them.
  // Also dedupe by accountSize: when an older "Demo …" config coexists with a
  // newer canonical one (e.g. PRO6 supersedes "Demo $50K Evaluation"), keep
  // the non-Demo one so traders see a stable product list.
  const visible = allConfigs.filter((c) => !c.name.toUpperCase().startsWith("TEST"));
  const bySize = new Map<string, (typeof visible)[number]>();
  for (const c of visible) {
    const key = c.accountSizeCents.toString();
    const existing = bySize.get(key);
    if (!existing) {
      bySize.set(key, c);
      continue;
    }
    const existingIsDemo = existing.name.startsWith("Demo ");
    const candidateIsDemo = c.name.startsWith("Demo ");
    if (existingIsDemo && !candidateIsDemo) bySize.set(key, c);
  }

  return bigintJson([...bySize.values()].sort((a, b) =>
    a.accountSizeCents < b.accountSizeCents ? -1 : a.accountSizeCents > b.accountSizeCents ? 1 : 0,
  ));
}
