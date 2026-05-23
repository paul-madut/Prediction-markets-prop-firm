"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Blueberry label spec (DESIGN.md):
// - 12px Inter Tight, weight 600.
// - text-white/70.
// - 8px bottom margin (mb-2).
// - Tracks 0.02em.

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "block text-[12px] leading-4 font-semibold tracking-[0.02em] text-white/70 mb-2",
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
