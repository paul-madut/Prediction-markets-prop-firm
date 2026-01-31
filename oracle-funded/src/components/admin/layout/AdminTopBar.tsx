"use client";

import React from "react";
import { Bell, Search, RefreshCw } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { formatCurrency } from "@/lib/formatters";

interface AdminTopBarProps {
  title: string;
  subtitle?: string;
}

export const AdminTopBar = ({ title, subtitle }: AdminTopBarProps) => {
  const { dashboardStats, adminUser } = useAdmin();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left: Title */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      {/* Right: Stats & Actions */}
      <div className="flex items-center gap-6">
        {/* Quick Stats */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Pending Payouts:</span>
            <span className="font-semibold text-gray-900">
              {dashboardStats.pendingPayouts} ({formatCurrency(dashboardStats.pendingPayoutAmount)})
            </span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Active Traders:</span>
            <span className="font-semibold text-gray-900">{dashboardStats.activeTraders}</span>
          </div>
        </div>

        {/* Search */}
        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Search className="h-5 w-5" />
        </button>

        {/* Refresh */}
        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <RefreshCw className="h-5 w-5" />
        </button>

        {/* Notifications */}
        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative">
          <Bell className="h-5 w-5" />
          {(dashboardStats.activeAlerts > 0 || dashboardStats.pendingKYC > 0) && (
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          )}
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
            {adminUser?.name.charAt(0).toUpperCase() || "A"}
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-medium text-gray-900">{adminUser?.name}</p>
            <p className="text-xs text-gray-500 capitalize">
              {adminUser?.role.replace("_", " ")}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
