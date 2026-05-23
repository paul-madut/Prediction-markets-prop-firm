"use client";

// /dashboard/payouts — trader-facing payouts on real backend.
//
// Wires:
//   GET /api/accounts         → find funded accounts (only those can request)
//   GET /api/payouts          → trader's own payout history
//   POST /api/payouts         → submit a request
//
// Critical UX:
//   - Show available profit per funded account so the trader can't request
//     more than they've earned.
//   - Show "you'll receive" preview using profit_split_pct so the firm cut
//     isn't a surprise after submission.
//   - Balance is debited immediately on request (Phase 8 design); the
//     pending-payouts stat reflects this.

import { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ArrowUpRightIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/16/solid";
import {
  PayoutStatusBadge,
  type PayoutStatus,
} from "@/components/payouts/PayoutStatusBadge";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { cn } from "@/lib/utils";

interface AccountRow {
  id: string;
  status: string;
  startingBalanceCents: string;
  currentBalanceCents: string;
  config: {
    name: string;
    profitSplitPct: string;
  };
}

interface PayoutRow {
  id: string;
  accountId: string;
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

const PAYMENT_METHODS = [
  {
    id: "bank_transfer",
    label: "Bank Transfer",
    icon: BuildingLibraryIcon,
    hint: "2-3 business days",
  },
  {
    id: "crypto",
    label: "Crypto (USDC/USDT)",
    icon: CurrencyDollarIcon,
    hint: "Within 24 hours",
  },
  {
    id: "paypal",
    label: "PayPal",
    icon: CreditCardIcon,
    hint: "Instant",
  },
] as const;
type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

export default function PayoutsLivePage() {
  const [accounts, setAccounts] = useState<AccountRow[] | null>(null);
  const [payouts, setPayouts] = useState<PayoutRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [requestedDollars, setRequestedDollars] = useState<string>("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodId>("bank_transfer");
  const [paymentDestination, setPaymentDestination] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadAll(): Promise<void> {
    setLoadError(null);
    try {
      const [accs, ps] = await Promise.all([
        api.get<AccountRow[]>("/api/accounts"),
        api.get<PayoutRow[]>("/api/payouts"),
      ]);
      setAccounts(accs);
      setPayouts(ps);
      const firstFunded = accs.find((a) => a.status === "funded");
      if (firstFunded && !selectedAccountId)
        setSelectedAccountId(firstFunded.id);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : String(err));
      setAccounts([]);
      setPayouts([]);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fundedAccounts = useMemo(
    () => (accounts ?? []).filter((a) => a.status === "funded"),
    [accounts],
  );

  const selectedAccount = useMemo(
    () =>
      fundedAccounts.find((a) => a.id === selectedAccountId) ??
      fundedAccounts[0] ??
      null,
    [fundedAccounts, selectedAccountId],
  );

  const availableProfitCents = useMemo(() => {
    if (!selectedAccount) return 0n;
    const cur = BigInt(selectedAccount.currentBalanceCents);
    const start = BigInt(selectedAccount.startingBalanceCents);
    const p = cur - start;
    return p > 0n ? p : 0n;
  }, [selectedAccount]);

  const requestedCents = useMemo(() => {
    const dollars = parseFloat(requestedDollars);
    if (!Number.isFinite(dollars) || dollars <= 0) return 0n;
    return BigInt(Math.round(dollars * 100));
  }, [requestedDollars]);

  const splitPct = selectedAccount
    ? Number(selectedAccount.config.profitSplitPct)
    : 0;
  const traderAmountCents = useMemo(() => {
    if (requestedCents <= 0n || !selectedAccount) return 0n;
    const bps = BigInt(Math.round(splitPct * 100));
    return (requestedCents * bps) / 10000n;
  }, [requestedCents, selectedAccount, splitPct]);

  const exceedsProfit = requestedCents > availableProfitCents;
  const canSubmit =
    selectedAccount &&
    requestedCents > 0n &&
    !exceedsProfit &&
    paymentDestination.trim().length > 0 &&
    !submitting;

  const stats = useMemo(() => {
    const ps = payouts ?? [];
    const pendingCents = ps
      .filter(
        (p) =>
          p.status === "requested" ||
          p.status === "approved" ||
          p.status === "processing",
      )
      .reduce((acc, p) => acc + BigInt(p.requestedCents), 0n);
    const lifetimePaidCents = ps
      .filter((p) => p.status === "paid")
      .reduce((acc, p) => acc + BigInt(p.traderAmountCents), 0n);
    const totalAvailableCents = fundedAccounts.reduce((acc, a) => {
      const profit =
        BigInt(a.currentBalanceCents) - BigInt(a.startingBalanceCents);
      return acc + (profit > 0n ? profit : 0n);
    }, 0n);
    return { pendingCents, lifetimePaidCents, totalAvailableCents };
  }, [payouts, fundedAccounts]);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!canSubmit || !selectedAccount) return;
    setSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);
    try {
      await api.post("/api/payouts", {
        accountId: selectedAccount.id,
        requestedCents: requestedCents.toString(),
        paymentMethod,
        paymentDestination: paymentDestination.trim(),
      });
      setSuccessMessage(
        `Payout requested. You'll receive ${formatCurrency(Number(traderAmountCents))} after admin review.`,
      );
      setRequestedDollars("");
      setPaymentDestination("");
      await loadAll();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Payouts</h1>
          <p className="text-sm text-[#ADADAD] mt-1">
            Request a payout from a funded account; track every request through
            to paid.
          </p>
        </div>
        <div className="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-[rgba(18,223,186,0.14)] px-2.5 text-[12px] font-semibold uppercase tracking-wide text-[#12DFBA]">
          <div className="h-2 w-2 rounded-full bg-[#12DFBA] animate-pulse" />
          Live
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-[#FF1C1C]/30 bg-[rgba(255,28,28,0.14)] px-4 py-3 text-sm text-[#FF1C1C]">
          Failed to load payouts: {loadError}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Available Profit"
          value={Number(stats.totalAvailableCents) / 100}
          format={(v) =>
            `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
          }
          hint="Across all funded accounts"
          tone="good"
        />
        <MetricCard
          label="Pending"
          value={Number(stats.pendingCents) / 100}
          format={(v) =>
            `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
          }
          hint="Awaiting review or processing"
          tone="warn"
        />
        <MetricCard
          label="Lifetime Paid"
          value={Number(stats.lifetimePaidCents) / 100}
          format={(v) =>
            `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
          }
          hint="Trader take after split"
          tone="brand"
        />
      </div>

      {/* Request form */}
      <div className="rounded-xl border border-white/10 bg-[#180630] p-6">
        <h2 className="text-lg font-semibold text-white">Request a payout</h2>
        <p className="mt-1 text-sm text-[#ADADAD]">
          Funds clear once an admin approves. You can&apos;t exceed your
          available profit.
        </p>

        {accounts === null && (
          <div className="mt-6 text-sm text-[#ADADAD]">Loading accounts…</div>
        )}

        {accounts !== null && fundedAccounts.length === 0 && (
          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] p-6 text-center">
            <CheckCircleIcon className="mx-auto mb-3 h-6 w-6 text-[#5A6476]" />
            <p className="text-sm text-[#ADADAD]">
              No funded accounts yet. Pass a challenge to unlock payouts.
            </p>
          </div>
        )}

        {selectedAccount && (
          <form onSubmit={submit} className="mt-6 space-y-5">
            {fundedAccounts.length > 1 && (
              <Field label="Account">
                <select
                  value={selectedAccount.id}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[rgba(127,36,255,0.45)]"
                >
                  {fundedAccounts.map((a) => {
                    const profit =
                      BigInt(a.currentBalanceCents) -
                      BigInt(a.startingBalanceCents);
                    return (
                      <option key={a.id} value={a.id}>
                        {a.config.name} —{" "}
                        {formatCurrency(Number(profit > 0n ? profit : 0n))}{" "}
                        available
                      </option>
                    );
                  })}
                </select>
              </Field>
            )}

            <Field label="Amount to request (USD)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-[#5A6476]">
                  $
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={requestedDollars}
                  onChange={(e) => setRequestedDollars(e.target.value)}
                  className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] pl-7 pr-3 font-mono text-sm text-white tabular-nums placeholder:text-[#5A6476] focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[rgba(127,36,255,0.45)]"
                />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span
                  className={cn(
                    "font-mono tabular-nums",
                    exceedsProfit ? "text-[#FF1C1C]" : "text-[#ADADAD]",
                  )}
                >
                  {exceedsProfit
                    ? `Exceeds available profit (${formatCurrency(Number(availableProfitCents))})`
                    : `Available profit: ${formatCurrency(Number(availableProfitCents))}`}
                </span>
                {requestedCents > 0n && !exceedsProfit && (
                  <span className="font-mono tabular-nums text-white">
                    You receive{" "}
                    <span className="font-semibold text-[#12DFBA]">
                      {formatCurrency(Number(traderAmountCents))}
                    </span>{" "}
                    <span className="text-[#ADADAD]">({splitPct}%)</span>
                  </span>
                )}
              </div>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Payment method">
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as PaymentMethodId)
                  }
                  className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[rgba(127,36,255,0.45)]"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-xs text-[#5A6476]">
                  {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.hint}
                </div>
              </Field>
              <Field label="Destination">
                <input
                  type="text"
                  placeholder={
                    paymentMethod === "crypto"
                      ? "0x… wallet address"
                      : paymentMethod === "paypal"
                        ? "you@paypal.com"
                        : "Bank account number"
                  }
                  value={paymentDestination}
                  onChange={(e) => setPaymentDestination(e.target.value)}
                  className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-[#5A6476] focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[rgba(127,36,255,0.45)]"
                />
              </Field>
            </div>

            {submitError && (
              <div className="rounded-lg border border-[#FF1C1C]/30 bg-[rgba(255,28,28,0.14)] px-3 py-2 text-sm text-[#FF1C1C]">
                {submitError}
              </div>
            )}
            {successMessage && (
              <div className="rounded-lg border border-[#12DFBA]/30 bg-[rgba(18,223,186,0.14)] px-3 py-2 text-sm text-[#12DFBA]">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="group relative inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#7F24FF] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(127,36,255,0.55)] transition-all hover:bg-[#A769FF] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {submitting ? (
                "Submitting…"
              ) : (
                <>
                  <ArrowUpRightIcon className="h-4 w-4" />
                  <span className="font-mono tabular-nums">
                    Request{" "}
                    {requestedCents > 0n
                      ? formatCurrency(Number(requestedCents))
                      : "Payout"}
                  </span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* History */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#180630]">
        <div className="flex h-12 items-center justify-between border-b border-white/10 px-6">
          <h2 className="text-lg font-semibold text-white">History</h2>
          <button
            onClick={() => void loadAll()}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] hover:text-white transition-colors"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {payouts === null && (
          <div className="px-6 py-10 text-center text-sm text-[#ADADAD]">
            Loading…
          </div>
        )}
        {payouts !== null && payouts.length === 0 && (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06]">
              <CheckCircleIcon className="h-5 w-5 text-[#5A6476]" />
            </div>
            <p className="text-sm text-[#ADADAD]">No payout requests yet.</p>
          </div>
        )}
        {payouts !== null && payouts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD]">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Requested</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Method</th>
                  <th className="text-right px-4 py-3 font-medium">
                    Amount
                  </th>
                  <th className="text-right px-4 py-3 font-medium">
                    To you
                  </th>
                  <th className="text-right px-6 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => {
                  const requested = Number(p.requestedCents);
                  const trader = Number(p.traderAmountCents);
                  return (
                    <tr
                      key={p.id}
                      className="h-14 border-b border-white/10 last:border-b-0 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-6 align-middle font-mono text-xs text-white tabular-nums whitespace-nowrap">
                        {formatDate(p.requestedAt, "yyyy-MM-dd HH:mm")}
                      </td>
                      <td className="px-4 align-middle">
                        <PayoutStatusBadge status={p.status} />
                      </td>
                      <td className="px-4 align-middle">
                        <div className="text-sm text-white capitalize">
                          {p.paymentMethod?.replace(/_/g, " ") ?? "—"}
                        </div>
                        {p.paymentDestination && (
                          <div className="font-mono text-[10px] text-[#5A6476] truncate max-w-[180px]">
                            {p.paymentDestination}
                          </div>
                        )}
                      </td>
                      <td className="px-4 text-right font-mono text-sm text-white tabular-nums">
                        {formatCurrency(requested)}
                      </td>
                      <td className="px-4 text-right font-mono text-sm font-medium text-[#12DFBA] tabular-nums">
                        {formatCurrency(trader)}
                      </td>
                      <td className="px-6 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                        {p.paidAt ? (
                          <span className="text-[#12DFBA]">
                            Paid {formatDate(p.paidAt, "MMM dd")}
                          </span>
                        ) : p.reviewedAt ? (
                          <span className="text-[#ADADAD]">
                            Reviewed {formatDate(p.reviewedAt, "MMM dd")}
                          </span>
                        ) : (
                          <span className="text-[#5A6476]">Awaiting review</span>
                        )}
                        {p.externalReference && (
                          <div className="font-mono text-[10px] text-[#5A6476]">
                            {p.externalReference}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[#ADADAD]">
        {label}
      </label>
      {children}
    </div>
  );
}
