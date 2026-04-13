"use client";

import React from "react";
import { EnvelopeIcon, CalendarIcon, ViewfinderCircleIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from "@heroicons/react/16/solid";
import { AdminTraderView } from "@/types/admin";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface TraderDetailCardProps {
  trader: AdminTraderView;
}

const StatusBadge = ({ status }: { status: AdminTraderView["accountStatus"] }) => {
  const config = {
    active: { icon: CheckCircleIcon, color: "text-green-600", bg: "bg-green-100" },
    frozen: { icon: ClockIcon, color: "text-blue-600", bg: "bg-blue-100" },
    suspended: { icon: ExclamationTriangleIcon, color: "text-amber-600", bg: "bg-amber-100" },
    closed: { icon: XCircleIcon, color: "text-gray-600", bg: "bg-gray-100" },
  };

  const { icon: Icon, color, bg } = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full capitalize",
        bg,
        color
      )}
    >
      <Icon className="h-4 w-4" />
      {status}
    </span>
  );
};

const KYCBadge = ({ status }: { status: AdminTraderView["kycStatus"] }) => {
  const config = {
    pending: { color: "text-amber-600", bg: "bg-amber-100" },
    approved: { color: "text-green-600", bg: "bg-green-100" },
    rejected: { color: "text-red-600", bg: "bg-red-100" },
    expired: { color: "text-gray-600", bg: "bg-gray-100" },
  };

  const { color, bg } = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full capitalize",
        bg,
        color
      )}
    >
      KYC: {status}
    </span>
  );
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const TraderDetailCard = ({ trader }: TraderDetailCardProps) => {
  const pnl = trader.accountBalance - trader.startingBalance;
  const pnlPercent = (pnl / trader.startingBalance) * 100;
  const profitTargetProgress = (trader.currentProfit / trader.profitTarget) * 100;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
              {trader.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {trader.username}
              </h2>
              <div className="flex items-center gap-2 text-gray-500 mt-1">
                <EnvelopeIcon className="h-4 w-4" />
                <span className="text-sm">{trader.email}</span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-1">
                ID: {trader.userId}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={trader.accountStatus} />
            <KYCBadge status={trader.kycStatus} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-6 border-b border-gray-200">
        {/* Account Balance */}
        <div>
          <p className="text-sm text-gray-500">Account Balance</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(trader.accountBalance)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            of {formatCurrency(trader.accountSize)}
          </p>
        </div>

        {/* P&L */}
        <div>
          <p className="text-sm text-gray-500">Total P&L</p>
          <p
            className={cn(
              "text-2xl font-bold mt-1",
              pnl >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {pnl >= 0 ? "+" : ""}
            {formatCurrency(pnl)}
          </p>
          <div
            className={cn(
              "flex items-center gap-1 text-xs mt-1",
              pnl >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {pnl >= 0 ? (
              <ArrowTrendingUpIcon className="h-3 w-3" />
            ) : (
              <ArrowTrendingDownIcon className="h-3 w-3" />
            )}
            {pnl >= 0 ? "+" : ""}
            {pnlPercent.toFixed(2)}%
          </div>
        </div>

        {/* Account Phase */}
        <div>
          <p className="text-sm text-gray-500">Account Phase</p>
          <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
            {trader.accountPhase.replace("_", " ")}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {trader.tradingDaysCompleted} / {trader.tradingDaysRequired} days
          </p>
        </div>

        {/* Risk Score */}
        <div>
          <p className="text-sm text-gray-500">Risk Score</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  trader.riskScore <= 33
                    ? "bg-green-500"
                    : trader.riskScore <= 66
                    ? "bg-amber-500"
                    : "bg-red-500"
                )}
                style={{ width: `${trader.riskScore}%` }}
              />
            </div>
            <span className="text-lg font-bold text-gray-900">
              {trader.riskScore}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Challenge Progress
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profit ViewfinderCircleIcon */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Profit Target</span>
              <span className="text-sm font-medium">
                {(trader.currentProfit * 100).toFixed(2)}% /{" "}
                {(trader.profitTarget * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  profitTargetProgress >= 100 ? "bg-green-500" : "bg-indigo-500"
                )}
                style={{ width: `${Math.min(profitTargetProgress, 100)}%` }}
              />
            </div>
          </div>

          {/* Daily Drawdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Daily Drawdown</span>
              <span className="text-sm font-medium">
                {(trader.currentDailyDrawdown * 100).toFixed(2)}% /{" "}
                {(trader.dailyDrawdownLimit * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  trader.currentDailyDrawdown >= trader.dailyDrawdownLimit * 0.8
                    ? "bg-red-500"
                    : trader.currentDailyDrawdown >= trader.dailyDrawdownLimit * 0.5
                    ? "bg-amber-500"
                    : "bg-green-500"
                )}
                style={{
                  width: `${Math.min(
                    (trader.currentDailyDrawdown / trader.dailyDrawdownLimit) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Max Drawdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Max Drawdown</span>
              <span className="text-sm font-medium">
                {(trader.currentMaxDrawdown * 100).toFixed(2)}% /{" "}
                {(trader.maxDrawdownLimit * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  trader.currentMaxDrawdown >= trader.maxDrawdownLimit * 0.8
                    ? "bg-red-500"
                    : trader.currentMaxDrawdown >= trader.maxDrawdownLimit * 0.5
                    ? "bg-amber-500"
                    : "bg-green-500"
                )}
                style={{
                  width: `${Math.min(
                    (trader.currentMaxDrawdown / trader.maxDrawdownLimit) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="p-6 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div>
            <p className="text-gray-500">Created</p>
            <div className="flex items-center gap-1.5 mt-1 text-gray-900">
              <CalendarIcon className="h-4 w-4 text-gray-400" />
              {formatDate(trader.createdAt)}
            </div>
          </div>
          <div>
            <p className="text-gray-500">Last Active</p>
            <div className="flex items-center gap-1.5 mt-1 text-gray-900">
              <ClockIcon className="h-4 w-4 text-gray-400" />
              {formatDate(trader.lastActiveAt)}
            </div>
          </div>
          <div>
            <p className="text-gray-500">Win Rate</p>
            <p className="mt-1 font-medium text-gray-900">
              {(trader.winRate * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-gray-500">Total Paid Out</p>
            <p className="mt-1 font-medium text-gray-900">
              {formatCurrency(trader.totalPaidOut)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
