"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthContext = getAuthContext;
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
async function getAuthContext(userId, sessionId, db) {
    const member = await db.firmMember.findFirst({
        where: { userId },
        select: { firmId: true, role: true },
        orderBy: { createdAt: 'asc' },
    });
    if (!member)
        return null;
    return {
        userId,
        sessionId,
        firmId: member.firmId,
        role: member.role,
    };
}
//# sourceMappingURL=context.js.map