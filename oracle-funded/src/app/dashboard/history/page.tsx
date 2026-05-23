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
  ChartBarIcon,
} from "@heroicons/react/16/solid";
import { useApp } from "@/context/AppContext";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/formatters";
import {
  arrayToCSV,
  downloadCSV,
  formatCurrencyForCSV,
  formatDateForCSV,
} from "@/lib/csvExport";
import { FilterChip } from "@/components/dashboard/FilterChip";
import { cn } from "@/lib/utils";

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

// Human-relative format ("2h ago", "yesterday") for recent timestamps; falls
// back to ISO date for entries older than a week.
function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  const diffSec = Math.round((Date.now() - ts) / 1000);
  if (diffSec < 45) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toISOString().slice(0, 10);
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
      if (resultFilter !== "all" && classifyResult(t) !== resultFilter)
        return false;
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
      {
        key: "isOpening",
        label: "Open",
        format: (v: unknown) => (v ? "open" : "close"),
      },
      { key: "sizeContracts", label: "Contracts" },
      { key: "priceCents", label: "Price (¢)" },
      { key: "feesCents", label: "Fees (¢)" },
      {
        key: "realizedPnlCents",
        label: "Realised P&L",
        format: (v: unknown) =>
          v === null || v === undefined
            ? ""
            : formatCurrencyForCSV(Number(v as string)),
      },
    ]);
    downloadCSV(
      csv,
      `trades-${activeAccount?.id.slice(0, 8) ?? "account"}-${Date.now()}.csv`,
    );
  }

  if (!signedIn) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-sm text-[#ADADAD]">
        Sign in to view trade history.
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-3">
        <h1 className="text-2xl font-bold text-white">History</h1>
        <p className="text-sm text-[#ADADAD]">
          You don&apos;t have an active challenge account.
        </p>
        <Link
          href="/dashboard/new-challenge"
          className="inline-flex h-11 items-center rounded-lg bg-[#7F24FF] px-5 text-sm font-semibold text-white hover:bg-[#A769FF] transition-colors"
        >
          Buy a challenge
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">History</h1>
          <p className="text-sm text-[#ADADAD] mt-1">
            Every fill on this account, newest first. Most recent 100 fills.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 text-sm font-medium text-white hover:bg-white/[0.10] transition-colors disabled:opacity-40"
          >
            <ArrowPathIcon
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 text-sm font-medium text-white hover:bg-white/[0.10] transition-colors disabled:opacity-40"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] mr-1">
            Side
          </span>
          {SIDE_FILTERS.map((f) => (
            <FilterChip
              key={f}
              active={sideFilter === f}
              onClick={() => setSideFilter(f)}
            >
              {f === "all" ? "All" : f.toUpperCase()}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] mr-1">
            Status
          </span>
          {RESULT_FILTERS.map((r) => (
            <FilterChip
              key={r}
              active={resultFilter === r}
              onClick={() => setResultFilter(r)}
              className="capitalize"
            >
              {r === "all" ? "All" : r}
            </FilterChip>
          ))}
          <div className="relative ml-auto w-full max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A6476]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search market"
              className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] pl-9 pr-3 text-sm text-white placeholder:text-[#5A6476] focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[rgba(127,36,255,0.45)]"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#FF1C1C]/30 bg-[rgba(255,28,28,0.14)] px-4 py-3 text-sm text-[#FF1C1C]">
          Failed to load history: {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#180630]">
        {trades === null && !error ? (
          <div className="p-12 text-center text-sm text-[#ADADAD]">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06]">
              <ChartBarIcon className="h-5 w-5 text-[#A769FF]" />
            </div>
            <p className="text-sm text-[#ADADAD]">
              {trades && trades.length === 0
                ? "No trades yet — place your first market order."
                : "No trades match the current filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#180630] font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD]">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Time</th>
                  <th className="text-left px-4 py-3 font-medium">Market</th>
                  <th className="text-left px-4 py-3 font-medium">Side</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-right px-4 py-3 font-medium">Size</th>
                  <th className="text-right px-4 py-3 font-medium">Price</th>
                  <th className="text-right px-4 py-3 font-medium">Fees</th>
                  <th className="text-right px-6 py-3 font-medium">Realised</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const result = classifyResult(t);
                  const pnl = t.realizedPnlCents
                    ? Number(t.realizedPnlCents)
                    : null;
                  const sideKey = t.side.toLowerCase() === "yes" ? "yes" : "no";
                  return (
                    <tr
                      key={t.id}
                      className="h-14 border-b border-white/10 last:border-b-0 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-6 align-middle">
                        <div className="font-mono text-xs text-white tabular-nums">
                          {formatRelative(t.executedAt)}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#5A6476]">
                          {new Date(t.executedAt)
                            .toISOString()
                            .slice(0, 16)
                            .replace("T", " ")}
                        </div>
                      </td>
                      <td className="px-4 align-middle">
                        <Link
                          href={`/dashboard/markets/${encodeURIComponent(t.externalMarketId)}`}
                          className="block max-w-[260px] truncate font-mono text-xs text-white hover:text-[#A769FF] transition-colors"
                        >
                          {t.externalMarketId}
                        </Link>
                        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#5A6476]">
                          {t.venue}
                        </div>
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
                          {t.side}
                        </span>
                      </td>
                      <td className="px-4 align-middle">
                        <span
                          className={cn(
                            "inline-flex h-[22px] items-center rounded-full px-2.5 text-[12px] font-semibold uppercase",
                            t.isOpening
                              ? "bg-[rgba(127,36,255,0.18)] text-[#A769FF]"
                              : result === "win"
                                ? "bg-[rgba(18,223,186,0.14)] text-[#12DFBA]"
                                : result === "loss"
                                  ? "bg-[rgba(255,28,28,0.14)] text-[#FF1C1C]"
                                  : "bg-white/[0.06] text-white",
                          )}
                        >
                          {t.isOpening ? "Open" : result}
                        </span>
                      </td>
                      <td className="px-4 text-right font-mono text-sm text-white tabular-nums">
                        {t.sizeContracts.toLocaleString()}
                      </td>
                      <td className="px-4 text-right font-mono text-sm text-white tabular-nums">
                        {t.priceCents}¢
                      </td>
                      <td className="px-4 text-right font-mono text-sm text-[#ADADAD] tabular-nums">
                        {t.feesCents > 0 ? formatCurrency(t.feesCents) : "—"}
                      </td>
                      <td
                        className={cn(
                          "px-6 text-right font-mono text-sm font-medium tabular-nums",
                          pnl === null
                            ? "text-[#5A6476]"
                            : pnl > 0
                              ? "text-[#12DFBA]"
                              : pnl < 0
                                ? "text-[#FF1C1C]"
                                : "text-white",
                        )}
                      >
                        {pnl === null
                          ? "—"
                          : `${pnl >= 0 ? "+" : ""}${formatCurrency(pnl)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
