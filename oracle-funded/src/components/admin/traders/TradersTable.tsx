"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, MoreHorizontal } from "lucide-react";
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
      <span className="text-xs font-medium text-gray-600">{score}</span>
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

export const TradersTable = ({ traders, isLoading = false }: TradersTableProps) => {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Show loading skeleton
  if (isLoading) {
    return <TableSkeleton rows={8} columns={9} />;
  }

  // Show empty state
  if (traders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200">
        <TradersEmptyState />
      </div>
    );
  }

  return (
    <TableContainer maxHeight="calc(100vh - 340px)">
      <table className="w-full">
        <StickyTableHeader>
          <tr className="border-b border-gray-200">
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
              Trader
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
              Status
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
              Phase
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
              Balance
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
              P&L
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
              KYC
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
              Risk
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
              Last Active
            </th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
              Actions
            </th>
          </tr>
        </StickyTableHeader>
        <tbody className="divide-y divide-gray-200">
          <AnimatePresence mode="popLayout">
            {traders.map((trader, index) => {
              const pnl = trader.accountBalance - trader.startingBalance;
              const pnlPercent = (pnl / trader.startingBalance) * 100;
              const isHovered = hoveredRow === trader.userId;

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
                    isHovered ? "bg-indigo-50/50" : "hover:bg-gray-50/80"
                  )}
                >
                  {/* Trader Info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm">
                        {trader.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          href={`/admin/traders/${trader.userId}`}
                          className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                        >
                          {trader.username}
                        </Link>
                        <p className="text-sm text-gray-500">{trader.email}</p>
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
                    <p className="font-medium text-gray-900">
                      {formatCurrency(trader.accountBalance)}
                    </p>
                    <p className="text-xs text-gray-500">
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
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(trader.lastActiveAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <RowActions>
                      <ActionButton
                        href={`/admin/traders/${trader.userId}`}
                        icon={ExternalLink}
                        title="View Details"
                        variant="primary"
                      />
                      <ActionButton
                        icon={MoreHorizontal}
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
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-white sticky bottom-0">
        <p className="text-sm text-gray-500">
          Showing {traders.length} trader{traders.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="px-3 py-1.5 text-sm text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed"
          >
            Previous
          </button>
          <button
            disabled
            className="px-3 py-1.5 text-sm text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </TableContainer>
  );
};
