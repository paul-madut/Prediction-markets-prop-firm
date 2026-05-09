// GET /api/admin/signals
//
// Cheat-signal queue for the firm. The detection queries that populate this
// table are deferred to beta weeks 3-5 per Decision 7 of the MVP plan; the
// queue surface ships now so admins can see infrastructure is live.

import { NextResponse } from "next/server";
import { prisma } from "@webflux/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function GET(req: Request): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const ctx = guard.ctx;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status")?.trim() || null;

  const rows = await prisma.cheatSignal.findMany({
    where: {
      firmId: ctx.firmId,
      ...(status ? { status } : {}),
    },
    orderBy: { detectedAt: "desc" },
    take: 200,
  });

  return new Response(
    JSON.stringify(rows, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
