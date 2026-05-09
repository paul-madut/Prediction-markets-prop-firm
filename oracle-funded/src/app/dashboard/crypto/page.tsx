"use client";

// /dashboard/crypto — Crypto-category market list.
//
// Same data source and card component as /dashboard/markets, pre-filtered to
// the "Crypto" category bucket assigned by the /api/markets normaliser.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "@heroicons/react/16/solid";
import { Event } from "@/types";
import { api, ApiError } from "@/lib/api-client";
import { MarketCard } from "@/components/markets/ExpandableMarketCard";
import { MarketCardSkeleton } from "@/components/markets/MarketCardSkeleton";

export default function CryptoMarketsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ events: Event[] }>("/api/markets?limit=200")
      .then((d) =>
        setEvents(
          (d.events ?? [])
            .filter((e) => e.category === "Crypto")
            .map((e) => ({
              ...e,
              outcomes: e.outcomes.filter((o) => o.yes_ask >= 10 && o.yes_ask <= 90),
            }))
            .filter((e) => e.outcomes.length > 0)
            .sort((a, b) => b.volume_24h_total - a.volume_24h_total),
        ),
      )
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : String(err));
        setEvents([]);
      });
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Crypto — Up or Down
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Live Polymarket crypto markets, sorted by 24h volume.
          </p>
        </div>
        <Link
          href="/dashboard/markets"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          All markets
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Failed to load markets: {error}
        </div>
      )}

      {events === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <MarketCardSkeleton key={i} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-16">
          No crypto markets available right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <MarketCard
              key={event.eventTicker}
              event={event}
              onClick={() => {
                const target = event.outcomes[0]?.ticker;
                if (target) router.push(`/dashboard/markets/${encodeURIComponent(target)}`);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
