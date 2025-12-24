"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  AppContextType,
  UserAccount,
  Market,
  Position,
  Trade,
  ChallengePlan,
  EquityPoint,
} from "@/types";
import { mockUser } from "@/data/mockUser";
import { mockMarkets } from "@/data/mockMarkets";
import { mockPositions } from "@/data/mockPositions";
import { mockTrades } from "@/data/mockTrades";
import { mockPlans } from "@/data/mockPlans";
import { mockEquityHistory } from "@/data/mockEquityHistory";
import { calculateUnrealizedPnL, calculateNewAveragePrice } from "@/lib/calculations";

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserAccount>(mockUser);
  const [markets, setMarkets] = useState<Market[]>(mockMarkets);
  const [positions, setPositions] = useState<Position[]>(mockPositions);
  const [trades, setTrades] = useState<Trade[]>(mockTrades);
  const [equityHistory, setEquityHistory] = useState<EquityPoint[]>(mockEquityHistory);
  const [plans] = useState<ChallengePlan[]>(mockPlans);
  const [selectedPlan, setSelectedPlan] = useState<ChallengePlan | null>(null);

  // Update account balance
  const updateAccountBalance = (newBalance: number) => {
    setUser((prev) => ({ ...prev, accountBalance: newBalance }));
  };

  // Get market by ticker
  const getMarketByTicker = (ticker: string): Market | undefined => {
    return markets.find((m) => m.ticker === ticker);
  };

  // Add new position
  const addPosition = (position: Position) => {
    setPositions((prev) => [...prev, position]);
  };

  // Update existing position
  const updatePosition = (
    ticker: string,
    side: "yes" | "no",
    updates: Partial<Position>
  ) => {
    setPositions((prev) =>
      prev.map((pos) =>
        pos.ticker === ticker && pos.side === side ? { ...pos, ...updates } : pos
      )
    );
  };

  // Close position
  const closePosition = (ticker: string, side: "yes" | "no", exitPrice: number) => {
    const position = positions.find((p) => p.ticker === ticker && p.side === side);
    if (!position) return;

    const pnl = calculateUnrealizedPnL(position, exitPrice);
    const newBalance = user.accountBalance + pnl + position.market_exposure;

    // Update balance
    updateAccountBalance(newBalance);

    // Remove position
    setPositions((prev) => prev.filter((p) => !(p.ticker === ticker && p.side === side)));

    // Update the corresponding trade
    setTrades((prev) =>
      prev.map((t) =>
        t.ticker === ticker && t.side === side && !t.exitDate
          ? {
              ...t,
              exitDate: new Date().toISOString(),
              exitPrice,
              pnl,
              pnlPercent: pnl / position.total_traded,
              result: pnl > 0 ? "won" : "lost",
              exitType: "manual_sell" as const,
            }
          : t
      )
    );
  };

  // Add trade
  const addTrade = (trade: Trade) => {
    setTrades((prev) => [trade, ...prev]);
  };

  // Update equity history
  const updateEquity = (date: string, equity: number, balance: number) => {
    setEquityHistory((prev) => [...prev, { date, equity, balance }]);
  };

  // Select challenge plan
  const selectPlan = (planId: string) => {
    const plan = plans.find((p) => p.planId === planId);
    if (plan) {
      setSelectedPlan(plan);
    }
  };

  // Execute trade (main trading logic)
  const executeTrade = (
    ticker: string,
    side: "yes" | "no",
    shares: number
  ): boolean => {
    const market = getMarketByTicker(ticker);
    if (!market) return false;

    // 1. Calculate trade cost
    const price = side === "yes" ? market.yes_ask : market.no_ask;
    const cost = shares * price; // in cents
    const fee = Math.floor(cost * 0.02); // 2% fee
    const totalCost = cost + fee;

    // 2. Check if user has enough balance
    if (user.accountBalance < totalCost) {
      alert("Insufficient balance");
      return false;
    }

    // 3. Update balance
    const newBalance = user.accountBalance - totalCost;
    updateAccountBalance(newBalance);

    // 4. Create or update position
    const existingPosition = positions.find(
      (p) => p.ticker === ticker && p.side === side
    );

    if (existingPosition) {
      // Add to existing position
      const newAvgPrice = calculateNewAveragePrice(
        existingPosition.avg_entry_price || 0,
        existingPosition.position,
        price,
        shares
      );

      updatePosition(ticker, side, {
        position: existingPosition.position + shares,
        total_traded: existingPosition.total_traded + cost,
        market_exposure: existingPosition.market_exposure + cost,
        fees_paid: existingPosition.fees_paid + fee,
        avg_entry_price: newAvgPrice,
        current_price: price,
      });
    } else {
      // New position
      addPosition({
        ticker,
        market_title: market.title,
        side,
        position: shares,
        total_traded: cost,
        market_exposure: cost,
        realized_pnl: 0,
        fees_paid: fee,
        avg_entry_price: price,
        current_price: price,
        opened_at: new Date().toISOString(),
      });
    }

    // 5. Record trade
    addTrade({
      tradeId: `trade_${Date.now()}`,
      ticket: `TKT-${Math.floor(Math.random() * 99999)}`,
      ticker,
      market_title: market.title,
      side,
      shares,
      entryPrice: price,
      entryDate: new Date().toISOString(),
      pnl: 0,
      pnlPercent: 0,
      fees: fee,
      result: "sold", // Will update on exit
      exitType: "manual_sell",
    });

    // 6. Update equity (simplified - just using new balance)
    updateEquity(new Date().toISOString(), newBalance, newBalance);

    // 7. Update user stats
    setUser((prev) => {
      const newProfit = (newBalance - prev.startingBalance) / prev.startingBalance;
      const newDrawdown =
        (newBalance - prev.peakBalance) / (prev.peakBalance || 1);

      return {
        ...prev,
        currentProfit: newProfit,
        currentDrawdown: newDrawdown,
        peakBalance: Math.max(prev.peakBalance, newBalance),
      };
    });

    return true;
  };

  const value: AppContextType = {
    user,
    updateAccountBalance,
    setUser,
    markets,
    getMarketByTicker,
    positions,
    addPosition,
    updatePosition,
    closePosition,
    trades,
    addTrade,
    equityHistory,
    updateEquity,
    plans,
    selectedPlan,
    selectPlan,
    executeTrade,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
