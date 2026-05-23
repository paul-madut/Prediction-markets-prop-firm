"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { springs } from "./motion";

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

interface SortDropdownProps<T extends string> {
  options: SortOption<T>[];
  value: T;
  onChange: (next: T) => void;
}

export function SortDropdown<T extends string>({
  options,
  value,
  onChange,
}: SortDropdownProps<T>) {
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
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        transition={springs.snappy}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 h-11 px-3.5 text-[13px] font-semibold border border-white/10 rounded-lg bg-[#180630] hover:bg-[#1f0a3d] hover:border-white/[0.18] transition-colors"
      >
        <span className="text-white">{active.label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={springs.snappy}
          className="inline-flex"
        >
          <ChevronDownIcon className="w-4 h-4 text-white/55" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={springs.snappy}
            className="absolute right-0 top-full mt-2 min-w-[200px] bg-[#1f0a3d] rounded-xl border border-white/10 p-1 z-50"
            style={{ boxShadow: "0 24px 48px -12px rgba(0,0,0,0.6)" }}
          >
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 h-9 rounded-md text-[13px] hover:bg-white/[0.06] flex items-center justify-between transition-colors",
                  o.value === value ? "text-[#A769FF] font-semibold" : "text-white/85",
                )}
              >
                {o.label}
                {o.value === value && <CheckIcon className="w-4 h-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
