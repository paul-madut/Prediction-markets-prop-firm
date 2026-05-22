"use client";

// /dashboard/payouts-live — trader-facing payouts on real backend.
//
// Wires:
//   GET  /api/accounts        → find funded accounts (only those can request)
//   GET  /api/payouts         → trader's own payout history
//   POST /api/payouts         → submit a request
//
// Visual structure mirrors the mock /dashboard/payouts: stats row +
// request form + history list, all on TextureCard, status badges,
// formatCurrency. The only behavioral difference is everything is real.
//
// Critical UX:
//   - Show available profit per funded account so the trader can't
//     request more than they've earned.
//   - Show "you'll receive" preview using profit_split_pct so the firm
//     cut isn't a surprise after submission.
//   - Balance is debited immediately on request (Phase 8 design); the
//     "pending payouts" stat reflects this so the trader sees a
//     consistent picture of available funds.

import { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ArrowUpRightIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { TextureButton } from "@/components/ui/texture-button";
import { PayoutStatusBadge, type PayoutStatus } from "@/components/payouts/PayoutStatusBadge";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/formatters";

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
  { id: "bank_transfer", label: "Bank Transfer", icon: BuildingLibraryIcon, hint: "2–3 business days" },
  { id: "crypto", label: "Crypto (USDC/USDT)", icon: CurrencyDollarIcon, hint: "Within 24 hours" },
  { id: "paypal", label: "PayPal", icon: CreditCardIcon, hint: "Instant" },
] as const;
type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

