export interface CryptoSymbol {
  symbol: string;
  name: string;
  spotUsd: number;             // current spot price in USD
  change24hPct: number;        // % change last 24h, e.g. -0.012 = -1.2%
  volatility: number;          // walk size factor (higher = jumpier)
  activeMarkets: number;       // displayed count of active expiry markets
}

export const mockCrypto: CryptoSymbol[] = [
  { symbol: "BTC",  name: "Bitcoin",   spotUsd: 77567,  change24hPct: -0.0010, volatility: 0.0008, activeMarkets: 5 },
  { symbol: "ETH",  name: "Ethereum",  spotUsd: 3892,   change24hPct: 0.0142,  volatility: 0.0012, activeMarkets: 5 },
  { symbol: "SOL",  name: "Solana",    spotUsd: 214,    change24hPct: 0.0285,  volatility: 0.0020, activeMarkets: 4 },
  { symbol: "AVAX", name: "Avalanche", spotUsd: 41.2,   change24hPct: -0.0080, volatility: 0.0022, activeMarkets: 3 },
  { symbol: "BNB",  name: "BNB",       spotUsd: 612,    change24hPct: 0.0035,  volatility: 0.0015, activeMarkets: 3 },
  { symbol: "ADA",  name: "Cardano",   spotUsd: 0.94,   change24hPct: 0.0091,  volatility: 0.0024, activeMarkets: 3 },
  { symbol: "DOGE", name: "Dogecoin",  spotUsd: 0.382,  change24hPct: -0.0210, volatility: 0.0030, activeMarkets: 3 },
  { symbol: "MATIC", name: "Polygon",  spotUsd: 0.81,   change24hPct: 0.0044,  volatility: 0.0025, activeMarkets: 2 },
];

export type Expiry = "5m" | "15m" | "1h" | "4h" | "24h";
export const EXPIRIES: Expiry[] = ["5m", "15m", "1h", "4h", "24h"];
export const EXPIRY_SECONDS: Record<Expiry, number> = {
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "24h": 86400,
};
