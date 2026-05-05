import type { PrismaClient } from '@prisma/client';
import type { AuthContext } from './types.js';
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
export declare function getAuthContext(userId: string, sessionId: string, db: PrismaClient, firmSlug?: string): Promise<AuthContext | null>;
//# sourceMappingURL=context.d.ts.map