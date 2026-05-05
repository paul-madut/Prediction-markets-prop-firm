/**
 * Read the tenant headers injected by oracle-funded/src/middleware.ts.
 *
 * These headers are set by Clerk middleware after verifying the session JWT,
 * so they can be trusted inside route handlers and server components.
 * They are never exposed to the client (Next.js strips request headers from
 * the browser); client code cannot set them because middleware overwrites
 * them unconditionally on every request.
 *
 * Usage in a Next.js App Router route handler:
 *
 *   import { headers } from 'next/headers';
 *   import { readTenantHeaders } from '@webflux/auth';
 *
 *   export async function GET() {
 *     const { userId, sessionId, firmSlug } = readTenantHeaders(await headers());
 *     // ...
 *   }
 */
export interface TenantHeaders {
  /** Clerk user ID — null on public/unauthenticated routes. */
  userId: string | null;
  /** Clerk session ID — null when userId is null. */
  sessionId: string | null;
  /**
   * Firm slug parsed from the request subdomain (e.g. "acme" from
   * acme.oracle-funded.com). Null when the request has no firm subdomain
   * (e.g. localhost or the bare apex domain).
   */
  firmSlug: string | null;
}

export function readTenantHeaders(headers: Headers): TenantHeaders {
  return {
    userId: headers.get('x-webflux-user-id'),
    sessionId: headers.get('x-webflux-session-id'),
    firmSlug: headers.get('x-webflux-firm-slug'),
  };
}
