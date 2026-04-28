import { Event, Market } from "@/types";
import { mockMarkets } from "./mockMarkets";
import { mockCrypto, EXPIRIES } from "./mockCrypto";

// Multi-outcome events: each outcome is its own binary Market with shared event_ticker.
// Shape: 1 Event → N Markets, each Market has bid/ask for "Will <outcome> win?".

const fedChairOutcomes: Market[] = [
  { ticker: "FED-CHAIR-2026-POWELL", event_ticker: "EVT-FED-CHAIR-2026", title: "Powell — Next Fed Chair", subtitle: "Resolves YES if Powell renominated and confirmed as Fed Chair in 2026", category: "Economics", yes_bid: 24, yes_ask: 25, no_bid: 75, no_ask: 76, last_price: 25, volume: 1820000, volume_24h: 145000, open_interest: 220000, status: "open", open_time: "2025-09-01T00:00:00Z", close_time: "2026-02-01T23:59:59Z", expiration_time: "2026-02-01T23:59:59Z", outcome_label: "Jerome Powell" },
  { ticker: "FED-CHAIR-2026-WARSH", event_ticker: "EVT-FED-CHAIR-2026", title: "Warsh — Next Fed Chair", subtitle: "Resolves YES if Kevin Warsh confirmed as Fed Chair", category: "Economics", yes_bid: 31, yes_ask: 32, no_bid: 68, no_ask: 69, last_price: 32, volume: 940000, volume_24h: 88000, open_interest: 130000, status: "open", open_time: "2025-09-01T00:00:00Z", close_time: "2026-02-01T23:59:59Z", expiration_time: "2026-02-01T23:59:59Z", outcome_label: "Kevin Warsh" },
  { ticker: "FED-CHAIR-2026-WALLER", event_ticker: "EVT-FED-CHAIR-2026", title: "Waller — Next Fed Chair", subtitle: "Resolves YES if Christopher Waller confirmed as Fed Chair", category: "Economics", yes_bid: 18, yes_ask: 19, no_bid: 81, no_ask: 82, last_price: 19, volume: 510000, volume_24h: 42000, open_interest: 70000, status: "open", open_time: "2025-09-01T00:00:00Z", close_time: "2026-02-01T23:59:59Z", expiration_time: "2026-02-01T23:59:59Z", outcome_label: "Christopher Waller" },
  { ticker: "FED-CHAIR-2026-BRAINARD", event_ticker: "EVT-FED-CHAIR-2026", title: "Brainard — Next Fed Chair", subtitle: "Resolves YES if Lael Brainard confirmed as Fed Chair", category: "Economics", yes_bid: 12, yes_ask: 13, no_bid: 87, no_ask: 88, last_price: 13, volume: 320000, volume_24h: 24000, open_interest: 45000, status: "open", open_time: "2025-09-01T00:00:00Z", close_time: "2026-02-01T23:59:59Z", expiration_time: "2026-02-01T23:59:59Z", outcome_label: "Lael Brainard" },
  { ticker: "FED-CHAIR-2026-OTHER", event_ticker: "EVT-FED-CHAIR-2026", title: "Other — Next Fed Chair", subtitle: "Resolves YES if any other candidate confirmed", category: "Economics", yes_bid: 14, yes_ask: 15, no_bid: 85, no_ask: 86, last_price: 15, volume: 180000, volume_24h: 14000, open_interest: 22000, status: "open", open_time: "2025-09-01T00:00:00Z", close_time: "2026-02-01T23:59:59Z", expiration_time: "2026-02-01T23:59:59Z", outcome_label: "Other" },
];

