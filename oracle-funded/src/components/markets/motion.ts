// Motion presets for the Markets surface.
// Mirrors the spring tokens defined in DESIGN.md so individual cards
// don't drift into bespoke physics. Keep these in sync with
// DESIGN.md › Motion › Spring presets.

import type { Transition } from "framer-motion";

export const springs = {
  gentle: { type: "spring", stiffness: 150, damping: 20 } as const,
  responsive: { type: "spring", stiffness: 300, damping: 30 } as const,
  snappy: { type: "spring", stiffness: 500, damping: 35 } as const,
  crisp: { type: "spring", stiffness: 600, damping: 40 } as const,
} satisfies Record<string, Transition>;
