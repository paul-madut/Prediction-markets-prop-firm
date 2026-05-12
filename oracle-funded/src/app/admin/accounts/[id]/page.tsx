"use client";

// /admin/accounts/[id] — per-account admin view + actions.
//
// Wires:
//   GET  /api/accounts/[id]                        (firm-scoped)
//   POST /api/admin/accounts/[id]/override         (rule overrides)
//   POST /api/admin/accounts/[id]/force-close      (close all positions)
//   POST /api/admin/accounts/[id]/force-breach     (mark-to-floor close)
//   POST /api/admin/accounts/[id]/reset            (restart challenge)
//   PATCH /api/accounts/[id]                       (active ↔ disabled)
//
// Every action prompts for a reason (server requires it). After a
// successful action the page refetches.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { TextureButton } from "@/components/ui/texture-button";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface Position {
  id: string;
  venue: string;
  externalMarketId: string;
  side: string;
  netContracts: number;
  avgEntryPriceCents: number;
  unrealizedPnlCents: string;
  lastPricedAt: string | null;
}

interface AccountDetail {
  id: string;
  userId: string;
  status: string;
  startingBalanceCents: string;
  currentBalanceCents: string;
  highestEodBalanceCents: string;
  highestEodEquityCents: string;
  drawdownFloorCents: string;
  dailyLossFloorCents: string | null;
  dayStartEquityCents: string;
  tradingDaysCount: number;
  firstTradeAt: string | null;
  breachAt: string | null;
  ruleOverrides: Record<string, unknown> | null;
  overrideReason: string | null;
  overrideExpiresAt: string | null;
  createdAt: string;
  config: {
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
    maxPositionsPerMarket: number;
    maxPositionsTotal: number;
    maxContractsPerOrder: number | null;
  };
  currentPhase: {
    phaseNumber: number;
    name: string;
    profitTargetPct: string;
    minTradingDays: number;
  };
  positions: Position[];
}

type ActionKind =
  | "override"
  | "force-close"
  | "force-breach"
  | "reset"
  | "disable"
  | "enable"
  | "promote-phase"
  | "reset-phase";

