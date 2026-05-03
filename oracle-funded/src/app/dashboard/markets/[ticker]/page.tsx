"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ArrowLeftIcon,
  ChartBarIcon,
  ClockIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useApp } from "@/context/AppContext";
import { useTickEvery } from "@/hooks/useTickEvery";
import { walkCents, seedFromString } from "@/lib/priceWalk";
import { formatVolume, formatCurrency, formatDate } from "@/lib/formatters";
import { calculateShares, calculateTotalCost } from "@/lib/calculations";
import { StatefulButton } from "@/components/ui/stateful-button";
import { cn } from "@/lib/utils";

type Range = "1D" | "7D" | "30D" | "ALL";
const RANGE_POINTS: Record<Range, number> = { "1D": 24, "7D": 84, "30D": 90, ALL: 120 };

function buildHistory(seedKey: string, points: number, currentCents: number): { t: number; price: number }[] {
  const out: { t: number; price: number }[] = [];
  let p = currentCents;
  const baseSeed = seedFromString(seedKey);
  for (let i = points - 1; i >= 0; i--) {
    p = walkCents(p, baseSeed + i, 2);
    out.push({ t: -i, price: p });
  }
  // Last point should match the live price
  out[out.length - 1].price = currentCents;
  return out;
}

export default function MarketDetailPage() {
  const params = useParams<{ ticker: string }>();
  const { events, getEventByTicker, getMarketByTicker, executeTrade, user, trades } = useApp();

  // Resolve route param against either eventTicker or market ticker.
  const event = useMemo(() => {
    const ticker = params?.ticker || "";
    const direct = getEventByTicker(ticker);
    if (direct) return direct;
    const market = getMarketByTicker(ticker);
    if (market) return events.find((e) => e.outcomes.some((o) => o.ticker === market.ticker));
    return undefined;
  }, [params?.ticker, events, getEventByTicker, getMarketByTicker]);

  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [stakeAmount, setStakeAmount] = useState<string>("100");
  const [range, setRange] = useState<Range>("7D");
  const [resolutionExpanded, setResolutionExpanded] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(null);

  const market = useMemo(() => {
    if (!event) return undefined;
    return event.outcomes.find((o) => o.ticker === selectedTicker) || event.outcomes[0];
  }, [event, selectedTicker]);

  const historyKey = market?.ticker || "";
  const points = RANGE_POINTS[range];
  const history = useMemo(() => {
    if (!market) return [];
    return buildHistory(historyKey, points, livePrice ?? market.yes_ask);
  }, [historyKey, points, market, livePrice]);

  // Live tick the last point.
  useTickEvery(market ? 1500 : 0, () => {
    if (!market) return;
    const seed = seedFromString(market.ticker) + ((Date.now() / 1500) | 0);
    setLivePrice((prev) => walkCents(prev ?? market.yes_ask, seed, 1));
  });

  if (!event || !market) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Market not found</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          The ticker &ldquo;{params?.ticker}&rdquo; doesn&apos;t match any open market.
        </p>
        <Link
          href="/dashboard/markets"
          className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700"
        >
          <ArrowLeftIcon className="w-4 h-4" /> Back to Markets
        </Link>
      </div>
    );
  }

  const isMulti = event.outcomes.length > 1;
  const yesAsk = livePrice ?? market.yes_ask;
  const noAsk = Math.min(99, 100 - yesAsk);
  const price = side === "yes" ? yesAsk : noAsk;

  const stakeCents = parseFloat(stakeAmount || "0") * 100;
  const shares = calculateShares(stakeCents, price);
  const totalCost = calculateTotalCost(shares, price);

  const setStakeFromBalancePct = (pct: number) => {
    const amount = Math.floor((user.accountBalance * pct) / 100) / 100;
    setStakeAmount(String(amount));
  };

  const tradeActivity = trades
    .filter((t) => t.ticker === market.ticker)
    .slice(0, 10);

  const handleTrade = async () => {
    const ok = executeTrade(market.ticker, side, shares);
    if (!ok) throw new Error("Insufficient balance");
    setStakeAmount("100");
  };

  const resolution = event.resolution_criteria || event.subtitle || "";
  const isLongResolution = resolution.length > 200;

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/dashboard/markets"
        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900"
      >
        <ArrowLeftIcon className="w-4 h-4" /> Back to Markets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
        {/* MAIN */}
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
            <div className="flex items-start gap-4">
              <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-slate-800">
                {event.image ? (
                  <Image src={event.image} alt={event.title} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <ChartBarIcon className="w-7 h-7 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                    {event.category}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {event.outcomes.length} outcome{event.outcomes.length === 1 ? "" : "s"}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{event.title}</h1>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                  <span>Volume: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatVolume(event.volume_total)}</span></span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    Closes {formatDate(event.close_time)}
                  </span>
                </div>
              </div>
            </div>

            {/* Resolution criteria */}
            {resolution && (
              <div className="mt-5 pt-5 border-t border-gray-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Resolution criteria</h3>
                <p className={cn("text-sm text-gray-600 dark:text-gray-300", !resolutionExpanded && isLongResolution && "line-clamp-3")}>
                  {resolution}
                </p>
                {isLongResolution && (
                  <button
                    onClick={() => setResolutionExpanded((v) => !v)}
                    className="mt-1 text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                  >
                    {resolutionExpanded ? "Show less" : "Show more"}
                    <ChevronDownIcon className={cn("w-3 h-3 transition-transform", resolutionExpanded && "rotate-180")} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{market.outcome_label || "YES"} price</div>
                <div className="text-3xl font-bold text-blue-600 tabular-nums">{yesAsk}¢</div>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                {(["1D", "7D", "30D", "ALL"] as Range[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded transition-colors",
                      range === r ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-600 dark:text-gray-300 hover:text-gray-900",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="t" hide />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}¢`} stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}
                    formatter={(v) => [`${typeof v === "number" ? v : Number(v)}¢`, "Price"]}
                    labelFormatter={() => ""}
                  />
                  <Area type="monotone" dataKey="price" stroke="#2563eb" fill="url(#priceGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Outcomes table */}
          {isMulti && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
              <div className="p-4 border-b border-gray-100 dark:border-slate-800">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Outcomes</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {[...event.outcomes]
                  .sort((a, b) => b.yes_ask - a.yes_ask)
                  .map((o) => {
                    const active = o.ticker === market.ticker;
                    return (
                      <button
                        key={o.ticker}
                        onClick={() => {
                          setSelectedTicker(o.ticker);
                          setLivePrice(null);
                        }}
                        className={cn(
                          "w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors",
                          active && "bg-blue-50",
                        )}
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">{o.outcome_label || o.title}</span>
                        <div className="flex items-center gap-4 tabular-nums">
                          <span className="text-sm text-gray-500 dark:text-gray-400">{formatVolume(o.volume)}</span>
                          <span className="font-bold text-blue-600 w-12 text-right">{o.yes_ask}¢</span>
                          <span className={cn(
                            "text-xs font-semibold px-2 py-1 rounded",
                            active ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300",
                          )}>
                            {active ? "Selected" : "Select"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Activity */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent activity</h3>
            </div>
            {tradeActivity.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No trades yet on this outcome. Be the first.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-950 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="text-left p-3 font-medium">Side</th>
                    <th className="text-right p-3 font-medium">Shares</th>
                    <th className="text-right p-3 font-medium">Price</th>
                    <th className="text-right p-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {tradeActivity.map((t) => (
                    <tr key={t.tradeId}>
                      <td className="p-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-semibold uppercase",
                          t.side === "yes" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
                        )}>
                          {t.side}
                        </span>
                      </td>
                      <td className="p-3 text-right tabular-nums">{t.shares}</td>
                      <td className="p-3 text-right tabular-nums">{t.entryPrice}¢</td>
                      <td className="p-3 text-right text-gray-500 dark:text-gray-400">{formatDate(t.entryDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* SIDEBAR ORDER PANEL */}
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 space-y-4"
          >
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Trade</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">{market.outcome_label || market.title}</div>
            </div>

            {/* Yes/No prices */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSide("yes")}
                className={cn(
                  "p-3 rounded-lg border-2 text-left transition-colors",
                  side === "yes" ? "border-green-600 bg-green-50" : "border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50",
                )}
              >
                <div className="text-xs text-gray-500 dark:text-gray-400">YES</div>
                <div className="font-bold text-green-700 tabular-nums text-lg">{yesAsk}¢</div>
              </button>
              <button
                onClick={() => setSide("no")}
                className={cn(
                  "p-3 rounded-lg border-2 text-left transition-colors",
                  side === "no" ? "border-red-600 bg-red-50" : "border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50",
                )}
              >
                <div className="text-xs text-gray-500 dark:text-gray-400">NO</div>
                <div className="font-bold text-red-700 tabular-nums text-lg">{noAsk}¢</div>
              </button>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                  min="1"
                />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[1, 2, 5].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setStakeFromBalancePct(pct)}
                    className="px-2 py-1 text-xs font-semibold border border-gray-200 dark:border-slate-800 rounded hover:bg-gray-50 dark:hover:bg-slate-800/50"
                  >
                    {pct}% of acct
                  </button>
                ))}
              </div>
            </div>

            <div className="text-sm space-y-1 bg-gray-50 dark:bg-slate-950 rounded-lg p-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Shares</span>
                <span className="font-semibold tabular-nums">{shares}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Total cost</span>
                <span className="font-semibold tabular-nums">{formatCurrency(totalCost)}</span>
              </div>
            </div>

            <StatefulButton
              onClick={handleTrade}
              disabled={shares === 0 || totalCost > user.accountBalance}
              className="w-full py-3"
            >
              {totalCost > user.accountBalance
                ? "Insufficient Balance"
                : `Buy ${side === "yes" ? "Yes" : "No"} @ ${price}¢`}
            </StatefulButton>

            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Account balance: {formatCurrency(user.accountBalance)}
            </div>
          </motion.div>
        </aside>
      </div>
    </div>
  );
}
