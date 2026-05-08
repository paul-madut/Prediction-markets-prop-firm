// Sentry edge runtime init (middleware, edge API routes). Identical to server
// config but loaded via the edge runtime; can't share modules with sentry.server.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  enabled: process.env.NODE_ENV !== "test",
});