export default function PayoutsLivePage() {
  const [accounts, setAccounts] = useState<AccountRow[] | null>(null);
  const [payouts, setPayouts] = useState<PayoutRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [requestedDollars, setRequestedDollars] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("bank_transfer");
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
      // Default-select the first funded account.
      const firstFunded = accs.find((a) => a.status === "funded");
      if (firstFunded && !selectedAccountId) setSelectedAccountId(firstFunded.id);
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
    () => fundedAccounts.find((a) => a.id === selectedAccountId) ?? fundedAccounts[0] ?? null,
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

  const splitPct = selectedAccount ? Number(selectedAccount.config.profitSplitPct) : 0;
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

  // Stats row math (over all accounts so the user sees the full picture).
  const stats = useMemo(() => {
    const ps = payouts ?? [];
    const pendingCents = ps
      .filter((p) => p.status === "requested" || p.status === "approved" || p.status === "processing")
      .reduce((acc, p) => acc + BigInt(p.requestedCents), 0n);
    const lifetimePaidCents = ps
      .filter((p) => p.status === "paid")
      .reduce((acc, p) => acc + BigInt(p.traderAmountCents), 0n);
    const totalAvailableCents = fundedAccounts.reduce((acc, a) => {
      const profit = BigInt(a.currentBalanceCents) - BigInt(a.startingBalanceCents);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Payouts</h1>
          <p className="text-sm text-white/55 mt-1">
            Request a payout from a funded account; track every request through to paid.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
            Live data
          </span>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Failed to load payouts: {loadError}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TextureCard>
          <TextureCardContent className="px-5 py-5">
            <div className="text-xs font-medium text-emerald-600 mb-2">Available Profit</div>
            <div className="text-2xl font-bold text-white tabular-nums">
              {formatCurrency(Number(stats.totalAvailableCents))}
            </div>
            <div className="text-xs text-white/55 mt-1">
              Across all funded accounts
            </div>
          </TextureCardContent>
        </TextureCard>
        <TextureCard>
          <TextureCardContent className="px-5 py-5">
            <div className="text-xs font-medium text-amber-600 mb-2">Pending</div>
            <div className="text-2xl font-bold text-white tabular-nums">
              {formatCurrency(Number(stats.pendingCents))}
            </div>
            <div className="text-xs text-white/55 mt-1">
              Awaiting review or processing
            </div>
          </TextureCardContent>
        </TextureCard>
        <TextureCard>
          <TextureCardContent className="px-5 py-5">
            <div className="text-xs font-medium text-[#A769FF] mb-2">Lifetime Paid</div>
            <div className="text-2xl font-bold text-white tabular-nums">
              {formatCurrency(Number(stats.lifetimePaidCents))}
            </div>
            <div className="text-xs text-white/55 mt-1">
              Trader take after profit split
            </div>
          </TextureCardContent>
        </TextureCard>
      </div>

      {/* Request form OR no-funded-account empty state */}
      <TextureCard interactive={false}>
        <TextureCardContent className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Request a payout
          </h2>

          {accounts === null && (
            <div className="text-sm text-white/55">Loading accounts…</div>
          )}

          {accounts !== null && fundedAccounts.length === 0 && (
            <div className="text-sm text-white/55">
              You don&apos;t have any funded accounts yet. Pass a challenge first to unlock payouts.
            </div>
          )}

          {selectedAccount && (
            <form onSubmit={submit} className="space-y-4">
              {/* Account selector — hide if only one funded account */}
              {fundedAccounts.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-white/75 mb-1.5">
                    Account
                  </label>
                  <select
                    value={selectedAccount.id}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#180630] border border-gray-200 dark:border-white/15 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#7F24FF]"
                  >
                    {fundedAccounts.map((a) => {
                      const profit = BigInt(a.currentBalanceCents) - BigInt(a.startingBalanceCents);
                      return (
                        <option key={a.id} value={a.id}>
                          {a.config.name} — {formatCurrency(Number(profit > 0n ? profit : 0n))} available
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-white/75 mb-1.5">
                  Amount to request (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={requestedDollars}
                    onChange={(e) => setRequestedDollars(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-[#180630] border border-gray-200 dark:border-white/15 rounded-lg text-sm text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#7F24FF]"
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <span className={`${exceedsProfit ? "text-red-600" : "text-white/55"}`}>
                    {exceedsProfit
                      ? `Exceeds available profit (${formatCurrency(Number(availableProfitCents))})`
                      : `Available profit: ${formatCurrency(Number(availableProfitCents))}`}
                  </span>
                  {requestedCents > 0n && !exceedsProfit && (
                    <span className="text-gray-700 dark:text-gray-200 font-medium">
                      You&apos;ll receive {formatCurrency(Number(traderAmountCents))} ({splitPct}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Method + destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/75 mb-1.5">
                    Payment method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodId)}
                    className="w-full px-3 py-2 bg-[#180630] border border-gray-200 dark:border-white/15 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#7F24FF]"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <div className="text-xs text-white/45 mt-1">
                    {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.hint}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/75 mb-1.5">
                    Destination
                  </label>
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
                    className="w-full px-3 py-2 bg-[#180630] border border-gray-200 dark:border-white/15 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#7F24FF]"
                  />
                </div>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  {submitError}
                </div>
              )}
              {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-700">
                  {successMessage}
                </div>
              )}

              <TextureButton
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!canSubmit}
                type="submit"
              >
                {submitting ? "Submitting…" : (
                  <>
                    <ArrowUpRightIcon className="w-4 h-4" />
                    Request {requestedCents > 0n ? formatCurrency(Number(requestedCents)) : "Payout"}
                  </>
                )}
              </TextureButton>
            </form>
          )}
        </TextureCardContent>
      </TextureCard>

      {/* History */}
      <TextureCard interactive={false}>
        <TextureCardContent className="p-0">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              History
            </h2>
            <button
              onClick={() => void loadAll()}
              className="inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {payouts === null && (
            <div className="px-6 py-8 text-sm text-white/55">Loading…</div>
          )}
          {payouts !== null && payouts.length === 0 && (
            <div className="px-6 py-12 text-center">
              <CheckCircleIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <div className="text-sm text-white/55">
                No payout requests yet.
              </div>
            </div>
          )}
          {payouts !== null && payouts.length > 0 && (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {payouts.map((p) => {
                const requested = Number(p.requestedCents);
                const trader = Number(p.traderAmountCents);
                return (
                  <li key={p.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <PayoutStatusBadge status={p.status} />
                        <span className="text-xs text-white/45">
                          {formatDate(p.requestedAt, "MMM dd, yyyy 'at' HH:mm")}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-white tabular-nums">
                        {formatCurrency(requested)} requested → {formatCurrency(trader)} to you
                      </div>
                      {p.paymentMethod && (
                        <div className="text-xs text-white/55 mt-0.5">
                          {p.paymentMethod} · {p.paymentDestination ?? "—"}
                        </div>
                      )}
                      {p.reviewerNotes && (
                        <div className="text-xs text-white/75 mt-1 italic">
                          Note: {p.reviewerNotes}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-xs text-white/55 shrink-0">
                      {p.paidAt ? (
                        <span className="text-green-700 dark:text-green-400 font-medium">
                          Paid {formatDate(p.paidAt, "MMM dd")}
                          {p.externalReference && (
                            <div className="font-mono text-white/45">
                              {p.externalReference}
                            </div>
                          )}
                        </span>
                      ) : p.reviewedAt ? (
                        <span>Reviewed {formatDate(p.reviewedAt, "MMM dd")}</span>
                      ) : (
                        <span>Awaiting review</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TextureCardContent>
      </TextureCard>
    </div>
  );
}
