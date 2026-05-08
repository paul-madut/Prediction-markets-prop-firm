// Sentry server-side init. Loaded automatically by Next.js when @sentry/nextjs
// is installed. Captures uncaught exceptions in API routes, server components,
// and middleware.
//
// DSN is public-safe (it identifies the project, not the auth secret).
// Auth token (build-time only, NEVER at runtime) is what controls writes.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // 10% sample on prod, 100% on dev — adjust upward for the demo if useful.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Don't ship request bodies — many of our routes carry session JWTs in
  // headers that we don't want bouncing through Sentry.
  sendDefaultPii: false,
  enabled: process.env.NODE_ENV !== "test",
});
