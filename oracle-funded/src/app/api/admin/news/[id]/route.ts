// PATCH / DELETE /api/admin/news/[id]
//
// Update or remove a single news event. Cross-firm rows (firmId = null) are
// readable but cannot be modified by a single firm — only their own.

import { NextResponse } from "next/server";
import { prisma, type Prisma } from "@webflux/db";
import { requireAdmin } from "@/lib/admin-guard";

interface PatchBody {
  eventName?: string;
  marketFilter?: string | null;
  startsAt?: string;
  endsAt?: string;
  cooldownMinutes?: number;
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

  const existing = await prisma.newsEvent.findFirst({
    where: { id, firmId: ctx.firmId },
  });
  if (!existing) {
    return NextResponse.json({ error: "News event not found" }, { status: 404 });
  }

  const data: Prisma.NewsEventUpdateInput = {};
  if (body.eventName !== undefined) {
    const v = String(body.eventName).trim();
    if (!v) return NextResponse.json({ error: "eventName cannot be empty" }, { status: 400 });
    data.eventName = v;
  }
  if (body.marketFilter !== undefined) {
    data.marketFilter = body.marketFilter?.trim() || null;
  }
  let nextStart = existing.startsAt;
  let nextEnd = existing.endsAt;
  if (body.startsAt !== undefined) {
    const d = new Date(body.startsAt);
    if (Number.isNaN(d.valueOf())) {
      return NextResponse.json({ error: "startsAt must be ISO 8601" }, { status: 400 });
    }
    nextStart = d;
    data.startsAt = d;
  }
  if (body.endsAt !== undefined) {
    const d = new Date(body.endsAt);
    if (Number.isNaN(d.valueOf())) {
      return NextResponse.json({ error: "endsAt must be ISO 8601" }, { status: 400 });
    }
    nextEnd = d;
    data.endsAt = d;
  }
  if (nextEnd <= nextStart) {
    return NextResponse.json(
      { error: "endsAt must be after startsAt" },
      { status: 400 },
    );
  }
  if (body.cooldownMinutes !== undefined) {
    if (
      typeof body.cooldownMinutes !== "number" ||
      body.cooldownMinutes < 0 ||
      body.cooldownMinutes > 60
    ) {
      return NextResponse.json(
        { error: "cooldownMinutes must be 0-60" },
        { status: 400 },
      );
    }
    data.cooldownMinutes = body.cooldownMinutes;
  }

  const updated = await prisma.newsEvent.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: {
      firmId: ctx.firmId,
      actorUserId: ctx.userId,
      action: "news.update",
      entityType: "news_event",
      entityId: id,
      beforeState: existing as unknown as Prisma.InputJsonValue,
      afterState: updated as unknown as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const ctx = guard.ctx;
  const { id } = await params;

  const existing = await prisma.newsEvent.findFirst({
    where: { id, firmId: ctx.firmId },
  });
  if (!existing) {
    return NextResponse.json({ error: "News event not found" }, { status: 404 });
  }
  await prisma.newsEvent.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      firmId: ctx.firmId,
      actorUserId: ctx.userId,
      action: "news.delete",
      entityType: "news_event",
      entityId: id,
      beforeState: existing as unknown as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json({ ok: true });
}
