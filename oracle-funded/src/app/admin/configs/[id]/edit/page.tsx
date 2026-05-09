"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/16/solid";
import { ConfigForm, type ConfigDraft } from "@/components/admin/configs/ConfigForm";
import { api, ApiError } from "@/lib/api-client";

interface Phase {
  phaseNumber: number;
  name: string;
  profitTargetPct: string;
  minTradingDays: number;
}

interface ConfigResponse {
  id: string;
  name: string;
  accountSizeCents: string;
  challengeFeeCents: number;
  drawdownType: string;
  trailingReference: string;
  totalDrawdownPct: string;
  dailyDrawdownPct: string | null;
  profitSplitPct: string;
  breachComparison: string;
  breachCloseBehavior: string;
  refundDisablesAccount: boolean;
  maxPositionsPerMarket: number;
  maxPositionsTotal: number;
  maxContractsPerOrder: number | null;
  isActive: boolean;
  phases: Phase[];
}

function toDraft(c: ConfigResponse): ConfigDraft {
  return {
    name: c.name,
    accountSizeCents: (Number(c.accountSizeCents) / 100).toString(),
    challengeFeeCents: (c.challengeFeeCents / 100).toString(),
    drawdownType: (c.drawdownType === "static" || c.drawdownType === "trailing_eod"
      ? c.drawdownType
      : "trailing_eod") as "static" | "trailing_eod",
    trailingReference: (["eod_balance", "eod_equity", "eod_max_balance_equity"].includes(
      c.trailingReference,
    )
      ? c.trailingReference
      : "eod_balance") as "eod_balance" | "eod_equity" | "eod_max_balance_equity",
    totalDrawdownPct: c.totalDrawdownPct,
    dailyDrawdownPct: c.dailyDrawdownPct ?? "",
    profitSplitPct: c.profitSplitPct,
    breachComparison: (c.breachComparison === "lte" ? "lte" : "lt") as "lt" | "lte",
    breachCloseBehavior: (c.breachCloseBehavior === "close_at_market"
      ? "close_at_market"
      : "mark_to_floor") as "mark_to_floor" | "close_at_market",
    refundDisablesAccount: c.refundDisablesAccount,
    maxPositionsPerMarket: c.maxPositionsPerMarket.toString(),
    maxPositionsTotal: c.maxPositionsTotal.toString(),
    maxContractsPerOrder:
      c.maxContractsPerOrder === null ? "" : c.maxContractsPerOrder.toString(),
    isActive: c.isActive,
    phases: c.phases.map((p) => ({
      phaseNumber: p.phaseNumber,
      name: p.name,
      profitTargetPct: p.profitTargetPct,
      minTradingDays: p.minTradingDays.toString(),
    })),
  };
}

export default function EditConfigPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [draft, setDraft] = useState<ConfigDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ConfigResponse>(`/api/admin/configs/${id}`)
      .then((c) => setDraft(toDraft(c)))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : String(err)),
      );
  }, [id]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/configs"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          All configs
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Edit challenge config
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Account size and drawdown style cannot be changed once a config
          has accounts attached. Other fields are mutable.
        </p>
      </div>
      {error && (
        <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Failed to load config: {error}
        </div>
      )}
      {!draft && !error && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-12">
          Loading…
        </div>
      )}
      {draft && <ConfigForm mode="edit" initialDraft={draft} configId={id} />}
    </div>
  );
}
