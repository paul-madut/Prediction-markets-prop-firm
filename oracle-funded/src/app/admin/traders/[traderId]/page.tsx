"use client";

// /admin/traders/[traderId] — accounts owned by a single user.
//
// Real list scoped via /api/accounts (admin sees all firm accounts), then
// filtered to the requested userId. Each row links to /admin/accounts/[id]
// where the actions live. We don't yet have per-trader profile data
// (display name, signup date) since it's not on /api/accounts; that lives in
// auth.users and would need its own endpoint.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowPathIcon,
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
  drawdownFloorCents: string;
  tradingDaysCount: number;
  createdAt: string;
  config: { name: string; accountSizeCents: string };
  currentPhase: { phaseNumber: number; name: string; profitTargetPct: string };
}

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

export default function TraderDetailPage() {
  const params = useParams<{ traderId: string }>();
  const traderId = params.traderId;
  const [rows, setRows] = useState<AccountRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<AccountRow[]>("/api/accounts");
      setRows(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
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
    return rows.filter((r) => r.userId === traderId);
  }, [rows, traderId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <Link
          href="/admin/traders"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          All traders
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Trader
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono break-all">
              {traderId}
            </p>
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
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <TextureCard interactive={false}>
        <TextureCardContent className="p-0">
          {rows === null && !error ? (
            <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
              No accounts found for this user.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-950 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Account</th>
                    <th className="text-left py-3 px-4 font-semibold">Config</th>
                    <th className="text-left py-3 px-4 font-semibold">Phase</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-right py-3 px-4 font-semibold">Balance</th>
                    <th className="text-right py-3 px-4 font-semibold">Trading days</th>
                    <th className="text-left py-3 px-4 font-semibold">Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {filtered.map((r) => {
                    const balance = Number(r.currentBalanceCents);
                    const starting = Number(r.startingBalanceCents);
                    const pnlPct = starting > 0 ? ((balance - starting) / starting) * 100 : 0;
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-xs">
                          {r.id.slice(0, 8)}…
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-gray-900 dark:text-gray-100">
                            {r.config.name}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {formatCurrency(Number(r.config.accountSizeCents))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                          <div>{r.currentPhase.name}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {r.currentPhase.profitTargetPct}% target
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          <div className="font-semibold">{formatCurrency(balance)}</div>
                          <div
                            className={`text-xs ${pnlPct >= 0 ? "text-emerald-600" : "text-red-600"}`}
                          >
                            {pnlPct >= 0 ? "+" : ""}
                            {pnlPct.toFixed(2)}%
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          {r.tradingDaysCount}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(r.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/admin/accounts/${r.id}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Open
                            <ArrowRightIcon className="w-3.5 h-3.5" />
                          </Link>
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
