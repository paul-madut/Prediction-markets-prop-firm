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
 <div className="bg-[#180630] rounded-xl border border-white/10 p-8 text-center text-sm text-white/55">
 No trades yet on this account.
 </div>
 );
 }

 return (
 <div className="bg-[#180630] rounded-xl border border-white/10 overflow-hidden">
 <div className="p-4 border-b border-white/10 flex items-center justify-between">
 <h3 className="font-semibold text-white">Recent trades</h3>
 <span className="text-xs text-white/55">{trades.length} total</span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-[#0C0319] text-white/75">
 <tr>
 <th className="text-left p-3 font-medium">Outcome</th>
 <th className="text-left p-3 font-medium">Side</th>
 <SortableHeader label="Shares" onClick={() => toggle("shares")} active={sortKey === "shares"} dir={sortDir} align="right" />
 <SortableHeader label="Price" onClick={() => toggle("price")} active={sortKey === "price"} dir={sortDir} align="right" />
 <SortableHeader label="Total" onClick={() => toggle("price")} active={false} dir={sortDir} align="right" />
 <SortableHeader label="P&L" onClick={() => toggle("pnl")} active={sortKey === "pnl"} dir={sortDir} align="right" />
 <SortableHeader label="Date" onClick={() => toggle("date")} active={sortKey === "date"} dir={sortDir} align="right" />
 </tr>
 </thead>
 <tbody className="divide-y divide-white/[0.07] dark:divide-white/10">
 {rows.map((t) => {
 const total = t.shares * t.entryPrice;
 const buy = !t.exitDate;
 return (
 <tr key={t.tradeId}>
 <td className="p-3 text-white font-medium max-w-xs truncate">{t.market_title}</td>
 <td className="p-3">
 <span
 className={cn(
 "px-2 py-0.5 rounded text-xs font-semibold uppercase",
 t.side === "yes"
 ? "bg-[#12DFBA]/15 text-green-800"
 : "bg-[#FF1C1C]/15 text-red-800",
 )}
 >
 {buy ? "Buy" : "Sell"} {t.side}
 </span>
 </td>
 <td className="p-3 text-right tabular-nums">{t.shares}</td>
 <td className="p-3 text-right tabular-nums">{t.entryPrice}¢</td>
 <td className="p-3 text-right tabular-nums text-white/85">{formatCurrency(total)}</td>
 <td
 className={cn(
 "p-3 text-right tabular-nums font-semibold",
 t.pnl > 0 ? "text-[#12DFBA]" : t.pnl < 0 ? "text-[#FF6B6B]" : "text-white/55",
 )}
 >
 {t.pnl === 0 ? "—" : (t.pnl > 0 ? "+" : "") + formatCurrency(t.pnl)}
 </td>
 <td className="p-3 text-right text-white/55 whitespace-nowrap">
 {new Date(t.entryDate).toLocaleDateString()}
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
 <th className={cn("p-3 font-medium", align === "right" ? "text-right" : "text-left")}>
 <button
 onClick={onClick}
 className={cn(
 "inline-flex items-center gap-1 hover:text-white transition-colors",
 active && "text-white font-semibold",
 )}
 >
 {label}
 <ChevronUpDownIcon className={cn("w-3 h-3", active && dir === "asc" && "rotate-180")} />
 </button>
 </th>
 );
}
