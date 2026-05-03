"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import * as Tabs from "@radix-ui/react-tabs";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  BoltIcon,
  XCircleIcon,
  ReceiptRefundIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { getAdminAccount } from "@/data/mockAdminAccounts";
import ConfirmationModal from "@/components/admin/shared/ConfirmationModal";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type AccountAction =
  | "view_as_trader"
  | "freeze"
  | "unfreeze"
  | "reset"
  | "rule_override"
  | "force_breach"
  | "force_close"
  | "refund"
  | "reach_out";

const actionMeta: Record<
  AccountAction,
  {
    label: string;
    title: string;
    message: string;
    confirmText: string;
    inputLabel: string;
    inputPlaceholder: string;
    variant: "danger" | "warning" | "primary";
    icon: React.ReactNode;
  }
> = {
  view_as_trader: {
    label: "View as trader",
    title: "View as trader",
    message: "Open this account in a trader-perspective preview. Reason logged to audit.",
    confirmText: "Open preview",
    inputLabel: "Reason",
    inputPlaceholder: "e.g. investigating a support ticket",
    variant: "primary",
    icon: <EyeIcon className="h-4 w-4" />,
  },
  freeze: {
    label: "Freeze account",
    title: "Freeze trading",
    message:
      "Freezing prevents new orders. Open positions remain. Trader is notified.",
    confirmText: "Freeze",
    inputLabel: "Reason",
    inputPlaceholder: "e.g. suspected copy-trading; awaiting review",
    variant: "warning",
    icon: <LockClosedIcon className="h-4 w-4" />,
  },
  unfreeze: {
    label: "Unfreeze account",
    title: "Unfreeze trading",
    message: "Restore trading access. Trader can place new orders immediately.",
    confirmText: "Unfreeze",
    inputLabel: "Reason",
    inputPlaceholder: "e.g. review complete, no violation found",
    variant: "primary",
    icon: <LockOpenIcon className="h-4 w-4" />,
  },
  reset: {
    label: "Reset account",
    title: "Reset to starting balance",
    message:
      "Restores balance, equity, and high-water marks. Open positions are closed at market. Irreversible.",
    confirmText: "Reset",
    inputLabel: "Reason",
    inputPlaceholder: "e.g. trader purchased reset add-on",
    variant: "danger",
    icon: <ArrowPathIcon className="h-4 w-4" />,
  },
  rule_override: {
    label: "Apply rule override",
    title: "Apply rule override",
    message:
      "Override one or more rule values for this account. Stored on rule_overrides; expires unless persistent.",
    confirmText: "Apply override",
    inputLabel: "Override + reason",
    inputPlaceholder:
      'e.g. total_drawdown_pct=12 (one-time goodwill; expires 7d)',
    variant: "warning",
    icon: <AdjustmentsHorizontalIcon className="h-4 w-4" />,
  },
  force_breach: {
    label: "Force breach",
    title: "Force breach this account",
    message:
      "Marks account as breached and closes positions per the configured close_behavior.",
    confirmText: "Force breach",
    inputLabel: "Reason",
    inputPlaceholder: "e.g. confirmed rule violation post-investigation",
    variant: "danger",
    icon: <BoltIcon className="h-4 w-4" />,
  },
  force_close: {
    label: "Force close positions",
    title: "Force close all positions",
    message: "Closes all open positions at market. Account state remains otherwise.",
    confirmText: "Close positions",
    inputLabel: "Reason",
    inputPlaceholder: "e.g. trader requested manual flat",
    variant: "warning",
    icon: <XCircleIcon className="h-4 w-4" />,
  },
  refund: {
    label: "Refund payment",
    title: "Refund challenge payment",
    message:
      "Issues refund via Stripe. Account is disabled by default unless firm config allows otherwise.",
    confirmText: "Issue refund",
    inputLabel: "Reason",
    inputPlaceholder: "e.g. trader requested within 14d window",
    variant: "danger",
    icon: <ReceiptRefundIcon className="h-4 w-4" />,
  },
  reach_out: {
    label: "Reach out to trader",
    title: "Send message to trader",
    message: "Sends an email + in-app message. Reason logged to audit trail.",
    confirmText: "Send",
    inputLabel: "Message",
    inputPlaceholder: "Hi! We noticed you've been trading near your DD limit...",
    variant: "primary",
    icon: <EnvelopeIcon className="h-4 w-4" />,
  },
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    funded: "bg-emerald-100 text-emerald-700",
    passed: "bg-emerald-100 text-emerald-700",
    pending: "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300",
    passed_phase: "bg-blue-100 text-blue-700",
    breached: "bg-red-100 text-red-700",
    failed: "bg-red-100 text-red-700",
    disabled: "bg-gray-200 text-gray-600 dark:text-gray-300",
    closed: "bg-red-100 text-red-700",
    frozen: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full capitalize",
        map[status] ?? "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300"
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function distanceToFloorTone(pct: number): "danger" | "warning" | "ok" {
  if (pct < 2) return "danger";
  if (pct < 5) return "warning";
  return "ok";
}

export default function AdminAccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";
  const account = getAdminAccount(id);

  const [pendingAction, setPendingAction] = useState<AccountAction | null>(null);

  const tone = useMemo(
    () => (account ? distanceToFloorTone(account.distanceToFloorPct) : "ok"),
    [account]
  );

  if (!account) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 -mx-6 -mt-6 px-6 py-6 mb-6">
          <Link
            href="/admin/traders"
            className="text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to traders
          </Link>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-4">Account not found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ID <code className="px-1 py-0.5 bg-gray-100 dark:bg-slate-800 rounded">{id}</code> doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const { snapshot } = account;
  const meta = pendingAction ? actionMeta[pendingAction] : null;

  const handleConfirm = async (reason?: string) => {
    // Mock — real wiring lands in §6 (admin actions BE).
    console.info(`[admin action] ${pendingAction} on ${snapshot.accountId}: ${reason}`);
  };

  const balanceDelta = snapshot.accountBalance - snapshot.startingBalance;
  const balanceDeltaPct = (balanceDelta / snapshot.startingBalance) * 100;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 -mx-6 -mt-6 px-6 py-6 mb-6">
        <Link
          href="/admin/traders"
          className="text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to traders
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
              {snapshot.username.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {snapshot.username}
                </h1>
                <StatusBadge status={snapshot.accountStatus} />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{snapshot.email}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                <span>{account.configName}</span>
                <span>·</span>
                <span>{account.phaseLabel}</span>
                <span>·</span>
                <span>{account.daysRemaining}d remaining</span>
                <span>·</span>
                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded">
                  {snapshot.accountId}
                </code>
              </div>
            </div>
          </div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                aria-label="Account actions"
              >
                Actions
                <EllipsisVerticalIcon className="h-4 w-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-lg min-w-[220px] py-1 z-50"
              >
                {(Object.keys(actionMeta) as AccountAction[]).map((key) => (
                  <DropdownMenu.Item
                    key={key}
                    onSelect={() => setPendingAction(key)}
                    className={cn(
                      "px-3 py-2 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2 cursor-pointer outline-none",
                      "data-[highlighted]:bg-indigo-50 data-[highlighted]:text-indigo-700"
                    )}
                  >
                    {actionMeta[key].icon}
                    {actionMeta[key].label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard
          label="Balance"
          value={formatCurrency(snapshot.accountBalance)}
          sub={`of ${formatCurrency(snapshot.startingBalance)} start`}
        />
        <KpiCard
          label="P&L"
          value={`${balanceDelta >= 0 ? "+" : ""}${formatCurrency(balanceDelta)}`}
          sub={`${balanceDeltaPct.toFixed(2)}%`}
          tone={balanceDelta >= 0 ? "positive" : "negative"}
        />
        <KpiCard label="DD floor" value={formatCurrency(account.drawdownFloorCents)} />
        <KpiCard
          label="Distance to floor"
          value={`${account.distanceToFloorPct.toFixed(account.distanceToFloorPct < 0.01 ? 5 : 2)}%`}
          tone={tone === "danger" ? "negative" : tone === "warning" ? "warning" : "positive"}
        />
        <KpiCard
          label="Daily floor"
          value={
            account.dailyFloorCents !== null
              ? formatCurrency(account.dailyFloorCents)
              : "—"
          }
          sub={account.dailyFloorCents === null ? "no daily DD" : undefined}
        />
      </section>

      {/* Tabs */}
      <Tabs.Root defaultValue="overview" className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
        <Tabs.List className="flex border-b border-gray-200 dark:border-slate-800 px-2">
          {[
            ["overview", "Overview"],
            ["positions", "Positions"],
            ["trades", "Trades"],
            ["drawdown", "Drawdown"],
            ["activity", "Activity"],
            ["audit", "Audit"],
          ].map(([value, label]) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className={cn(
                "px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent",
                "data-[state=active]:text-indigo-600 data-[state=active]:border-indigo-600",
                "hover:text-gray-900 transition"
              )}
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Overview */}
        <Tabs.Content value="overview" className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Equity vs floor (24d)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={account.drawdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `$${(v / 100000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v) => formatCurrency(typeof v === "number" ? v : 0)}
                    labelFormatter={(v) => `Date: ${v}`}
                  />
                  <ReferenceLine
                    y={account.drawdownFloorCents}
                    stroke="#dc2626"
                    strokeDasharray="4 4"
                    label={{ value: "DD floor", fontSize: 10, fill: "#dc2626" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={false}
                    name="Equity"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {account.ruleOverrides && Object.keys(account.ruleOverrides).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Active rule overrides
              </h3>
              <pre className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg p-3 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
                {JSON.stringify(account.ruleOverrides, null, 2)}
              </pre>
            </div>
          )}
        </Tabs.Content>

        {/* Positions */}
        <Tabs.Content value="positions" className="p-6">
          {account.positions.length === 0 ? (
            <EmptyState message="No open positions." />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                <tr className="border-b border-gray-200 dark:border-slate-800">
                  <th className="pb-2 pr-4">Market</th>
                  <th className="pb-2 pr-4">Side</th>
                  <th className="pb-2 pr-4">Contracts</th>
                  <th className="pb-2 pr-4">Avg entry</th>
                  <th className="pb-2 pr-4">Current</th>
                  <th className="pb-2 pr-4 text-right">Unrealized P&L</th>
                </tr>
              </thead>
              <tbody>
                {account.positions.map((p) => (
                  <tr key={`${p.ticker}-${p.side}`} className="border-b border-gray-100 dark:border-slate-800 last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{p.market_title}</p>
                      <code className="text-xs text-gray-500 dark:text-gray-400">{p.ticker}</code>
                    </td>
                    <td className="py-3 pr-4 uppercase font-semibold">{p.side}</td>
                    <td className="py-3 pr-4">{p.position}</td>
                    <td className="py-3 pr-4">{p.avg_entry_price}¢</td>
                    <td className="py-3 pr-4">{p.current_price}¢</td>
                    <td
                      className={cn(
                        "py-3 pr-4 text-right font-medium",
                        (p.unrealized_pnl ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {formatCurrency(p.unrealized_pnl ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Tabs.Content>

        {/* Trades */}
        <Tabs.Content value="trades" className="p-6">
          {account.recentTrades.length === 0 ? (
            <EmptyState message="No recent trades." />
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {account.recentTrades.map((t) => {
                const isSystem = t.ticket?.startsWith("SYS-");
                return (
                  <li key={t.tradeId} className="py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {t.market_title}
                          </p>
                          {isSystem && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-amber-100 text-amber-700">
                              system · mark to floor
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {t.shares} contracts · {t.side.toUpperCase()} · entry {t.entryPrice}¢ → exit {t.exitPrice}¢
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          t.pnl >= 0 ? "text-emerald-600" : "text-red-600"
                        )}
                      >
                        {t.pnl >= 0 ? "+" : ""}
                        {formatCurrency(t.pnl)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Tabs.Content>

        {/* Drawdown */}
        <Tabs.Content value="drawdown" className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Equity, balance, and floors
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={account.drawdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${(v / 100000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v) => formatCurrency(typeof v === "number" ? v : 0)}
                  labelFormatter={(v) => `Date: ${v}`}
                />
                <ReferenceLine
                  y={account.drawdownFloorCents}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  label={{ value: "Total DD floor", fontSize: 10, fill: "#dc2626" }}
                />
                {account.dailyFloorCents !== null && (
                  <ReferenceLine
                    y={account.dailyFloorCents}
                    stroke="#d97706"
                    strokeDasharray="2 4"
                    label={{ value: "Daily floor", fontSize: 10, fill: "#d97706" }}
                  />
                )}
                <Line type="monotone" dataKey="equity" stroke="#4f46e5" strokeWidth={2} dot={false} name="Equity" />
                <Line type="monotone" dataKey="balance" stroke="#94a3b8" strokeWidth={1.5} dot={false} name="Balance" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Tabs.Content>

        {/* Activity */}
        <Tabs.Content value="activity" className="p-6">
          {account.activity.length === 0 ? (
            <EmptyState message="No state transitions yet." />
          ) : (
            <ol className="relative border-l border-gray-200 dark:border-slate-800 ml-3 space-y-6">
              {account.activity.map((entry) => (
                <li key={entry.id} className="ml-6">
                  <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-indigo-500 ring-2 ring-white" />
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {entry.fromStatus ? `${entry.fromStatus} → ${entry.toStatus}` : entry.toStatus}
                    </span>
                    <time className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(entry.occurredAt).toLocaleString()}
                    </time>
                  </div>
                  {entry.reason && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{entry.reason}</p>}
                  {entry.metadata && (
                    <pre className="mt-2 text-xs font-mono text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded p-2 overflow-x-auto">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Tabs.Content>

        {/* Audit */}
        <Tabs.Content value="audit" className="p-6">
          {account.audit.length === 0 ? (
            <EmptyState message="No audit entries for this account." />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                <tr className="border-b border-gray-200 dark:border-slate-800">
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Action</th>
                  <th className="pb-2 pr-4">Actor</th>
                  <th className="pb-2 pr-4">Details</th>
                </tr>
              </thead>
              <tbody>
                {account.audit.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 dark:border-slate-800 last:border-0 align-top">
                    <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{entry.action}</td>
                    <td className="py-3 pr-4">{entry.actor}</td>
                    <td className="py-3 pr-4 text-xs text-gray-600 dark:text-gray-300">
                      {entry.before || entry.after || entry.metadata ? (
                        <pre className="font-mono whitespace-pre-wrap break-words bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded p-2">
                          {JSON.stringify(
                            { before: entry.before, after: entry.after, metadata: entry.metadata },
                            null,
                            2
                          )}
                        </pre>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Tabs.Content>
      </Tabs.Root>

      {/* Confirmation modal */}
      {meta && (
        <ConfirmationModal
          isOpen={pendingAction !== null}
          onClose={() => setPendingAction(null)}
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

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "positive" | "negative" | "warning";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4"
    >
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p
        className={cn(
          "text-xl font-bold mt-1",
          tone === "positive" && "text-emerald-600",
          tone === "negative" && "text-red-600",
          tone === "warning" && "text-amber-600",
          !tone && "text-gray-900 dark:text-gray-100"
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}
