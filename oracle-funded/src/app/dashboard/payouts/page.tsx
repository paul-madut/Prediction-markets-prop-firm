"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { PayoutsSkeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { CurrencyDollarIcon, WalletIcon, ArrowUpRightIcon, ClockIcon, CheckCircleIcon, XCircleIcon, BuildingLibraryIcon, CreditCardIcon, ExclamationCircleIcon, ArrowTrendingUpIcon, ChevronRightIcon } from "@heroicons/react/16/solid";

type PaymentMethod = "bank_transfer" | "crypto" | "paypal";

interface MockPayout {
  id: string;
  amount: number; // cents
  method: PaymentMethod;
  status: "pending" | "approved" | "processing" | "completed" | "rejected";
  requestedAt: string;
  processedAt?: string;
  note?: string;
}

// Mock payout history
const mockPayoutHistory: MockPayout[] = [
  {
    id: "PAY-001",
    amount: 240000,
    method: "bank_transfer",
    status: "completed",
    requestedAt: "2025-12-20T14:30:00Z",
    processedAt: "2025-12-23T09:00:00Z",
  },
  {
    id: "PAY-002",
    amount: 180000,
    method: "crypto",
    status: "completed",
    requestedAt: "2026-01-05T10:15:00Z",
    processedAt: "2026-01-06T11:30:00Z",
  },
  {
    id: "PAY-003",
    amount: 320000,
    method: "bank_transfer",
    status: "processing",
    requestedAt: "2026-03-28T16:45:00Z",
  },
];

const paymentMethods: {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
  fee: string;
  time: string;
}[] = [
  {
    id: "bank_transfer",
    label: "Bank Transfer",
    description: "Direct deposit to your bank account",
    icon: <BuildingLibraryIcon className="w-5 h-5" />,
    fee: "Free",
    time: "2-3 business days",
  },
  {
    id: "crypto",
    label: "Cryptocurrency",
    description: "USDC or USDT to your wallet",
    icon: <CurrencyDollarIcon className="w-5 h-5" />,
    fee: "Free",
    time: "Within 24 hours",
  },
  {
    id: "paypal",
    label: "PayPal",
    description: "Instant transfer to PayPal",
    icon: <CreditCardIcon className="w-5 h-5" />,
    fee: "2.9%",
    time: "Instant",
  },
];

const statusConfig: Record<
  MockPayout["status"],
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    color: "bg-amber-100 text-amber-800",
    icon: <ClockIcon className="w-3.5 h-3.5" />,
  },
  approved: {
    label: "Approved",
    color: "bg-blue-100 text-blue-800",
    icon: <CheckCircleIcon className="w-3.5 h-3.5" />,
  },
  processing: {
    label: "Processing",
    color: "bg-blue-100 text-blue-800",
    icon: <ClockIcon className="w-3.5 h-3.5" />,
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-800",
    icon: <CheckCircleIcon className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-800",
    icon: <XCircleIcon className="w-3.5 h-3.5" />,
  },
};

