// Sentry browser-side init. Captures unhandled errors and unhandled rejections
// from the trader/admin UI. Same DSN as server.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Replay is helpful for trader bug reports but adds bundle weight; off for MVP.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  enabled: process.env.NODE_ENV !== "test",
});
