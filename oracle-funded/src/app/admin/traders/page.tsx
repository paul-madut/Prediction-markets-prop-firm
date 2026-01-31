"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Download } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { TraderFilters } from "@/components/admin/traders/TraderFilters";
import { TradersTable } from "@/components/admin/traders/TradersTable";
import { TraderFilters as TraderFiltersType } from "@/types/admin";

export default function TradersPage() {
  const { traders, searchTraders, dashboardStats } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<TraderFiltersType>({});

  // Filter and search traders
  const filteredTraders = useMemo(() => {
    return searchTraders(searchQuery, filters);
  }, [searchTraders, searchQuery, filters]);

  const hasFilters = searchQuery || Object.values(filters).some((v) => v);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="h-6 w-6 text-blue-600" />
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
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </motion.button>
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
      <TradersTable traders={filteredTraders} />
    </div>
  );
}
