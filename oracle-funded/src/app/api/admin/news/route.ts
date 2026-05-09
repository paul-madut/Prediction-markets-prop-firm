// GET / POST /api/admin/news
//
// Firm-scoped news-event CRUD. The order engine consults this table during
// validation (see @webflux/utils order-validation): orders for a market that
// matches an active news event window are rejected with `cooldown_active`,
// and additional cooldownMinutes after the window ends.

import { NextResponse } from "next/server";
import { prisma, type Prisma } from "@webflux/db";
import { requireAdmin } from "@/lib/admin-guard";

interface CreateBody {
  eventName?: string;
  marketFilter?: string | null;
  startsAt?: string;
  endsAt?: string;
  cooldownMinutes?: number;
}

export async function GET(): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const ctx = guard.ctx;

  const events = await prisma.newsEvent.findMany({
    where: { OR: [{ firmId: ctx.firmId }, { firmId: null }] },
    orderBy: { startsAt: "desc" },
    take: 200,
  });
  return NextResponse.json(events);
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

  const eventName = typeof body.eventName === "string" ? body.eventName.trim() : "";
  if (!eventName) {
    return NextResponse.json({ error: "eventName is required" }, { status: 400 });
  }
  if (!body.startsAt || !body.endsAt) {
    return NextResponse.json(
      { error: "startsAt and endsAt are required ISO timestamps" },
      { status: 400 },
    );
  }
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  if (Number.isNaN(startsAt.valueOf()) || Number.isNaN(endsAt.valueOf())) {
    return NextResponse.json(
      { error: "startsAt and endsAt must be ISO 8601" },
      { status: 400 },
    );
  }
  if (endsAt <= startsAt) {
    return NextResponse.json(
      { error: "endsAt must be after startsAt" },
      { status: 400 },
    );
  }
  const cooldownMinutes =
    typeof body.cooldownMinutes === "number" ? body.cooldownMinutes : 2;
  if (cooldownMinutes < 0 || cooldownMinutes > 60) {
    return NextResponse.json(
      { error: "cooldownMinutes must be 0-60" },
      { status: 400 },
    );
  }

  const created = await prisma.newsEvent.create({
    data: {
      firmId: ctx.firmId,
      eventName,
      marketFilter: body.marketFilter?.trim() || null,
      startsAt,
      endsAt,
      cooldownMinutes,
    },
  });

  await prisma.auditLog.create({
    data: {
      firmId: ctx.firmId,
      actorUserId: ctx.userId,
      action: "news.create",
      entityType: "news_event",
      entityId: created.id,
      afterState: {
        eventName,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        marketFilter: created.marketFilter,
        cooldownMinutes,
      } as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
