"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard = ({ title, value, subValue, icon, iconBg, trend }: StatCardProps) => (
  <motion.div
    className={cn(
      "bg-white rounded-xl border border-gray-200 p-6",
      "shadow-sm hover:shadow-md",
      "transition-shadow duration-200 ease-out",
      "cursor-default"
    )}
    whileHover={{ scale: 1.02, y: -2 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
        {trend && (
          <p
            className={cn(
              "text-sm mt-2",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}% from yesterday
          </p>
        )}
      </div>
      <div className={cn("p-3 rounded-xl", iconBg)}>{icon}</div>
    </div>
  </motion.div>
);

// Container animation variants for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

// Individual card animation variants
const itemVariants = {
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

export const AdminStatsGrid = () => {
  const { dashboardStats } = useAdmin();

  const stats = [
    {
      title: "Active Traders",
      value: dashboardStats.activeTraders,
      subValue: `${dashboardStats.totalTraders} total`,
      icon: <Users className="h-6 w-6 text-blue-600" />,
      iconBg: "bg-blue-100",
    },
    {
      title: "Revenue Today",
      value: formatCurrency(dashboardStats.revenueToday),
      subValue: `${formatCurrency(dashboardStats.revenueThisMonth)} this month`,
      icon: <DollarSign className="h-6 w-6 text-green-600" />,
      iconBg: "bg-green-100",
    },
    {
      title: "Pending Payouts",
      value: dashboardStats.pendingPayouts,
      subValue: formatCurrency(dashboardStats.pendingPayoutAmount),
      icon: <Clock className="h-6 w-6 text-amber-600" />,
      iconBg: "bg-amber-100",
    },
    {
      title: "Active Alerts",
      value: dashboardStats.activeAlerts,
      subValue: `${dashboardStats.highRiskAccounts} high-risk accounts`,
      icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      iconBg: "bg-red-100",
    },
    {
      title: "Active Challenges",
      value: dashboardStats.activeChallenges,
      subValue: `${dashboardStats.passedToday} passed today`,
      icon: <TrendingUp className="h-6 w-6 text-purple-600" />,
      iconBg: "bg-purple-100",
    },
    {
      title: "Pending KYC",
      value: dashboardStats.pendingKYC,
      subValue: `${dashboardStats.openFraudAlerts} fraud alerts`,
      icon: <ShieldCheck className="h-6 w-6 text-indigo-600" />,
      iconBg: "bg-indigo-100",
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {stats.map((stat, index) => (
        <motion.div key={stat.title} variants={itemVariants}>
          <StatCard {...stat} />
        </motion.div>
      ))}
    </motion.div>
  );
};
