"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Event, Market } from "@/types";
import { api, ApiError } from "@/lib/api-client";
import { MarketFilters } from "@/components/markets/MarketFilters";
import { MarketCard } from "@/components/markets/ExpandableMarketCard";
import { MarketCardSkeleton } from "@/components/markets/MarketCardSkeleton";
import { SortDropdown, SortOption } from "@/components/markets/SortDropdown";
import { springs } from "@/components/markets/motion";
import { useTickEvery } from "@/hooks/useTickEvery";
import { walkCents, seedFromString } from "@/lib/priceWalk";
import { useApp } from "@/context/AppContext";

type MarketSort = "trending" | "newest" | "volume" | "closing";
const MARKET_SORT_OPTIONS: SortOption<MarketSort>[] = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "volume", label: "Highest volume" },
  { value: "closing", label: "Closing soon" },
];

export default function MarketsPage() {
  const { user } = useApp();
  // Firm-wide sidedness threshold. With threshold N>0, outcomes whose
  // yes_ask is <=N or >=100-N are hidden. N=0 disables the filter.
  // Source of truth lives on firms.one_sided_threshold_pct; this UI
  // hide is paired with a fillOrder backstop for security.
  const threshold = user?.firm?.oneSidedThresholdPct ?? 0;

  // Live Polymarket data via /api/markets (Phase 3). The route returns
  // both the flat market list and the event envelopes; we use events.
  const [events, setEvents] = useState<Event[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [marketsError, setMarketsError] = useState<string | null>(null);
  useEffect(() => {
    api
      .get<{ events: Event[] }>("/api/markets?limit=50")
      .then((d) => setEvents(d.events ?? []))
      .catch((err) => setMarketsError(err instanceof ApiError ? err.message : String(err)))
      .finally(() => setMarketsLoading(false));
  }, []);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<MarketSort>("trending");
  const [drift, setDrift] = useState<Record<string, number>>({});

  // Apply firm sidedness threshold. threshold=0 → no filter (passes everything).
  const inRangeEvents = events
    .map((event) => ({
      ...event,
      outcomes:
        threshold > 0
          ? event.outcomes.filter(
              (o) => o.yes_ask > threshold && o.yes_ask < 100 - threshold,
            )
          : event.outcomes,
    }))
    .filter((event) => event.outcomes.length > 0);

  const filteredEvents = inRangeEvents
    .filter((event) => {
      const matchesCategory =
        selectedCategory === "All" || event.category === selectedCategory;
      const matchesSearch =
        searchQuery === "" ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.subtitle?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortKey) {
        case "newest":
          return new Date(b.open_time).getTime() - new Date(a.open_time).getTime();
        case "volume":
          return b.volume_total - a.volume_total;
        case "closing":
          return new Date(a.close_time).getTime() - new Date(b.close_time).getTime();
        case "trending":
        default:
          return b.volume_24h_total - a.volume_24h_total;
      }
    });

  const tick = useCallback(() => {
    const seedBase = (Date.now() / 2000) | 0;
    setDrift((prev) => {
      const next: Record<string, number> = {};
      for (const event of events) {
        for (const outcome of event.outcomes) {
          const cur = prev[outcome.ticker] ?? outcome.yes_ask;
          const seed = seedFromString(outcome.ticker) + seedBase;
          next[outcome.ticker] = walkCents(cur, seed, 1);
        }
      }
      return next;
    });
  }, [events]);
  useTickEvery(2000, tick);

  const eventsWithDrift = filteredEvents.map((e) => ({
    ...e,
    outcomes: e.outcomes.map((o) =>
      drift[o.ticker] !== undefined
        ? {
            ...o,
            yes_ask: drift[o.ticker],
            yes_bid: Math.max(1, drift[o.ticker] - 1),
            no_bid: Math.max(1, 100 - drift[o.ticker] - 1),
            no_ask: Math.min(99, 100 - drift[o.ticker]),
          }
        : o,
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1">
          <MarketFilters
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
        <SortDropdown options={MARKET_SORT_OPTIONS} value={sortKey} onChange={setSortKey} />
      </div>

      {marketsError && (
        <div className="bg-[#FF1C1C]/[0.14] border border-[#FF1C1C]/30 rounded-xl px-4 py-3 text-[13px] text-[#FF1C1C]">
          Failed to load markets: {marketsError}
        </div>
      )}

      {/* Skeleton → content cross-fade per DESIGN.md › Skeleton → content.
          Skeleton fades out 200ms; real content fades in 250ms with y:4→0. */}
      <AnimatePresence mode="wait">
        {marketsLoading ? (
          <motion.div
            key="skeleton-grid"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {Array.from({ length: 9 }).map((_, i) => (
              <MarketCardSkeleton key={i} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="markets-grid"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {eventsWithDrift.map((event, i) => (
                  <motion.div
                    key={event.eventTicker}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      ...springs.responsive,
                      // Cap stagger at 8 cards (DESIGN.md › List stagger).
                      delay: Math.min(i * 0.03, 0.24),
                    }}
                  >
                    <Link
                      href={`/dashboard/markets/${event.eventTicker}`}
                      className="block h-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45"
                    >
                      <MarketCard event={event} onClick={() => {}} />
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {filteredEvents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-white/55 text-[14px]">
                  No markets found matching your criteria
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export type { Market };
