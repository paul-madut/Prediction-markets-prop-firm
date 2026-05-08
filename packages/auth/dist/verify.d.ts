import type { VerifiedToken } from './types.js';
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
export declare function verifyToken(token: string): Promise<VerifiedToken>;
/**
 * Extract the Bearer token from an Authorization header value.
 * Returns null if the header is absent or not a Bearer token.
 */
export declare function extractBearerToken(authHeader: string | null | undefined): string | null;
//# sourceMappingURL=verify.d.ts.map