import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that don't require an authenticated session.
// /api/stripe/webhook authenticates via the Stripe-Signature header (HMAC),
// not session cookies — Stripe doesn't send any. Same for /api/cron/* which
// auths via Bearer token. Keeping them out of the auth check stops the
// middleware from redirecting them to /sign-in (which Stripe CLI sees as a
// successful 307 and never retries).
const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/auth",
  "/api/markets",
  "/api/stripe",
  "/api/cron",
  "/api/health",
];
const PUBLIC_EXACT = ["/"];

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

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_EXACT.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  // Strip any client-supplied tenant headers before setting our own.
  const requestHeaders = new Headers(request.headers);
  for (const h of TENANT_HEADERS) {
    requestHeaders.delete(h);
  }

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getClaims —
  // a mistake here can randomly log users out under SSR.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  // Redirect unauthenticated users on protected routes.
  if (!claims && !isPublicRoute(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirect_url", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Forward verified identity as trusted headers so route handlers and server
  // components can read userId/sessionId without re-calling Supabase.
  if (claims?.sub) {
    requestHeaders.set("x-webflux-user-id", claims.sub);
    const sessionId = (claims as Record<string, unknown>).session_id;
    if (typeof sessionId === "string") {
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

  // Recreate the response so the new request headers are forwarded
  // alongside the cookies set by Supabase. We must preserve any cookies
  // already set on supabaseResponse (refreshed session tokens).
  const finalResponse = NextResponse.next({ request: { headers: requestHeaders } });
  supabaseResponse.cookies.getAll().forEach((c) => {
    finalResponse.cookies.set(c.name, c.value);
  });
  return finalResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
