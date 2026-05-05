import type { PrismaClient } from '@prisma/client';
import type { AuthContext, FirmRole } from './types.js';

/**
 * Enrich a verified token with firm membership (firmId + role) from the DB.
 *
 * When `firmSlug` is supplied (set by the tenant-extraction middleware from the
 * request subdomain), the lookup is scoped to that specific firm. This ensures
 * a user accessing `acme.oracle-funded.com` only gets a context for "acme" even
 * if they somehow belong to multiple firms.
 *
 * When `firmSlug` is absent, the first membership row by `createdAt` is used —
 * correct for MVP where each user belongs to exactly one firm.
 *
 * Returns null when the user has no matching firm membership.
 */
export async function getAuthContext(
  userId: string,
  sessionId: string,
  db: PrismaClient,
  firmSlug?: string,
): Promise<AuthContext | null> {
  const member = firmSlug
    ? await db.firmMember.findFirst({
        where: { userId, firm: { slug: firmSlug } },
        select: { firmId: true, role: true },
      })
    : await db.firmMember.findFirst({
        where: { userId },
        select: { firmId: true, role: true },
        orderBy: { createdAt: 'asc' },
      });

  if (!member) return null;

  return {
    userId,
    sessionId,
    firmId: member.firmId,
    role: member.role as FirmRole,
  };
}
