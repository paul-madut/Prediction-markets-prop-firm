"use client";

// Password input with show/hide toggle. Same focus + border treatment as
// the other auth inputs so the form has a consistent rhythm.

import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

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
 className="w-full px-3.5 py-2.5 pr-10 bg-[#180630] border border-slate-200 dark:border-white/15 rounded-lg text-sm text-white placeholder:text-slate-400 dark:placeholder:text-white/65 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7F24FF]/30 focus:border-[#7F24FF] transition-all"
 />
 <button
 type="button"
 onClick={() => setShow((s) => !s)}
 className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 dark:text-white/55 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-white/[0.06] dark:hover:bg-[#1f0a3d]"
 aria-label={show ? "Hide password" : "Show password"}
 tabIndex={-1}
 >
 {show ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
 </button>
 </div>
 );
}