interface ActionState {
  kind: ActionKind;
  reason: string;
  totalDrawdownPct?: string;
  dailyDrawdownPct?: string;
  profitSplitPct?: string;
  maxPositionsPerMarket?: string;
  maxPositionsTotal?: string;
  maxContractsPerOrder?: string;
  minTradingDays?: string;
  submitting: boolean;
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
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "bad";
}) {
  const valueCls =
    tone === "good"
      ? "text-emerald-700"
      : tone === "bad"
        ? "text-red-700"
        : "text-gray-900 dark:text-gray-100";
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${valueCls}`}>{value}</div>
      {hint && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</div>
      )}
    </div>
  );
}

export default function AdminAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<ActionState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoadError(null);
    try {
      const data = await api.get<AccountDetail>(`/api/accounts/${id}`);
      setAccount(data);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : String(err));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submitAction(): Promise<void> {
    if (!action) return;
    setActionError(null);
    setAction({ ...action, submitting: true });
    try {
      const reason = action.reason.trim();
      if (!reason) throw new Error("Reason is required");

      switch (action.kind) {
        case "override": {
          const totalPct = action.totalDrawdownPct?.trim()
            ? Number(action.totalDrawdownPct)
            : null;
          const dailyPct = action.dailyDrawdownPct?.trim()
            ? Number(action.dailyDrawdownPct)
            : undefined;
          const split = action.profitSplitPct?.trim()
            ? Number(action.profitSplitPct)
            : undefined;
          const maxPerMkt = action.maxPositionsPerMarket?.trim()
            ? Number(action.maxPositionsPerMarket)
            : undefined;
          const maxTotal = action.maxPositionsTotal?.trim()
            ? Number(action.maxPositionsTotal)
            : undefined;
          const maxContracts = action.maxContractsPerOrder?.trim()
            ? Number(action.maxContractsPerOrder)
            : undefined;
          const minDays = action.minTradingDays?.trim()
            ? Number(action.minTradingDays)
            : undefined;
          const anyKey =
            totalPct !== null ||
            dailyPct !== undefined ||
            split !== undefined ||
            maxPerMkt !== undefined ||
            maxTotal !== undefined ||
            maxContracts !== undefined ||
            minDays !== undefined;
          if (!anyKey) {
            throw new Error("Provide at least one override key");
          }
          await api.post(`/api/admin/accounts/${id}/override`, {
            ...(totalPct !== null && { totalDrawdownPct: totalPct }),
            ...(dailyPct !== undefined && { dailyDrawdownPct: dailyPct }),
            ...(split !== undefined && { profitSplitPct: split }),
            ...(maxPerMkt !== undefined && { maxPositionsPerMarket: maxPerMkt }),
            ...(maxTotal !== undefined && { maxPositionsTotal: maxTotal }),
            ...(maxContracts !== undefined && {
              maxContractsPerOrder: maxContracts,
            }),
            ...(minDays !== undefined && { minTradingDays: minDays }),
            reason,
          });
          setToast("Override applied");
          break;
        }
        case "force-close":
          await api.post(`/api/admin/accounts/${id}/force-close`, { reason });
          setToast("All positions closed");
          break;
        case "force-breach":
          await api.post(`/api/admin/accounts/${id}/force-breach`, { reason });
          setToast("Account breached");
          break;
        case "reset":
          await api.post(`/api/admin/accounts/${id}/reset`, { reason });
          setToast("Account reset");
          break;
        case "disable":
          await api.patch(`/api/accounts/${id}`, { status: "disabled", reason });
          setToast("Account disabled");
          break;
        case "enable":
          await api.patch(`/api/accounts/${id}`, { status: "active", reason });
          setToast("Account re-enabled");
          break;
        case "promote-phase":
          await api.post(`/api/admin/accounts/${id}/promote-phase`, { reason });
          setToast("Phase promoted");
          break;
        case "reset-phase":
          await api.post(`/api/admin/accounts/${id}/reset-phase`, { reason });
          setToast("Phase reset to 1");
          break;
      }
      setAction(null);
      await load();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err));
      setAction(action ? { ...action, submitting: false } : null);
    }
  }

  if (loadError && !account) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Failed to load account: {loadError}
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-sm text-gray-500 dark:text-gray-400">
        Loading account…
      </div>
    );
  }

  const balance = Number(account.currentBalanceCents);
  const starting = Number(account.startingBalanceCents);
  const floor = Number(account.drawdownFloorCents);
  const dailyFloor = account.dailyLossFloorCents ? Number(account.dailyLossFloorCents) : null;
  const pnlPct = starting === 0 ? 0 : ((balance - starting) / starting) * 100;
  const floorRoom = balance - floor;

  const isBreached = account.status === "breached";
  const isDisabled = account.status === "disabled";
  const hasOpenPositions = account.positions.length > 0;
  const hasOverrides = account.ruleOverrides && Object.keys(account.ruleOverrides).length > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/traders"
            className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            All traders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {account.config.name}
            </h1>
            <StatusBadge status={account.status} />
          </div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-mono">
            owner {account.userId} · acct {account.id}
          </div>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-blue-300"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
          {toast}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          label="Current balance"
          value={formatCurrency(balance)}
          hint={`${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}% vs start`}
          tone={pnlPct >= 0 ? "good" : "bad"}
        />
        <StatTile label="Starting balance" value={formatCurrency(starting)} />
        <StatTile
          label="Drawdown floor"
          value={formatCurrency(floor)}
          hint={floorRoom >= 0 ? `${formatCurrency(floorRoom)} room` : "breached"}
          tone={floorRoom >= 0 ? "default" : "bad"}
        />
        <StatTile
          label="Daily floor"
          value={dailyFloor ? formatCurrency(dailyFloor) : "—"}
          hint={dailyFloor ? "resets at 00:01 UTC" : "no daily floor"}
        />
        <StatTile
          label="Highest EOD balance"
          value={formatCurrency(Number(account.highestEodBalanceCents))}
        />
        <StatTile label="Trading days" value={String(account.tradingDaysCount)} />
        <StatTile
          label="First trade"
          value={account.firstTradeAt ? formatDate(account.firstTradeAt) : "—"}
        />
        <StatTile
          label="Breach"
          value={account.breachAt ? formatDate(account.breachAt) : "—"}
          tone={account.breachAt ? "bad" : "default"}
        />
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: config + positions */}
        <div className="lg:col-span-2 space-y-6">
          <TextureCard interactive={false}>
            <TextureCardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Challenge config
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Account size
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(Number(account.config.accountSizeCents))}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Drawdown style
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                    {account.config.drawdownType.replace("_", " ")}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Total drawdown
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {account.config.totalDrawdownPct}%
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Daily drawdown
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {account.config.dailyDrawdownPct
                      ? `${account.config.dailyDrawdownPct}%`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Profit split
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {account.config.profitSplitPct}%
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Breach behaviour
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                    {account.config.breachCloseBehavior.replace(/_/g, " ")}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Phase
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {account.currentPhase.name} ({account.currentPhase.phaseNumber})
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Phase target
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {account.currentPhase.profitTargetPct}%
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Min trading days
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {account.currentPhase.minTradingDays}
                  </div>
                </div>
              </div>

              {hasOverrides && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                  <div className="font-semibold text-amber-800 mb-1 inline-flex items-center gap-1.5">
                    <ShieldCheckIcon className="w-4 h-4" />
                    Active rule overrides
                  </div>
                  <pre className="text-xs text-amber-900 whitespace-pre-wrap break-words">
                    {JSON.stringify(account.ruleOverrides, null, 2)}
                  </pre>
                  {account.overrideReason && (
                    <div className="mt-1 text-xs text-amber-800">
                      Reason: {account.overrideReason}
                    </div>
                  )}
                  {account.overrideExpiresAt && (
                    <div className="text-xs text-amber-800">
                      Expires: {formatDate(account.overrideExpiresAt)}
                    </div>
                  )}
                </div>
              )}
            </TextureCardContent>
          </TextureCard>

          <TextureCard interactive={false}>
            <TextureCardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Open positions
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {account.positions.length} open
                </span>
              </div>
              {account.positions.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
                  No open positions.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="text-left py-2 pr-4 font-semibold">Market</th>
                        <th className="text-left py-2 pr-4 font-semibold">Side</th>
                        <th className="text-right py-2 pr-4 font-semibold">Contracts</th>
                        <th className="text-right py-2 pr-4 font-semibold">Avg entry</th>
                        <th className="text-right py-2 pr-4 font-semibold">Unrealised</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {account.positions.map((p) => {
                        const upnl = Number(p.unrealizedPnlCents);
                        return (
                          <tr key={p.id}>
                            <td className="py-2 pr-4">
                              <div className="font-mono text-xs text-gray-900 dark:text-gray-100">
                                {p.externalMarketId}
                              </div>
                              <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">
                                {p.venue}
                              </div>
                            </td>
                            <td className="py-2 pr-4 capitalize">{p.side}</td>
                            <td className="py-2 pr-4 text-right tabular-nums">
                              {p.netContracts}
                            </td>
                            <td className="py-2 pr-4 text-right tabular-nums">
                              {(p.avgEntryPriceCents / 100).toFixed(2)}¢
                            </td>
                            <td
                              className={`py-2 pr-4 text-right tabular-nums ${upnl >= 0 ? "text-emerald-700" : "text-red-700"}`}
                            >
                              {upnl >= 0 ? "+" : ""}
                              {formatCurrency(upnl)}
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

        {/* Right: actions panel */}
        <div className="space-y-6">
          <TextureCard interactive={false}>
            <TextureCardContent className="p-6 space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Admin actions
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                Every action is recorded in the audit log with the reason you supply.
              </p>

              <TextureButton
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() =>
                  setAction({
                    kind: "override",
                    reason: "",
                    totalDrawdownPct: account.config.totalDrawdownPct,
                    dailyDrawdownPct: account.config.dailyDrawdownPct ?? "",
                    submitting: false,
                  })
                }
              >
                Apply rule override
              </TextureButton>

              <TextureButton
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() =>
                  setAction({ kind: "force-close", reason: "", submitting: false })
                }
                disabled={!hasOpenPositions || isBreached}
              >
                Force-close positions
              </TextureButton>

              <TextureButton
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() =>
                  setAction({ kind: "force-breach", reason: "", submitting: false })
                }
                disabled={isBreached}
              >
                Force breach (mark to floor)
              </TextureButton>

              <TextureButton
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() =>
                  setAction({ kind: "reset", reason: "", submitting: false })
                }
              >
                Reset challenge
              </TextureButton>

              <TextureButton
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() =>
                  setAction({ kind: "promote-phase", reason: "", submitting: false })
                }
                disabled={isBreached || isDisabled || account.status === "funded"}
              >
                Promote to next phase
              </TextureButton>

              <TextureButton
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() =>
                  setAction({ kind: "reset-phase", reason: "", submitting: false })
                }
                disabled={isBreached || isDisabled}
              >
                Reset to phase 1
              </TextureButton>

              {isDisabled ? (
                <TextureButton
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    setAction({ kind: "enable", reason: "", submitting: false })
                  }
                >
                  Re-enable account
                </TextureButton>
              ) : (
                <TextureButton
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    setAction({ kind: "disable", reason: "", submitting: false })
                  }
                  disabled={isBreached}
                >
                  Disable account
                </TextureButton>
              )}
            </TextureCardContent>
          </TextureCard>
        </div>
      </div>

      {/* Action modal */}
      {action && (
        <ActionModal
          action={action}
          onChange={setAction}
          onClose={() => {
            setAction(null);
            setActionError(null);
          }}
          onSubmit={() => void submitAction()}
          error={actionError}
        />
      )}
    </div>
  );
}

function ActionModal({
  action,
  onChange,
  onClose,
  onSubmit,
  error,
}: {
  action: ActionState;
  onChange: (a: ActionState) => void;
  onClose: () => void;
  onSubmit: () => void;
  error: string | null;
}) {
  const titles: Record<ActionKind, string> = {
    override: "Apply rule override",
    "force-close": "Force-close all positions",
    "force-breach": "Force breach (mark to floor)",
    reset: "Reset challenge to starting balance",
    disable: "Disable account",
    enable: "Re-enable account",
    "promote-phase": "Promote to next phase",
    "reset-phase": "Reset to phase 1",
  };
  const descriptions: Record<ActionKind, string> = {
    override:
      "Shadow the config rules for this account. Eval engine reads the override on next tick. Drawdown keys are enforced today; the other keys are stored for the same JSON for forward-compat.",
    "force-close":
      "Closes every open position at the current bid. Account status is unchanged.",
    "force-breach":
      "Mark-to-floor close: balance lands on the drawdown floor exactly. Account moves to breached.",
    reset:
      "Clears positions, resets balance to starting balance, restarts trading-day counter, clears breach.",
    disable: "Account becomes disabled — orders rejected, eval pauses.",
    enable: "Account returns to active — orders accepted, eval runs.",
    "promote-phase":
      "Advance currentPhaseId to the next phase on this config. If no next phase exists, flips status to funded. Resets trading-day counter for the new phase.",
    "reset-phase":
      "Send the trader back to phase 1 of this config. Resets trading-day counter; does NOT touch balance or positions.",
  };

  const isDanger = action.kind === "force-breach";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-start justify-between">
          <div className="flex items-start gap-3">
            {isDanger && (
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {titles[action.kind]}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {descriptions[action.kind]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={action.submitting}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3">
          {action.kind === "override" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Total drawdown (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={action.totalDrawdownPct ?? ""}
                  onChange={(e) =>
                    onChange({ ...action, totalDrawdownPct: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Daily drawdown (%) — leave blank to remove
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={action.dailyDrawdownPct ?? ""}
                  onChange={(e) =>
                    onChange({ ...action, dailyDrawdownPct: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>
              <div className="border-t border-gray-100 dark:border-slate-800 pt-3 mt-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-2">
                  Advanced — stored in rule_overrides JSON
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Profit split (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={action.profitSplitPct ?? ""}
                      onChange={(e) =>
                        onChange({ ...action, profitSplitPct: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Min trading days
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={action.minTradingDays ?? ""}
                      onChange={(e) =>
                        onChange({ ...action, minTradingDays: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Max positions per market
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={action.maxPositionsPerMarket ?? ""}
                      onChange={(e) =>
                        onChange({
                          ...action,
                          maxPositionsPerMarket: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Max positions total
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={action.maxPositionsTotal ?? ""}
                      onChange={(e) =>
                        onChange({
                          ...action,
                          maxPositionsTotal: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Max contracts per order
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={action.maxContractsPerOrder ?? ""}
                      onChange={(e) =>
                        onChange({
                          ...action,
                          maxContractsPerOrder: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 italic">
                  Drawdown keys are enforced by the eval engine today. The
                  others are written to <code className="font-mono">rule_overrides</code>{" "}
                  for forward-compat — they'll go live as the engine learns to
                  read them.
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              Reason (required, recorded in audit log)
            </label>
            <textarea
              value={action.reason}
              onChange={(e) => onChange({ ...action, reason: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              placeholder="Explain why this action is being taken…"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={action.submitting}
            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <TextureButton
            variant={isDanger ? "destructive" : "primary"}
            size="sm"
            onClick={onSubmit}
            disabled={action.submitting || !action.reason.trim()}
          >
            {action.submitting ? "Submitting…" : "Confirm"}
          </TextureButton>
        </div>
      </div>
    </div>
  );
}
