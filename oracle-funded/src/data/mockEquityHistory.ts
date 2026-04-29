import { EquityPoint } from "@/types";
import { ACCOUNT_IDS } from "./mockAccounts";

// Phase 1 — 14-day equity curve
const phase1: EquityPoint[] = [
  { date: "2026-04-01T00:00:00Z", equity: 5000000, balance: 5000000 },
  { date: "2026-04-02T00:00:00Z", equity: 5023400, balance: 5018000 },
  { date: "2026-04-03T00:00:00Z", equity: 5010200, balance: 5005000 },
  { date: "2026-04-04T00:00:00Z", equity: 5085600, balance: 5070000 },
  { date: "2026-04-05T00:00:00Z", equity: 5068900, balance: 5060000 },
  { date: "2026-04-06T00:00:00Z", equity: 5045300, balance: 5040000 },
  { date: "2026-04-07T00:00:00Z", equity: 5098700, balance: 5085000 },
  { date: "2026-04-08T00:00:00Z", equity: 5112400, balance: 5095000 },
  { date: "2026-04-09T00:00:00Z", equity: 5134800, balance: 5120000 },
  { date: "2026-04-10T00:00:00Z", equity: 5156200, balance: 5138000 },
  { date: "2026-04-11T00:00:00Z", equity: 5189500, balance: 5165000 },
  { date: "2026-04-12T00:00:00Z", equity: 5210000, balance: 5185000 },
  { date: "2026-04-13T00:00:00Z", equity: 5198300, balance: 5175000 },
  { date: "2026-04-14T00:00:00Z", equity: 5126900, balance: 5110000 },
].map((p) => ({ ...p, accountId: ACCOUNT_IDS.PHASE1 }));

// Phase 2 — fresh start, 1 data point
const phase2: EquityPoint[] = [
  { date: "2026-04-25T00:00:00Z", equity: 10018000, balance: 10018000, accountId: ACCOUNT_IDS.PHASE2 },
];

// Funded — 90-day equity curve, ending higher than starting
const fundedStart = 25000000;
const funded: EquityPoint[] = Array.from({ length: 90 }, (_, i) => {
  const day = new Date(2026, 0, 15 + i);
  // Smooth-ish growth from $250k → ~$274k with some noise
  const growth = 1 + (i / 90) * 0.0973;
  const noise = Math.sin(i * 0.43) * 0.005;
  const equity = Math.round(fundedStart * (growth + noise));
  return {
    accountId: ACCOUNT_IDS.FUNDED,
    date: day.toISOString(),
    equity,
    balance: equity,
  };
});

export const mockEquityHistory: EquityPoint[] = [...phase1, ...phase2, ...funded];
