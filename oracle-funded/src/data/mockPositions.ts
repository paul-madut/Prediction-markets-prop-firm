import { Position } from "@/types";

export const mockPositions: Position[] = [
  {
    ticker: "BTC-150K-JUN25",
    market_title: "Will Bitcoin exceed $150,000 by June 30, 2025?",
    side: "yes",
    position: 150,
    total_traded: 5100,        // 150 shares * 34 cents
    market_exposure: 5100,
    realized_pnl: 0,
    unrealized_pnl: 0,         // Will be calculated
    fees_paid: 102,            // 2% fee
    avg_entry_price: 34,
    current_price: 34,
    opened_at: "2025-01-10T14:23:00Z",
  },
  {
    ticker: "GPT5-2025",
    market_title: "Will OpenAI release GPT-5 in 2025?",
    side: "yes",
    position: 80,
    total_traded: 5680,        // 80 shares * 71 cents
    market_exposure: 5680,
    realized_pnl: 0,
    unrealized_pnl: 0,
    fees_paid: 114,
    avg_entry_price: 71,
    current_price: 71,
    opened_at: "2025-01-12T09:15:00Z",
  },
  {
    ticker: "FED-CUTS-3-2025",
    market_title: "Will the Fed cut rates 3+ times in 2025?",
    side: "no",
    position: 100,
    total_traded: 3900,        // 100 shares * 39 cents (NO side)
    market_exposure: 3900,
    realized_pnl: 0,
    unrealized_pnl: 0,
    fees_paid: 78,
    avg_entry_price: 39,
    current_price: 39,
    opened_at: "2025-01-15T11:45:00Z",
  },
];