export default function PayoutsPage() {
  const { user } = useApp();
  const [ready, setReady] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("bank_transfer");
  const [requestAmount, setRequestAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return <PayoutsSkeleton />;

  const isFunded = user.accountPhase === "funded";
  const profitCents = user.accountBalance - user.startingBalance;
  const traderShare = Math.max(0, Math.floor(profitCents * 0.8));
  const firmShare = Math.max(0, profitCents - traderShare);
  const minPayout = 5000; // $50 minimum in cents
  const canRequestPayout = isFunded && traderShare >= minPayout;

  const filteredPayouts = mockPayoutHistory.filter((p) => {
    if (filter === "all") return true;
    if (filter === "pending") return ["pending", "approved", "processing"].includes(p.status);
    return p.status === "completed";
  });

  const totalPaidOut = mockPayoutHistory
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  const handleSubmit = async () => {
    if (!requestAmount || submitting) return;
    const amountCents = Math.round(parseFloat(requestAmount) * 100);
    if (amountCents < minPayout || amountCents > traderShare) return;

    setSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSubmitting(false);
    setSubmitted(true);
    setRequestAmount("");
    setTimeout(() => setSubmitted(false), 3000);
  };

  const getMethodLabel = (method: PaymentMethod) =>
    paymentMethods.find((m) => m.id === method)?.label ?? method;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Subtitle */}
      <p className="text-sm text-gray-500">
        Request withdrawals from your funded account profits.
      </p>

      {/* Not Funded Banner */}
      {!isFunded && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <ExclamationCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Account Not Yet Funded</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Payouts are available once you pass your evaluation and reach funded status.
              You are currently in the{" "}
              <span className="font-semibold">
                {user.accountPhase === "evaluation_1"
                  ? "Evaluation Phase 1"
                  : "Evaluation Phase 2"}
              </span>{" "}
              stage.
            </p>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <WalletIcon className="w-4 h-4" />
            Account Balance
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(user.accountBalance)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <ArrowTrendingUpIcon className="w-4 h-4" />
            Total Profit
          </div>
          <p
            className={`text-xl font-bold ${
              profitCents >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {profitCents >= 0 ? "+" : ""}
            {formatCurrency(profitCents)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <CurrencyDollarIcon className="w-4 h-4" />
            Available to Withdraw
          </div>
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(traderShare)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <ArrowUpRightIcon className="w-4 h-4" />
            Total Paid Out
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(totalPaidOut)}
          </p>
        </div>
      </div>

      {/* Profit Split Breakdown */}
      {isFunded && profitCents > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Profit Split</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 bg-green-100 rounded-full h-3 overflow-hidden">
                <div className="bg-green-500 h-full rounded-full" style={{ width: "80%" }} />
              </div>
              <span className="text-sm font-medium text-gray-600 w-10 text-right">80%</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Gross Profit</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(profitCents)}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                <p className="text-sm text-green-700">Your Share (80%)</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(traderShare)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Firm Share (20%)</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(firmShare)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Payout Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Request Payout</h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Payment Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  disabled={!canRequestPayout}
                  className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                    selectedMethod === method.id
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  } ${!canRequestPayout ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`${
                        selectedMethod === method.id ? "text-blue-600" : "text-gray-500"
                      }`}
                    >
                      {method.icon}
                    </div>
                    <span className="font-medium text-gray-900">{method.label}</span>
                  </div>
                  <p className="text-xs text-gray-500">{method.description}</p>
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="text-gray-400">Fee: {method.fee}</span>
                    <span className="text-gray-400">{method.time}</span>
                  </div>
                  {selectedMethod === method.id && (
                    <div className="absolute top-2 right-2">
                      <CheckCircleIcon className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (USD)
            </label>
            <div className="relative max-w-xs">
              <CurrencyDollarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                placeholder={`Min ${formatCurrency(minPayout)}`}
                disabled={!canRequestPayout}
                min={minPayout / 100}
                max={traderShare / 100}
                step="0.01"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            {canRequestPayout && (
              <p className="text-xs text-gray-400 mt-1">
                Maximum: {formatCurrency(traderShare)}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSubmit}
              disabled={
                !canRequestPayout ||
                !requestAmount ||
                submitting ||
                parseFloat(requestAmount) * 100 < minPayout ||
                parseFloat(requestAmount) * 100 > traderShare
              }
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : submitted ? (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  Request Submitted!
                </>
              ) : (
                <>
                  <ArrowUpRightIcon className="w-4 h-4" />
                  Request Payout
                </>
              )}
            </button>
            {!canRequestPayout && isFunded && (
              <p className="text-sm text-gray-500">
                Minimum withdrawal is {formatCurrency(minPayout)}.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Payout History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Payout History</h2>
          <div className="flex gap-1">
            {(["all", "pending", "completed"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                  filter === tab
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Card Layout */}
        <div className="block md:hidden p-4 space-y-3">
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CurrencyDollarIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="font-medium">No payouts yet</p>
              <p className="text-sm">Your payout history will appear here.</p>
            </div>
          ) : (
            filteredPayouts.map((payout) => {
              const status = statusConfig[payout.status];
              return (
                <div
                  key={payout.id}
                  className="bg-gray-50 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {payout.id}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded ${status.color}`}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(payout.amount)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {getMethodLabel(payout.method)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Requested {formatDate(payout.requestedAt)}
                    {payout.processedAt && (
                      <> &middot; Paid {formatDate(payout.processedAt)}</>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CurrencyDollarIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="font-medium">No payouts yet</p>
              <p className="text-sm">Your payout history will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requested
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Processed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayouts.map((payout) => {
                    const status = statusConfig[payout.status];
                    return (
                      <tr key={payout.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payout.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatCurrency(payout.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {getMethodLabel(payout.method)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded ${status.color}`}
                          >
                            {status.icon}
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(payout.requestedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payout.processedAt
                            ? formatDate(payout.processedAt)
                            : "-"}
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
    </div>
  );
}
