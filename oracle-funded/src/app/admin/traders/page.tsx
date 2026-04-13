"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserGroupIcon, ArrowDownTrayIcon } from "@heroicons/react/16/solid";
import { useAdmin } from "@/context/AdminContext";
import { TraderFilters } from "@/components/admin/traders/TraderFilters";
import { TradersTable } from "@/components/admin/traders/TradersTable";
import BatchActionsBar from "@/components/admin/traders/BatchActionsBar";
import ExportButton from "@/components/admin/shared/ExportButton";
import { TraderFilters as TraderFiltersType, AdminTraderView } from "@/types/admin";
import { ExportColumn, formatCurrencyForCSV, formatDateForCSV } from "@/lib/csvExport";

export default function TradersPage() {
  const { traders, searchTraders, dashboardStats, freezeTraders, unfreezeTraders } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<TraderFiltersType>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter and search traders
  const filteredTraders = useMemo(() => {
    return searchTraders(searchQuery, filters);
  }, [searchTraders, searchQuery, filters]);

  const hasFilters = searchQuery || Object.values(filters).some((v) => v);

  // CSV export column definitions
  const exportColumns: ExportColumn<AdminTraderView>[] = [
    { key: "username", label: "Trader" },
    { key: "email", label: "Email" },
    { key: "accountStatus", label: "Status" },
    { key: "kycStatus", label: "KYC Status" },
    { key: "accountPhase", label: "Phase" },
    {
      key: "accountBalance",
      label: "Balance",
      format: (val) => formatCurrencyForCSV(val),
    },
    {
      key: "accountSize",
      label: "Account Size",
      format: (val) => formatCurrencyForCSV(val),
    },
    {
      key: "currentProfit",
      label: "Current Profit",
      format: (val) => formatCurrencyForCSV(val),
    },
    {
      key: "totalPaidOut",
      label: "Total Paid Out",
      format: (val) => formatCurrencyForCSV(val),
    },
    { key: "riskScore", label: "Risk Score" },
    {
      key: "createdAt",
      label: "Created At",
      format: (val) => formatDateForCSV(val),
    },
    {
      key: "lastActiveAt",
      label: "Last Active",
      format: (val) => formatDateForCSV(val),
    },
  ];

  // Batch action handlers
  const handleBatchFreeze = async (reason: string) => {
    const traderIds = Array.from(selectedIds);
    freezeTraders(traderIds, reason);
  };

  const handleBatchUnfreeze = async () => {
    const traderIds = Array.from(selectedIds);
    unfreezeTraders(traderIds);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Trader Management
              </h1>
              <p className="text-gray-500 mt-1">
                View and manage all trader accounts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex items-center gap-6 mr-4 text-sm">
              <div>
                <span className="text-gray-500">Total:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {dashboardStats.totalTraders}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Active:</span>
                <span className="ml-2 font-semibold text-green-600">
                  {dashboardStats.activeTraders}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Frozen:</span>
                <span className="ml-2 font-semibold text-blue-600">
                  {dashboardStats.frozenTraders}
                </span>
              </div>
            </div>

            {/* Export Button */}
            <ExportButton
              data={filteredTraders}
              filename="traders"
              columns={exportColumns}
              selectedIds={selectedIds}
              entityIdKey="userId"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <TraderFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Results count with animation */}
      <AnimatePresence>
        {hasFilters && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-gray-500"
          >
            Found{" "}
            <motion.span
              key={filteredTraders.length}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-medium text-indigo-600"
            >
              {filteredTraders.length}
            </motion.span>{" "}
            trader{filteredTraders.length !== 1 ? "s" : ""} matching your criteria
          </motion.p>
        )}
      </AnimatePresence>

      {/* Table */}
      <TradersTable
        traders={filteredTraders}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Batch Actions Bar */}
      <BatchActionsBar
        selectedCount={selectedIds.size}
        onFreeze={handleBatchFreeze}
        onUnfreeze={handleBatchUnfreeze}
        onExport={() => {
          // Export will be handled by the export button in batch actions
          const selectedTraders = filteredTraders.filter((t) =>
            selectedIds.has(t.userId)
          );
          // The ExportButton component handles this, but we can trigger it programmatically
        }}
        onClearSelection={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
