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

// Safely parse JSON string or return default
function safeParseJSON<T>(str: string | T[], defaultValue: T[]): T[] {
  if (Array.isArray(str)) return str;
  if (typeof str !== "string") return defaultValue;
  try {
    return JSON.parse(str);
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "50";
    const offset = searchParams.get("offset") || "0";
    const category = searchParams.get("category");

    // Fetch active events from Polymarket
    const url = new URL(`${POLYMARKET_API}/events`);
    url.searchParams.set("limit", limit);
    url.searchParams.set("offset", offset);
    url.searchParams.set("active", "true");
    url.searchParams.set("closed", "false");
    url.searchParams.set("order", "volume24hr");
    url.searchParams.set("ascending", "false");

    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const polyEvents: PolymarketEvent[] = await response.json();

    // Build paired markets + events arrays from the same source.
    const eventEnvelopes: Event[] = [];
    const allMarkets: Market[] = [];

    for (const pe of polyEvents) {
      const outcomes = transformToMarket(pe);
      if (outcomes.length === 0) continue;
      const cat = mapTagToCategory(pe.tags || []);
      const evt: Event = {
        eventTicker: pe.ticker || pe.slug || `EVT-${pe.id}`,
        title: pe.title,
        subtitle: pe.description?.slice(0, 200),
        category: cat,
        image: pe.image || pe.icon,
        volume_total: outcomes.reduce((s, o) => s + o.volume, 0),
        volume_24h_total: outcomes.reduce((s, o) => s + o.volume_24h, 0),
        open_time: pe.startDate || pe.createdAt,
        close_time: pe.endDate || "",
        expiration_time: pe.endDate || "",
        featured: pe.featured || false,
        outcomes,
        resolution_criteria: pe.description,
      };
      eventEnvelopes.push(evt);
      allMarkets.push(...outcomes);
    }

    // Filter by category if specified
    let filteredMarkets = allMarkets;
    let filteredEvents = eventEnvelopes;
    if (category && category !== "All") {
      filteredMarkets = filteredMarkets.filter((m) => m.category === category);
      filteredEvents = filteredEvents.filter((e) => e.category === category);
    }

    // Sort by 24h volume
    filteredMarkets.sort((a, b) => b.volume_24h - a.volume_24h);
    filteredEvents.sort((a, b) => b.volume_24h_total - a.volume_24h_total);

    return NextResponse.json({
      markets: filteredMarkets,
      events: filteredEvents,
      count: filteredMarkets.length,
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
        error: error instanceof Error ? error.message : "Failed to fetch markets",
        source: "polymarket",
      },
      { status: 500 }
    );
  }
}
