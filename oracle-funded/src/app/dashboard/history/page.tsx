"use client";

// /dashboard/history — full trade ledger.
//
// Pulls /api/trades?accountId=<id>, supports filter by side (yes/no), result
// (win/loss/scratch/open), and free-text market search. CSV export uses the
// existing csvExport helper.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
 ArrowDownTrayIcon,
 ArrowPathIcon,
 MagnifyingGlassIcon,
} from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { useApp } from "@/context/AppContext";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/formatters";
import {
 arrayToCSV,
 downloadCSV,
 formatCurrencyForCSV,
 formatDateForCSV,
} from "@/lib/csvExport";

interface TradeRow {
 id: string;
 accountId: string;
 side: string;
 sizeContracts: number;
 priceCents: number;
 feesCents: number;
 realizedPnlCents: string | null;
 isOpening: boolean;
 externalMarketId: string;
 venue: string;
 executedAt: string;
}

const SIDE_FILTERS = ["all", "yes", "no"] as const;
type SideFilter = (typeof SIDE_FILTERS)[number];

const RESULT_FILTERS = ["all", "win", "loss", "scratch", "open"] as const;
type ResultFilter = (typeof RESULT_FILTERS)[number];

function classifyResult(t: TradeRow): ResultFilter {
 if (t.isOpening || t.realizedPnlCents === null) return "open";
 const pnl = Number(t.realizedPnlCents);
 if (pnl > 0) return "win";
 if (pnl < 0) return "loss";
 return "scratch";
}

