"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAuth = withAuth;
exports.enrichSupabaseAuth = enrichSupabaseAuth;
const verify_js_1 = require("./verify.js");
const context_js_1 = require("./context.js");
function json(body, status) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
/**
 * Route handler wrapper that enforces Bearer JWT auth + firm-context resolution.
 *
 * Extracts the Bearer token from the Authorization header, verifies it as a
 * Supabase access token, looks up the caller's firm membership, and passes
 * the resolved AuthContext to the inner handler.
 *
 * Usage — Next.js App Router API route receiving a programmatic Bearer token:
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
 * For browser-session API routes, prefer reading the user from the Supabase
 * SSR client and calling `enrichSupabaseAuth` directly.
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
 * Enrich a Supabase user (from SSR client) with firm membership context.
 *
 * Use in Next.js Server Components and Route Handlers when you already
 * have the Supabase user from `supabase.auth.getClaims()` or `getUser()`:
 *
 *   import { createClient } from '@/lib/supabase/server';
 *   import { enrichSupabaseAuth } from '@webflux/auth';
 *
 *   const supabase = await createClient();
 *   const { data: { claims } } = await supabase.auth.getClaims();
 *   const ctx = await enrichSupabaseAuth(claims, prisma);
 *   if (!ctx) return redirect('/sign-in');
 */
async function enrichSupabaseAuth(claims, db, firmSlug) {
    if (!claims?.sub)
        return null;
    return (0, context_js_1.getAuthContext)(claims.sub, claims.session_id ?? '', db, firmSlug);
}
//# sourceMappingURL=middleware.js.map