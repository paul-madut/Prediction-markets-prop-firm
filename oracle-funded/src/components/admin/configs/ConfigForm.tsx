"use client";

// Shared challenge-config form used by /admin/configs/new and
// /admin/configs/[id]/edit. Posts to /api/admin/configs (create) or
// patches /api/admin/configs/[id] (edit).

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrashIcon, PlusIcon } from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { TextureButton } from "@/components/ui/texture-button";
import { api, ApiError } from "@/lib/api-client";

export interface PhaseDraft {
  phaseNumber: number;
  name: string;
  profitTargetPct: string;
  minTradingDays: string;
}

export interface ConfigDraft {
  name: string;
  accountSizeCents: string; // dollars input × 100 on submit; stored in input as plain dollars
  challengeFeeCents: string; // dollars input
  drawdownType: "static" | "trailing_eod";
  trailingReference: "eod_balance" | "eod_equity" | "eod_max_balance_equity";
  totalDrawdownPct: string;
  dailyDrawdownPct: string;
  profitSplitPct: string;
  breachComparison: "lt" | "lte";
  breachCloseBehavior: "mark_to_floor" | "close_at_market";
  refundDisablesAccount: boolean;
  maxPositionsPerMarket: string;
  maxPositionsTotal: string;
  maxContractsPerOrder: string;
  isActive: boolean;
  phases: PhaseDraft[];
}

export const EMPTY_DRAFT: ConfigDraft = {
  name: "",
  accountSizeCents: "50000",
  challengeFeeCents: "299",
  drawdownType: "trailing_eod",
  trailingReference: "eod_balance",
  totalDrawdownPct: "10",
  dailyDrawdownPct: "5",
  profitSplitPct: "80",
  breachComparison: "lt",
  breachCloseBehavior: "mark_to_floor",
  refundDisablesAccount: true,
  maxPositionsPerMarket: "1",
  maxPositionsTotal: "5",
  maxContractsPerOrder: "",
  isActive: true,
  phases: [
    { phaseNumber: 1, name: "Phase 1", profitTargetPct: "8", minTradingDays: "5" },
    { phaseNumber: 2, name: "Phase 2", profitTargetPct: "5", minTradingDays: "5" },
  ],
};

interface ConfigFormProps {
  mode: "create" | "edit";
  initialDraft: ConfigDraft;
  configId?: string;
}

