"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { CurrencyDollarIcon, CheckCircleIcon, XCircleIcon, EyeIcon, ArrowLeftIcon } from "@heroicons/react/16/solid";
import { useAdmin } from "@/context/AdminContext";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { PayoutRequest } from "@/types/admin";
import {
  PayoutStatusBadge,
  PayoutsEmptyState,
  TableSkeleton,
  StickyTableHeader,
  RowActions,
  ActionButton,
  TableContainer,
} from "@/components/admin/shared/TableUI";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Filter tabs with animated indicator
const FilterTabs = ({
  filter,
  setFilter,
}: {
  filter: PayoutRequest["status"] | "all";
  setFilter: (filter: PayoutRequest["status"] | "all") => void;
}) => {
  const tabs = ["all", "pending", "approved", "completed", "rejected"] as const;

  return (
    <LayoutGroup>
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg w-fit">
        {tabs.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              "relative px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize",
              filter === status ? "text-indigo-700" : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
            )}
          >
            {filter === status && (
              <motion.div
                layoutId="activePayoutFilter"
                className="absolute inset-0 bg-white dark:bg-slate-900 shadow-sm rounded-md"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">{status}</span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
};

export default function PayoutsPage() {
  const { payoutQueue, approvePayout, rejectPayout } = useAdmin();
  const [filter, setFilter] = useState<PayoutRequest["status"] | "all">("all");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [isLoading] = useState(false); // Can be connected to actual loading state

  const filteredPayouts =
    filter === "all"
      ? payoutQueue
      : payoutQueue.filter((p) => p.status === filter);

  const pendingCount = payoutQueue.filter((p) => p.status === "pending").length;
  const pendingAmount = payoutQueue
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const handleReject = (payoutId: string) => {
    if (rejectReason.trim()) {
      rejectPayout(payoutId, rejectReason);
      setRejectingId(null);
      setRejectReason("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 -mx-6 -mt-6 px-6 py-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/admin"
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Payout Queue</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Review and process payout requests
              </p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-8 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Pending:</span>
            <span className="ml-2 font-semibold text-amber-600">
              {pendingCount} ({formatCurrency(pendingAmount)})
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Total in Queue:</span>
            <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
              {payoutQueue.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filters with animated indicator */}
      <FilterTabs filter={filter} setFilter={setFilter} />

      {/* Loading State */}
      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : filteredPayouts.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
          <PayoutsEmptyState />
        </div>
      ) : (
        /* Payouts Table */
        <TableContainer maxHeight="calc(100vh - 380px)">
          <table className="w-full">
            <StickyTableHeader>
              <tr className="border-b border-gray-200 dark:border-slate-800">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-slate-950">
                  Trader
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-slate-950">
                  Amount
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-slate-950">
                  Method
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-slate-950">
                  Status
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-slate-950">
                  Requested
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-slate-950">
                  Actions
                </th>
              </tr>
            </StickyTableHeader>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              <AnimatePresence mode="popLayout">
                {filteredPayouts.map((payout, index) => {
                  const isHovered = hoveredRow === payout.payoutId;

                  return (
                    <motion.tr
                      key={payout.payoutId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      onMouseEnter={() => setHoveredRow(payout.payoutId)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={cn(
                        "group transition-colors duration-150 ease-in-out",
                        isHovered ? "bg-green-50/50" : "hover:bg-gray-50/80"
                      )}
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/traders/${payout.traderId}`}
                          className="font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 transition-colors"
                        >
                          {payout.traderName}
                        </Link>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{payout.traderEmail}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(payout.amount)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Gross: {formatCurrency(payout.grossProfit)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-gray-900 dark:text-gray-100">
                          {payout.paymentMethod.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <PayoutStatusBadge status={payout.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(payout.requestedAt)}
                      </td>
                      <td className="px-6 py-4">
                        {payout.status === "pending" ? (
                          <RowActions alwaysVisible>
                            <ActionButton
                              onClick={() => approvePayout(payout.payoutId)}
                              icon={CheckCircleIcon}
                              title="Approve"
                              variant="success"
                            />
                            <ActionButton
                              onClick={() => setRejectingId(payout.payoutId)}
                              icon={XCircleIcon}
                              title="Reject"
                              variant="danger"
                            />
                            <ActionButton
                              href={`/admin/traders/${payout.traderId}`}
                              icon={EyeIcon}
                              title="View Trader"
                              variant="default"
                            />
                          </RowActions>
                        ) : (
                          <RowActions>
                            <ActionButton
                              href={`/admin/traders/${payout.traderId}`}
                              icon={EyeIcon}
                              title="View Trader"
                              variant="default"
                            />
                          </RowActions>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </TableContainer>
      )}

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectingId && (
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
              className="absolute inset-0 bg-black/50"
              onClick={() => setRejectingId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reject Payout</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Please provide a reason for rejecting this payout request.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Rejection reason..."
                className="w-full mt-4 px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-shadow"
                rows={3}
                autoFocus
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setRejectingId(null);
                    setRejectReason("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(rejectingId)}
                  disabled={!rejectReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reject Payout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
