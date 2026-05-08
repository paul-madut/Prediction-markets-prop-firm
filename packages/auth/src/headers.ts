/**
 * Read the tenant headers injected by oracle-funded/src/middleware.ts.
 *
 * These headers are set by the Supabase session middleware after verifying
 * the JWT cookie, so they can be trusted inside route handlers and server
 * components. They are never exposed to the client (Next.js strips request
 * headers from the browser); client code cannot set them because middleware
 * overwrites them unconditionally on every request.
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
  /** Supabase auth.users.id — null on public/unauthenticated routes. */
  userId: string | null;
  /** Supabase session_id — null when userId is null or token is legacy. */
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
