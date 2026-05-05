import type { PrismaClient } from '@prisma/client';
import type { AuthContext } from './types.js';
type AuthedHandler = (req: Request, auth: AuthContext) => Promise<Response>;
/**
 * Route handler wrapper that enforces JWT auth + firm-context resolution.
 *
 * Extracts the Bearer token from the Authorization header, verifies it as
 * a Clerk session token, looks up the caller's firm membership, and passes
 * the resolved AuthContext to the inner handler.
 *
 * Usage — Next.js App Router API route:
 *
 *   import { withAuth } from '@webflux/auth';
 *   import { prisma } from '@webflux/db';
 *
 *   export const GET = withAuth(async (req, auth) => {
 *     const db = createScopedClient(auth.firmId);
 *     const accounts = await db.account.findMany();
 *     return Response.json(accounts);
 *   }, prisma);
 *
 * Usage — worker Express-style handler:
 *
 *   const handler = withAuth(async (req, auth) => { ... }, prisma);
 *   app.get('/api/something', (req, res) => handler(req).then(r => ...));
 *
 * Returns 401 on missing/invalid token, 403 if the user has no firm membership.
 */
export declare function withAuth(handler: AuthedHandler, db: PrismaClient): (req: Request) => Promise<Response>;
/**
 * Enrich a Clerk auth object (from Next.js `auth()`) with firm context.
 *
 * Use in Next.js Server Components and Route Handlers when you already
 * have the Clerk auth object and don't want to re-verify the token:
 *
 *   import { auth } from '@clerk/nextjs/server';
 *   import { enrichClerkAuth } from '@webflux/auth';
 *
 *   const clerkAuth = await auth();
 *   const ctx = await enrichClerkAuth(clerkAuth, prisma);
 *   if (!ctx) return redirect('/sign-in');
 */
export declare function enrichClerkAuth(clerkAuth: {
    userId: string | null;
    sessionId?: string | null;
}, db: PrismaClient): Promise<AuthContext | null>;
export {};
//# sourceMappingURL=middleware.d.ts.map