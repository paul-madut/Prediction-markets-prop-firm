"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { UserIcon, CurrencyDollarIcon, ExclamationTriangleIcon, ShieldCheckIcon, Cog6ToothIcon, ArrowRightEndOnRectangleIcon, XCircleIcon, CheckCircleIcon, ArrowRightIcon, SignalIcon } from "@heroicons/react/16/solid";
import { useAdmin } from "@/context/AdminContext";
import { cn } from "@/lib/utils";

const getActionIcon = (action: string) => {
  if (action.includes("login")) return <ArrowRightEndOnRectangleIcon className="h-4 w-4" />;
  if (action.includes("freeze") || action.includes("reject"))
    return <XCircleIcon className="h-4 w-4" />;
  if (action.includes("approve") || action.includes("unfreeze"))
    return <CheckCircleIcon className="h-4 w-4" />;
  if (action.includes("trader")) return <UserIcon className="h-4 w-4" />;
  if (action.includes("payout") || action.includes("refund"))
    return <CurrencyDollarIcon className="h-4 w-4" />;
  if (action.includes("risk") || action.includes("breach"))
    return <ExclamationTriangleIcon className="h-4 w-4" />;
  if (action.includes("kyc") || action.includes("fraud"))
    return <ShieldCheckIcon className="h-4 w-4" />;
  if (action.includes("challenge") || action.includes("config"))
    return <Cog6ToothIcon className="h-4 w-4" />;
  return <Cog6ToothIcon className="h-4 w-4" />;
};

const getActionColor = (action: string) => {
  if (action.includes("approve") || action.includes("unfreeze"))
    return "bg-green-100 text-green-600";
  if (action.includes("reject") || action.includes("freeze") || action.includes("breach"))
    return "bg-red-100 text-red-600";
  if (action.includes("risk") || action.includes("alert"))
    return "bg-amber-100 text-amber-600";
  return "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300";
};

const formatAction = (action: string): string => {
  const parts = action.split(".");
  if (parts.length === 2) {
    const [resource, verb] = parts;
    const formattedVerb = verb
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    const formattedResource = resource.charAt(0).toUpperCase() + resource.slice(1);
    return `${formattedResource} ${formattedVerb}`;
  }
  return action.replace(/\./g, " ").replace(/_/g, " ");
};

const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1] as const, // easeOut curve
    },
  },
};

export const RecentActivityFeed = () => {
  const { auditLogs } = useAdmin();
  const recentLogs = auditLogs.slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm"
    >
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <SignalIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Latest admin actions and system events</p>
          </div>
        </div>
      </div>

      <motion.div
        className="divide-y divide-gray-100 dark:divide-slate-800"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {recentLogs.map((log, index) => (
            <motion.div
              key={log.logId}
              variants={itemVariants}
              className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-150"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className={cn(
                    "p-2 rounded-lg flex-shrink-0",
                    getActionColor(log.action)
                  )}
                >
                  {getActionIcon(log.action)}
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatAction(log.action)}
                    </p>
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs rounded-full",
                        log.outcome === "success"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {log.outcome}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    by {log.actorName} ({log.actorRole.replace("_", " ")})
                  </p>
                  {log.resourceId && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                      {log.resource}: {log.resourceId}
                    </p>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {formatTimeAgo(log.timestamp)}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* View All Link */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
        <Link
          href="/admin/audit"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 group"
        >
          View all activity
          <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </motion.div>
  );
};
