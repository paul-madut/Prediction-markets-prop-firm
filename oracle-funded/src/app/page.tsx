"use client";

import React from "react";
import { EquityDisplay } from "@/components/dashboard/EquityDisplay";
import { EquityChart } from "@/components/dashboard/EquityChart";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { TradingHistoryTable } from "@/components/dashboard/TradingHistoryTable";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Track your challenge progress and performance</p>
      </div>

      {/* Equity Display */}
      <EquityDisplay />

      {/* Stats Grid */}
      <StatsGrid />

      {/* Equity Chart */}
      <EquityChart />

      {/* Trading History */}
      <TradingHistoryTable />
    </div>
  );
}
