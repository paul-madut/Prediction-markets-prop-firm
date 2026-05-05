import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { enrichClerkAuth } from '@webflux/auth';
import { prisma } from '@webflux/db';

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's full auth context: userId, sessionId,
 * firmId, and role. Called by the frontend after Clerk sign-in to resolve
 * the user's firm membership and permissions.
 *
 * Protected by Clerk middleware (see src/middleware.ts). Returns 401 if
 * the session is invalid and 403 if the user has no firm membership yet.
 */
export async function GET() {
  const clerkAuth = await auth();

  if (!clerkAuth.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ctx = await enrichClerkAuth(
    { userId: clerkAuth.userId, sessionId: clerkAuth.sessionId },
    prisma,
  );

  if (!ctx) {
    return NextResponse.json(
      { error: 'No firm membership found for this user' },
      { status: 403 },
    );
  }

  return NextResponse.json(ctx);
}
