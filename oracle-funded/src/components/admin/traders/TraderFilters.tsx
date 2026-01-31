"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronDown } from "lucide-react";
import { TraderFilters as TraderFiltersType } from "@/types/admin";
import { cn } from "@/lib/utils";

interface TraderFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: TraderFiltersType;
  onFiltersChange: (filters: TraderFiltersType) => void;
}

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "frozen", label: "Frozen" },
  { value: "suspended", label: "Suspended" },
  { value: "closed", label: "Closed" },
];

const kycOptions = [
  { value: "", label: "All KYC" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const phaseOptions = [
  { value: "", label: "All Phases" },
  { value: "evaluation_1", label: "Evaluation 1" },
  { value: "evaluation_2", label: "Evaluation 2" },
  { value: "funded", label: "Funded" },
];

const riskOptions = [
  { value: "", label: "All Risk" },
  { value: "low", label: "Low Risk" },
  { value: "medium", label: "Medium Risk" },
  { value: "high", label: "High Risk" },
];

// Animated select wrapper for smoother visual feedback
const AnimatedSelect = ({
  value,
  onChange,
  options,
  isActive,
  className,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  isActive: boolean;
  className?: string;
}) => {
  return (
    <div className="relative">
      <motion.select
        value={value}
        onChange={onChange}
        initial={false}
        animate={{
          backgroundColor: isActive ? "rgb(238 242 255)" : "rgb(255 255 255)",
          borderColor: isActive ? "rgb(165 180 252)" : "rgb(229 231 235)",
        }}
        transition={{ duration: 0.2 }}
        className={cn(
          "appearance-none px-4 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer transition-shadow",
          className
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </motion.select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  );
};

export const TraderFilters = ({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
}: TraderFiltersProps) => {
  const hasActiveFilters = Object.values(filters).some((v) => v);

  const clearFilters = () => {
    onFiltersChange({});
    onSearchChange("");
  };

  const activeFilterCount =
    (filters.status ? 1 : 0) +
    (filters.kycStatus ? 1 : 0) +
    (filters.accountPhase ? 1 : 0) +
    (filters.riskLevel ? 1 : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
    >
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors group-focus-within:text-indigo-500" />
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <AnimatedSelect
            value={filters.status || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                status: (e.target.value as TraderFiltersType["status"]) || undefined,
              })
            }
            options={statusOptions}
            isActive={!!filters.status}
          />

          {/* KYC Filter */}
          <AnimatedSelect
            value={filters.kycStatus || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                kycStatus: (e.target.value as TraderFiltersType["kycStatus"]) || undefined,
              })
            }
            options={kycOptions}
            isActive={!!filters.kycStatus}
          />

          {/* Phase Filter */}
          <AnimatedSelect
            value={filters.accountPhase || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                accountPhase: (e.target.value as TraderFiltersType["accountPhase"]) || undefined,
              })
            }
            options={phaseOptions}
            isActive={!!filters.accountPhase}
          />

          {/* Risk Filter */}
          <AnimatedSelect
            value={filters.riskLevel || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                riskLevel: (e.target.value as TraderFiltersType["riskLevel"]) || undefined,
              })
            }
            options={riskOptions}
            isActive={!!filters.riskLevel}
          />

          {/* Clear Filters */}
          <AnimatePresence>
            {(hasActiveFilters || searchQuery) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -10 }}
                transition={{ duration: 0.2 }}
                onClick={clearFilters}
                className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <X className="h-4 w-4" />
                Clear
                {activeFilterCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
