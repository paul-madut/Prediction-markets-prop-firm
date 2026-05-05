import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/markets(.*)",
]);

// Subdomains that are never firm slugs.
const RESERVED_SUBDOMAINS = new Set([
  "www", "app", "api", "admin", "mail", "smtp", "localhost",
]);

// Headers injected by this middleware. Always stripped from incoming requests
// before re-setting so clients cannot spoof them.
const TENANT_HEADERS = [
  "x-webflux-user-id",
  "x-webflux-session-id",
  "x-webflux-firm-slug",
] as const;

export default clerkMiddleware(async (auth, request) => {
  // Strip any client-supplied tenant headers before setting our own.
  const requestHeaders = new Headers(request.headers);
  for (const h of TENANT_HEADERS) {
    requestHeaders.delete(h);
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Forward verified identity as trusted headers so route handlers and server
  // components can read userId/sessionId without re-calling auth().
  const { userId, sessionId } = await auth();
  if (userId) {
    requestHeaders.set("x-webflux-user-id", userId);
    if (sessionId) {
      requestHeaders.set("x-webflux-session-id", sessionId);
    }
  }

  // Extract firm slug from the first subdomain segment.
  // e.g. acme.oracle-funded.com  →  x-webflux-firm-slug: acme
  // Skips localhost, IP addresses, and reserved subdomain names.
  const host = request.headers.get("host") ?? "";
  const subdomainMatch = host.match(/^([a-z0-9-]+)\.[a-z0-9-]+\.[a-z]{2,}/i);
  if (
    subdomainMatch &&
    !RESERVED_SUBDOMAINS.has(subdomainMatch[1].toLowerCase())
  ) {
    requestHeaders.set(
      "x-webflux-firm-slug",
      subdomainMatch[1].toLowerCase(),
    );
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
