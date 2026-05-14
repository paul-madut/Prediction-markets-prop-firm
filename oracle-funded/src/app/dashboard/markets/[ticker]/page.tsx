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
import { formatCurrency, formatDate } from "@/lib/formatters";

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

  // Locate the parent event by ticker. The list page links via event.eventTicker,
  // which equals the outcome ticker for binary events but not for multi-outcome
  // events (e.g. an NBA game's event ticker differs from its per-team outcome
  // tickers). Try outcome-match first to keep deep links working; fall back to
  // event-ticker match.
  const parentEvent = useMemo<Event | null>(() => {
    if (!events) return null;
    for (const ev of events) {
      if (ev.outcomes.find((o) => o.ticker === ticker)) return ev;
    }
    return events.find((e) => e.eventTicker === ticker) ?? null;
  }, [events, ticker]);

  // Track which outcome the trade panel is bound to. Default: the URL ticker
  // if it matches an outcome, else the first outcome of the parent event.
  const [selectedOutcomeTicker, setSelectedOutcomeTicker] = useState<string | null>(null);
  useEffect(() => {
    if (!parentEvent) return;
    const matchByUrl = parentEvent.outcomes.find((o) => o.ticker === ticker);
    setSelectedOutcomeTicker(matchByUrl?.ticker ?? parentEvent.outcomes[0]?.ticker ?? null);
  }, [parentEvent, ticker]);

  const market = useMemo<Market | null>(() => {
    if (!parentEvent || !selectedOutcomeTicker) return null;
    return (
      parentEvent.outcomes.find((o) => o.ticker === selectedOutcomeTicker) ??
      parentEvent.outcomes[0] ??
      null
    );
  }, [parentEvent, selectedOutcomeTicker]);

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
              {parentEvent && parentEvent.outcomes.length > 1
                ? parentEvent.title
                : market.title}
            </h1>
            {market.subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-300 max-w-3xl">
                {market.subtitle}
              </p>
            )}
          </div>

          {/* Outcome list — Polymarket-style row per outcome with title +
              % chance + two action buttons (Buy Yes / Buy No). Clicking any
              button rebinds the trade panel to that outcome+side and
              scrolls the panel into view. */}
          {parentEvent && parentEvent.outcomes.length > 1 && (
            <TextureCard interactive={false}>
              <TextureCardContent className="p-0">
                <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-2">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Outcomes
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                    {parentEvent.outcomes.length} options
                  </div>
                </div>
                <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 pb-1.5 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">
                  <span>Outcome</span>
                  <span className="text-right">% Chance</span>
                  <span className="text-right pl-2">Buy Yes</span>
                  <span className="text-right">Buy No</span>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-slate-800 border-t border-gray-100 dark:border-slate-800 max-h-[520px] overflow-y-auto">
                  {[...parentEvent.outcomes]
                    .sort((a, b) => b.yes_ask - a.yes_ask)
                    .map((o) => {
                      const active = o.ticker === selectedOutcomeTicker;
                      // Button prices = ASK (what you actually pay to buy
                      // the corresponding side). API guarantees both fields:
                      //   yes_ask = best Polymarket offer to buy YES
                      //   no_ask  = 100 - yes_bid (the binary complement, clamped ≤99)
                      const yesAsk = o.yes_ask;
                      const noAsk = o.no_ask;
                      // Chance % = mid-market YES probability, distinct from
                      // the ask price shown on the Yes button. Matches the
                      // "implied probability" Polymarket displays prominently.
                      const chancePct = Math.round((o.yes_bid + o.yes_ask) / 2);
                      const pickOutcome = (side: "yes" | "no") => {
                        setSelectedOutcomeTicker(o.ticker);
                        setSide(side);
                        setAction("buy");
                        // Bring the trade panel into view on small screens.
                        requestAnimationFrame(() => {
                          document
                            .getElementById("trade-panel")
                            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        });
                      };
                      return (
                        <li
                          key={o.ticker}
                          className={`grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 transition-colors ${
                            active
                              ? "bg-blue-50/40 dark:bg-blue-950/20"
                              : "hover:bg-gray-50/60 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          {/* Title */}
                          <button
                            type="button"
                            onClick={() => setSelectedOutcomeTicker(o.ticker)}
                            className="text-left min-w-0"
                          >
                            <div
                              className={`text-sm font-medium line-clamp-2 ${
                                active
                                  ? "text-blue-700 dark:text-blue-300"
                                  : "text-gray-900 dark:text-gray-100"
                              }`}
                              title={o.title}
                            >
                              {o.title.replace(/^Will\s+/i, "").replace(/\?$/, "")}
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
                              {typeof o.volume === "number" && Number.isFinite(o.volume)
                                ? `$${(o.volume / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} vol`
                                : "no volume data"}
                            </div>
                          </button>

                          {/* Chance % — mid-market YES probability,
                              distinct from the ask price on the buttons. */}
                          <div className="text-right shrink-0 hidden sm:block">
                            <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100 leading-none">
                              {chancePct}%
                            </div>
                          </div>

                          {/* Buy Yes */}
                          <button
                            type="button"
                            onClick={() => pickOutcome("yes")}
                            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 sm:px-4 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold tabular-nums whitespace-nowrap transition-colors"
                          >
                            Yes <span className="text-[11px] sm:text-xs opacity-80">{yesAsk}¢</span>
                          </button>

                          {/* Buy No */}
                          <button
                            type="button"
                            onClick={() => pickOutcome("no")}
                            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 sm:px-4 rounded-md bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-semibold tabular-nums whitespace-nowrap transition-colors"
                          >
                            No <span className="text-[11px] sm:text-xs opacity-80">{noAsk}¢</span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </TextureCardContent>
            </TextureCard>
          )}

          {/* Quote + trade panel grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quote card */}
            <TextureCard interactive={false} className="lg:col-span-2">
              <TextureCardContent className="p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Current quote
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate" title={market.title}>
                    {market.title}
                  </p>
                </div>
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
                      {market.close_time ? formatDate(market.close_time) : "—"}
                    </div>
                  </div>
                </div>
              </TextureCardContent>
            </TextureCard>

            {/* Order entry */}
            <TextureCard interactive={false} id="trade-panel">
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

                {(() => {
                  // When the trader has no active account the order ticket
                  // can't fire — gray it out so it doesn't look interactive.
                  const ticketDisabled = !signedIn || !activeAccount;
                  return (
                <fieldset disabled={ticketDisabled} className={ticketDisabled ? "opacity-50 cursor-not-allowed space-y-4" : "space-y-4"}>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSide("yes")}
                    disabled={ticketDisabled}
                    className={`py-2 rounded-lg text-sm font-semibold border-2 transition-colors disabled:pointer-events-none ${
                      side === "yes"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                        : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    Yes · {market.yes_ask}¢
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide("no")}
                    disabled={ticketDisabled}
                    className={`py-2 rounded-lg text-sm font-semibold border-2 transition-colors disabled:pointer-events-none ${
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
                    type="button"
                    onClick={() => setAction("buy")}
                    disabled={ticketDisabled}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-colors disabled:pointer-events-none ${
                      action === "buy"
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    Buy (open)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction("sell")}
                    disabled={ticketDisabled}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-colors disabled:pointer-events-none ${
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
                    disabled={ticketDisabled}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 disabled:cursor-not-allowed"
                  />
                </div>
                </fieldset>
                  );
                })()}

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
