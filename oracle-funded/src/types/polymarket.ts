// Polymarket Gamma API Types

export interface PolymarketEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  creationDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  liquidity: number;
  volume: number;
  openInterest: number;
  competitive: number;
  volume24hr: number;
  volume1wk: number;
  volume1mo: number;
  volume1yr: number;
  enableOrderBook: boolean;
  liquidityClob: number;
  negRisk: boolean;
  commentCount: number;
  markets: PolymarketMarket[];
  tags: PolymarketTag[];
  createdAt: string;
  updatedAt: string;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  outcomes: string | string[];
  outcomePrices: string | string[];
  liquidity: number | string;
  volume: number | string;
  volume24hr: number;
  bestBid: number;
  bestAsk: number;
  lastTradePrice: number;
  spread: number;
  orderPriceMinTickSize: number;
  orderMinSize: number;
  active: boolean;
  closed: boolean;
  archived: boolean;
  acceptingOrders: boolean;
  clobTokenIds: string | string[];
  volumeClob: number;
  liquidityClob: number;
  oneDayPriceChange: number;
  oneHourPriceChange: number;
  oneWeekPriceChange: number;
  image?: string;
  icon?: string;
  description?: string;
  groupItemTitle?: string;
  startDate?: string;
  endDate?: string;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PolymarketTag {
  id: string;
  label: string;
  slug: string;
  forceShow: boolean;
  isCarousel: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Response type
export interface PolymarketEventsResponse {
  events: PolymarketEvent[];
  nextCursor?: string;
}
