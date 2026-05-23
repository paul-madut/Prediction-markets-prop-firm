"use client";

// Secondary-button-styled filter chip per DESIGN.md.
//   - 10px radius
//   - Resting: bg-white/[0.06] + text-white
//   - Active:  bg-[#7F24FF] + text-white
//   - 200ms color cross-fade via CSS

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function FilterChip({
  active,
  className,
  children,
  ...rest
}: FilterChipProps) {
  return (
    <button
      type="button"
      data-active={active ? "true" : "false"}
      className={cn(
        "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium",
        "transition-colors duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        active
          ? "bg-[#7F24FF] text-white"
          : "bg-white/[0.06] text-white hover:bg-white/[0.10]",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
