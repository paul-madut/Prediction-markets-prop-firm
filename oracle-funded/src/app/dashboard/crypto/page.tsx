"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from "recharts";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  BoltIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { CryptoCard } from "@/components/crypto/CryptoCard";
import { mockCrypto, EXPIRIES, EXPIRY_SECONDS, type Expiry, type CryptoSymbol } from "@/data/mockCrypto";
import { useTickEvery } from "@/hooks/useTickEvery";
import { walkValue, walkCents, seedFromString } from "@/lib/priceWalk";
import { useApp } from "@/context/AppContext";
import { calculateShares, calculateTotalCost } from "@/lib/calculations";
import { formatCurrency } from "@/lib/formatters";
import { StatefulButton } from "@/components/ui/stateful-button";
import { cn } from "@/lib/utils";

// Build a 30-second sparkline trailing the live price.
function buildSpark(seedKey: string, points: number, current: number, vol: number): { t: number; price: number }[] {
  const out: { t: number; price: number }[] = [];
  let p = current;
  const baseSeed = seedFromString(seedKey);
  for (let i = points - 1; i >= 0; i--) {
    p = walkValue(p, baseSeed + i, vol * 4);
    out.push({ t: -i, price: p });
  }
  out[out.length - 1].price = current;
  return out;
}

