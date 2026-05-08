"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Event, Market } from "@/types";
import { api, ApiError } from "@/lib/api-client";
import { MarketFilters } from "@/components/markets/MarketFilters";
import { MarketCard } from "@/components/markets/ExpandableMarketCard";
import { MarketCardSkeleton } from "@/components/markets/MarketCardSkeleton";
import { SortDropdown, SortOption } from "@/components/markets/SortDropdown";
import { useTickEvery } from "@/hooks/useTickEvery";
import { walkCents, seedFromString } from "@/lib/priceWalk";

type MarketSort = "trending" | "newest" | "volume" | "closing";
const MARKET_SORT_OPTIONS: SortOption<MarketSort>[] = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "volume", label: "Highest volume" },
  { value: "closing", label: "Closing soon" },
];

export default function MarketsPage() {
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

  // Trim outcomes to those priced between 10% and 90% (in either direction)
  // and drop events left with zero outcomes after the trim.
  const inRangeEvents = events
    .map((event) => ({
      ...event,
      outcomes: event.outcomes.filter((o) => o.yes_ask >= 10 && o.yes_ask <= 90),
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

      {marketsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <MarketCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventsWithDrift.map((event) => (
              <Link
                key={event.eventTicker}
                href={`/dashboard/markets/${event.eventTicker}`}
                className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
              >
                <MarketCard event={event} onClick={() => {}} />
              </Link>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No markets found matching your criteria</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export type { Market };
