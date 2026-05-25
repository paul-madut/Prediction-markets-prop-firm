import { NextResponse } from "next/server";
import { PolymarketEvent } from "@/types/polymarket";
import { Market, Event } from "@/types";

const POLYMARKET_API = "https://gamma-api.polymarket.com";

// Map Polymarket tags to our categories
function mapTagToCategory(tags: { label: string }[]): string {
  const tagLabels = tags.map((t) => t.label.toLowerCase());

  if (tagLabels.some((t) => t.includes("politic") || t.includes("election") || t.includes("trump") || t.includes("biden"))) {
    return "Politics";
  }
  if (tagLabels.some((t) => t.includes("crypto") || t.includes("bitcoin") || t.includes("ethereum"))) {
    return "Crypto";
  }
  if (tagLabels.some((t) => t.includes("sport") || t.includes("nfl") || t.includes("nba") || t.includes("soccer"))) {
    return "Sports";
  }
  if (tagLabels.some((t) => t.includes("econ") || t.includes("fed") || t.includes("inflation"))) {
    return "Economics";
  }
  if (tagLabels.some((t) => t.includes("tech") || t.includes("ai") || t.includes("openai"))) {
    return "Tech";
  }
  if (tagLabels.some((t) => t.includes("entertainment") || t.includes("movie") || t.includes("oscar"))) {
    return "Entertainment";
  }

  return "Other";
}

