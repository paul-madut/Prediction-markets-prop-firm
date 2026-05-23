"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Blueberry design-system input. Spec (DESIGN.md):
// - bg-white/4 at rest, bg-white/6 on focus.
// - Focus ring: 2px primary-ring (rgba(127,36,255,0.45)) outset, 150ms ease.
// - 10px radius (rounded-lg), height 44px, padding 12px 14px.
// - No second-layer wrapping gradients; the field IS the field.

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-white",
          "placeholder:text-white/40",
          "transition-[background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "focus-visible:outline-none focus-visible:bg-white/[0.06] focus-visible:border-white/15",
          "focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
