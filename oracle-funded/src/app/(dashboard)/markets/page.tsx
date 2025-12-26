"use client";

import React, { useState, useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { Market } from "@/types";
import { MarketFilters } from "@/components/markets/MarketFilters";
import { MarketCard, MarketModal } from "@/components/markets/ExpandableMarketCard";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { X } from "lucide-react";

export default function MarketsPage() {
  const { markets } = useApp();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMarket, setActiveMarket] = useState<Market | null>(null);
  const id = useId();
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
        {/* Page Header */}
        <p className="text-gray-500">
          Browse and trade on {markets.length} prediction markets
        </p>

        {/* Filters */}
        <MarketFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Markets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMarkets.map((market) => (
            <MarketCard
              key={market.ticker}
              market={market}
              layoutId={`card-${market.ticker}-${id}`}
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
      </div>

      {/* Modal Overlay */}
      <AnimatePresence>
        {activeMarket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
        )}
      </AnimatePresence>

      {/* Modal Content */}
      <AnimatePresence>
        {activeMarket && (
          <div className="fixed inset-0 grid place-items-center z-[100] p-4">
            {/* Close Button for Mobile */}
            <motion.button
              key={`button-${activeMarket.ticker}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="flex absolute top-4 right-4 lg:hidden items-center justify-center bg-white rounded-full h-10 w-10 shadow-lg z-[110]"
              onClick={() => setActiveMarket(null)}
            >
              <X className="h-5 w-5 text-gray-700" />
            </motion.button>

            {/* Close Button for Desktop */}
            <motion.button
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="hidden lg:flex absolute top-4 right-4 items-center justify-center bg-white rounded-full h-10 w-10 shadow-lg z-[110] hover:bg-gray-100 transition-colors"
              onClick={() => setActiveMarket(null)}
            >
              <X className="h-5 w-5 text-gray-700" />
            </motion.button>

            <div ref={ref}>
              <MarketModal
                market={activeMarket}
                layoutId={`card-${activeMarket.ticker}-${id}`}
                onClose={() => setActiveMarket(null)}
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
