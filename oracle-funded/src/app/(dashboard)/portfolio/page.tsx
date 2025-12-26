"use client";

import React from "react";
import { PortfolioSummary } from "@/components/portfolio/PortfolioSummary";
import { PositionsTable } from "@/components/portfolio/PositionsTable";

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
        <p className="text-gray-500">Manage your open positions</p>
      </div>

      {/* Summary Cards */}
      <PortfolioSummary />

      {/* Positions Table */}
      <PositionsTable />
    </div>
  );
}