const worldCupOutcomes: Market[] = [
  { ticker: "WC-2026-FRA", event_ticker: "EVT-WORLD-CUP-2026", title: "France — World Cup 2026 Winner", subtitle: "Resolves YES if France wins 2026 FIFA World Cup", category: "Sports", yes_bid: 16, yes_ask: 17, no_bid: 83, no_ask: 84, last_price: 17, volume: 4200000, volume_24h: 380000, open_interest: 520000, status: "open", open_time: "2025-06-01T00:00:00Z", close_time: "2026-07-19T23:59:59Z", expiration_time: "2026-07-19T23:59:59Z", outcome_label: "France" },
  { ticker: "WC-2026-ESP", event_ticker: "EVT-WORLD-CUP-2026", title: "Spain — World Cup 2026 Winner", subtitle: "Resolves YES if Spain wins 2026 FIFA World Cup", category: "Sports", yes_bid: 15, yes_ask: 16, no_bid: 84, no_ask: 85, last_price: 16, volume: 3800000, volume_24h: 320000, open_interest: 480000, status: "open", open_time: "2025-06-01T00:00:00Z", close_time: "2026-07-19T23:59:59Z", expiration_time: "2026-07-19T23:59:59Z", outcome_label: "Spain" },
  { ticker: "WC-2026-ENG", event_ticker: "EVT-WORLD-CUP-2026", title: "England — World Cup 2026 Winner", subtitle: "Resolves YES if England wins 2026 FIFA World Cup", category: "Sports", yes_bid: 10, yes_ask: 11, no_bid: 89, no_ask: 90, last_price: 11, volume: 2900000, volume_24h: 240000, open_interest: 360000, status: "open", open_time: "2025-06-01T00:00:00Z", close_time: "2026-07-19T23:59:59Z", expiration_time: "2026-07-19T23:59:59Z", outcome_label: "England" },
  { ticker: "WC-2026-BRA", event_ticker: "EVT-WORLD-CUP-2026", title: "Brazil — World Cup 2026 Winner", subtitle: "Resolves YES if Brazil wins 2026 FIFA World Cup", category: "Sports", yes_bid: 13, yes_ask: 14, no_bid: 86, no_ask: 87, last_price: 14, volume: 3300000, volume_24h: 290000, open_interest: 410000, status: "open", open_time: "2025-06-01T00:00:00Z", close_time: "2026-07-19T23:59:59Z", expiration_time: "2026-07-19T23:59:59Z", outcome_label: "Brazil" },
  { ticker: "WC-2026-ARG", event_ticker: "EVT-WORLD-CUP-2026", title: "Argentina — World Cup 2026 Winner", subtitle: "Resolves YES if Argentina wins 2026 FIFA World Cup", category: "Sports", yes_bid: 9, yes_ask: 10, no_bid: 90, no_ask: 91, last_price: 10, volume: 2600000, volume_24h: 200000, open_interest: 320000, status: "open", open_time: "2025-06-01T00:00:00Z", close_time: "2026-07-19T23:59:59Z", expiration_time: "2026-07-19T23:59:59Z", outcome_label: "Argentina" },
  { ticker: "WC-2026-GER", event_ticker: "EVT-WORLD-CUP-2026", title: "Germany — World Cup 2026 Winner", subtitle: "Resolves YES if Germany wins 2026 FIFA World Cup", category: "Sports", yes_bid: 7, yes_ask: 8, no_bid: 92, no_ask: 93, last_price: 8, volume: 1900000, volume_24h: 145000, open_interest: 230000, status: "open", open_time: "2025-06-01T00:00:00Z", close_time: "2026-07-19T23:59:59Z", expiration_time: "2026-07-19T23:59:59Z", outcome_label: "Germany" },
  { ticker: "WC-2026-OTHER", event_ticker: "EVT-WORLD-CUP-2026", title: "Other — World Cup 2026 Winner", subtitle: "Resolves YES if any other team wins", category: "Sports", yes_bid: 29, yes_ask: 30, no_bid: 70, no_ask: 71, last_price: 30, volume: 4800000, volume_24h: 410000, open_interest: 580000, status: "open", open_time: "2025-06-01T00:00:00Z", close_time: "2026-07-19T23:59:59Z", expiration_time: "2026-07-19T23:59:59Z", outcome_label: "Other (50 teams)" },
];

