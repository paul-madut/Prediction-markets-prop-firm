import { Position } from "@/types";
import { ACCOUNT_IDS } from "./mockAccounts";

export const mockPositions: Position[] = [
  // Phase 1 — 2 open positions
  {
    accountId: ACCOUNT_IDS.PHASE1,
    ticker: "BTC-150K-JUN25",
    market_title: "Will Bitcoin exceed $150,000 by June 30, 2025?",
    side: "yes",
    position: 150,
    total_traded: 5100,        // 150 shares * 34 cents
    market_exposure: 5100,
    realized_pnl: 0,
    unrealized_pnl: 0,
    fees_paid: 102,
    avg_entry_price: 34,
    current_price: 34,
    opened_at: "2026-04-10T14:23:00Z",
  },
  {
    accountId: ACCOUNT_IDS.PHASE1,
    ticker: "GPT5-2025",
    market_title: "Will OpenAI release GPT-5 in 2025?",
    side: "yes",
    position: 80,
    total_traded: 5680,
    market_exposure: 5680,
    realized_pnl: 0,
    unrealized_pnl: 0,
    fees_paid: 114,
    avg_entry_price: 71,
    current_price: 71,
    opened_at: "2026-04-12T09:15:00Z",
  },
  // Funded — 1 open position
  {
    accountId: ACCOUNT_IDS.FUNDED,
    ticker: "FED-CUTS-3-2025",
    market_title: "Will the Fed cut rates 3+ times in 2025?",
    side: "no",
    position: 100,
    total_traded: 3900,
    market_exposure: 3900,
    realized_pnl: 0,
    unrealized_pnl: 0,
    fees_paid: 78,
    avg_entry_price: 39,
    current_price: 39,
    opened_at: "2026-04-15T11:45:00Z",
  },
];
