import type { PrismaClient } from '@prisma/client';
import type { AuthContext } from './types.js';
/**
 * Enrich a verified token with firm membership (firmId + role) from the DB.
 *
 * Multi-firm routing (subdomain or URL slug) is handled in the
 * "Add middleware for tenant extraction" task. For now, the first
 * membership row for the user is returned — which is correct for MVP
 * where each user belongs to exactly one firm.
 *
 * Returns null when the user has no firm membership (e.g. newly registered
 * user whose Clerk webhook hasn't created the firm_members row yet).
 */
export declare function getAuthContext(userId: string, sessionId: string, db: PrismaClient): Promise<AuthContext | null>;
//# sourceMappingURL=context.d.ts.map