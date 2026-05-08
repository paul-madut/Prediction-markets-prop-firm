"use client";

// /admin/payouts-live — admin payout queue on real backend.
//
// Wires:
//   GET /api/payouts(?status=…)                       (admin sees all firm)
//   POST /api/admin/payouts/[id]/approve
//   POST /api/admin/payouts/[id]/reject               (with reason)
//   POST /api/admin/payouts/[id]/mark-paid            (with optional ref)
//
// Behaviour:
//   - Status filter pills (Requested / Approved / Paid / Rejected / All).
//   - Each row has the action(s) appropriate to its current state.
//   - Reject prompts for a reason; mark-paid prompts for an external ref.
//   - After every action, the list refetches (no optimistic update — keeps
//     state consistent with what the eval/audit pipeline saw).
//
// Auth: behind `requireAdmin()` per route. Admin must be signed in with
// AAL2 (TOTP) for production. NEXT_PUBLIC_DEMO_MODE=true bypasses the
// AAL2 check for the demo.

import { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CheckIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/16/solid";
import { motion, AnimatePresence } from "framer-motion";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { TextureButton } from "@/components/ui/texture-button";
import { PayoutStatusBadge, type PayoutStatus } from "@/components/payouts/PayoutStatusBadge";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface PayoutRow {
  id: string;
  accountId: string;
  userId: string;
  status: PayoutStatus | string;
  requestedCents: string;
  traderAmountCents: string;
  profitSplitPct: string;
  paymentMethod: string | null;
  paymentDestination: string | null;
  externalReference: string | null;
  reviewerNotes: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
}

const FILTERS = [
  { id: "requested", label: "Requested" },
  { id: "approved", label: "Approved" },
  { id: "paid", label: "Paid" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

export default function AdminPayoutsLivePage() {
  const [filter, setFilter] = useState<FilterId>("requested");
  const [rows, setRows] = useState<PayoutRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // One modal state object — only one action active at a time.
  const [modal, setModal] = useState<
    | { kind: "reject"; payout: PayoutRow; reason: string; submitting: boolean }
    | { kind: "mark-paid"; payout: PayoutRow; ref: string; submitting: boolean }
    | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoadError(null);
    try {
      const path =
        filter === "all" ? "/api/payouts" : `/api/payouts?status=${filter}`;
      const data = await api.get<PayoutRow[]>(path);
      setRows(data);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : String(err));
      setRows([]);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function approve(payout: PayoutRow): Promise<void> {
    setActionError(null);
    setActingId(payout.id);
    try {
      await api.post(`/api/admin/payouts/${payout.id}/approve`, {});
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setActingId(null);
    }
  }

  async function submitReject(): Promise<void> {
    if (!modal || modal.kind !== "reject" || !modal.reason.trim()) return;
    setModal({ ...modal, submitting: true });
    setActionError(null);
    try {
      await api.post(`/api/admin/payouts/${modal.payout.id}/reject`, {
        reason: modal.reason.trim(),
      });
      setModal(null);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : String(err));
      setModal({ ...modal, submitting: false });
    }
  }

  async function submitMarkPaid(): Promise<void> {
    if (!modal || modal.kind !== "mark-paid") return;
    setModal({ ...modal, submitting: true });
    setActionError(null);
    try {
      await api.post(`/api/admin/payouts/${modal.payout.id}/mark-paid`, {
        externalReference: modal.ref.trim() || undefined,
      });
      setModal(null);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : String(err));
      setModal({ ...modal, submitting: false });
    }
  }

  const summary = useMemo(() => {
    if (!rows) return null;
    const cents = (s: PayoutStatus) =>
      rows
        .filter((r) => r.status === s)
        .reduce((acc, r) => acc + BigInt(r.traderAmountCents), 0n);
    return {
      requestedCount: rows.filter((r) => r.status === "requested").length,
      approvedCount: rows.filter((r) => r.status === "approved").length,
      paidThisFilterCents: cents("paid"),
    };
  }, [rows]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Payouts Queue</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review trader payout requests, approve/reject, and mark paid once funds are sent.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
            Live data
          </span>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === f.id ? "text-indigo-700 bg-white dark:bg-slate-900 shadow-sm" : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => void load()}
          className="ml-1 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 inline-flex items-center gap-1.5"
        >
          <ArrowPathIcon className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Failed to load payouts: {loadError}
        </div>
      )}
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Summary bar (only meaningful when filter='all') */}
      {summary && filter === "all" && (
        <div className="grid grid-cols-3 gap-4">
          <TextureCard>
            <TextureCardContent className="px-5 py-4">
              <div className="text-xs font-medium text-amber-600 mb-1">Awaiting review</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{summary.requestedCount}</div>
            </TextureCardContent>
          </TextureCard>
          <TextureCard>
            <TextureCardContent className="px-5 py-4">
              <div className="text-xs font-medium text-blue-600 mb-1">To process</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{summary.approvedCount}</div>
            </TextureCardContent>
          </TextureCard>
          <TextureCard>
            <TextureCardContent className="px-5 py-4">
              <div className="text-xs font-medium text-green-600 mb-1">Paid (this view)</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {formatCurrency(Number(summary.paidThisFilterCents))}
              </div>
            </TextureCardContent>
          </TextureCard>
        </div>
      )}

      {/* Table-style list */}
      <TextureCard interactive={false}>
        <TextureCardContent className="p-0">
          {rows === null && (
            <div className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          )}
          {rows !== null && rows.length === 0 && (
            <div className="px-6 py-16 text-center">
              <CurrencyDollarIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No payouts in this view.
              </div>
            </div>
          )}
          {rows !== null && rows.length > 0 && (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {rows.map((p) => {
                const isActing = actingId === p.id;
                const requested = Number(p.requestedCents);
                const trader = Number(p.traderAmountCents);
                return (
                  <li key={p.id} className="px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Identity + amounts */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <PayoutStatusBadge status={p.status} />
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(p.requestedAt, "MMM dd, yyyy 'at' HH:mm")}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                        {formatCurrency(requested)} <span className="text-gray-400 dark:text-gray-500 font-normal">→</span>{" "}
                        {formatCurrency(trader)} <span className="text-gray-400 dark:text-gray-500 text-xs font-normal">to trader ({p.profitSplitPct}%)</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono">
                        <span>trader <span className="text-gray-700 dark:text-gray-200">{p.userId.slice(0, 8)}…</span></span>
                        <span>account <span className="text-gray-700 dark:text-gray-200">{p.accountId.slice(0, 8)}…</span></span>
                        {p.paymentMethod && <span>{p.paymentMethod} · {p.paymentDestination?.slice(0, 22) ?? "—"}</span>}
                      </div>
                      {p.reviewerNotes && (
                        <div className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 italic">
                          Note: {p.reviewerNotes}
                        </div>
                      )}
                    </div>

                    {/* Actions per state */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {p.status === "requested" && (
                        <>
                          <TextureButton
                            variant="primary"
                            size="sm"
                            onClick={() => approve(p)}
                            disabled={isActing}
                          >
                            <CheckIcon className="w-3.5 h-3.5" />
                            {isActing ? "…" : "Approve"}
                          </TextureButton>
                          <button
                            onClick={() =>
                              setModal({ kind: "reject", payout: p, reason: "", submitting: false })
                            }
                            disabled={isActing}
                            className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      )}
                      {p.status === "approved" && (
                        <TextureButton
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            setModal({ kind: "mark-paid", payout: p, ref: "", submitting: false })
                          }
                        >
                          <CurrencyDollarIcon className="w-3.5 h-3.5" />
                          Mark Paid
                        </TextureButton>
                      )}
                      {p.status === "paid" && p.externalReference && (
                        <span className="text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-950 px-2 py-1 rounded">
                          {p.externalReference}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TextureCardContent>
      </TextureCard>

      {/* Reject + mark-paid modals */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !modal.submitting && setModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {modal.kind === "reject" ? "Reject payout" : "Mark payout as paid"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {modal.kind === "reject"
                    ? "The trader will see your reason and the debit will be refunded."
                    : "Confirm the funds have left your account; the trader gets an email."}
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 dark:bg-slate-950 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Amount </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                    {formatCurrency(Number(modal.payout.requestedCents))}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400"> → trader </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                    {formatCurrency(Number(modal.payout.traderAmountCents))}
                  </span>
                </div>

                {modal.kind === "reject" ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                      Reason (required)
                    </label>
                    <textarea
                      autoFocus
                      rows={3}
                      value={modal.reason}
                      onChange={(e) => setModal({ ...modal, reason: e.target.value })}
                      placeholder="e.g. payment destination invalid, KYC mismatch"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                      External reference (optional)
                    </label>
                    <input
                      autoFocus
                      type="text"
                      value={modal.ref}
                      onChange={(e) => setModal({ ...modal, ref: e.target.value })}
                      placeholder="WIRE-…, INTERAC-…, TX-hash"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => setModal(null)}
                    disabled={modal.submitting}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  {modal.kind === "reject" ? (
                    <button
                      onClick={submitReject}
                      disabled={modal.submitting || !modal.reason.trim()}
                      className="inline-flex items-center gap-1 h-9 px-4 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {modal.submitting ? "Rejecting…" : "Confirm reject"}
                    </button>
                  ) : (
                    <TextureButton
                      variant="primary"
                      size="sm"
                      onClick={submitMarkPaid}
                      disabled={modal.submitting}
                    >
                      {modal.submitting ? "Marking paid…" : "Confirm paid"}
                    </TextureButton>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
