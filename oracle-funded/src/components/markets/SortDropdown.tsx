"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

interface SortDropdownProps<T extends string> {
  options: SortOption<T>[];
  value: T;
  onChange: (next: T) => void;
}

export function SortDropdown<T extends string>({ options, value, onChange }: SortDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const active = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold border border-gray-200 dark:border-white/10 rounded-lg bg-[#180630] hover:bg-[#0C0319] dark:hover:bg-[#1f0a3d]/50 transition-colors"
      >
        <span className="text-white/85">{active.label}</span>
        <ChevronDownIcon className={cn("w-4 h-4 text-white/45 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 min-w-[200px] bg-[#180630] rounded-lg shadow-lg border border-gray-200 dark:border-white/10 p-1 z-50">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm hover:bg-[#0C0319] dark:hover:bg-[#1f0a3d]/50 flex items-center justify-between",
                o.value === value && "bg-[#7F24FF]/10 text-[#7F24FF]",
              )}
            >
              {o.label}
              {o.value === value && <CheckIcon className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
