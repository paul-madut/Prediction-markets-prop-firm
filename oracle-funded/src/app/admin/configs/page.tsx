"use client";

// /admin/configs — challenge config list.
//
// Reads active firm configs from GET /api/configs. Each row links to
// /admin/configs/[id]/edit; "New config" links to /admin/configs/new.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowPathIcon, PlusIcon, PencilSquareIcon } from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { TextureButton } from "@/components/ui/texture-button";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/formatters";

interface Phase {
  phaseNumber: number;
  name: string;
  profitTargetPct: string;
  minTradingDays: number;
}

interface Config {
  id: string;
  name: string;
  accountSizeCents: string;
  challengeFeeCents: number;
  drawdownType: string;
  trailingReference: string;
  totalDrawdownPct: string;
  dailyDrawdownPct: string | null;
  profitSplitPct: string;
  phases: Phase[];
}

export default function AdminConfigsPage() {
  const [rows, setRows] = useState<Config[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Config[]>("/api/configs");
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Challenge configs
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            The rule templates traders can buy. Each config drives provisioning, eval, and pricing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-blue-300 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link href="/admin/configs/new">
            <TextureButton variant="primary" size="sm">
              <PlusIcon className="w-4 h-4" />
              New config
            </TextureButton>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Failed to load configs: {error}
        </div>
      )}

      <TextureCard interactive={false}>
        <TextureCardContent className="p-0">
          {rows === null && !error && (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
              Loading configs…
            </div>
          )}
          {rows && rows.length === 0 && !error && (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
              No active configs. Create one to start selling challenges.
            </div>
          )}
          {rows && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-950 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Name</th>
                    <th className="text-right py-3 px-4 font-semibold">Account size</th>
                    <th className="text-right py-3 px-4 font-semibold">Fee</th>
                    <th className="text-left py-3 px-4 font-semibold">Drawdown</th>
                    <th className="text-right py-3 px-4 font-semibold">Total / Daily</th>
                    <th className="text-right py-3 px-4 font-semibold">Split</th>
                    <th className="text-left py-3 px-4 font-semibold">Phases</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {rows.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {c.name}
                        </div>
                        <div className="font-mono text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {c.id.slice(0, 8)}…
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-gray-900 dark:text-gray-100">
                        {formatCurrency(Number(c.accountSizeCents))}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-gray-900 dark:text-gray-100">
                        ${(c.challengeFeeCents / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300 capitalize">
                        {c.drawdownType.replace("_", " ")}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {c.totalDrawdownPct}% /{" "}
                        {c.dailyDrawdownPct ? `${c.dailyDrawdownPct}%` : "—"}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {c.profitSplitPct}%
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {c.phases.length}{" "}
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          ({c.phases.map((p) => `${p.profitTargetPct}%`).join(" → ")})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/configs/${c.id}/edit`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                          Edit
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