export default function CryptoPage() {
  const { user, executeTrade } = useApp();
  const [activeSymbol, setActiveSymbol] = useState<string>(mockCrypto[0].symbol);
  const [expiry, setExpiry] = useState<Expiry>("5m");
  const [stakeAmount, setStakeAmount] = useState<string>("100");
  const [instant, setInstant] = useState<boolean>(true);

  // Live spot prices keyed by symbol.
  const [spots, setSpots] = useState<Record<string, number>>(() =>
    Object.fromEntries(mockCrypto.map((c) => [c.symbol, c.spotUsd])),
  );

  // Live up-cents per (symbol, expiry).
  const [oddsCents, setOddsCents] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const c of mockCrypto) {
      for (const e of EXPIRIES) {
        init[`${c.symbol}-${e}`] = 50;
      }
    }
    return init;
  });

  // Tick spot prices every second.
  const tickSpot = useCallback(() => {
    const seedBase = (Date.now() / 1000) | 0;
    setSpots((prev) => {
      const next: Record<string, number> = {};
      for (const c of mockCrypto) {
        const cur = prev[c.symbol] ?? c.spotUsd;
        const seed = seedFromString(c.symbol) + seedBase;
        next[c.symbol] = walkValue(cur, seed, c.volatility);
      }
      return next;
    });
  }, []);
  useTickEvery(1000, tickSpot);

  // Tick odds (in cents) every 2s.
  const tickOdds = useCallback(() => {
    const seedBase = (Date.now() / 2000) | 0;
    setOddsCents((prev) => {
      const next: Record<string, number> = {};
      for (const c of mockCrypto) {
        for (const e of EXPIRIES) {
          const key = `${c.symbol}-${e}`;
          const cur = prev[key] ?? 50;
          const seed = seedFromString(key) + seedBase;
          next[key] = walkCents(cur, seed, 1);
        }
      }
      return next;
    });
  }, []);
  useTickEvery(2000, tickOdds);

  const active: CryptoSymbol = useMemo(
    () => mockCrypto.find((c) => c.symbol === activeSymbol) || mockCrypto[0],
    [activeSymbol],
  );
  const livePrice = spots[active.symbol] ?? active.spotUsd;
  const upCents = oddsCents[`${active.symbol}-${expiry}`] ?? 50;
  const downCents = 100 - upCents;

  // Sparkline for active symbol.
  const spark = useMemo(
    () => buildSpark(`${active.symbol}-spark`, 30, livePrice, active.volatility),
    [active.symbol, livePrice, active.volatility],
  );
  // Target line: midpoint of recent series.
  const target = spark[0].price;

  // Countdown to next bar.
  const [now, setNow] = useState<number>(() => Date.now());
  useTickEvery(1000, () => setNow(Date.now()));
  const expirySeconds = EXPIRY_SECONDS[expiry];
  const remaining = expirySeconds - (Math.floor(now / 1000) % expirySeconds);
  const remainingLabel = `${Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`;

  const stakeCents = parseFloat(stakeAmount || "0") * 100;

  const placeBet = (direction: "up" | "down", forSymbol?: CryptoSymbol) => {
    const symbol = forSymbol || active;
    const ticker = `CRYPTO-${symbol.symbol}-${expiry.toUpperCase()}`;
    const side: "yes" | "no" = direction === "up" ? "yes" : "no";
    const key = `${symbol.symbol}-${expiry}`;
    const cents = direction === "up" ? oddsCents[key] ?? 50 : 100 - (oddsCents[key] ?? 50);
    const shares = calculateShares(stakeCents, cents);
    const totalCost = calculateTotalCost(shares, cents);
    if (shares === 0) {
      alert("Stake too small for current price");
      return;
    }
    if (totalCost > user.accountBalance) {
      alert("Insufficient balance");
      return;
    }
    executeTrade(ticker, side, shares);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Crypto — Up or Down</h1>
        <p className="text-sm text-gray-600 mt-1">
          Pick a direction over a fixed window. Shorter windows pay faster, longer windows offer
          better risk/reward.
        </p>
      </div>

      {/* Asset tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-2 flex gap-1 overflow-x-auto">
        {mockCrypto.slice(0, 6).map((c) => {
          const tabPrice = spots[c.symbol] ?? c.spotUsd;
          const isActive = c.symbol === active.symbol;
          return (
            <button
              key={c.symbol}
              onClick={() => setActiveSymbol(c.symbol)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2",
                isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100",
              )}
            >
              <span>{c.symbol}</span>
              <span className={cn("tabular-nums text-xs", isActive ? "text-blue-100" : "text-gray-500")}>
                ${tabPrice >= 1000 ? Math.round(tabPrice).toLocaleString() : tabPrice.toFixed(2)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Big price + chart + countdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm text-gray-500">{active.name}</div>
            <div className="flex items-baseline gap-3">
              <div className="text-4xl font-bold text-gray-900 tabular-nums">
                ${livePrice >= 1000 ? Math.round(livePrice).toLocaleString() : livePrice.toFixed(active.spotUsd < 10 ? 4 : 2)}
              </div>
              <div className={cn("text-sm font-semibold tabular-nums", active.change24hPct >= 0 ? "text-green-600" : "text-red-600")}>
                {active.change24hPct >= 0 ? "+" : ""}
                {(active.change24hPct * 100).toFixed(2)}% (24h)
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {active.symbol} Up or Down — {expiry} window
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-gray-500 justify-end">
              <ClockIcon className="w-3.5 h-3.5" />
              Next bar
            </div>
            <div className="text-2xl font-bold text-gray-900 tabular-nums">{remainingLabel}</div>
          </div>
        </div>

        <div className="h-48">
          <ResponsiveContainer>
            <AreaChart data={spark}>
              <defs>
                <linearGradient id="spotGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide />
              <YAxis domain={["dataMin", "dataMax"]} hide />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}
                formatter={(v) => {
                  const n = typeof v === "number" ? v : Number(v);
                  return [`$${n >= 1000 ? Math.round(n).toLocaleString() : n.toFixed(2)}`, "Price"];
                }}
                labelFormatter={() => ""}
              />
              <ReferenceLine y={target} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: "Target", position: "right", fontSize: 10, fill: "#6b7280" }} />
              <Area type="monotone" dataKey="price" stroke="#2563eb" fill="url(#spotGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expiry tabs */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 mr-2">Expiry:</span>
          {EXPIRIES.map((e) => (
            <button
              key={e}
              onClick={() => setExpiry(e)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                expiry === e ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200",
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Inline trade widget */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Trade {active.symbol} — {expiry}</h3>
          <button
            onClick={() => setInstant((v) => !v)}
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors",
              instant ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600",
            )}
          >
            <BoltIcon className="w-3.5 h-3.5" />
            INSTANT {instant ? "ON" : "OFF"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Stake amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                min="1"
              />
            </div>
            <div className="mt-2 flex gap-1">
              {[25, 50, 100, 250].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setStakeAmount(String(amt))}
                  className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => placeBet("up")}
            className="flex flex-col items-center justify-center py-4 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
          >
            <ArrowUpIcon className="w-6 h-6 mb-1" />
            <span className="font-bold text-lg tabular-nums">UP @ {upCents}¢</span>
            <span className="text-xs opacity-90 tabular-nums">
              Pays {formatCurrency(calculateShares(stakeCents, upCents) * 100)} if right
            </span>
          </button>

          <button
            onClick={() => placeBet("down")}
            className="flex flex-col items-center justify-center py-4 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <ArrowDownIcon className="w-6 h-6 mb-1" />
            <span className="font-bold text-lg tabular-nums">DOWN @ {downCents}¢</span>
            <span className="text-xs opacity-90 tabular-nums">
              Pays {formatCurrency(calculateShares(stakeCents, downCents) * 100)} if right
            </span>
          </button>
        </div>
      </div>

      {/* Card grid */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">All markets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockCrypto.map((c) => (
            <CryptoCard
              key={c.symbol}
              data={c}
              livePrice={spots[c.symbol] ?? c.spotUsd}
              upPriceCents={oddsCents[`${c.symbol}-${expiry}`] ?? 50}
              downPriceCents={100 - (oddsCents[`${c.symbol}-${expiry}`] ?? 50)}
              expiry={expiry}
              active={c.symbol === active.symbol}
              onSelect={() => setActiveSymbol(c.symbol)}
              onUp={() => placeBet("up", c)}
              onDown={() => placeBet("down", c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
