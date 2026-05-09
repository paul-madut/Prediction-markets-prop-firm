// GET / PATCH /api/admin/firm — read and update the caller's firm record.
//
// PATCH accepts: name, brandConfig (jsonb), enabledVenues (string[]),
// priceHistorySampleIntervalSeconds, status. Slug is immutable post-creation.
// Audit log emitted on every PATCH.

import { NextResponse } from "next/server";
import { prisma, type Prisma } from "@webflux/db";
import { requireAdmin } from "@/lib/admin-guard";

function bigintJson(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

const ALLOWED_VENUES = new Set(["polymarket", "kalshi"]);
const ALLOWED_STATUSES = new Set(["active", "paused", "disabled"]);

interface PatchBody {
  name?: string;
  brandConfig?: Record<string, unknown>;
  enabledVenues?: string[];
  priceHistorySampleIntervalSeconds?: number;
  status?: string;
}

export async function GET(): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const ctx = guard.ctx;

  const firm = await prisma.firm.findUnique({
    where: { id: ctx.firmId },
  });
  if (!firm) return NextResponse.json({ error: "Firm not found" }, { status: 404 });
  return bigintJson(firm);
}

export async function PATCH(req: Request): Promise<Response> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const ctx = guard.ctx;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: Prisma.FirmUpdateInput = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    data.name = name;
  }
  if (body.brandConfig !== undefined) {
    if (typeof body.brandConfig !== "object" || body.brandConfig === null) {
      return NextResponse.json(
        { error: "brandConfig must be an object" },
        { status: 400 },
      );
    }
    data.brandConfig = body.brandConfig as Prisma.InputJsonValue;
  }
  if (body.enabledVenues !== undefined) {
    if (
      !Array.isArray(body.enabledVenues) ||
      body.enabledVenues.some((v) => !ALLOWED_VENUES.has(v))
    ) {
      return NextResponse.json(
        { error: `enabledVenues must be an array of: ${[...ALLOWED_VENUES].join(", ")}` },
        { status: 400 },
      );
    }
    if (body.enabledVenues.length === 0) {
      return NextResponse.json(
        { error: "enabledVenues cannot be empty" },
        { status: 400 },
      );
    }
    data.enabledVenues = body.enabledVenues;
  }
  if (body.priceHistorySampleIntervalSeconds !== undefined) {
    if (
      typeof body.priceHistorySampleIntervalSeconds !== "number" ||
      body.priceHistorySampleIntervalSeconds < 5 ||
      body.priceHistorySampleIntervalSeconds > 3600
    ) {
      return NextResponse.json(
        { error: "priceHistorySampleIntervalSeconds must be 5-3600" },
        { status: 400 },
      );
    }
    data.priceHistorySampleIntervalSeconds = body.priceHistorySampleIntervalSeconds;
  }
  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${[...ALLOWED_STATUSES].join(", ")}` },
        { status: 400 },
      );
    }
    data.status = body.status;
  }

  const before = await prisma.firm.findUnique({
    where: { id: ctx.firmId },
    select: {
      name: true,
      brandConfig: true,
      enabledVenues: true,
      priceHistorySampleIntervalSeconds: true,
      status: true,
    },
  });
  if (!before) return NextResponse.json({ error: "Firm not found" }, { status: 404 });

  const updated = await prisma.firm.update({
    where: { id: ctx.firmId },
    data,
  });

  await prisma.auditLog.create({
    data: {
      firmId: ctx.firmId,
      actorUserId: ctx.userId,
      action: "firm.update",
      entityType: "firm",
      entityId: ctx.firmId,
      beforeState: before as Prisma.InputJsonValue,
      afterState: {
        name: updated.name,
        brandConfig: updated.brandConfig,
        enabledVenues: updated.enabledVenues,
        priceHistorySampleIntervalSeconds: updated.priceHistorySampleIntervalSeconds,
        status: updated.status,
      } as Prisma.InputJsonValue,
    },
  });

  return bigintJson(updated);
}
