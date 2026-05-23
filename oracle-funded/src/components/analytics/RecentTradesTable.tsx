"use client";

import React, { useState } from "react";
import { Trade } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { ChevronUpDownIcon } from "@heroicons/react/24/outline";

type SortKey = "date" | "pnl" | "shares" | "price";
type SortDir = "asc" | "desc";

interface RecentTradesTableProps {
  trades: Trade[];
  limit?: number;
}

export function RecentTradesTable({ trades, limit = 25 }: RecentTradesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = [...trades].sort((a, b) => {
    let av = 0;
    let bv = 0;
    switch (sortKey) {
      case "date":
        av = new Date(a.entryDate).getTime();
        bv = new Date(b.entryDate).getTime();
        break;
      case "pnl":
        av = a.pnl;
        bv = b.pnl;
        break;
      case "shares":
        av = a.shares;
        bv = b.shares;
        break;
      case "price":
        av = a.entryPrice;
        bv = b.entryPrice;
        break;
    }
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const rows = sorted.slice(0, limit);

  const toggle = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#180630] p-10 text-center text-sm text-[#ADADAD]">
        No trades yet on this account.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#180630]">
      <div className="flex h-12 items-center justify-between border-b border-white/10 px-6">
        <h3 className="text-base font-semibold text-white">Recent trades</h3>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] tabular-nums">
          {trades.length} total
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#180630] text-[11px] font-mono uppercase tracking-[0.08em] text-[#ADADAD]">
            <tr>
              <th className="text-left px-6 py-3 font-medium">Outcome</th>
              <th className="text-left px-4 py-3 font-medium">Side</th>
              <SortableHeader
                label="Shares"
                onClick={() => toggle("shares")}
                active={sortKey === "shares"}
                dir={sortDir}
                align="right"
              />
              <SortableHeader
                label="Price"
                onClick={() => toggle("price")}
                active={sortKey === "price"}
                dir={sortDir}
                align="right"
              />
              <th className="text-right px-4 py-3 font-medium">Total</th>
              <SortableHeader
                label="P&L"
                onClick={() => toggle("pnl")}
                active={sortKey === "pnl"}
                dir={sortDir}
                align="right"
              />
              <SortableHeader
                label="Date"
                onClick={() => toggle("date")}
                active={sortKey === "date"}
                dir={sortDir}
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const total = t.shares * t.entryPrice;
              const buy = !t.exitDate;
              const sideKey = t.side === "yes" ? "yes" : "no";
              return (
                <tr
                  key={t.tradeId}
                  className="h-14 border-b border-white/10 last:border-b-0 transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-6 align-middle">
                    <span className="block max-w-xs truncate text-sm text-white">
                      {t.market_title}
                    </span>
                  </td>
                  <td className="px-4 align-middle">
                    <span
                      className={cn(
                        "inline-flex h-[22px] items-center rounded-full px-2.5 text-[12px] font-semibold uppercase",
                        sideKey === "yes"
                          ? "bg-[rgba(18,223,186,0.14)] text-[#12DFBA]"
                          : "bg-[rgba(255,28,28,0.14)] text-[#FF1C1C]",
                      )}
                    >
                      {buy ? "Buy" : "Sell"} {t.side}
                    </span>
                  </td>
                  <td className="px-4 text-right font-mono text-sm text-white tabular-nums">
                    {t.shares.toLocaleString()}
                  </td>
                  <td className="px-4 text-right font-mono text-sm text-white tabular-nums">
                    {t.entryPrice}¢
                  </td>
                  <td className="px-4 text-right font-mono text-sm text-white tabular-nums">
                    {formatCurrency(total)}
                  </td>
                  <td
                    className={cn(
                      "px-4 text-right font-mono text-sm font-semibold tabular-nums",
                      t.pnl > 0
                        ? "text-[#12DFBA]"
                        : t.pnl < 0
                          ? "text-[#FF1C1C]"
                          : "text-white",
                    )}
                  >
                    {t.pnl === 0
                      ? "—"
                      : (t.pnl > 0 ? "+" : "") + formatCurrency(t.pnl)}
                  </td>
                  <td className="px-6 text-right font-mono text-xs text-[#ADADAD] tabular-nums whitespace-nowrap">
                    {new Date(t.entryDate).toISOString().slice(0, 10)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  onClick,
  active,
  dir,
  align,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  dir: SortDir;
  align: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 font-medium",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-white",
          active && "text-white",
        )}
      >
        {label}
        <ChevronUpDownIcon
          className={cn(
            "h-3 w-3 transition-transform",
            active && dir === "asc" && "rotate-180",
          )}
        />
      </button>
    </th>
  );
}
