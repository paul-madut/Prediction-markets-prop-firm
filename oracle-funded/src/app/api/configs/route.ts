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

  const configs = await prisma.challengeConfig.findMany({
    where: { firmId: ctx.firmId, isActive: true },
    orderBy: { accountSizeCents: "asc" },
    include: {
      phases: {
        orderBy: { phaseNumber: "asc" },
        select: { phaseNumber: true, name: true, profitTargetPct: true, minTradingDays: true },
      },
    },
  });
  return bigintJson(configs);
}
