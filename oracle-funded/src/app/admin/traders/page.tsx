"use client";

// /admin/traders — firm-scoped account directory.
//
// Wires GET /api/accounts (admins receive all firm accounts). Each row
// shows the account's owner, status, current balance vs starting balance,
// drawdown floor proximity, and config name. Clicking a row drills into
// /admin/accounts/[id] for actions.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface AccountRow {
  id: string;
  userId: string;
  status: string;
  startingBalanceCents: string;
  currentBalanceCents: string;
  highestEodBalanceCents: string;
  drawdownFloorCents: string;
  dailyLossFloorCents: string | null;
  tradingDaysCount: number;
  firstTradeAt: string | null;
  breachAt: string | null;
  createdAt: string;
  config: {
    name: string;
    accountSizeCents: string;
    drawdownType: string;
    totalDrawdownPct: string;
    dailyDrawdownPct: string | null;
    profitSplitPct: string;
  };
  currentPhase: {
    phaseNumber: number;
    name: string;
    profitTargetPct: string;
  };
}

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "pending", label: "Pending" },
  { id: "passed_phase", label: "Passed phase" },
  { id: "funded", label: "Funded" },
  { id: "breached", label: "Breached" },
  { id: "disabled", label: "Disabled" },
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number]["id"];

function StatusBadge({ status }: { status: string }) {
  const palette: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-gray-50 text-gray-700 border-gray-200",
    passed_phase: "bg-blue-50 text-blue-700 border-blue-200",
    funded: "bg-violet-50 text-violet-700 border-violet-200",
    breached: "bg-red-50 text-red-700 border-red-200",
    disabled: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const cls = palette[status] ?? "bg-gray-50 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default function AdminTradersPage() {
  const [rows, setRows] = useState<AccountRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  async function load(): Promise<void> {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.get<AccountRow[]>("/api/accounts");
      setRows(data);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : String(err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (q && !r.userId.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [rows, filter, search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Traders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Every challenge account in the firm. Click a row to drill into actions.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
            Live data
          </span>
        </div>
      </div>

      {/* Filter pills + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f.id
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800 hover:border-blue-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user ID or account ID"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-blue-300 disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Failed to load accounts: {loadError}
        </div>
      )}

      <TextureCard interactive={false}>
        <TextureCardContent className="p-0">
          {rows === null && !loadError && (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
              Loading accounts…
            </div>
          )}
          {rows && filtered.length === 0 && !loadError && (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
              No accounts match the current filter.
            </div>
          )}
          {filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-950 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Trader / Account</th>
                    <th className="text-left py-3 px-4 font-semibold">Config</th>
                    <th className="text-left py-3 px-4 font-semibold">Phase</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-right py-3 px-4 font-semibold">Balance</th>
                    <th className="text-right py-3 px-4 font-semibold">DD floor</th>
                    <th className="text-right py-3 px-4 font-semibold">Trading days</th>
                    <th className="text-left py-3 px-4 font-semibold">Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {filtered.map((r) => {
                    const balance = Number(r.currentBalanceCents);
                    const starting = Number(r.startingBalanceCents);
                    const floor = Number(r.drawdownFloorCents);
                    const pnlPct = starting === 0 ? 0 : ((balance - starting) / starting) * 100;
                    const floorProximity =
                      balance <= floor
                        ? 100
                        : starting === floor
                          ? 0
                          : ((starting - balance) / (starting - floor)) * 100;
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-mono text-xs text-gray-900 dark:text-gray-100">
                            {r.userId.slice(0, 8)}…
                          </div>
                          <div className="font-mono text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            acct {r.id.slice(0, 8)}…
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                          <div>{r.config.name}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {formatCurrency(Number(r.config.accountSizeCents))} ·{" "}
                            {r.config.drawdownType === "trailing_eod" ? "Trailing-EOD" : "Static"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                          <div>{r.currentPhase.name}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            target {r.currentPhase.profitTargetPct}%
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(balance)}
                          </div>
                          <div
                            className={`text-xs ${pnlPct >= 0 ? "text-emerald-600" : "text-red-600"}`}
                          >
                            {pnlPct >= 0 ? "+" : ""}
                            {pnlPct.toFixed(2)}%
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          <div className="text-gray-700 dark:text-gray-300">
                            {formatCurrency(floor)}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {floorProximity.toFixed(0)}% used
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-gray-700 dark:text-gray-300">
                          {r.tradingDaysCount}
                        </td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">
                          {formatDate(r.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-3">
                            <Link
                              href={`/admin/traders/${r.userId}`}
                              className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400"
                            >
                              All accounts
                            </Link>
                            <Link
                              href={`/admin/accounts/${r.id}`}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              Open
                              <ArrowRightIcon className="w-3.5 h-3.5" />
                            </Link>
                          </div>
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
