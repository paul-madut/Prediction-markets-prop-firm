import { verifyToken as clerkVerifyToken } from '@clerk/backend';
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
export async function verifyToken(token: string): Promise<VerifiedToken> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error('CLERK_SECRET_KEY env var is required');

  const payload = await clerkVerifyToken(token, { secretKey });

  return {
    userId: payload.sub,
    // `sid` is a standard Clerk claim but not in the base JwtPayload type.
    sessionId: (payload as Record<string, unknown>).sid as string ?? '',
  };
}

/**
 * Extract the Bearer token from an Authorization header value.
 * Returns null if the header is absent or not a Bearer token.
 */
export function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}
