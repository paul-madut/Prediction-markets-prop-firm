"use client";

import React from "react";
import { Search } from "lucide-react";

interface MarketFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const categories = ["All", "Crypto", "Politics", "Sports", "Economics", "Tech", "Culture"];

export const MarketFilters = ({
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: MarketFiltersProps) => {
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search markets..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};
