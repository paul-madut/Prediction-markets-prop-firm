"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { walkCents, seedFromString } from "@/lib/priceWalk";
import { useApp } from "@/context/AppContext";
import { Loader } from "@/components/ui/loader";

type MarketSort = "trending" | "newest" | "volume" | "closing";
const MARKET_SORT_OPTIONS: SortOption<MarketSort>[] = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "volume", label: "Highest volume" },
  { value: "closing", label: "Closing soon" },
];

const PAGE_SIZE = 50;

interface MarketsResponse {
  events: Event[];
  hasMore: boolean;
  error?: string;
}

export default function MarketsPage() {
  const { user } = useApp();
  // Firm-wide sidedness threshold. With threshold N>0, outcomes whose
  // yes_ask is <=N or >=100-N are hidden. N=0 disables the filter.
  // Source of truth lives on firms.one_sided_threshold_pct; this UI
  // hide is paired with a fillOrder backstop for security.
  const threshold = user?.firm?.oneSidedThresholdPct ?? 0;

  // ────────────────────── Filter / search / sort state ──────────────────────
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<MarketSort>("trending");

  // Debounce the search input so we don't fire a request on every keystroke.
  // 300ms is the spec's default and matches how the rest of the app reacts.
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  // ────────────────────── Paginated data state ──────────────────────────────
  const [events, setEvents] = useState<Event[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true); // initial fetch
  const [loadingMore, setLoadingMore] = useState(false); // appending pages
  const [error, setError] = useState<string | null>(null);

  // ────────────────────── Fetcher ───────────────────────────────────────────
  // Two-axis stale-fetch guard:
  //   1. AbortController cancels the underlying HTTP request.
  //   2. fetchTokenRef is bumped per request; only the latest token's
  //      result is allowed to mutate state. This belt-and-braces protects
  //      against AbortController not always firing before the fetch resolves
  //      (e.g. cached responses race the abort signal).
  const abortRef = useRef<AbortController | null>(null);
  const fetchTokenRef = useRef(0);

  const fetchPage = useCallback(
    async (pageOffset: number, append: boolean): Promise<void> => {
      // Cancel any in-flight request before kicking off a new one.
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const token = ++fetchTokenRef.current;

      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(null);
      }

      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(pageOffset),
        sort: sortKey,
      });
      if (selectedCategory !== "All") params.set("category", selectedCategory);
      if (debouncedQuery) params.set("q", debouncedQuery);

      try {
        const data = await api.get<MarketsResponse>(`/api/markets?${params.toString()}`, {
          signal: ctrl.signal,
        });
        if (token !== fetchTokenRef.current) return; // stale — newer request in flight

        setHasMore(Boolean(data.hasMore));
        setEvents((prev) => (append ? [...prev, ...(data.events ?? [])] : data.events ?? []));
        setOffset(pageOffset + PAGE_SIZE);
      } catch (err) {
        if (ctrl.signal.aborted) return; // explicit cancellation, not an error
        if (token !== fetchTokenRef.current) return;
        setError(err instanceof ApiError ? err.message : String(err));
        if (!append) setEvents([]);
      } finally {
        if (token === fetchTokenRef.current) {
          if (append) setLoadingMore(false);
          else setLoading(false);
        }
      }
    },
    [debouncedQuery, selectedCategory, sortKey],
  );

  // Reset + refetch whenever a filter dimension changes. Initial mount also
  // satisfies this (deps fire on mount with default values).
  useEffect(() => {
    setOffset(0);
    fetchPage(0, false);
    // Cleanup: cancel in-flight if the component unmounts mid-fetch.
    return () => abortRef.current?.abort();
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    fetchPage(offset, true);
  }, [fetchPage, hasMore, loading, loadingMore, offset]);

  // IntersectionObserver-driven auto-load. We attach to the same DOM node as
  // the "Load more" button so a single ref does double duty: clicking it is
  // the manual fallback, scrolling it into view is the automatic trigger.
  // 600px rootMargin pre-loads the next page just before the user reaches
  // the button (eliminates the "wait for spinner" beat at the seam).
  const sentinelRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loadingMore || loading) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMore, loading, loadMore, loadingMore]);

  // ────────────────────── Live price drift (unchanged) ──────────────────────
  const [drift, setDrift] = useState<Record<string, number>>({});
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

  // ────────────────────── Derived view list ─────────────────────────────────
  // Threshold filter (firm-level one-sidedness guard) stays client-side —
  // it's a per-firm setting and Polymarket doesn't know about it. Sort and
  // search are now server-side; we don't re-apply them here.
  const visibleEvents = useMemo(() => {
    const filtered =
      threshold > 0
        ? events
            .map((e) => ({
              ...e,
              outcomes: e.outcomes.filter(
                (o) => o.yes_ask > threshold && o.yes_ask < 100 - threshold,
              ),
            }))
            .filter((e) => e.outcomes.length > 0)
        : events;

    // Apply drift overlay so prices visibly walk.
    return filtered.map((e) => ({
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
  }, [events, drift, threshold]);

  const isSearching = debouncedQuery.length > 0;

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

      {error && (
        <div className="bg-[#FF1C1C]/[0.14] border border-[#FF1C1C]/30 rounded-xl px-4 py-3 text-[13px] text-[#FF1C1C]">
          Failed to load markets: {error}
        </div>
      )}

      {/* Skeleton → content cross-fade per DESIGN.md › Skeleton → content.
          Only the initial load swaps the whole grid; appending pages keeps
          the existing cards mounted and adds skeleton tiles at the end. */}
      <AnimatePresence mode="wait">
        {loading ? (
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
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {visibleEvents.map((event, i) => (
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

              {/* Skeleton tiles appended at the seam while loadMore runs so
                  the layout doesn't jump and the user can see the next batch
                  is on the way. Only rendered while loadingMore. */}
              {loadingMore &&
                Array.from({ length: 3 }).map((_, i) => (
                  <MarketCardSkeleton key={`load-more-skel-${i}`} />
                ))}
            </div>

            {/* Empty state. Discriminated by isSearching so the copy matches
                the user's intent — "no results for your search" reads
                differently than "no markets in this category". */}
            {visibleEvents.length === 0 && !loadingMore && (
              <div className="text-center py-16 space-y-2">
                <p
                  className="text-white text-lg font-semibold tracking-[-0.01em]"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {isSearching
                    ? `No markets match "${debouncedQuery}"`
                    : selectedCategory !== "All"
                      ? `No markets in ${selectedCategory}`
                      : "No markets available right now"}
                </p>
                <p className="text-white/55 text-sm">
                  {isSearching
                    ? "Try a different search term or clear the search to browse all markets."
                    : "Try a different category."}
                </p>
              </div>
            )}

            {/* Load-more affordance. The button doubles as the
                IntersectionObserver target — clicking is the manual path,
                scrolling near it is the automatic path. When the upstream
                is exhausted, it's replaced by a quiet footer message. */}
            {visibleEvents.length > 0 && (
              <div className="flex items-center justify-center pt-2 pb-8">
                {hasMore ? (
                  <motion.button
                    ref={sentinelRef}
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    whileTap={loadingMore ? undefined : { scale: 0.97 }}
                    transition={springs.snappy}
                    className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg
                               bg-white/[0.06] hover:bg-white/[0.10] text-white text-sm font-semibold
                               border border-white/10 hover:border-white/[0.18]
                               transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45
                               disabled:opacity-60 disabled:cursor-wait"
                  >
                    {loadingMore ? (
                      <>
                        <Loader size="sm" className="w-4 h-4" />
                        <span>Loading more…</span>
                      </>
                    ) : (
                      <span>Load more markets</span>
                    )}
                  </motion.button>
                ) : (
                  <p
                    className="text-[11px] uppercase tracking-[0.08em] text-white/40"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {visibleEvents.length} {visibleEvents.length === 1 ? "market" : "markets"}
                    {" "}— end of results
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export type { Market };