export default function HistoryPage() {
 const { activeAccount, signedIn } = useApp();
 const [trades, setTrades] = useState<TradeRow[] | null>(null);
 const [error, setError] = useState<string | null>(null);
 const [loading, setLoading] = useState(false);

 const [sideFilter, setSideFilter] = useState<SideFilter>("all");
 const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
 const [search, setSearch] = useState("");

 async function load(): Promise<void> {
 if (!activeAccount) return;
 setLoading(true);
 setError(null);
 try {
 const data = await api.get<TradeRow[]>(
 `/api/trades?accountId=${activeAccount.id}`,
 );
 setTrades(data);
 } catch (err) {
 setError(err instanceof ApiError ? err.message : String(err));
 } finally {
 setLoading(false);
 }
 }

 useEffect(() => {
 void load();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [activeAccount?.id]);

 const filtered = useMemo(() => {
 if (!trades) return [];
 const q = search.trim().toLowerCase();
 return trades.filter((t) => {
 if (sideFilter !== "all" && t.side !== sideFilter) return false;
 if (resultFilter !== "all" && classifyResult(t) !== resultFilter) return false;
 if (q && !t.externalMarketId.toLowerCase().includes(q)) return false;
 return true;
 });
 }, [trades, sideFilter, resultFilter, search]);

 function exportCsv(): void {
 if (filtered.length === 0) return;
 const csv = arrayToCSV(filtered, [
 { key: "executedAt", label: "Time", format: formatDateForCSV },
 { key: "venue", label: "Venue" },
 { key: "externalMarketId", label: "Market" },
 { key: "side", label: "Side" },
 { key: "isOpening", label: "Open", format: (v: unknown) => (v ? "open" : "close") },
 { key: "sizeContracts", label: "Contracts" },
 { key: "priceCents", label: "Price (¢)" },
 { key: "feesCents", label: "Fees (¢)" },
 {
 key: "realizedPnlCents",
 label: "Realised P&L",
 format: (v: unknown) =>
 v === null || v === undefined ? "" : formatCurrencyForCSV(Number(v as string)),
 },
 ]);
 downloadCSV(csv, `trades-${activeAccount?.id.slice(0, 8) ?? "account"}-${Date.now()}.csv`);
 }

 if (!signedIn) {
 return (
 <div className="max-w-3xl mx-auto py-12 text-center text-sm text-white/55">
 Sign in to view trade history.
 </div>
 );
 }

 if (!activeAccount) {
 return (
 <div className="max-w-3xl mx-auto py-12 text-center space-y-3">
 <h1 className="text-2xl font-bold text-white">History</h1>
 <p className="text-sm text-white/55">
 You don&apos;t have an active challenge account.
 </p>
 <Link
 href="/dashboard/new-challenge"
 className="inline-block px-4 py-2 rounded-lg bg-[#7F24FF] text-white text-sm font-medium"
 >
 Buy a challenge
 </Link>
 </div>
 );
 }

 return (
 <div className="space-y-6 max-w-7xl mx-auto">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-white">History</h1>
 <p className="text-sm text-white/55 mt-1">
 Every fill on this account, newest first. Most recent 100 fills.
 </p>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => void load()}
 disabled={loading}
 className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white/85 bg-[#180630] border border-gray-200 dark:border-white/10 hover:border-[#A769FF] disabled:opacity-50"
 >
 <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
 Refresh
 </button>
 <button
 onClick={exportCsv}
 disabled={filtered.length === 0}
 className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white/85 bg-[#180630] border border-gray-200 dark:border-white/10 hover:border-[#A769FF] disabled:opacity-50"
 >
 <ArrowDownTrayIcon className="w-4 h-4" />
 Export CSV
 </button>
 </div>
 </div>

 {/* Filters */}
 <div className="flex flex-wrap items-center gap-3">
 <div className="flex flex-wrap gap-2">
 {SIDE_FILTERS.map((f) => (
 <button
 key={f}
 onClick={() => setSideFilter(f)}
 className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
 sideFilter === f
 ? "bg-[#7F24FF] text-white"
 : "bg-[#180630] text-white/85 border border-gray-200 dark:border-white/10"
 }`}
 >
 {f === "all" ? "All sides" : f.toUpperCase()}
 </button>
 ))}
 </div>
 <div className="flex flex-wrap gap-2">
 {RESULT_FILTERS.map((r) => (
 <button
 key={r}
 onClick={() => setResultFilter(r)}
 className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
 resultFilter === r
 ? "bg-[#7F24FF] text-white"
 : "bg-[#180630] text-white/85 border border-gray-200 dark:border-white/10"
 }`}
 >
 {r === "all" ? "All results" : r}
 </button>
 ))}
 </div>
 <div className="relative flex-1 min-w-[200px] max-w-sm">
 <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45" />
 <input
 type="text"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search market"
 className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-[#180630] text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#7F24FF]"
 />
 </div>
 </div>

 {error && (
 <div className="bg-[#FF1C1C]/10 border border-[#FF1C1C]/30 rounded-xl px-4 py-3 text-sm text-[#FF6B6B]">
 Failed to load history: {error}
 </div>
 )}

 <TextureCard interactive={false}>
 <TextureCardContent className="p-0">
 {trades === null && !error ? (
 <div className="p-12 text-center text-sm text-white/55">
 Loading…
 </div>
 ) : filtered.length === 0 ? (
 <div className="p-12 text-center text-sm text-white/55">
 {trades && trades.length === 0
 ? "No trades yet — place your first market order."
 : "No trades match the current filter."}
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-[#0C0319] dark:bg-[#0C0319] text-xs uppercase tracking-wider text-white/55">
 <tr>
 <th className="text-left py-3 px-4 font-semibold">Time</th>
 <th className="text-left py-3 px-4 font-semibold">Market</th>
 <th className="text-left py-3 px-4 font-semibold">Side</th>
 <th className="text-left py-3 px-4 font-semibold">Type</th>
 <th className="text-right py-3 px-4 font-semibold">Size</th>
 <th className="text-right py-3 px-4 font-semibold">Price</th>
 <th className="text-right py-3 px-4 font-semibold">Fees</th>
 <th className="text-right py-3 px-4 font-semibold">Realised</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/[0.07] dark:divide-white/10">
 {filtered.map((t) => {
 const result = classifyResult(t);
 const pnl = t.realizedPnlCents ? Number(t.realizedPnlCents) : null;
 return (
 <tr
 key={t.id}
 className="hover:bg-[#0C0319] dark:hover:bg-[#180630] transition-colors"
 >
 <td className="py-2 px-4 text-xs text-white/55">
 {new Date(t.executedAt).toLocaleString()}
 </td>
 <td className="py-2 px-4">
 <Link
 href={`/dashboard/markets/${encodeURIComponent(t.externalMarketId)}`}
 className="font-mono text-xs text-white hover:text-[#A769FF]"
 >
 {t.externalMarketId.slice(0, 18)}
 {t.externalMarketId.length > 18 ? "…" : ""}
 </Link>
 <div className="text-[10px] text-white/45 uppercase">
 {t.venue}
 </div>
 </td>
 <td className="py-2 px-4 capitalize">{t.side}</td>
 <td className="py-2 px-4">
 <span
 className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold ${
 t.isOpening
 ? "bg-[#7F24FF]/10 text-[#7F24FF]"
 : result === "win"
 ? "bg-[#12DFBA]/10 text-[#12DFBA]"
 : result === "loss"
 ? "bg-[#FF1C1C]/10 text-[#FF6B6B]"
 : "bg-white/[0.06] text-white/70"
 }`}
 >
 {t.isOpening ? "Open" : result}
 </span>
 </td>
 <td className="py-2 px-4 text-right tabular-nums">
 {t.sizeContracts}
 </td>
 <td className="py-2 px-4 text-right tabular-nums">
 {t.priceCents}¢
 </td>
 <td className="py-2 px-4 text-right tabular-nums text-white/55">
 {t.feesCents > 0 ? formatCurrency(t.feesCents) : "—"}
 </td>
 <td
 className={`py-2 px-4 text-right tabular-nums ${
 pnl === null
 ? "text-white/45"
 : pnl >= 0
 ? "text-[#12DFBA]"
 : "text-[#FF6B6B]"
 }`}
 >
 {pnl === null ? "—" : `${pnl >= 0 ? "+" : ""}${formatCurrency(pnl)}`}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </TextureCardContent>
 </TextureCard>
 </div>
 );
}
