"use client";

// /admin/signals — anti-cheat signal queue, wired to /api/admin/signals.
//
// Detection queries are deferred to beta wks 3-5 per Decision 7; this page
// queries the cheat_signals table — currently empty, but renders any rows
// detection generates once enabled. Click a row to review.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { api, ApiError } from "@/lib/api-client";

interface SignalRow {
  id: string;
  accountId: string;
  signalType: string;
  severity: string;
  score: string | null;
  status: string;
  detectedAt: string;
}

const STATUS_FILTERS = ["all", "pending", "confirmed", "dismissed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function SeverityBadge({ severity }: { severity: string }) {
  const palette: Record<string, string> = {
    low: "bg-gray-100 text-gray-700 border-gray-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    high: "bg-orange-50 text-orange-700 border-orange-200",
    critical: "bg-red-50 text-red-700 border-red-200",
  };
  const cls = palette[severity] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}
    >
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const palette: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: "bg-red-50 text-red-700 border-red-200",
    dismissed: "bg-gray-100 text-gray-600 border-gray-200",
  };
  const cls = palette[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}
    >
      {status}
    </span>
  );
}

export default function AdminSignalsPage() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [rows, setRows] = useState<SignalRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const path =
        filter === "all"
          ? "/api/admin/signals"
          : `/api/admin/signals?status=${filter}`;
      const data = await api.get<SignalRow[]>(path);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const sorted = useMemo(() => {
    if (!rows) return [];
    return [...rows].sort(
      (a, b) =>
        new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
    );
  }, [rows]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 inline-flex items-center gap-2">
            <ShieldExclamationIcon className="w-7 h-7 text-amber-600" />
            Signals
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Anti-cheat queue. Detection queries are off in MVP; this surface
            renders any signals the system records once detection is enabled.
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

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-800"
            }`}
          >
            {f}
          </button>
        ))}
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
          ) : sorted.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ShieldExclamationIcon className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No signals to review.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-md mx-auto">
                The cheat_signals table is empty. Detection queries (latency
                arb, duplicate accounts, pattern trading) ship in beta weeks 3-5
                — see Decision 7 in the WebFlux MVP plan.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-950 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Detected</th>
                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 font-semibold">Severity</th>
                    <th className="text-right py-3 px-4 font-semibold">Score</th>
                    <th className="text-left py-3 px-4 font-semibold">Account</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {sorted.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors"
                    >
                      <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(s.detectedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 capitalize text-gray-900 dark:text-gray-100">
                        {s.signalType.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-4">
                        <SeverityBadge severity={s.severity} />
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-gray-700 dark:text-gray-300">
                        {s.score ? Number(s.score).toFixed(2) : "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <Link
                          href={`/admin/accounts/${s.accountId}`}
                          className="text-gray-900 dark:text-gray-100 hover:text-blue-600"
                        >
                          {s.accountId.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/signals/${s.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Review
                          <ArrowRightIcon className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TextureCardContent>
      </TextureCard>
    </div>
  );
}
