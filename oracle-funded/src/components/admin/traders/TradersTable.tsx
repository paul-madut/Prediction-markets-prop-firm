"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowTopRightOnSquareIcon, EllipsisHorizontalIcon } from "@heroicons/react/16/solid";
import { AdminTraderView } from "@/types/admin";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  TraderStatusBadge,
  TraderKYCBadge,
  TraderPhaseBadge,
  TradersEmptyState,
  TableSkeleton,
  StickyTableHeader,
  RowActions,
  ActionButton,
  TableContainer,
} from "@/components/admin/shared/TableUI";

interface TradersTableProps {
  traders: AdminTraderView[];
  isLoading?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

const RiskIndicator = ({ score }: { score: number }) => {
  const level = score <= 33 ? "low" : score <= 66 ? "medium" : "high";
  const colors = {
    low: "bg-green-500",
    medium: "bg-amber-500",
    high: "bg-red-500",
  };
  const bgColors = {
    low: "bg-green-100",
    medium: "bg-amber-100",
    high: "bg-red-100",
  };

  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-16 h-2 rounded-full overflow-hidden", bgColors[level])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn("h-full rounded-full", colors[level])}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{score}</span>
    </div>
  );
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const TradersTable = ({
  traders,
  isLoading = false,
  selectedIds = new Set(),
  onSelectionChange,
}: TradersTableProps) => {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    if (!onSelectionChange) return;
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    onSelectionChange(newSelected);
  };

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedIds.size === traders.length && traders.length > 0) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(traders.map((t) => t.userId)));
    }
  };

  const isAllSelected = traders.length > 0 && selectedIds.size === traders.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < traders.length;

  // Show loading skeleton
  if (isLoading) {
    return <TableSkeleton rows={8} columns={9} />;
  }

  // Show empty state
  if (traders.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
        <TradersEmptyState />
      </div>
    );
  }

  return (
    <TableContainer maxHeight="calc(100vh - 340px)">
      <table className="w-full">
        <StickyTableHeader>
          <tr className="border-b border-gray-200 dark:border-slate-800">
            {/* Checkbox column */}
            {onSelectionChange && (
              <th className="px-6 py-3.5 w-12 bg-gray-50 dark:bg-slate-950">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = isIndeterminate;
                    }
                  }}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 text-indigo-600 rounded border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                />
              </th>
            )}
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-950">
              Trader
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-950">
              Status
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-950">
              Phase
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-950">
              Balance
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-950">
              P&L
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-950">
              KYC
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-950">
              Risk
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-950">
              Last Active
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-950">
              Actions
            </th>
          </tr>
        </StickyTableHeader>
        <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
          <AnimatePresence mode="popLayout">
            {traders.map((trader, index) => {
              const pnl = trader.accountBalance - trader.startingBalance;
              const pnlPercent = (pnl / trader.startingBalance) * 100;
              const isHovered = hoveredRow === trader.userId;
              const isSelected = selectedIds.has(trader.userId);

              return (
                <motion.tr
                  key={trader.userId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  onMouseEnter={() => setHoveredRow(trader.userId)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={cn(
                    "group transition-colors duration-150 ease-in-out",
                    isSelected && "bg-indigo-50 border-l-2 border-indigo-600",
                    !isSelected && (isHovered ? "bg-indigo-50/50" : "hover:bg-gray-50/80")
                  )}
                >
                  {/* Checkbox */}
                  {onSelectionChange && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(trader.userId)}
                        className="h-4 w-4 text-indigo-600 rounded border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                  )}

                  {/* Trader Info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm">
                        {trader.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          href={`/admin/traders/${trader.userId}`}
                          className="font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 transition-colors"
                        >
                          {trader.username}
                        </Link>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{trader.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <TraderStatusBadge status={trader.accountStatus} />
                  </td>

                  {/* Phase */}
                  <td className="px-6 py-4">
                    <TraderPhaseBadge phase={trader.accountPhase} />
                  </td>

                  {/* Balance */}
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(trader.accountBalance)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      of {formatCurrency(trader.accountSize)}
                    </p>
                  </td>

                  {/* P&L */}
                  <td className="px-6 py-4">
                    <p
                      className={cn(
                        "font-medium",
                        pnl >= 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {pnl >= 0 ? "+" : ""}
                      {formatCurrency(pnl)}
                    </p>
                    <p
                      className={cn(
                        "text-xs",
                        pnl >= 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {pnl >= 0 ? "+" : ""}
                      {pnlPercent.toFixed(2)}%
                    </p>
                  </td>

                  {/* KYC */}
                  <td className="px-6 py-4">
                    <TraderKYCBadge status={trader.kycStatus} />
                  </td>

                  {/* Risk Score */}
                  <td className="px-6 py-4">
                    <RiskIndicator score={trader.riskScore} />
                  </td>

                  {/* Last Active */}
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(trader.lastActiveAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <RowActions>
                      <ActionButton
                        href={`/admin/traders/${trader.userId}`}
                        icon={ArrowTopRightOnSquareIcon}
                        title="View Details"
                        variant="primary"
                      />
                      <ActionButton
                        icon={EllipsisHorizontalIcon}
                        title="More Actions"
                        variant="default"
                      />
                    </RowActions>
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky bottom-0">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {traders.length} trader{traders.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="px-3 py-1.5 text-sm text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-slate-800 rounded-lg cursor-not-allowed"
          >
            Previous
          </button>
          <button
            disabled
            className="px-3 py-1.5 text-sm text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-slate-800 rounded-lg cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </TableContainer>
  );
};
