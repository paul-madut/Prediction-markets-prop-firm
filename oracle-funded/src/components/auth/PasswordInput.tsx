"use client";

// Password input with animated show/hide toggle.
// - Input follows the Blueberry design system (bg-white/4, focus ring 2px
//   primary-ring outset, 150ms transition).
// - The eye icon swaps with a `snappy` spring (scale 0.85 -> 1) so the
//   visibility toggle feels punchy without overshooting.

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

const SNAPPY = { type: "spring" as const, stiffness: 500, damping: 35 };

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  minLength,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-3.5 py-3 pr-11 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40
                   transition-[background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                   focus:outline-none focus:bg-white/[0.06] focus-visible:bg-white/[0.06]
                   focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45 focus-visible:border-white/15"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-md text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors duration-150"
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={show ? "hide" : "show"}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={SNAPPY}
            className="inline-flex"
          >
            {show ? (
              <EyeSlashIcon className="w-4 h-4" />
            ) : (
              <EyeIcon className="w-4 h-4" />
            )}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}