const aiCompanyOutcomes: Market[] = [
  { ticker: "AI-AGI-2027-OPENAI", event_ticker: "EVT-AGI-FIRST-2027", title: "OpenAI — First to AGI by 2027", subtitle: "Resolves YES if OpenAI is widely recognized as first to AGI by Dec 31 2027", category: "Tech", yes_bid: 38, yes_ask: 39, no_bid: 61, no_ask: 62, last_price: 39, volume: 2700000, volume_24h: 220000, open_interest: 340000, status: "open", open_time: "2025-04-01T00:00:00Z", close_time: "2027-12-31T23:59:59Z", expiration_time: "2027-12-31T23:59:59Z", outcome_label: "OpenAI" },
  { ticker: "AI-AGI-2027-ANTHROPIC", event_ticker: "EVT-AGI-FIRST-2027", title: "Anthropic — First to AGI by 2027", subtitle: "Resolves YES if Anthropic is widely recognized as first to AGI by Dec 31 2027", category: "Tech", yes_bid: 22, yes_ask: 23, no_bid: 77, no_ask: 78, last_price: 23, volume: 1800000, volume_24h: 165000, open_interest: 240000, status: "open", open_time: "2025-04-01T00:00:00Z", close_time: "2027-12-31T23:59:59Z", expiration_time: "2027-12-31T23:59:59Z", outcome_label: "Anthropic" },
  { ticker: "AI-AGI-2027-GOOGLE", event_ticker: "EVT-AGI-FIRST-2027", title: "Google DeepMind — First to AGI by 2027", subtitle: "Resolves YES if Google DeepMind is widely recognized as first to AGI", category: "Tech", yes_bid: 18, yes_ask: 19, no_bid: 81, no_ask: 82, last_price: 19, volume: 1400000, volume_24h: 130000, open_interest: 200000, status: "open", open_time: "2025-04-01T00:00:00Z", close_time: "2027-12-31T23:59:59Z", expiration_time: "2027-12-31T23:59:59Z", outcome_label: "Google DeepMind" },
  { ticker: "AI-AGI-2027-XAI", event_ticker: "EVT-AGI-FIRST-2027", title: "xAI — First to AGI by 2027", subtitle: "Resolves YES if xAI is widely recognized as first to AGI", category: "Tech", yes_bid: 6, yes_ask: 7, no_bid: 93, no_ask: 94, last_price: 7, volume: 480000, volume_24h: 38000, open_interest: 60000, status: "open", open_time: "2025-04-01T00:00:00Z", close_time: "2027-12-31T23:59:59Z", expiration_time: "2027-12-31T23:59:59Z", outcome_label: "xAI" },
  { ticker: "AI-AGI-2027-NONE", event_ticker: "EVT-AGI-FIRST-2027", title: "No AGI by 2027", subtitle: "Resolves YES if no organization is recognized as having reached AGI by end of 2027", category: "Tech", yes_bid: 16, yes_ask: 17, no_bid: 83, no_ask: 84, last_price: 17, volume: 1100000, volume_24h: 95000, open_interest: 160000, status: "open", open_time: "2025-04-01T00:00:00Z", close_time: "2027-12-31T23:59:59Z", expiration_time: "2027-12-31T23:59:59Z", outcome_label: "None" },
];

