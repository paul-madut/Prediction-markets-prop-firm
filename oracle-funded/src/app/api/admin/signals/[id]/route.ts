// GET / PATCH /api/admin/signals/[id]
//
// Per-signal detail + review action. PATCH accepts { status, reviewerNotes }.
// Allowed status transitions: pending → confirmed | dismissed.

import { NextResponse } from "next/server";
import { prisma, type Prisma } from "@webflux/db";
import { requireAdmin } from "@/lib/admin-guard";

const ALLOWED_STATUSES = new Set(["pending", "confirmed", "dismissed"]);

interface PatchBody {
  status?: string;
  reviewerNotes?: string | null;
}

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

  const signal = await prisma.cheatSignal.findFirst({
    where: { id, firmId: ctx.firmId },
  });
  if (!signal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return bigintJson(signal);
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

  const data: Prisma.CheatSignalUpdateInput = {};
  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${[...ALLOWED_STATUSES].join(", ")}` },
        { status: 400 },
      );
    }
    data.status = body.status;
    if (body.status !== "pending") {
      data.reviewedByUserId = ctx.userId;
      data.reviewedAt = new Date();
    }
  }
  if (body.reviewerNotes !== undefined) {
    data.reviewerNotes = body.reviewerNotes?.trim() || null;
  }

  const existing = await prisma.cheatSignal.findFirst({
    where: { id, firmId: ctx.firmId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.cheatSignal.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: {
      firmId: ctx.firmId,
      actorUserId: ctx.userId,
      action: `signal.${updated.status}`,
      entityType: "cheat_signal",
      entityId: id,
      beforeState: { status: existing.status } as Prisma.InputJsonValue,
      afterState: { status: updated.status } as Prisma.InputJsonValue,
      metadata: body.reviewerNotes ? { reviewerNotes: body.reviewerNotes } : undefined,
    },
  });
  return bigintJson(updated);
}
