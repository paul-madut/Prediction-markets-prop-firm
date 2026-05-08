// Singleton Upstash Redis REST client. Used for the worker heartbeat,
// hot price cache (when wired), and anywhere we'd otherwise reach for
// shared state across Vercel instances.
//
// Returns null when env is unset so health-check / non-Redis-critical
// paths can soft-degrade instead of crashing at import.

import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// Heartbeat key — the worker writes this on every successful loop; the
// health endpoint reads it. Stale > 60s = worker is sick.
export const REDIS_KEY_WORKER_HEARTBEAT = "worker:heartbeat:lastMessageMs";
