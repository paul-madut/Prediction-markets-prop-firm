"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUpDownIcon, CheckCircleIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { UserAccount } from "@/types";

const PHASE_LABELS: Record<UserAccount["accountPhase"], string> = {
  evaluation_1: "Phase 1",
  evaluation_2: "Phase 2",
  funded: "Funded",
};

const PHASE_BADGE: Record<UserAccount["accountPhase"], string> = {
  evaluation_1: "bg-amber-100 text-amber-800",
  evaluation_2: "bg-blue-100 text-blue-800",
  funded: "bg-green-100 text-green-800",
};

interface AccountSwitcherProps {
  variant?: "full" | "compact";
}

export function AccountSwitcher({ variant = "full" }: AccountSwitcherProps) {
  const { accounts, activeAccountId, setActiveAccount } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = accounts.find((a) => a.accountId === activeAccountId) || accounts[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!active) return null;

  const profitPct = ((active.accountBalance - active.startingBalance) / active.startingBalance) * 100;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors",
          variant === "full" ? "p-3" : "p-2",
        )}
      >
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded", PHASE_BADGE[active.accountPhase])}>
              {PHASE_LABELS[active.accountPhase]}
            </span>
            <span className="text-xs text-gray-500">
              ${(active.accountSize / 100000).toFixed(0)}K
            </span>
          </div>
          {variant === "full" && (
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-bold text-gray-900 tabular-nums text-sm">
                {formatCurrency(active.accountBalance)}
              </span>
              <span className={cn("text-xs font-semibold tabular-nums", profitPct >= 0 ? "text-green-600" : "text-red-600")}>
                {profitPct >= 0 ? "+" : ""}{profitPct.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        <ChevronUpDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
          >
            <div className="p-2 max-h-80 overflow-y-auto">
              {accounts.map((a) => {
                const pct = ((a.accountBalance - a.startingBalance) / a.startingBalance) * 100;
                const isActive = a.accountId === activeAccountId;
                return (
                  <button
                    key={a.accountId}
                    onClick={() => {
                      setActiveAccount(a.accountId);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 flex items-start gap-3 transition-colors",
                      isActive && "bg-blue-50 hover:bg-blue-50",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded", PHASE_BADGE[a.accountPhase])}>
                          {PHASE_LABELS[a.accountPhase]}
                        </span>
                        <span className="text-xs text-gray-500">${(a.accountSize / 100000).toFixed(0)}K</span>
                        {isActive && (
                          <span className="text-xs font-semibold text-blue-600 inline-flex items-center gap-1">
                            <CheckCircleIcon className="w-3 h-3" />
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-gray-900 tabular-nums text-sm">
                          {formatCurrency(a.accountBalance)}
                        </span>
                        <span className={cn("text-xs font-semibold tabular-nums", pct >= 0 ? "text-green-600" : "text-red-600")}>
                          {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <Link
              href="/dashboard/new-challenge"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 text-blue-600 font-semibold text-sm hover:bg-gray-50"
            >
              <PlusIcon className="w-4 h-4" />
              Start New Challenge
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
