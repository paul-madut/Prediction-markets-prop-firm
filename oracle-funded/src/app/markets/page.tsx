"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Market } from "@/types";
import { MarketFilters } from "@/components/markets/MarketFilters";
import { MarketGrid } from "@/components/markets/MarketGrid";
import { TradeModal } from "@/components/markets/TradeModal";

export default function MarketsPage() {
  const { markets } = useApp();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);

  // Filter markets
  const filteredMarkets = markets.filter((market) => {
    const matchesCategory =
      selectedCategory === "All" || market.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      market.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      market.subtitle?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Markets</h1>
        <p className="text-gray-500">
          Browse and trade on {markets.length} prediction markets
        </p>
      </div>

      {/* Filters */}
      <MarketFilters
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Markets Grid */}
      <MarketGrid
        markets={filteredMarkets}
        onMarketClick={setSelectedMarket}
      />

      {/* Trade Modal */}
      {selectedMarket && (
        <TradeModal
          market={selectedMarket}
          isOpen={!!selectedMarket}
          onClose={() => setSelectedMarket(null)}
        />
      )}
    </div>
  );
}
