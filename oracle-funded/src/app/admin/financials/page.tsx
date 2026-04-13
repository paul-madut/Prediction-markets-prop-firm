"use client";

import React from "react";
import Link from "next/link";
import { CurrencyDollarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, CreditCardIcon, ArrowRightIcon, ClockIcon } from "@heroicons/react/16/solid";
import { useAdmin } from "@/context/AdminContext";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export default function FinancialsPage() {
  const { payoutQueue, revenueData, refundRequests, dashboardStats } = useAdmin();

  const pendingPayouts = payoutQueue.filter((p) => p.status === "pending");
  const pendingRefunds = refundRequests.filter((r) => r.status === "pending");

  // Calculate revenue metrics
  const todayRevenue = revenueData[0];
  const thisMonthRevenue = revenueData.reduce(
    (sum, r) => sum + r.netRevenue,
    0
  );
  const totalChallengeFees = revenueData.reduce(
    (sum, r) => sum + r.challengeFees,
    0
  );
  const totalProfitShare = revenueData.reduce(
    (sum, r) => sum + r.profitShare,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Financial Operations
              </h1>
              <p className="text-gray-500 mt-1">
                Revenue, payouts, and financial management
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Today&apos;s Net Revenue</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(todayRevenue?.netRevenue || 0)}
          </p>
          <div
            className={cn(
              "flex items-center gap-1 text-sm mt-2",
              (todayRevenue?.netRevenue || 0) >= 0
                ? "text-green-600"
                : "text-red-600"
            )}
          >
            {(todayRevenue?.netRevenue || 0) >= 0 ? (
              <ArrowTrendingUpIcon className="h-4 w-4" />
            ) : (
              <ArrowTrendingDownIcon className="h-4 w-4" />
            )}
            vs yesterday
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">This Month</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(thisMonthRevenue)}
          </p>
          <p className="text-sm text-gray-500 mt-2">Net Revenue</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Challenge Fees</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {formatCurrency(totalChallengeFees)}
          </p>
          <p className="text-sm text-gray-500 mt-2">This month</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Profit Share</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {formatCurrency(totalProfitShare)}
          </p>
          <p className="text-sm text-gray-500 mt-2">Firm&apos;s share</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Payouts Card */}
        <Link
          href="/admin/financials/payouts"
          className="block bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between">
            <div className="p-3 bg-amber-100 rounded-xl">
              <ClockIcon className="h-6 w-6 text-amber-600" />
            </div>
            {pendingPayouts.length > 0 && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-semibold rounded-full">
                {pendingPayouts.length} pending
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4 group-hover:text-indigo-600 transition-colors">
            Payout Queue
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {formatCurrency(dashboardStats.pendingPayoutAmount)} awaiting
            approval
          </p>
          <div className="flex items-center gap-1 text-indigo-600 text-sm font-medium mt-4 group-hover:gap-2 transition-all">
            Review payouts <ArrowRightIcon className="h-4 w-4" />
          </div>
        </Link>

        {/* Pending Refunds Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="p-3 bg-red-100 rounded-xl">
              <CreditCardIcon className="h-6 w-6 text-red-600" />
            </div>
            {pendingRefunds.length > 0 && (
              <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
                {pendingRefunds.length} pending
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">
            Refund Requests
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {formatCurrency(
              pendingRefunds.reduce((sum, r) => sum + r.amount, 0)
            )}{" "}
            requested
          </p>
          <button className="flex items-center gap-1 text-indigo-600 text-sm font-medium mt-4 hover:gap-2 transition-all">
            Process refunds <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Revenue Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Daily Revenue Report
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                  Challenge Fees
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                  Profit Share
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                  Reset Fees
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                  Payouts
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                  Net Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {revenueData.map((record) => (
                <tr key={record.recordId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(record.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-green-600">
                    +{formatCurrency(record.challengeFees)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-green-600">
                    +{formatCurrency(record.profitShare)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-green-600">
                    +{formatCurrency(record.resetFees)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-red-600">
                    -{formatCurrency(record.payoutsProcessed)}
                  </td>
                  <td
                    className={cn(
                      "px-6 py-4 text-sm text-right font-semibold",
                      record.netRevenue >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {record.netRevenue >= 0 ? "+" : ""}
                    {formatCurrency(record.netRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
