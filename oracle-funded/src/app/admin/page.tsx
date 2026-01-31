"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  DollarSign,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Inbox,
  CheckCircle2,
} from "lucide-react";
import { AdminStatsGrid } from "@/components/admin/dashboard/AdminStatsGrid";
import { RecentActivityFeed } from "@/components/admin/dashboard/RecentActivityFeed";
import { useAdmin } from "@/context/AdminContext";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

// Skeleton loading component
const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "animate-pulse bg-gray-200 rounded",
      className
    )}
  />
);

// Quick action card skeleton
const QuickActionCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
    <div className="flex items-start justify-between">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <Skeleton className="h-6 w-8 rounded-full" />
    </div>
    <Skeleton className="h-5 w-32 mt-4" />
    <Skeleton className="h-4 w-48 mt-2" />
    <Skeleton className="h-4 w-24 mt-4" />
  </div>
);

// Quick action card component with improved animations
const QuickActionCard = ({
  title,
  description,
  href,
  icon,
  iconBg,
  count,
  countColor,
  isLoading = false,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  count?: number;
  countColor?: string;
  isLoading?: boolean;
}) => {
  if (isLoading) {
    return <QuickActionCardSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Link
        href={href}
        className={cn(
          "block bg-white rounded-xl border border-gray-200 p-6",
          "shadow-sm hover:shadow-lg hover:border-indigo-300",
          "transition-all duration-200 ease-out group"
        )}
      >
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="flex items-start justify-between">
            <div className={cn("p-3 rounded-xl transition-transform duration-200 group-hover:scale-110", iconBg)}>
              {icon}
            </div>
            {count !== undefined && count > 0 && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "px-3 py-1 text-sm font-semibold rounded-full",
                  countColor || "bg-gray-100 text-gray-700"
                )}
              >
                {count}
              </motion.span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4 group-hover:text-indigo-600 transition-colors duration-200">
            {title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
          <div className="flex items-center gap-1 text-indigo-600 text-sm font-medium mt-4 overflow-hidden">
            <span>View details</span>
            <motion.div
              className="inline-flex"
              initial={{ x: 0 }}
              whileHover={{ x: 0 }}
            >
              <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1" />
            </motion.div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
};

// Risk alert preview component with pulse animation for critical alerts
const RiskAlertPreview = () => {
  const { riskAlerts } = useAdmin();
  const criticalAlerts = riskAlerts.filter(
    (a) => !a.resolved && (a.severity === "critical" || a.severity === "high")
  );

  if (criticalAlerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm"
      >
        <div className="flex flex-col items-center text-center py-4">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="p-4 bg-green-100 rounded-full mb-4"
          >
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </motion.div>
          <p className="font-semibold text-green-800 text-lg">All Clear</p>
          <p className="text-sm text-green-600 mt-1">
            No critical risk alerts at this time
          </p>
          <Link
            href="/admin/risk"
            className="text-sm font-medium text-green-700 hover:text-green-800 mt-4 inline-flex items-center gap-1 group"
          >
            View risk dashboard
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
    >
      <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [1, 0.8, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </motion.div>
          <h3 className="font-semibold text-red-800">
            {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? "s" : ""}
          </h3>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        <AnimatePresence>
          {criticalAlerts.slice(0, 3).map((alert, index) => (
            <motion.div
              key={alert.alertId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {alert.traderName}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{alert.message}</p>
                </div>
                <span
                  className={cn(
                    "px-2 py-1 text-xs font-medium rounded-full ml-3 flex-shrink-0",
                    alert.severity === "critical"
                      ? "bg-red-100 text-red-700 animate-pulse"
                      : "bg-amber-100 text-amber-700"
                  )}
                >
                  {alert.severity}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <Link
          href="/admin/risk"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 group"
        >
          View all alerts
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </motion.div>
  );
};

// Payout skeleton loading
const PayoutItemSkeleton = () => (
  <div className="px-6 py-4">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-20" />
    </div>
  </div>
);

// Pending payouts preview with skeleton loading and improved empty state
const PendingPayoutsPreview = ({ isLoading = false }: { isLoading?: boolean }) => {
  const { payoutQueue } = useAdmin();
  const pendingPayouts = payoutQueue.filter((p) => p.status === "pending");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
    >
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Pending Payouts</h3>
        <p className="text-sm text-gray-500">
          {isLoading ? (
            <Skeleton className="h-4 w-32 mt-1" />
          ) : (
            `${pendingPayouts.length} awaiting approval`
          )}
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {isLoading ? (
          <>
            <PayoutItemSkeleton />
            <PayoutItemSkeleton />
            <PayoutItemSkeleton />
          </>
        ) : pendingPayouts.length === 0 ? (
          <div className="px-6 py-10 flex flex-col items-center text-center">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <Inbox className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No pending payouts</p>
            <p className="text-sm text-gray-400 mt-1">
              All payout requests have been processed
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {pendingPayouts.slice(0, 3).map((payout, index) => (
              <motion.div
                key={payout.payoutId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {payout.traderName}
                    </p>
                    <p className="text-xs text-gray-500">{payout.paymentMethod}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(payout.amount)}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <Link
          href="/admin/financials/payouts"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 group"
        >
          View all payouts
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </motion.div>
  );
};

// Container animation for quick actions
const quickActionsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const quickActionItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as const, // easeOut curve
    },
  },
};

export default function AdminDashboardPage() {
  const { dashboardStats, revenueData } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial load
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Calculate revenue trend
  const todayRevenue = revenueData[0]?.netRevenue || 0;
  const yesterdayRevenue = revenueData[1]?.netRevenue || 0;
  const revenueTrend =
    yesterdayRevenue !== 0
      ? ((todayRevenue - yesterdayRevenue) / Math.abs(yesterdayRevenue)) * 100
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6 mb-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Overview of your prop firm operations
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Today&apos;s Net Revenue</p>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency(todayRevenue)}
              </span>
              {revenueTrend !== 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className={cn(
                    "flex items-center text-sm font-medium",
                    revenueTrend > 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {revenueTrend > 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(revenueTrend).toFixed(1)}%
                </motion.span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <AdminStatsGrid />

      {/* Quick Actions */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={quickActionsContainerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={quickActionItemVariants}>
          <QuickActionCard
            title="Manage Traders"
            description="View, search, and manage trader accounts"
            href="/admin/traders"
            icon={<Users className="h-6 w-6 text-blue-600" />}
            iconBg="bg-blue-100"
            count={dashboardStats.frozenTraders}
            countColor="bg-red-100 text-red-700"
            isLoading={isLoading}
          />
        </motion.div>
        <motion.div variants={quickActionItemVariants}>
          <QuickActionCard
            title="Payout Queue"
            description="Review and approve pending payouts"
            href="/admin/financials/payouts"
            icon={<DollarSign className="h-6 w-6 text-green-600" />}
            iconBg="bg-green-100"
            count={dashboardStats.pendingPayouts}
            countColor="bg-amber-100 text-amber-700"
            isLoading={isLoading}
          />
        </motion.div>
        <motion.div variants={quickActionItemVariants}>
          <QuickActionCard
            title="Risk Dashboard"
            description="Monitor at-risk accounts and alerts"
            href="/admin/risk"
            icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
            iconBg="bg-red-100"
            count={dashboardStats.activeAlerts}
            countColor="bg-red-100 text-red-700"
            isLoading={isLoading}
          />
        </motion.div>
        <motion.div variants={quickActionItemVariants}>
          <QuickActionCard
            title="KYC Verification"
            description="Review pending identity verifications"
            href="/admin/compliance/kyc"
            icon={<ShieldCheck className="h-6 w-6 text-indigo-600" />}
            iconBg="bg-indigo-100"
            count={dashboardStats.pendingKYC}
            countColor="bg-amber-100 text-amber-700"
            isLoading={isLoading}
          />
        </motion.div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RecentActivityFeed />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Risk Alerts */}
          <RiskAlertPreview />

          {/* Pending Payouts */}
          <PendingPayoutsPreview isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
