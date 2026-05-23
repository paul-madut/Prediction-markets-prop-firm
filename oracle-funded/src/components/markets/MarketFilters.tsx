"use client";

import React from "react";
import { motion } from "framer-motion";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { springs } from "./motion";

interface MarketFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const categories = [
  "All",
  "Crypto",
  "Politics",
  "Sports",
  "Economics",
  "Tech",
  "Culture",
  "Other",
];

export const MarketFilters = ({
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: MarketFiltersProps) => {
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
        <input
          type="text"
          placeholder="Search markets..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-11 pl-10 pr-4 text-[14px] bg-white/[0.04] focus:bg-white/[0.06] border border-transparent rounded-lg text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-[#7F24FF]/45 transition-colors"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {categories.map((category) => {
          const active = selectedCategory === category;
          return (
            <motion.button
              key={category}
              type="button"
              whileTap={{ scale: 0.97 }}
              transition={springs.snappy}
              onClick={() => onCategoryChange(category)}
              className={cn(
                "px-3.5 h-9 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors",
                active
                  ? "bg-[#7F24FF]/[0.18] text-[#A769FF]"
                  : "bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white",
              )}
            >
              {category}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
