import { Position, Market } from "@/types";

/**
 * Calculate unrealized P&L for a position
 * @param position - The position to calculate P&L for
 * @param currentPrice - Current market price in cents
 * @returns Unrealized P&L in cents
 */
export const calculateUnrealizedPnL = (
  position: Position,
  currentPrice: number
): number => {
  const avgEntry = position.avg_entry_price || 0;
  const shares = position.position;

  if (position.side === "yes") {
    return (currentPrice - avgEntry) * shares;
  } else {
    return (avgEntry - currentPrice) * shares;
  }
};

/**
 * Calculate drawdown percentage
 * @param peakBalance - Peak account balance in cents
 * @param currentBalance - Current account balance in cents
 * @returns Drawdown as decimal (negative value, e.g., -0.05 = -5%)
 */
export const calculateDrawdown = (
  peakBalance: number,
  currentBalance: number
): number => {
  if (peakBalance === 0) return 0;
  return (currentBalance - peakBalance) / peakBalance;
};

/**
 * Calculate profit progress toward target
 * @param startBalance - Starting account balance in cents
 * @param currentBalance - Current account balance in cents
 * @param targetPercent - Target profit percentage (e.g., 0.08 for 8%)
 * @returns Progress as decimal (0 to 1+)
 */
export const calculateProfitProgress = (
  startBalance: number,
  currentBalance: number,
  targetPercent: number
): number => {
  if (startBalance === 0) return 0;
  const currentProfit = (currentBalance - startBalance) / startBalance;
  return currentProfit / targetPercent;
};

/**
 * Calculate number of shares for a given stake
 * @param stakeCents - Amount to stake in cents
 * @param priceCents - Price per share in cents
 * @returns Number of shares
 */
export const calculateShares = (stakeCents: number, priceCents: number): number => {
  if (priceCents === 0) return 0;
  return Math.floor(stakeCents / priceCents);
};

/**
 * Calculate total cost including fees
 * @param shares - Number of shares
 * @param priceCents - Price per share in cents
 * @param feePercent - Fee percentage (e.g., 0.02 for 2%)
 * @returns Total cost in cents
 */
export const calculateTotalCost = (
  shares: number,
  priceCents: number,
  feePercent = 0.02
): number => {
  const cost = shares * priceCents;
  const fee = Math.floor(cost * feePercent);
  return cost + fee;
};

/**
 * Calculate potential payout for a winning position
 * @param shares - Number of shares
 * @param side - Position side (yes or no)
 * @param entryPrice - Entry price in cents
 * @returns Potential payout in cents (winnings only, not including original stake)
 */
export const calculatePotentialPayout = (
  shares: number,
  side: "yes" | "no",
  entryPrice: number
): number => {
  // In prediction markets, you win 100 cents per share if correct
  // Your profit is (100 - entry_price) * shares for YES
  // Your profit is entry_price * shares for NO (since NO price is inverse)
  if (side === "yes") {
    return shares * (100 - entryPrice);
  } else {
    return shares * (100 - entryPrice);
  }
};

/**
 * Calculate current equity (balance + unrealized P&L)
 * @param balance - Current balance in cents
 * @param positions - Array of open positions
 * @param markets - Array of markets for current prices
 * @returns Total equity in cents
 */
export const calculateCurrentEquity = (
  balance: number,
  positions: Position[],
  markets: Market[]
): number => {
  const unrealizedPnL = positions.reduce((total, pos) => {
    const market = markets.find((m) => m.ticker === pos.ticker);
    if (!market) return total;

    const currentPrice = pos.side === "yes" ? market.yes_ask : market.no_ask;
    return total + calculateUnrealizedPnL(pos, currentPrice);
  }, 0);

  return balance + unrealizedPnL;
};

/**
 * Calculate win rate from trades
 * @param trades - Array of historical trades
 * @returns Win rate as decimal (0 to 1)
 */
export const calculateWinRate = (trades: { result: string }[]): number => {
  if (trades.length === 0) return 0;
  const wins = trades.filter((t) => t.result === "won").length;
  return wins / trades.length;
};

/**
 * Calculate average entry price for a position
 * @param currentAvg - Current average entry price
 * @param currentShares - Current number of shares
 * @param newPrice - New entry price
 * @param newShares - New shares to add
 * @returns New average entry price
 */
export const calculateNewAveragePrice = (
  currentAvg: number,
  currentShares: number,
  newPrice: number,
  newShares: number
): number => {
  const totalCost = currentAvg * currentShares + newPrice * newShares;
  const totalShares = currentShares + newShares;
  return totalShares === 0 ? 0 : totalCost / totalShares;
};
