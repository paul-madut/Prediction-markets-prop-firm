"use client";

// /dashboard/markets/[ticker] — per-market detail + trade panel.
//
// Pulls the market list from /api/markets (cached) and finds the matching
// outcome by ticker. Order entry posts to /api/orders with the active
// account from AppContext. After a fill, refetches account state so the
// dashboard balance / drawdown floor reflect the new equity.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { TextureButton } from "@/components/ui/texture-button";
import { useApp } from "@/context/AppContext";
import { api, ApiError } from "@/lib/api-client";
import type { Market, Event } from "@/types";
import { formatCurrency } from "@/lib/formatters";

interface TradeRow {
  id: string;
  accountId: string;
  side: string;
  sizeContracts: number;
  priceCents: number;
  feesCents: number;
  realizedPnlCents: string | null;
  isOpening: boolean;
  externalMarketId: string;
  executedAt: string;
}

type Side = "yes" | "no";
type Action = "buy" | "sell";

export default function MarketDetailPage() {
  const params = useParams<{ ticker: string }>();
  const ticker = decodeURIComponent(params.ticker);
  const { activeAccount, refresh, signedIn } = useApp();

  const [events, setEvents] = useState<Event[] | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [trades, setTrades] = useState<TradeRow[] | null>(null);

  const [side, setSide] = useState<Side>("yes");
  const [action, setAction] = useState<Action>("buy");
  const [size, setSize] = useState<string>("10");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastFill, setLastFill] = useState<{
    fillPriceCents: number;
    sizeContracts: number;
    side: string;
  } | null>(null);

  // Load market list once on mount.
  useEffect(() => {
    api
      .get<{ events: Event[] }>("/api/markets?limit=200")
      .then((d) => setEvents(d.events ?? []))
      .catch((err) =>
        setEventsError(err instanceof ApiError ? err.message : String(err)),
      );
  }, []);

  // Locate the market by ticker.
  const { market, parentEvent } = useMemo(() => {
    if (!events) return { market: null, parentEvent: null };
    for (const ev of events) {
      const m = ev.outcomes.find((o) => o.ticker === ticker);
      if (m) return { market: m, parentEvent: ev };
    }
    return { market: null, parentEvent: null };
  }, [events, ticker]);

  // Load trades for this account + market.
  async function loadTrades(): Promise<void> {
    if (!activeAccount) return;
    try {
      const data = await api.get<TradeRow[]>(
        `/api/trades?accountId=${activeAccount.id}`,
      );
      setTrades(data.filter((t) => t.externalMarketId === ticker));
    } catch {
      setTrades([]);
    }
  }

  useEffect(() => {
    if (activeAccount) void loadTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount?.id, ticker]);

  async function submitOrder(): Promise<void> {
    if (!activeAccount || !market) return;
    setSubmitError(null);
    setSubmitting(true);
    setLastFill(null);
    try {
      const sizeContracts = Number(size);
      if (!Number.isFinite(sizeContracts) || sizeContracts <= 0) {
        throw new Error("Size must be a positive integer");
      }
      const idempotencyKey = crypto.randomUUID();
      const result = await api.post<{
        id: string;
        status: string;
        fillPriceCents?: number;
        sizeContracts: number;
        side: string;
        fillError?: string;
      }>("/api/orders", {
        accountId: activeAccount.id,
        venue: "polymarket",
        externalMarketId: market.ticker,
        externalMarketTicker: market.ticker,
        side,
        action,
        sizeContracts,
        idempotencyKey,
      });
      if (result.fillError) {
        throw new Error(`Order accepted but fill failed: ${result.fillError}`);
      }
      if (typeof result.fillPriceCents === "number") {
        setLastFill({
          fillPriceCents: result.fillPriceCents,
          sizeContracts: result.sizeContracts,
          side: result.side,
        });
      }
      await Promise.all([refresh(), loadTrades()]);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Header
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <Link
          href="/dashboard/markets"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          All markets
        </Link>
      </div>

      {eventsError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Failed to load market: {eventsError}
        </div>
      )}

      {events === null && !eventsError && (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
          Loading market…
        </div>
      )}

      {events && !market && !eventsError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Market <span className="font-mono">{ticker}</span> not found in the active
          list. It may have closed — try the markets browser.
        </div>
      )}

      {market && (
        <>
          {/* Market header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <span>{market.category}</span>
              <span>·</span>
              <span className="font-mono">{market.ticker}</span>
              {parentEvent && parentEvent.outcomes.length > 1 && (
                <>
                  <span>·</span>
                  <span>multi-outcome</span>
                </>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {market.title}
            </h1>
            {market.subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-300 max-w-3xl">
                {market.subtitle}
              </p>
            )}
          </div>

          {/* Quote + trade panel grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quote card */}
            <TextureCard interactive={false} className="lg:col-span-2">
              <TextureCardContent className="p-6 space-y-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Current quote
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <QuoteTile
                    label="Yes"
                    bid={market.yes_bid}
                    ask={market.yes_ask}
                    accent="emerald"
                    icon={<ArrowTrendingUpIcon className="w-4 h-4" />}
                  />
                  <QuoteTile
                    label="No"
                    bid={market.no_bid}
                    ask={market.no_ask}
                    accent="red"
                    icon={<ArrowTrendingDownIcon className="w-4 h-4" />}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-gray-50 dark:bg-slate-950 rounded-lg px-3 py-2">
                    <div className="text-gray-400 dark:text-gray-500 uppercase">
                      Last
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                      {market.last_price}¢
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-950 rounded-lg px-3 py-2">
                    <div className="text-gray-400 dark:text-gray-500 uppercase">
                      24h vol
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                      {formatCurrency(market.volume_24h)}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-950 rounded-lg px-3 py-2">
                    <div className="text-gray-400 dark:text-gray-500 uppercase">
                      Closes
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                      {market.close_time
                        ? new Date(market.close_time).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                </div>
              </TextureCardContent>
            </TextureCard>

            {/* Order entry */}
            <TextureCard interactive={false}>
              <TextureCardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Place order
                </h2>

                {!signedIn && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Sign in to trade.
                  </div>
                )}
                {signedIn && !activeAccount && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    No active challenge account. Buy a challenge first.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSide("yes")}
                    className={`py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      side === "yes"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                        : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    Yes · {market.yes_ask}¢
                  </button>
                  <button
                    onClick={() => setSide("no")}
                    className={`py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                      side === "no"
                        ? "bg-red-50 border-red-500 text-red-700"
                        : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    No · {market.no_ask}¢
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAction("buy")}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      action === "buy"
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    Buy (open)
                  </button>
                  <button
                    onClick={() => setAction("sell")}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      action === "sell"
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    Sell (close)
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Contracts
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-950 rounded-lg px-3 py-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Side</span>
                    <span className="font-semibold uppercase">{side}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Action</span>
                    <span className="font-semibold capitalize">{action}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Notional max</span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(
                        (Number(size) || 0) *
                          (side === "yes" ? market.yes_ask : market.no_ask),
                      )}
                    </span>
                  </div>
                </div>

                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {lastFill && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800 flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Filled {lastFill.sizeContracts} {lastFill.side} @{" "}
                      {lastFill.fillPriceCents}¢
                    </span>
                  </div>
                )}

                <TextureButton
                  variant="primary"
                  className="w-full"
                  onClick={() => void submitOrder()}
                  disabled={submitting || !activeAccount || !signedIn}
                >
                  {submitting
                    ? "Submitting…"
                    : `Submit ${action} ${size || 0} ${side.toUpperCase()}`}
                </TextureButton>
              </TextureCardContent>
            </TextureCard>
          </div>

          {/* Recent fills on this market */}
          <TextureCard interactive={false}>
            <TextureCardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Your fills on this market
                </h2>
                <button
                  onClick={() => void loadTrades()}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <ArrowPathIcon className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>
              {trades === null ? (
                <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading…
                </div>
              ) : trades.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No fills on this market yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="text-left py-2 pr-4 font-semibold">Time</th>
                        <th className="text-left py-2 pr-4 font-semibold">Side</th>
                        <th className="text-left py-2 pr-4 font-semibold">Type</th>
                        <th className="text-right py-2 pr-4 font-semibold">Size</th>
                        <th className="text-right py-2 pr-4 font-semibold">Price</th>
                        <th className="text-right py-2 pr-4 font-semibold">Realised P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {trades.map((t) => {
                        const pnl = t.realizedPnlCents ? Number(t.realizedPnlCents) : null;
                        return (
                          <tr key={t.id}>
                            <td className="py-2 pr-4 text-gray-700 dark:text-gray-300 text-xs">
                              {new Date(t.executedAt).toLocaleString()}
                            </td>
                            <td className="py-2 pr-4 capitalize">{t.side}</td>
                            <td className="py-2 pr-4 capitalize text-xs text-gray-500 dark:text-gray-400">
                              {t.isOpening ? "Open" : "Close"}
                            </td>
                            <td className="py-2 pr-4 text-right tabular-nums">
                              {t.sizeContracts}
                            </td>
                            <td className="py-2 pr-4 text-right tabular-nums">
                              {t.priceCents}¢
                            </td>
                            <td
                              className={`py-2 pr-4 text-right tabular-nums ${
                                pnl === null ? "text-gray-400" : pnl >= 0 ? "text-emerald-700" : "text-red-700"
                              }`}
                            >
                              {pnl === null ? "—" : `${pnl >= 0 ? "+" : ""}${formatCurrency(pnl)}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TextureCardContent>
          </TextureCard>
        </>
      )}
    </div>
  );
}

function QuoteTile({
  label,
  bid,
  ask,
  accent,
  icon,
}: {
  label: string;
  bid: number;
  ask: number;
  accent: "emerald" | "red";
  icon: React.ReactNode;
}) {
  const accentCls =
    accent === "emerald"
      ? "from-emerald-50 to-teal-50 border-emerald-200 text-emerald-700"
      : "from-red-50 to-rose-50 border-red-200 text-red-700";
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${accentCls}`}>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
        <span className="inline-flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span>{ask}¢ ask</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums">{(ask + bid) >> 1}¢</span>
        <span className="text-xs opacity-80">{bid}¢ bid</span>
      </div>
    </div>
  );
}