// Safely parse JSON string or return default.
//
// Polymarket sometimes ships `outcomePrices` as the literal string "null" (or
// other non-array JSON), so we must guard the post-parse value — not just the
// pre-parse type. Returning a non-array from here used to crash the route on
// `outcomePrices[0]`, killing the entire feed for one bad upstream event.
function safeParseJSON<T>(str: string | T[] | null | undefined, defaultValue: T[]): T[] {
  if (Array.isArray(str)) return str;
  if (typeof str !== "string") return defaultValue;
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Transform Polymarket event to our Market type
function transformToMarket(event: PolymarketEvent): Market[] {
  // Each event can have multiple markets (outcomes)
  return event.markets.map((market) => {
    // Parse outcome prices - they come as JSON string like "[\"0.0045\", \"0.9955\"]"
    const outcomePrices = safeParseJSON(market.outcomePrices as unknown as string, ["0.5", "0.5"]);
    const yesPriceDecimal = parseFloat(outcomePrices[0] || "0.5");
    const noPriceDecimal = parseFloat(outcomePrices[1] || "0.5");

    // Convert to percentage (0-100 scale)
    const yesPrice = Math.round(yesPriceDecimal * 100);
    const noPrice = Math.round(noPriceDecimal * 100);

    // Use bestBid/bestAsk if available, otherwise calculate from price
    const yesBid = market.bestBid ? Math.round(market.bestBid * 100) : Math.max(1, yesPrice - 1);
    const yesAsk = market.bestAsk ? Math.round(market.bestAsk * 100) : Math.min(99, yesPrice + 1);

    // Volume comes in dollars, convert to cents
    const volumeNum = typeof market.volume === "string" ? parseFloat(market.volume) : market.volume;
    const volumeCents = Math.round((volumeNum || 0) * 100);
    const volume24hCents = Math.round((market.volume24hr || 0) * 100);

    return {
      ticker: market.id,
      event_ticker: event.ticker,
      title: market.question || event.title,
      subtitle: market.description || market.groupItemTitle || event.description?.slice(0, 200),
      category: mapTagToCategory(event.tags || []),
      yes_bid: yesBid,
      yes_ask: yesAsk,
      no_bid: Math.max(1, 100 - yesAsk),
      no_ask: Math.min(99, 100 - yesBid),
      last_price: market.lastTradePrice ? Math.round(market.lastTradePrice * 100) : yesPrice,
      volume: volumeCents,
      volume_24h: volume24hCents,
      open_interest: Math.round((event.openInterest || 0) * 100),
      status: market.closed ? "closed" : market.active ? "open" : "closed",
      open_time: market.startDate || event.startDate || event.createdAt,
      close_time: market.endDate || event.endDate || "",
      expiration_time: market.endDate || event.endDate || "",
      featured: event.featured || market.featured || false,
      image: market.image || market.icon || event.image || event.icon,
    } as Market;
  });
}

// Map our internal sort key (which the UI exposes) to Polymarket's `order` +
// `ascending` pair. Keeping the mapping server-side means the API contract is
// stable even if Polymarket renames a field.
const SORT_MAP: Record<string, { order: string; ascending: boolean }> = {
  trending: { order: "volume24hr", ascending: false },
  newest: { order: "startDate", ascending: false },
  volume: { order: "volume", ascending: false },
  closing: { order: "endDate", ascending: true },
};

// When the user is searching, we widen the upstream fetch to this many events
// in a single call. Polymarket's Gamma /events endpoint accepts large limits;
// we filter the response by title/subtitle/ticker substring at this route
// because Polymarket's own `search=` parameter is unreliable (returns
// unrelated events in practice). The wider window means a search reaches
// markets far beyond the trending top-50; the trade-off is one heavier
// upstream call, gated by the 10s route cache.
const SEARCH_WINDOW_SIZE = 300;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Cap at 100 — Polymarket allows higher but our category-filter pass is
    // O(n*outcomes) and we don't want a single request to hold the route open.
    const rawLimit = Number(searchParams.get("limit") ?? "50");
    const limit = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 50), 100);
    const rawOffset = Number(searchParams.get("offset") ?? "0");
    const offset = Math.max(0, Number.isFinite(rawOffset) ? rawOffset : 0);
    const category = searchParams.get("category");
    const query = (searchParams.get("q") || "").trim();
    const sortKey = searchParams.get("sort") || "trending";
    const sort = SORT_MAP[sortKey] ?? SORT_MAP.trending;
    const isSearch = query.length > 0;

    // Search mode swaps the pagination strategy: instead of relying on
    // upstream offset/limit (which would only see results within the wrong
    // 50-event slice), we fetch a wide window once and paginate the
    // filtered result ourselves. Browse mode keeps the simple passthrough.
    const upstreamLimit = isSearch ? SEARCH_WINDOW_SIZE : limit;
    const upstreamOffset = isSearch ? 0 : offset;

    // Fetch active events from Polymarket
    const url = new URL(`${POLYMARKET_API}/events`);
    url.searchParams.set("limit", String(upstreamLimit));
    url.searchParams.set("offset", String(upstreamOffset));
    url.searchParams.set("active", "true");
    url.searchParams.set("closed", "false");
    url.searchParams.set("order", sort.order);
    url.searchParams.set("ascending", String(sort.ascending));

    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 10 }, // Cache for 10s so list + detail stay in sync
    });

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const polyEvents: PolymarketEvent[] = await response.json();

    // Build paired markets + events arrays from the same source.
    // Drop outcomes whose Polymarket status is closed, OR whose close_time
    // has already passed — Gamma's active=true filter is not consistently
    // honored and returns stale outcomes whose fillOrder calls then fail
    // with no_quote_for_market. Defense in depth: filter both flags.
    const nowMs = Date.now();
    const eventEnvelopes: Event[] = [];

    for (const pe of polyEvents) {
      // Per-event isolation: one malformed upstream payload (missing
      // `markets`, unexpected `outcomePrices` shape, etc.) must not take down
      // the whole feed. Skip the bad event, keep serving the rest.
      let allOutcomes: Market[];
      try {
        allOutcomes = transformToMarket(pe);
      } catch (err) {
        console.warn(
          `[markets] skipping event ${pe.ticker || pe.slug || pe.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
        continue;
      }
      const outcomes = allOutcomes.filter((o) => {
        if (o.status === "closed") return false;
        if (o.close_time) {
          const ms = Date.parse(o.close_time);
          if (!Number.isNaN(ms) && ms <= nowMs) return false;
        }
        return true;
      });
      if (outcomes.length === 0) continue;
      const cat = mapTagToCategory(pe.tags || []);
      // Polymarket's event-level endDate is sometimes stale (a past date)
      // even when individual outcomes still trade with future end dates.
      // Derive the event close_time from the max of the outcomes' close_time
      // so the trader-facing "Closes: …" label matches reality.
      const outcomeCloseMs = outcomes
        .map((o) => (o.close_time ? Date.parse(o.close_time) : NaN))
        .filter((n) => !Number.isNaN(n));
      const eventEndIso = pe.endDate || "";
      const eventEndMs = eventEndIso ? Date.parse(eventEndIso) : NaN;
      const maxOutcomeMs = outcomeCloseMs.length ? Math.max(...outcomeCloseMs) : NaN;
      const effectiveCloseMs = !Number.isNaN(maxOutcomeMs) && (Number.isNaN(eventEndMs) || maxOutcomeMs > eventEndMs)
        ? maxOutcomeMs
        : eventEndMs;
      const effectiveCloseIso = !Number.isNaN(effectiveCloseMs)
        ? new Date(effectiveCloseMs).toISOString()
        : eventEndIso;
      const evt: Event = {
        eventTicker: pe.ticker || pe.slug || `EVT-${pe.id}`,
        title: pe.title,
        subtitle: pe.description?.slice(0, 200),
        category: cat,
        image: pe.image || pe.icon,
        volume_total: outcomes.reduce((s, o) => s + o.volume, 0),
        volume_24h_total: outcomes.reduce((s, o) => s + o.volume_24h, 0),
        open_time: pe.startDate || pe.createdAt,
        close_time: effectiveCloseIso,
        expiration_time: effectiveCloseIso,
        featured: pe.featured || false,
        outcomes,
        resolution_criteria: pe.description,
      };
      eventEnvelopes.push(evt);
    }

    // ── Category + search filtering (both applied at this route, not upstream)
    let filteredEvents = eventEnvelopes;
    if (category && category !== "All") {
      filteredEvents = filteredEvents.filter((e) => e.category === category);
    }
    if (isSearch) {
      const needle = query.toLowerCase();
      filteredEvents = filteredEvents.filter((e) => {
        return (
          e.title.toLowerCase().includes(needle) ||
          e.subtitle?.toLowerCase().includes(needle) ||
          e.eventTicker.toLowerCase().includes(needle) ||
          e.outcomes.some((o) => o.title.toLowerCase().includes(needle))
        );
      });
    }

    // ── Pagination
    // Search mode: we have the full filtered set in memory; slice it.
    // Browse mode: upstream already returned the right slice; pass through.
    const pageEvents = isSearch
      ? filteredEvents.slice(offset, offset + limit)
      : filteredEvents;

    // hasMore semantics differ per mode:
    //   - Search: there are more matches beyond what we sliced.
    //   - Browse: upstream returned a full page, so there's likely more
    //     behind it. (Edge case: if it returned exactly `limit` AND we're
    //     at the very end, the next request will simply return zero and
    //     hasMore will flip to false then.)
    const hasMore = isSearch
      ? filteredEvents.length > offset + limit
      : polyEvents.length >= upstreamLimit;

    // Build the flat per-outcome markets array from the paginated events
    // (not the full filteredEvents) so the two arrays stay in lock-step.
    const pageMarkets: Market[] = [];
    for (const evt of pageEvents) {
      pageMarkets.push(...evt.outcomes);
    }
    pageMarkets.sort((a, b) => b.volume_24h - a.volume_24h);

    return NextResponse.json({
      markets: pageMarkets,
      events: pageEvents,
      count: pageMarkets.length,
      hasMore,
      source: "polymarket",
    });
  } catch (error) {
    console.error("Failed to fetch markets:", error);

    // Return empty array on error (frontend can fall back to mock data)
    return NextResponse.json(
      {
        markets: [],
        events: [],
        count: 0,
        hasMore: false,
        error: error instanceof Error ? error.message : "Failed to fetch markets",
        source: "polymarket",
      },
      { status: 500 }
    );
  }
}
