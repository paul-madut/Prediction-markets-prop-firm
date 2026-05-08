// Structured logger. Replaces console.* in server code. Outputs JSON in
// production (BetterStack ingests cleanly), pretty-printed in dev.
//
// Each route should bind its own context with `logger.child({ route: ... })`
// so log lines are filterable downstream without grepping on free text.

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  // Pretty-print only in dev (Vercel pipe needs JSON).
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
        },
      }
    : {}),
  base: { service: "oracle-funded" },
  // Strip Authorization + cookie headers if they ever land in metadata.
  redact: {
    paths: [
      "headers.authorization",
      "headers.cookie",
      "*.password",
      "*.access_token",
      "*.refresh_token",
    ],
    censor: "[REDACTED]",
  },
});