export function ConfigForm({ mode, initialDraft, configId }: ConfigFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<ConfigDraft>(initialDraft);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  const set = <K extends keyof ConfigDraft>(key: K, value: ConfigDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function addPhase(): void {
    setDraft((d) => ({
      ...d,
      phases: [
        ...d.phases,
        {
          phaseNumber: d.phases.length + 1,
          name: `Phase ${d.phases.length + 1}`,
          profitTargetPct: "5",
          minTradingDays: "5",
        },
      ],
    }));
  }

  function removePhase(idx: number): void {
    setDraft((d) => {
      const next = d.phases.filter((_, i) => i !== idx);
      // Renumber so phaseNumber stays 1..n
      return { ...d, phases: next.map((p, i) => ({ ...p, phaseNumber: i + 1 })) };
    });
  }

  function updatePhase(idx: number, field: keyof PhaseDraft, value: string | number): void {
    setDraft((d) => ({
      ...d,
      phases: d.phases.map((p, i) =>
        i === idx ? { ...p, [field]: value } : p,
      ),
    }));
  }

  async function submit(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      const accountSizeCents = Math.round(Number(draft.accountSizeCents) * 100);
      const challengeFeeCents = Math.round(Number(draft.challengeFeeCents) * 100);
      const totalDrawdownPct = Number(draft.totalDrawdownPct);
      const dailyDrawdownPct = draft.dailyDrawdownPct.trim()
        ? Number(draft.dailyDrawdownPct)
        : null;
      const profitSplitPct = Number(draft.profitSplitPct);
      const maxPositionsPerMarket = Number(draft.maxPositionsPerMarket);
      const maxPositionsTotal = Number(draft.maxPositionsTotal);
      const maxContractsPerOrder = draft.maxContractsPerOrder.trim()
        ? Number(draft.maxContractsPerOrder)
        : null;

      const phases = draft.phases.map((p) => ({
        phaseNumber: p.phaseNumber,
        name: p.name.trim(),
        profitTargetPct: Number(p.profitTargetPct),
        minTradingDays: Number(p.minTradingDays || 0),
      }));

      if (!draft.name.trim()) throw new Error("Config name is required");
      if (!Number.isFinite(accountSizeCents) || accountSizeCents <= 0) {
        throw new Error("Account size must be a positive number");
      }
      if (phases.length === 0) throw new Error("At least one phase is required");

      if (mode === "create") {
        await api.post("/api/admin/configs", {
          name: draft.name.trim(),
          accountSizeCents,
          challengeFeeCents,
          drawdownType: draft.drawdownType,
          trailingReference: draft.trailingReference,
          totalDrawdownPct,
          dailyDrawdownPct,
          profitSplitPct,
          breachComparison: draft.breachComparison,
          breachCloseBehavior: draft.breachCloseBehavior,
          refundDisablesAccount: draft.refundDisablesAccount,
          maxPositionsPerMarket,
          maxPositionsTotal,
          maxContractsPerOrder,
          phases,
        });
      } else if (configId) {
        await api.patch(`/api/admin/configs/${configId}`, {
          name: draft.name.trim(),
          challengeFeeCents,
          totalDrawdownPct,
          dailyDrawdownPct,
          profitSplitPct,
          breachComparison: draft.breachComparison,
          breachCloseBehavior: draft.breachCloseBehavior,
          refundDisablesAccount: draft.refundDisablesAccount,
          maxPositionsPerMarket,
          maxPositionsTotal,
          maxContractsPerOrder,
          isActive: draft.isActive,
          phases,
        });
      }
      router.push("/admin/configs");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <TextureCard interactive={false}>
        <TextureCardContent className="p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Basics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Name">
              <input
                type="text"
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Standard $50K 2-Step"
                className={inputCls}
              />
            </Field>
            <Field label="Account size ($)">
              <input
                type="number"
                value={draft.accountSizeCents}
                disabled={mode === "edit"}
                onChange={(e) => set("accountSizeCents", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Challenge fee ($)">
              <input
                type="number"
                value={draft.challengeFeeCents}
                onChange={(e) => set("challengeFeeCents", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Profit split (% to trader)">
              <input
                type="number"
                step="0.01"
                value={draft.profitSplitPct}
                onChange={(e) => set("profitSplitPct", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </TextureCardContent>
      </TextureCard>

      <TextureCard interactive={false}>
        <TextureCardContent className="p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Drawdown rules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Drawdown type">
              <select
                value={draft.drawdownType}
                disabled={mode === "edit"}
                onChange={(e) =>
                  set("drawdownType", e.target.value as ConfigDraft["drawdownType"])
                }
                className={inputCls}
              >
                <option value="static">Static</option>
                <option value="trailing_eod">Trailing EOD</option>
              </select>
            </Field>
            <Field label="Trailing reference">
              <select
                value={draft.trailingReference}
                disabled={mode === "edit" || draft.drawdownType !== "trailing_eod"}
                onChange={(e) =>
                  set(
                    "trailingReference",
                    e.target.value as ConfigDraft["trailingReference"],
                  )
                }
                className={inputCls}
              >
                <option value="eod_balance">EOD balance</option>
                <option value="eod_equity">EOD equity</option>
                <option value="eod_max_balance_equity">Max(EOD balance, equity)</option>
              </select>
            </Field>
            <Field label="Total drawdown (%)">
              <input
                type="number"
                step="0.01"
                value={draft.totalDrawdownPct}
                onChange={(e) => set("totalDrawdownPct", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Daily drawdown (%) — blank = none">
              <input
                type="number"
                step="0.01"
                value={draft.dailyDrawdownPct}
                onChange={(e) => set("dailyDrawdownPct", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Breach comparison">
              <select
                value={draft.breachComparison}
                onChange={(e) =>
                  set("breachComparison", e.target.value as ConfigDraft["breachComparison"])
                }
                className={inputCls}
              >
                <option value="lt">&lt; (strict)</option>
                <option value="lte">&le; (touching the floor breaches)</option>
              </select>
            </Field>
            <Field label="Breach close behaviour">
              <select
                value={draft.breachCloseBehavior}
                onChange={(e) =>
                  set(
                    "breachCloseBehavior",
                    e.target.value as ConfigDraft["breachCloseBehavior"],
                  )
                }
                className={inputCls}
              >
                <option value="mark_to_floor">Mark to floor</option>
                <option value="close_at_market">Close at market</option>
              </select>
            </Field>
          </div>
        </TextureCardContent>
      </TextureCard>

      <TextureCard interactive={false}>
        <TextureCardContent className="p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Position limits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Max positions per market">
              <input
                type="number"
                value={draft.maxPositionsPerMarket}
                onChange={(e) => set("maxPositionsPerMarket", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Max positions total">
              <input
                type="number"
                value={draft.maxPositionsTotal}
                onChange={(e) => set("maxPositionsTotal", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Max contracts per order — blank = unlimited">
              <input
                type="number"
                value={draft.maxContractsPerOrder}
                onChange={(e) => set("maxContractsPerOrder", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={draft.refundDisablesAccount}
                onChange={(e) => set("refundDisablesAccount", e.target.checked)}
                className="rounded border-gray-300"
              />
              Refund disables account
            </label>
            {mode === "edit" && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => set("isActive", e.target.checked)}
                  className="rounded border-gray-300"
                />
                Active (visible to traders on Buy page)
              </label>
            )}
          </div>
        </TextureCardContent>
      </TextureCard>

      <TextureCard interactive={false}>
        <TextureCardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Phases
            </h2>
            <TextureButton variant="secondary" size="sm" onClick={addPhase}>
              <PlusIcon className="w-4 h-4" />
              Add phase
            </TextureButton>
          </div>
          <div className="space-y-3">
            {draft.phases.map((p, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-[60px_2fr_1fr_1fr_auto] gap-3 items-end"
              >
                <Field label="#">
                  <input
                    type="number"
                    value={p.phaseNumber}
                    onChange={(e) =>
                      updatePhase(idx, "phaseNumber", Number(e.target.value))
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label="Name">
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => updatePhase(idx, "name", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Profit target (%)">
                  <input
                    type="number"
                    step="0.01"
                    value={p.profitTargetPct}
                    onChange={(e) => updatePhase(idx, "profitTargetPct", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Min trading days">
                  <input
                    type="number"
                    value={p.minTradingDays}
                    onChange={(e) => updatePhase(idx, "minTradingDays", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <button
                  onClick={() => removePhase(idx)}
                  disabled={draft.phases.length === 1}
                  className="h-9 px-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent"
                  title="Remove phase"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </TextureCardContent>
      </TextureCard>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pb-4">
        <button
          onClick={() => router.push("/admin/configs")}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <TextureButton
          variant="primary"
          onClick={() => void submit()}
          disabled={submitting}
        >
          {submitting
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create config"
              : "Save changes"}
        </TextureButton>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