const multiOutcomeEvents: Event[] = [
  {
    eventTicker: "EVT-FED-CHAIR-2026",
    title: "Who will be the next Fed Chair?",
    subtitle: "Multi-outcome market on the next confirmed Federal Reserve Chair",
    category: "Economics",
    volume_total: fedChairOutcomes.reduce((s, o) => s + o.volume, 0),
    volume_24h_total: fedChairOutcomes.reduce((s, o) => s + o.volume_24h, 0),
    open_time: "2025-09-01T00:00:00Z",
    close_time: "2026-02-01T23:59:59Z",
    expiration_time: "2026-02-01T23:59:59Z",
    featured: true,
    outcomes: fedChairOutcomes,
    resolution_criteria: "Resolves YES on the candidate confirmed by the US Senate as Federal Reserve Chair before February 1, 2026. If no candidate is confirmed by that date, the market resolves to 'Other'.",
  },
  {
    eventTicker: "EVT-WORLD-CUP-2026",
    title: "2026 FIFA World Cup Winner",
    subtitle: "48-team tournament hosted across USA, Canada, Mexico",
    category: "Sports",
    volume_total: worldCupOutcomes.reduce((s, o) => s + o.volume, 0),
    volume_24h_total: worldCupOutcomes.reduce((s, o) => s + o.volume_24h, 0),
    open_time: "2025-06-01T00:00:00Z",
    close_time: "2026-07-19T23:59:59Z",
    expiration_time: "2026-07-19T23:59:59Z",
    featured: true,
    outcomes: worldCupOutcomes,
    resolution_criteria: "Resolves YES on the team that wins the 2026 FIFA World Cup Final scheduled July 19, 2026. Markets resolve based on official FIFA results.",
  },
  {
    eventTicker: "EVT-AGI-FIRST-2027",
    title: "First organization to reach AGI by end of 2027",
    subtitle: "Multi-outcome market on AGI achievement",
    category: "Tech",
    volume_total: aiCompanyOutcomes.reduce((s, o) => s + o.volume, 0),
    volume_24h_total: aiCompanyOutcomes.reduce((s, o) => s + o.volume_24h, 0),
    open_time: "2025-04-01T00:00:00Z",
    close_time: "2027-12-31T23:59:59Z",
    expiration_time: "2027-12-31T23:59:59Z",
    featured: false,
    outcomes: aiCompanyOutcomes,
    resolution_criteria: "Resolves based on consensus from a panel of AI researchers and credible reporting (Bloomberg, NYT, Reuters) that an organization has demonstrated capabilities meeting accepted AGI thresholds.",
  },
];

// Generate one binary "Up or Down" market per crypto symbol × expiry.
// Yes = Up, No = Down. Wired through executeTrade like any other binary market.
function generateCryptoMarkets(): { events: Event[]; markets: Market[] } {
  const evs: Event[] = [];
  const mkts: Market[] = [];
  for (const c of mockCrypto) {
    for (const e of EXPIRIES) {
      const ticker = `CRYPTO-${c.symbol}-${e.toUpperCase()}`;
      const eventTicker = `EVT-${ticker}`;
      const m: Market = {
        ticker,
        event_ticker: eventTicker,
        title: `Will ${c.symbol} be Up or Down in ${e}?`,
        subtitle: `Resolves YES if ${c.symbol} closes higher than current spot at the end of the ${e} window`,
        category: "Crypto",
        yes_bid: 49,
        yes_ask: 50,
        no_bid: 49,
        no_ask: 50,
        last_price: 50,
        volume: 0,
        volume_24h: 0,
        open_interest: 0,
        status: "open",
        open_time: new Date().toISOString(),
        close_time: new Date(Date.now() + 86400000).toISOString(),
        expiration_time: new Date(Date.now() + 86400000).toISOString(),
        outcome_label: `${c.symbol} ${e}`,
      };
      mkts.push(m);
      evs.push({
        eventTicker,
        title: m.title,
        subtitle: m.subtitle,
        category: "Crypto",
        volume_total: 0,
        volume_24h_total: 0,
        open_time: m.open_time,
        close_time: m.close_time,
        expiration_time: m.expiration_time,
        outcomes: [m],
        resolution_criteria: m.subtitle,
      });
    }
  }
  return { events: evs, markets: mkts };
}

const crypto = generateCryptoMarkets();

// Wrap each existing binary market as a length-1 Event.
function wrapBinaryAsEvent(m: Market): Event {
  return {
    eventTicker: m.event_ticker || `EVT-${m.ticker}`,
    title: m.title,
    subtitle: m.subtitle,
    category: m.category,
    image: m.image,
    volume_total: m.volume,
    volume_24h_total: m.volume_24h,
    open_time: m.open_time,
    close_time: m.close_time,
    expiration_time: m.expiration_time,
    featured: m.featured,
    outcomes: [m],
    resolution_criteria: m.subtitle,
  };
}

export const mockEvents: Event[] = [
  ...multiOutcomeEvents,
  ...mockMarkets.map(wrapBinaryAsEvent),
  ...crypto.events,
];

// Flat list of every outcome Market across all events — used as the canonical markets array.
export const mockMarketsFromEvents: Market[] = mockEvents.flatMap((e) => e.outcomes);
