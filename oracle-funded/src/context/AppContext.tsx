"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  AppContextType,
  UserAccount,
  Market,
  Event,
  Position,
  Trade,
  ChallengePlan,
  EquityPoint,
  ChallengeType,
  LoadingState,
} from "@/types";
import { mockAccounts, ACCOUNT_IDS } from "@/data/mockAccounts";
import { mockEvents, mockMarketsFromEvents } from "@/data/mockEvents";
import { mockPositions } from "@/data/mockPositions";
import { mockTrades } from "@/data/mockTrades";
import { mockPlans } from "@/data/mockPlans";
import { mockEquityHistory } from "@/data/mockEquityHistory";
import { challengeTypes } from "@/data/challengeTypes";
import { calculateUnrealizedPnL, calculateNewAveragePrice } from "@/lib/calculations";

const AppContext = createContext<AppContextType | undefined>(undefined);

const ACTIVE_ACCOUNT_KEY = "oracle_active_account_id";

// Group flat markets by event_ticker into Events. Used when the API
// does not yet return an explicit events envelope.
function groupMarketsToEvents(markets: Market[]): Event[] {
  const byEvent = new Map<string, Market[]>();
  for (const m of markets) {
    const key = m.event_ticker || `EVT-${m.ticker}`;
    const arr = byEvent.get(key) || [];
    arr.push(m);
    byEvent.set(key, arr);
  }
  return Array.from(byEvent.entries()).map(([eventTicker, outcomes]) => {
    const first = outcomes[0];
    return {
      eventTicker,
      title: outcomes.length === 1 ? first.title : first.title.split(" — ")[0] || first.title,
      subtitle: first.subtitle,
      category: first.category,
      image: first.image,
      volume_total: outcomes.reduce((s, o) => s + o.volume, 0),
      volume_24h_total: outcomes.reduce((s, o) => s + o.volume_24h, 0),
      open_time: first.open_time,
      close_time: first.close_time,
      expiration_time: first.expiration_time,
      featured: first.featured,
      outcomes,
      resolution_criteria: first.subtitle,
    };
  });
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  // Multi-account state
  const [accounts, setAccounts] = useState<UserAccount[]>(mockAccounts);
  const [activeAccountId, setActiveAccountIdState] = useState<string>(ACCOUNT_IDS.PHASE1);

  // Restore last selected account from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    if (saved && mockAccounts.some((a) => a.accountId === saved)) {
      setActiveAccountIdState(saved);
    }
  }, []);

  const setActiveAccount = useCallback((id: string) => {
    setActiveAccountIdState(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
    }
  }, []);

  // Active account is a derived selector
  const user = useMemo(
    () => accounts.find((a) => a.accountId === activeAccountId) || accounts[0],
    [accounts, activeAccountId],
  );

  // Canonical (cross-account) data — context filters per active account before exposing.
  const [allMarkets, setAllMarkets] = useState<Market[]>(mockMarketsFromEvents);
  const [allEvents, setAllEvents] = useState<Event[]>(mockEvents);
  const [allPositions, setAllPositions] = useState<Position[]>(mockPositions);
  const [allTrades, setAllTrades] = useState<Trade[]>(mockTrades);
  const [allEquity, setAllEquity] = useState<EquityPoint[]>(mockEquityHistory);
  const [plans] = useState<ChallengePlan[]>(mockPlans);
  const [selectedPlan, setSelectedPlan] = useState<ChallengePlan | null>(null);
  const [selectedChallengeType, setSelectedChallengeType] = useState<ChallengeType | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    message: undefined,
  });
  const [marketsLoaded, setMarketsLoaded] = useState(false);

  // Per-active-account selectors
  const positions = useMemo(
    () => allPositions.filter((p) => p.accountId === activeAccountId),
    [allPositions, activeAccountId],
  );
  const trades = useMemo(
    () => allTrades.filter((t) => t.accountId === activeAccountId),
    [allTrades, activeAccountId],
  );
  const equityHistory = useMemo(
    () => allEquity.filter((e) => e.accountId === activeAccountId),
    [allEquity, activeAccountId],
  );

  // Markets / events are not per-account.
  const markets = allMarkets;
  const events = allEvents;

  // Fetch real markets from Polymarket API
  const fetchMarkets = useCallback(async () => {
    try {
      const response = await fetch("/api/markets?limit=100");
      const data = await response.json();

      if (data.markets && data.markets.length > 0) {
        setAllMarkets(data.markets);
        if (data.events && data.events.length > 0) {
          setAllEvents(data.events);
        } else {
          setAllEvents(groupMarketsToEvents(data.markets));
        }
        console.log(`Loaded ${data.markets.length} markets from Polymarket`);
      } else {
        console.log("Using mock markets (API returned empty)");
        setAllMarkets(mockMarketsFromEvents);
        setAllEvents(mockEvents);
      }
    } catch (error) {
      console.error("Failed to fetch markets, using mock data:", error);
      setAllMarkets(mockMarketsFromEvents);
      setAllEvents(mockEvents);
    } finally {
      setMarketsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!marketsLoaded) {
      fetchMarkets();
    }
  }, [marketsLoaded, fetchMarkets]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMarkets();
    }, 300000);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  // Update active account's balance.
  const updateAccountBalance = (newBalance: number) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.accountId === activeAccountId
          ? { ...a, accountBalance: newBalance, peakBalance: Math.max(a.peakBalance, newBalance) }
          : a,
      ),
    );
  };

  // setUser keeps the legacy API: update the active account record.
  const setUser = (next: UserAccount) => {
    setAccounts((prev) => prev.map((a) => (a.accountId === activeAccountId ? next : a)));
  };

  const getMarketByTicker = (ticker: string): Market | undefined =>
    allMarkets.find((m) => m.ticker === ticker);

  const getEventByTicker = (eventTicker: string): Event | undefined =>
    allEvents.find((e) => e.eventTicker === eventTicker);

  const addPosition = (position: Position) => {
    setAllPositions((prev) => [...prev, { ...position, accountId: position.accountId || activeAccountId }]);
  };

  const updatePosition = (
    ticker: string,
    side: "yes" | "no",
    updates: Partial<Position>,
  ) => {
    setAllPositions((prev) =>
      prev.map((pos) =>
        pos.accountId === activeAccountId && pos.ticker === ticker && pos.side === side
          ? { ...pos, ...updates }
          : pos,
      ),
    );
  };

  const closePosition = (ticker: string, side: "yes" | "no", exitPrice: number) => {
    const position = allPositions.find(
      (p) => p.accountId === activeAccountId && p.ticker === ticker && p.side === side,
    );
    if (!position) return;

    const pnl = calculateUnrealizedPnL(position, exitPrice);
    const newBalance = user.accountBalance + pnl + position.market_exposure;

    updateAccountBalance(newBalance);

    setAllPositions((prev) =>
      prev.filter((p) => !(p.accountId === activeAccountId && p.ticker === ticker && p.side === side)),
    );

    setAllTrades((prev) =>
      prev.map((t) =>
        t.accountId === activeAccountId && t.ticker === ticker && t.side === side && !t.exitDate
          ? {
              ...t,
              exitDate: new Date().toISOString(),
              exitPrice,
              pnl,
              pnlPercent: pnl / position.total_traded,
              result: pnl > 0 ? "won" : "lost",
              exitType: "manual_sell" as const,
            }
          : t,
      ),
    );
  };

  const addTrade = (trade: Trade) => {
    setAllTrades((prev) => [{ ...trade, accountId: trade.accountId || activeAccountId }, ...prev]);
  };

  const updateEquity = (date: string, equity: number, balance: number) => {
    setAllEquity((prev) => [...prev, { accountId: activeAccountId, date, equity, balance }]);
  };

  const selectPlan = (planId: string) => {
    const plan = plans.find((p) => p.planId === planId);
    if (plan) setSelectedPlan(plan);
  };

  const selectChallengeType = (typeId: "blitz" | "2step" | "3step") => {
    const type = challengeTypes.find((t) => t.id === typeId);
    if (type) setSelectedChallengeType(type);
  };

  const executeTrade = (ticker: string, side: "yes" | "no", shares: number): boolean => {
    const market = getMarketByTicker(ticker);
    if (!market) return false;

    const price = side === "yes" ? market.yes_ask : market.no_ask;
    const cost = shares * price;
    const fee = Math.floor(cost * 0.02);
    const totalCost = cost + fee;

    if (user.accountBalance < totalCost) {
      alert("Insufficient balance");
      return false;
    }

    const newBalance = user.accountBalance - totalCost;
    updateAccountBalance(newBalance);

    const existingPosition = allPositions.find(
      (p) => p.accountId === activeAccountId && p.ticker === ticker && p.side === side,
    );

    if (existingPosition) {
      const newAvgPrice = calculateNewAveragePrice(
        existingPosition.avg_entry_price || 0,
        existingPosition.position,
        price,
        shares,
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
      addPosition({
        accountId: activeAccountId,
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

    addTrade({
      accountId: activeAccountId,
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
      result: "sold",
      exitType: "manual_sell",
    });

    updateEquity(new Date().toISOString(), newBalance, newBalance);

    // Update active account stats
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.accountId !== activeAccountId) return a;
        const newProfit = (newBalance - a.startingBalance) / a.startingBalance;
        return {
          ...a,
          currentProfit: newProfit,
          peakBalance: Math.max(a.peakBalance, newBalance),
        };
      }),
    );

    return true;
  };

  const value: AppContextType = {
    user,
    updateAccountBalance,
    setUser,
    accounts,
    activeAccountId,
    setActiveAccount,
    markets,
    marketsLoading: !marketsLoaded,
    getMarketByTicker,
    events,
    getEventByTicker,
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
    challengeTypes,
    selectedChallengeType,
    selectChallengeType,
    loadingState,
    setLoadingState,
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
