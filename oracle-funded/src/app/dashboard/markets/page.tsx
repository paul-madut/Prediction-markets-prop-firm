"use client";

import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { Market } from "@/types";
import { MarketFilters } from "@/components/markets/MarketFilters";
import { MarketCard, MarketModal } from "@/components/markets/ExpandableMarketCard";
import { MarketCardSkeleton } from "@/components/markets/MarketCardSkeleton";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { X } from "lucide-react";

export default function MarketsPage() {
  const { markets, marketsLoading } = useApp();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMarket, setActiveMarket] = useState<Market | null>(null);
  const ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveMarket(null);
      }
    }

    if (activeMarket) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeMarket]);

  useOutsideClick(ref, () => setActiveMarket(null));

  return (
    <>
      <div className="space-y-6">
        {/* Filters */}
        <MarketFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Markets Grid */}
        {marketsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <MarketCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMarkets.map((market) => (
                <MarketCard
                  key={market.ticker}
                  market={market}
                  onClick={() => setActiveMarket(market)}
                />
              ))}
            </div>

            {/* Empty State */}
            {filteredMarkets.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  No markets found matching your criteria
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {activeMarket && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setActiveMarket(null)}
            />
            <div className="fixed inset-0 grid place-items-center z-[100] p-2 sm:p-4">
              <button
                className="flex absolute top-3 right-3 sm:top-4 sm:right-4 items-center justify-center bg-white rounded-full h-10 w-10 shadow-lg z-[110] hover:bg-gray-100 transition-colors"
                onClick={() => setActiveMarket(null)}
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>

              <div ref={ref} className="w-full max-w-2xl">
                <MarketModal
                  market={activeMarket}
                  onClose={() => setActiveMarket(null)}
                />
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
