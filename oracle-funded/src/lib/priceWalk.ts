// Deterministic Mulberry32 PRNG. Same seed → same value, every call.
function mulberry32(seed: number): number {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Walk a cents price (1-99) by up to ±volatility cents using a deterministic seed.
// Pass `Date.now() / tickMs | 0` as the seed for time-based ticks.
export function walkCents(prevCents: number, seed: number, volatility: number = 1): number {
  const r = mulberry32(seed);
  const delta = Math.round((r - 0.5) * 2 * volatility);
  const next = prevCents + delta;
  return Math.max(1, Math.min(99, next));
}

// Walk an arbitrary numeric value (e.g. spot price) by ±volatility%.
export function walkValue(prev: number, seed: number, volatilityPct: number = 0.001): number {
  const r = mulberry32(seed);
  const pct = (r - 0.5) * 2 * volatilityPct;
  return prev * (1 + pct);
}

// Hash a string to a deterministic seed.
export function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
