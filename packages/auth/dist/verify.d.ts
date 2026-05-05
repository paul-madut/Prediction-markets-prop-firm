import type { VerifiedToken } from './types.js';
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
export declare function verifyToken(token: string): Promise<VerifiedToken>;
/**
 * Extract the Bearer token from an Authorization header value.
 * Returns null if the header is absent or not a Bearer token.
 */
export declare function extractBearerToken(authHeader: string | null | undefined): string | null;
//# sourceMappingURL=verify.d.ts.map