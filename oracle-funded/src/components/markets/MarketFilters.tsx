"use client";

import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface MarketFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const categories = ["All", "Crypto", "Politics", "Sports", "Economics", "Tech", "Culture", "Other"];

export const MarketFilters = ({
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: MarketFiltersProps) => {
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* MagnifyingGlassIcon Bar */}
      <div className="relative">
        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-white/45" />
        <input
          type="text"
          placeholder="Search markets..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-1.5 text-sm border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7F24FF]"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category
                ? "bg-[#7F24FF] text-white"
                : "bg-[#180630] text-white/85 hover:bg-gray-100 dark:hover:bg-[#1f0a3d] border border-gray-200 dark:border-white/10"
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};
