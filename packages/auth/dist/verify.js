"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = verifyToken;
exports.extractBearerToken = extractBearerToken;
const jose_1 = require("jose");
const jwksCache = new Map();
function getJwks() {
    const url = process.env.SUPABASE_JWT_JWKS_URL;
    if (!url)
        throw new Error('SUPABASE_JWT_JWKS_URL env var is required');
    let jwks = jwksCache.get(url);
    if (!jwks) {
        jwks = (0, jose_1.createRemoteJWKSet)(new URL(url));
        jwksCache.set(url, jwks);
    }
    return jwks;
}
/**
 * Verify a Supabase access token (JWT).
 *
 * Supabase issues short-lived ES256 JWTs signed with a project-specific
 * asymmetric key. Verification fetches the public JWKS from the project's
 * /auth/v1/.well-known/jwks.json endpoint (cached in-process by `jose`).
 *
 * Used for:
 *   - API routes that receive tokens from non-browser clients (Bearer header).
 *   - Worker HTTP endpoints.
 *
 * For Next.js Server Components / Route Handlers that already have a
 * Supabase server client, prefer `enrichSupabaseAuth(user, db, firmSlug)`
 * which uses the SDK's session handling instead.
 *
 * Throws on missing env, invalid signature, expired token, or missing `sub`.
 */
async function verifyToken(token) {
    const { payload } = await (0, jose_1.jwtVerify)(token, getJwks());
    if (!payload.sub)
        throw new Error('JWT missing sub claim');
    const sessionId = typeof payload.session_id === 'string'
        ? payload.session_id
        : '';
    return {
        userId: payload.sub,
        sessionId,
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