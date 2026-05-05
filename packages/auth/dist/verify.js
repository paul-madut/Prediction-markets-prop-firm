"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = verifyToken;
exports.extractBearerToken = extractBearerToken;
const backend_1 = require("@clerk/backend");
/**
 * Verify a Clerk session JWT (access token).
 *
 * Refresh tokens are managed by the Clerk SDK on the frontend
 * (@clerk/nextjs rotates them transparently). This function is for
 * server-side verification of the short-lived access token passed as a
 * Bearer header — used in the worker's HTTP endpoints and API routes
 * that receive tokens from non-browser clients.
 *
 * Throws if the token is invalid, expired, or the secret key is missing.
 */
async function verifyToken(token) {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey)
        throw new Error('CLERK_SECRET_KEY env var is required');
    const payload = await (0, backend_1.verifyToken)(token, { secretKey });
    return {
        userId: payload.sub,
        // `sid` is a standard Clerk claim but not in the base JwtPayload type.
        sessionId: payload.sid ?? '',
    };
}
/**
 * Extract the Bearer token from an Authorization header value.
 * Returns null if the header is absent or not a Bearer token.
 */
function extractBearerToken(authHeader) {
    if (!authHeader?.startsWith('Bearer '))
        return null;
    return authHeader.slice(7).trim() || null;
}
//# sourceMappingURL=verify.js.map