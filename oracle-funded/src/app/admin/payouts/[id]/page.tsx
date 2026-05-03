"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { useAdmin } from "@/context/AdminContext";
import { getAdminAccount } from "@/data/mockAdminAccounts";
import ConfirmationModal from "@/components/admin/shared/ConfirmationModal";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type ActionKind = "approve" | "reject" | "info_request" | null;

const actionMeta = {
  approve: {
    title: "Approve payout",
    message:
      "Marks the payout as approved and notifies the trader. Funds are not transferred — that step happens externally.",
    confirmText: "Approve",
    inputLabel: "Reason / note for audit log",
    inputPlaceholder: "e.g. all checks passed; no recent breaches",
    variant: "primary" as const,
  },
  reject: {
    title: "Reject payout",
    message:
      "Marks the payout as rejected and notifies the trader. Funds are not deducted from the account.",
    confirmText: "Reject",
    inputLabel: "Reason (sent to trader)",
    inputPlaceholder: "e.g. recent rule violation; trading days requirement not met",
    variant: "danger" as const,
  },
  info_request: {
    title: "Request more information",
    message: "Send a message to the trader requesting additional info before review.",
    confirmText: "Send request",
    inputLabel: "Message to trader",
    inputPlaceholder: "We need a copy of your KYC document re-verified...",
    variant: "warning" as const,
  },
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full capitalize",
        map[status] ?? "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300"
      )}
    >
      {status}
    </span>
  );
}

export default function AdminPayoutDetailPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";
  const { payoutQueue, traders, approvePayout, rejectPayout } = useAdmin();
  const payout = payoutQueue.find((p) => p.payoutId === id);
  const [pending, setPending] = useState<ActionKind>(null);

  if (!payout) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 -mx-6 -mt-6 px-6 py-6 mb-6">
          <Link
            href="/admin/payouts"
            className="text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to payouts
          </Link>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payout not found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ID <code className="px-1 py-0.5 bg-gray-100 dark:bg-slate-800 rounded">{id}</code> doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const trader = traders.find((t) => t.userId === payout.traderId);
  const adminAccount =
    trader && getAdminAccount(trader.userId);

  const netToTrader = payout.traderShare - payout.processingFee;

  const handleConfirm = async (reason?: string) => {
    if (pending === "approve") {
      approvePayout(payout.payoutId);
      console.info("[approve] reason:", reason);
    } else if (pending === "reject") {
      rejectPayout(payout.payoutId, reason ?? "no reason provided");
    } else if (pending === "info_request") {
      console.info("[info request]", reason);
    }
  };

  const meta = pending ? actionMeta[pending] : null;
  const isPending = payout.status === "pending";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 -mx-6 -mt-6 px-6 py-6 mb-6">
        <Link
          href="/admin/payouts"
          className="text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to payouts
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{payout.traderName}</h1>
              <StatusBadge status={payout.status} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{payout.traderEmail}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Requested {new Date(payout.requestedAt).toLocaleString()} ·{" "}
              <code className="px-1 py-0.5 bg-gray-100 dark:bg-slate-800 rounded">{payout.payoutId}</code>
            </p>
          </div>

          {isPending && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setPending("approve")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
              >
                <CheckCircleIcon className="h-4 w-4" />
                Approve
              </button>
              <button
                onClick={() => setPending("reject")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                <XCircleIcon className="h-4 w-4" />
                Reject
              </button>
              <button
                onClick={() => setPending("info_request")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition"
              >
                <QuestionMarkCircleIcon className="h-4 w-4" />
                Request more info
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount */}
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            <header className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
              <CurrencyDollarIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Amount breakdown</h2>
            </header>
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              <Row label="Gross profit" value={formatCurrency(payout.grossProfit)} />
              <Row label="Firm share" value={formatCurrency(payout.firmShare)} />
              <Row label="Trader share" value={formatCurrency(payout.traderShare)} />
              <Row
                label="Processing fee"
                value={`-${formatCurrency(payout.processingFee)}`}
                tone="negative"
              />
              <div className="px-5 py-4 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Net to trader</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(netToTrader)}
                </p>
              </div>
            </div>
          </section>

          {/* Banking destination */}
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            <header className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Banking destination · {payout.paymentMethod.replace("_", " ")}
              </h2>
            </header>
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {Object.entries(payout.paymentDetails).map(([k, v]) => (
                <Row
                  key={k}
                  label={k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                  value={v}
                  mono
                />
              ))}
            </div>
          </section>

          {/* Cheat signals — empty state in MVP */}
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            <header className="px-5 py-3 border-b border-gray-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cheat signals history</h2>
            </header>
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No signals on this account.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Detection rules enable in beta weeks 3–5.
              </p>
            </div>
          </section>
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-6">
          {/* Account info */}
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            <header className="px-5 py-3 border-b border-gray-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Account info</h2>
            </header>
            <div className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
              <Row label="Status" value={trader?.accountStatus ?? "—"} mono />
              <Row label="Phase" value={trader?.accountPhase ?? "—"} mono />
              <Row
                label="Balance"
                value={trader ? formatCurrency(trader.accountBalance) : "—"}
              />
              <Row
                label="Days since last payout"
                value={trader && trader.totalPaidOut > 0 ? "14d" : "—"}
              />
            </div>
            {trader && (
              <div className="px-5 py-3 bg-gray-50 dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800">
                <Link
                  href={`/admin/accounts/${trader.userId}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Open account detail →
                </Link>
              </div>
            )}
          </section>

          {/* Risk indicators */}
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            <header className="px-5 py-3 border-b border-gray-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Risk indicators</h2>
            </header>
            <div className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
              <Row
                label="Risk score"
                value={trader ? `${trader.riskScore}/100` : "—"}
                tone={
                  trader && trader.riskScore >= 70
                    ? "negative"
                    : trader && trader.riskScore >= 40
                    ? "warning"
                    : "positive"
                }
              />
              <Row
                label="Distance to floor (now)"
                value={
                  adminAccount
                    ? `${adminAccount.distanceToFloorPct.toFixed(2)}%`
                    : "—"
                }
                tone={
                  adminAccount && adminAccount.distanceToFloorPct < 2
                    ? "negative"
                    : "positive"
                }
              />
              <Row
                label="Closest to floor (30d)"
                value={
                  adminAccount
                    ? `${Math.min(adminAccount.distanceToFloorPct, 1.5).toFixed(2)}%`
                    : "—"
                }
              />
              <Row
                label="Win rate"
                value={trader ? `${(trader.winRate * 100).toFixed(0)}%` : "—"}
              />
            </div>
          </section>
        </div>
      </div>

      {/* Confirmation */}
      {meta && (
        <ConfirmationModal
          isOpen={pending !== null}
          onClose={() => setPending(null)}
          onConfirm={handleConfirm}
          title={meta.title}
          message={meta.message}
          confirmText={meta.confirmText}
          confirmVariant={meta.variant}
          requireInput
          inputLabel={meta.inputLabel}
          inputPlaceholder={meta.inputPlaceholder}
        />
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "positive" | "negative" | "warning";
}) {
  return (
    <div className="px-5 py-3 flex items-center justify-between gap-4">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={cn(
          "text-sm text-gray-900 dark:text-gray-100",
          mono && "font-mono",
          tone === "positive" && "text-emerald-600 font-medium",
          tone === "negative" && "text-red-600 font-medium",
          tone === "warning" && "text-amber-600 font-medium"
        )}
      >
        {value}
      </span>
    </div>
  );
}
