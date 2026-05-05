"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAuth = withAuth;
exports.enrichClerkAuth = enrichClerkAuth;
const verify_js_1 = require("./verify.js");
const context_js_1 = require("./context.js");
function json(body, status) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
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
function withAuth(handler, db) {
    return async (req) => {
        const token = (0, verify_js_1.extractBearerToken)(req.headers.get('authorization'));
        if (!token) {
            return json({ error: 'Missing Authorization header' }, 401);
        }
        let verified;
        try {
            verified = await (0, verify_js_1.verifyToken)(token);
        }
        catch {
            return json({ error: 'Invalid or expired token' }, 401);
        }
        const auth = await (0, context_js_1.getAuthContext)(verified.userId, verified.sessionId, db);
        if (!auth) {
            return json({ error: 'No firm membership found for this user' }, 403);
        }
        return handler(req, auth);
    };
}
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
async function enrichClerkAuth(clerkAuth, db) {
    if (!clerkAuth.userId)
        return null;
    return (0, context_js_1.getAuthContext)(clerkAuth.userId, clerkAuth.sessionId ?? '', db);
}
//# sourceMappingURL=middleware.js.map