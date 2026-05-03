"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Squares2X2Icon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ShieldExclamationIcon,
  AdjustmentsHorizontalIcon,
  MegaphoneIcon,
  DocumentMagnifyingGlassIcon,
  BuildingOffice2Icon,
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { useAdmin } from "@/context/AdminContext";
import { cn } from "@/lib/utils";
import NotificationBell from "./NotificationBell";

const adminLinks = [
  { label: "Overview", href: "/admin", icon: <Squares2X2Icon className="h-5 w-5" /> },
  { label: "Traders", href: "/admin/traders", icon: <UserGroupIcon className="h-5 w-5" /> },
  { label: "Payouts", href: "/admin/payouts", icon: <CurrencyDollarIcon className="h-5 w-5" /> },
  { label: "Signals", href: "/admin/signals", icon: <ShieldExclamationIcon className="h-5 w-5" /> },
  { label: "Configs", href: "/admin/configs", icon: <AdjustmentsHorizontalIcon className="h-5 w-5" /> },
  { label: "News", href: "/admin/news", icon: <MegaphoneIcon className="h-5 w-5" /> },
  { label: "Audit", href: "/admin/audit", icon: <DocumentMagnifyingGlassIcon className="h-5 w-5" /> },
];

const bottomLinks = [
  { label: "Firm", href: "/admin/firm", icon: <BuildingOffice2Icon className="h-5 w-5" /> },
];

export const AdminSidebar = () => {
  const pathname = usePathname();
  const { adminUser, dashboardStats } = useAdmin();
  const [open, setOpen] = useState(true);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? 280 : 80 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen bg-slate-900 border-r border-slate-800 flex flex-col fixed left-0 top-0 z-40"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex-shrink-0"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <motion.span
            animate={{ opacity: open ? 1 : 0, width: open ? "auto" : 0 }}
            transition={{ duration: 0.2 }}
            className="font-bold text-white text-lg overflow-hidden whitespace-nowrap"
          >
            Admin Panel
          </motion.span>
        </div>
        {open && <NotificationBell compact />}
      </div>

      {/* Alert Badge */}
      {open && dashboardStats.activeAlerts > 0 && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <ShieldExclamationIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              {dashboardStats.activeAlerts} active alerts
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {adminLinks.map((link) => {
          const active = isActive(link.href);
          const showSignalBadge =
            link.href === "/admin/signals" && dashboardStats.activeAlerts > 0;
          const showPayoutBadge =
            link.href === "/admin/payouts" && dashboardStats.pendingPayouts > 0;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                active
                  ? "bg-indigo-500/10 text-indigo-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <span className={cn("flex-shrink-0", active && "text-indigo-400")}>
                {link.icon}
              </span>
              <motion.span
                animate={{ opacity: open ? 1 : 0, width: open ? "auto" : 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-medium overflow-hidden whitespace-nowrap"
              >
                {link.label}
              </motion.span>

              {showSignalBadge && (
                <motion.span
                  animate={{ opacity: open ? 1 : 0 }}
                  className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full"
                >
                  {dashboardStats.activeAlerts}
                </motion.span>
              )}

              {showPayoutBadge && (
                <motion.span
                  animate={{ opacity: open ? 1 : 0 }}
                  className="ml-auto bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full"
                >
                  {dashboardStats.pendingPayouts}
                </motion.span>
              )}

              {!open && (showSignalBadge || showPayoutBadge) && (
                <span
                  className={cn(
                    "absolute top-1 right-1 h-2 w-2 rounded-full",
                    showSignalBadge ? "bg-red-500" : "bg-amber-500"
                  )}
                />
              )}

              {active && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        {bottomLinks.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                active
                  ? "bg-indigo-500/10 text-indigo-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <span className="flex-shrink-0">{link.icon}</span>
              <motion.span
                animate={{ opacity: open ? 1 : 0, width: open ? "auto" : 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-medium overflow-hidden whitespace-nowrap"
              >
                {link.label}
              </motion.span>
            </Link>
          );
        })}

        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
        >
          <ArrowRightStartOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
          <motion.span
            animate={{ opacity: open ? 1 : 0, width: open ? "auto" : 0 }}
            transition={{ duration: 0.2 }}
            className="text-sm font-medium overflow-hidden whitespace-nowrap"
          >
            Trader Dashboard
          </motion.span>
        </Link>

        <div
          className={cn(
            "flex items-center gap-3 py-2 rounded-lg transition-colors",
            open ? "px-3" : "justify-center"
          )}
        >
          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
            {adminUser?.name.charAt(0).toUpperCase() || "A"}
          </div>
          <motion.div
            animate={{ opacity: open ? 1 : 0, width: open ? "auto" : 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-sm font-medium text-white whitespace-nowrap">
              {adminUser?.name}
            </p>
            <p className="text-xs text-slate-400 whitespace-nowrap capitalize">
              {adminUser?.role.replace("_", " ")}
            </p>
          </motion.div>
        </div>
      </div>
    </motion.aside>
  );
};
