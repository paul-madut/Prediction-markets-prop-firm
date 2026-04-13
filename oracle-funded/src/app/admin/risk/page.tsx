"use client";

import React from "react";
import Link from "next/link";
import { ExclamationTriangleIcon, CheckCircleIcon, ClockIcon, ArrowTrendingUpIcon, UserGroupIcon, EyeIcon } from "@heroicons/react/16/solid";
import { useAdmin } from "@/context/AdminContext";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const SeverityBadge = ({
  severity,
}: {
  severity: "low" | "medium" | "high" | "critical";
}) => {
  const styles = {
    low: "bg-green-100 text-green-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={cn(
        "px-2.5 py-1 text-xs font-medium rounded-full capitalize",
        styles[severity]
      )}
    >
      {severity}
    </span>
  );
};

const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
};

export default function RiskDashboardPage() {
  const {
    riskAlerts,
    aggregatedExposure,
    breachHistory,
    acknowledgeAlert,
    dashboardStats,
  } = useAdmin();

  const activeAlerts = riskAlerts.filter((a) => !a.resolved);
  const criticalAlerts = activeAlerts.filter(
    (a) => a.severity === "critical" || a.severity === "high"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Risk Dashboard</h1>
              <p className="text-gray-500 mt-1">
                Monitor accounts and manage risk alerts
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {criticalAlerts.length}
              </p>
              <p className="text-gray-500">Critical</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">
                {activeAlerts.length}
              </p>
              <p className="text-gray-500">Active Alerts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats.highRiskAccounts}
              </p>
              <p className="text-gray-500">High Risk</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Accounts</p>
              <p className="text-2xl font-bold text-gray-900">
                {aggregatedExposure.totalAccounts}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Exposure</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(aggregatedExposure.totalExposure)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ClockIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeAlerts.filter((a) => !a.acknowledgedAt).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Breaches (30d)</p>
              <p className="text-2xl font-bold text-gray-900">
                {breachHistory.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Alerts Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {activeAlerts.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">No active alerts</p>
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <div
                  key={alert.alertId}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(alert.createdAt)}
                        </span>
                      </div>
                      <Link
                        href={`/admin/traders/${alert.traderId}`}
                        className="font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {alert.traderName}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">
                        {alert.message}
                      </p>
                      {alert.percentageUsed > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{alert.percentageUsed}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                alert.percentageUsed >= 90
                                  ? "bg-red-500"
                                  : alert.percentageUsed >= 70
                                  ? "bg-amber-500"
                                  : "bg-green-500"
                              )}
                              style={{ width: `${alert.percentageUsed}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!alert.acknowledgedAt && (
                        <button
                          onClick={() => acknowledgeAlert(alert.alertId)}
                          className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                      <Link
                        href={`/admin/traders/${alert.traderId}`}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Exposure by Category */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Exposure by Category
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {aggregatedExposure.byCategory.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{cat.category}</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(cat.exposure)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{
                        width: `${
                          (cat.exposure / aggregatedExposure.totalExposure) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Breaches */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Breaches
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {breachHistory.slice(0, 5).map((breach) => (
                <div key={breach.breachId} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {breach.traderName}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {breach.breachType.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">
                        {breach.breachValue}%
                      </p>
                      <p className="text-xs text-gray-400">
                        limit: {breach.limitValue}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
