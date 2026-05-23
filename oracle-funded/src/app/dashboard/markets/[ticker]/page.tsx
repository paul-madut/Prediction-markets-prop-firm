"use client";

// /dashboard/markets/[ticker] — per-market detail + trade panel.
//
// Pulls the market list from /api/markets (cached) and finds the matching
// outcome by ticker. Order entry posts to /api/orders with the active
// account from AppContext. After a fill, refetches account state so the
// dashboard balance / drawdown floor reflect the new equity.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useApp } from "@/context/AppContext";
import { api, ApiError } from "@/lib/api-client";
import type { Market, Event } from "@/types";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { springs } from "@/components/markets/motion";
import { cn } from "@/lib/utils";

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

  // Mobile drawer state. On desktop the order panel is sticky on the
  // right; on mobile it slides up from the bottom via a `gentle` spring.
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Load market list once on mount.
  useEffect(() => {
    api
      .get<{ events: Event[] }>("/api/markets?limit=200")
      .then((d) => setEvents(d.events ?? []))
      .catch((err) => {
        const raw = err instanceof ApiError ? err.message : String(err);
        // Polymarket upstream errors leak as raw TypeErrors. Hide the stack
        // trace from end users; log the detail for ourselves.
        console.error("[markets/detail] failed to load events feed", err);
        const looksInternal = /cannot read|undefined|null|TypeError/i.test(raw);
        setEventsError(
          looksInternal
            ? "We couldn't load live market data right now. Please refresh in a moment."
            : raw,
        );
      });
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
      setSubmitError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <Link
          href="/dashboard/markets"
          className="inline-flex items-center gap-1.5 text-[13px] text-white/55 hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          All markets
        </Link>
      </div>

      {eventsError && (
        <div className="bg-[#FF1C1C]/[0.14] border border-[#FF1C1C]/30 rounded-xl px-4 py-3 text-[13px] text-[#FF1C1C]">
          Failed to load market: {eventsError}
        </div>
      )}

      {events === null && !eventsError && (
        <div className="text-[13px] text-white/55 py-8 text-center">Loading market…</div>
      )}

      {events && !market && !eventsError && (
        <div className="bg-[#FFB539]/[0.14] border border-[#FFB539]/30 rounded-xl px-4 py-3 text-[13px] text-[#FFB539]">
          Market <span className="font-mono">{ticker}</span> not found in the active list. It may
          have closed — try the markets browser.
        </div>
      )}

      {market && parentEvent && (
        <>
          {/* Hero */}
          <MarketHero
            title={
              parentEvent.outcomes.length > 1 ? parentEvent.title : market.title
            }
            ticker={market.ticker}
            category={market.category}
            multi={parentEvent.outcomes.length > 1}
            yesAsk={market.yes_ask}
          />

          {/* Outcome list — Polymarket-style row per outcome with title +
              % chance + two action buttons (Buy Yes / Buy No). Clicking any
              button rebinds the trade panel to that outcome+side. */}
          {parentEvent.outcomes.length > 1 && (
            <OutcomeList
              outcomes={parentEvent.outcomes}
              selectedTicker={selectedOutcomeTicker}
              onPick={(o, nextSide) => {
                setSelectedOutcomeTicker(o.ticker);
                setSide(nextSide);
                setAction("buy");
                // Bring the trade panel into view on small screens.
                requestAnimationFrame(() => {
                  document
                    .getElementById("trade-panel")
                    ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                });
              }}
            />
          )}

          {/* Quote + trade panel grid. Desktop: 2/3 quote + 1/3 sticky
              order ticket. Mobile: stack with a single "Place order"
              button that opens a bottom drawer. */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <QuoteCard market={market} />
              <RecentFillsCard
                trades={trades}
                onRefresh={() => void loadTrades()}
              />
            </div>

            {/* Desktop sticky order panel */}
            <div className="hidden lg:block">
              <div className="sticky top-6">
                <OrderTicket
                  market={market}
                  side={side}
                  setSide={setSide}
                  action={action}
                  setAction={setAction}
                  size={size}
                  setSize={setSize}
                  signedIn={signedIn}
                  activeAccount={activeAccount}
                  submitting={submitting}
                  submitError={submitError}
                  lastFill={lastFill}
                  onSubmit={() => void submitOrder()}
                  primary
                />
              </div>
            </div>

            {/* Mobile fixed CTA opens drawer */}
            <div className="lg:hidden fixed bottom-4 left-4 right-4 z-30">
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={springs.snappy}
                onClick={() => setDrawerOpen(true)}
                className="w-full h-12 rounded-lg bg-[#7F24FF] hover:bg-[#A769FF] text-white text-[14px] font-semibold transition-colors"
                style={{ boxShadow: "0 8px 24px -6px rgba(127, 36, 255, 0.55)" }}
              >
                Place order
              </motion.button>
            </div>
          </div>

          {/* Mobile drawer */}
          <OrderDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          >
            <OrderTicket
              market={market}
              side={side}
              setSide={setSide}
              action={action}
              setAction={setAction}
              size={size}
              setSize={setSize}
              signedIn={signedIn}
              activeAccount={activeAccount}
              submitting={submitting}
              submitError={submitError}
              lastFill={lastFill}
              onSubmit={() => void submitOrder()}
              primary
            />
          </OrderDrawer>
        </>
      )}
    </div>
  );
}

// -- Hero -----------------------------------------------------------------

function MarketHero({
  title,
  ticker,
  category,
  multi,
  yesAsk,
}: {
  title: string;
  ticker: string;
  category: string;
  multi: boolean;
  yesAsk: number;
}) {
  // Count-up on first paint only (DESIGN.md › Number counters).
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[12px] font-semibold bg-white/[0.06] text-white/85">
          {category}
        </span>
        <span className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[11px] font-mono uppercase tracking-wider bg-white/[0.06] text-white/85">
          {ticker}
        </span>
        {multi && (
          <span className="text-[12px] text-white/55 font-mono uppercase tracking-wider">
            multi-outcome
          </span>
        )}
      </div>
      <h1
        className="text-[28px] font-bold text-white tracking-tight leading-tight"
        style={{ fontFamily: "var(--font-plus-jakarta-sans), 'Plus Jakarta Sans', sans-serif" }}
      >
        {title}
      </h1>
      {!multi && (
        <div className="flex items-baseline gap-3">
          <CountUpNumber value={yesAsk} suffix="%" />
          <span className="text-[12px] font-mono uppercase tracking-wider text-white/55">
            Yes implied
          </span>
        </div>
      )}
    </div>
  );
}

function CountUpNumber({ value, suffix }: { value: number; suffix?: string }) {
  // Animate from 0 → value once per mount. Subsequent re-renders show
  // the static value without re-animating (per DESIGN.md › Number counters).
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const animated = useRef(false);

  useEffect(() => {
    if (animated.current || reduce) {
      setDisplay(value);
      return;
    }
    animated.current = true;
    const start = performance.now();
    const duration = 600;
    let raf = 0;
    const tick = (t: number) => {
      const elapsed = t - start;
      const p = Math.min(1, elapsed / duration);
      // easeOut cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);

  return (
    <span className="text-5xl font-mono font-semibold text-white tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

// -- Outcome list ---------------------------------------------------------

function OutcomeList({
  outcomes,
  selectedTicker,
  onPick,
}: {
  outcomes: Market[];
  selectedTicker: string | null;
  onPick: (o: Market, side: "yes" | "no") => void;
}) {
  return (
    <div className="bg-[#180630] border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-[16px] font-semibold text-white">Outcomes</h2>
        <span className="text-[12px] font-mono tabular-nums text-white/55">
          {outcomes.length} options
        </span>
      </div>
      <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 pb-2 text-[11px] font-mono uppercase tracking-wider text-white/45">
        <span>Outcome</span>
        <span className="text-right">Chance</span>
        <span className="text-right pl-2">Yes</span>
        <span className="text-right">No</span>
      </div>
      <ul className="divide-y divide-white/[0.06] border-t border-white/[0.06] max-h-[520px] overflow-y-auto">
        {[...outcomes]
          .sort((a, b) => b.yes_ask - a.yes_ask)
          .map((o) => {
            const active = o.ticker === selectedTicker;
            const yesAsk = o.yes_ask;
            const noAsk = o.no_ask;
            const chancePct = Math.round((o.yes_bid + o.yes_ask) / 2);
            return (
              <li
                key={o.ticker}
                className={cn(
                  "grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto] items-center gap-3 sm:gap-4 px-5 transition-colors",
                  "min-h-[56px] py-2",
                  active ? "bg-white/[0.04]" : "hover:bg-white/[0.03]",
                )}
              >
                <button
                  type="button"
                  onClick={() => onPick(o, "yes")}
                  className="text-left min-w-0"
                >
                  <div
                    className={cn(
                      "text-[14px] line-clamp-2",
                      active ? "text-[#A769FF] font-medium" : "text-white",
                    )}
                    title={o.title}
                  >
                    {o.title.replace(/^Will\s+/i, "").replace(/\?$/, "")}
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-white/45 mt-0.5">
                    {typeof o.volume === "number" && Number.isFinite(o.volume)
                      ? `$${(o.volume / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} vol`
                      : "no volume data"}
                  </div>
                </button>

                <div className="text-right shrink-0 hidden sm:block">
                  <div className="text-[16px] font-mono font-semibold tabular-nums text-white leading-none">
                    {chancePct}%
                  </div>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  transition={springs.snappy}
                  onClick={() => onPick(o, "yes")}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-3 sm:px-4 rounded-md bg-[#12DFBA]/[0.14] hover:bg-[#12DFBA]/[0.22] text-[#12DFBA] text-[13px] font-semibold whitespace-nowrap transition-colors"
                >
                  Yes
                  <span className="font-mono tabular-nums opacity-80">{yesAsk}¢</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  transition={springs.snappy}
                  onClick={() => onPick(o, "no")}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-3 sm:px-4 rounded-md bg-[#FF1C1C]/[0.14] hover:bg-[#FF1C1C]/[0.22] text-[#FF1C1C] text-[13px] font-semibold whitespace-nowrap transition-colors"
                >
                  No
                  <span className="font-mono tabular-nums opacity-80">{noAsk}¢</span>
                </motion.button>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

// -- Quote card -----------------------------------------------------------

function QuoteCard({ market }: { market: Market }) {
  return (
    <div className="bg-[#180630] border border-white/10 rounded-xl p-6 space-y-5">
      <div>
        <h2 className="text-[16px] font-semibold text-white">Current quote</h2>
        <p className="text-[12px] text-white/55 mt-1 truncate" title={market.title}>
          {market.title}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <QuoteTile label="Yes" bid={market.yes_bid} ask={market.yes_ask} tone="success" />
        <QuoteTile label="No" bid={market.no_bid} ask={market.no_ask} tone="danger" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Last" value={`${market.last_price}¢`} />
        <StatTile label="24h vol" value={formatCurrency(market.volume_24h)} />
        <StatTile
          label="Closes"
          value={market.close_time ? formatDate(market.close_time) : "—"}
        />
      </div>
    </div>
  );
}

function QuoteTile({
  label,
  bid,
  ask,
  tone,
}: {
  label: string;
  bid: number;
  ask: number;
  tone: "success" | "danger";
}) {
  const toneCls =
    tone === "success"
      ? "bg-[#12DFBA]/[0.14] border-[#12DFBA]/30 text-[#12DFBA]"
      : "bg-[#FF1C1C]/[0.14] border-[#FF1C1C]/30 text-[#FF1C1C]";
  return (
    <div className={cn("rounded-xl border p-4", toneCls)}>
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{ask}¢ ask</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-mono font-semibold tabular-nums">
          {(ask + bid) >> 1}¢
        </span>
        <span className="text-[12px] font-mono tabular-nums opacity-80">{bid}¢ bid</span>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0C0319] border border-white/[0.06] rounded-lg px-3 py-2">
      <div className="text-[11px] font-mono uppercase tracking-wider text-white/45">
        {label}
      </div>
      <div className="text-[14px] font-mono font-semibold tabular-nums text-white mt-1">
        {value}
      </div>
    </div>
  );
}

// -- Order ticket ---------------------------------------------------------

function OrderTicket({
  market,
  side,
  setSide,
  action,
  setAction,
  size,
  setSize,
  signedIn,
  activeAccount,
  submitting,
  submitError,
  lastFill,
  onSubmit,
  primary,
}: {
  market: Market;
  side: Side;
  setSide: (s: Side) => void;
  action: Action;
  setAction: (a: Action) => void;
  size: string;
  setSize: (v: string) => void;
  signedIn: boolean;
  activeAccount: { id: string } | null;
  submitting: boolean;
  submitError: string | null;
  lastFill: { fillPriceCents: number; sizeContracts: number; side: string } | null;
  onSubmit: () => void;
  primary?: boolean;
}) {
  const ticketDisabled = !signedIn || !activeAccount;

  return (
    <div
      id="trade-panel"
      className="bg-[#180630] border border-white/10 rounded-xl p-6 space-y-4"
    >
      <h2 className="text-[16px] font-semibold text-white">Place order</h2>

      {!signedIn && (
        <div className="text-[13px] text-white/55">Sign in to trade.</div>
      )}
      {signedIn && !activeAccount && (
        <div className="text-[12px] text-[#FFB539] bg-[#FFB539]/[0.14] border border-[#FFB539]/30 rounded-lg px-3 py-2">
          No active challenge account. Buy a challenge first.
        </div>
      )}

      <fieldset
        disabled={ticketDisabled}
        className={cn(
          "space-y-4",
          ticketDisabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            transition={springs.snappy}
            onClick={() => setSide("yes")}
            disabled={ticketDisabled}
            className={cn(
              "h-11 rounded-lg text-[13px] font-semibold transition-colors disabled:pointer-events-none",
              side === "yes"
                ? "bg-[#12DFBA]/[0.22] text-[#12DFBA]"
                : "bg-white/[0.06] text-white/75 hover:bg-white/[0.1]",
            )}
          >
            Yes · <span className="font-mono tabular-nums">{market.yes_ask}¢</span>
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            transition={springs.snappy}
            onClick={() => setSide("no")}
            disabled={ticketDisabled}
            className={cn(
              "h-11 rounded-lg text-[13px] font-semibold transition-colors disabled:pointer-events-none",
              side === "no"
                ? "bg-[#FF1C1C]/[0.22] text-[#FF1C1C]"
                : "bg-white/[0.06] text-white/75 hover:bg-white/[0.1]",
            )}
          >
            No · <span className="font-mono tabular-nums">{market.no_ask}¢</span>
          </motion.button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            transition={springs.snappy}
            onClick={() => setAction("buy")}
            disabled={ticketDisabled}
            className={cn(
              "h-10 rounded-lg text-[12px] font-semibold transition-colors disabled:pointer-events-none",
              action === "buy"
                ? "bg-white/[0.1] text-white"
                : "bg-white/[0.04] text-white/55 hover:bg-white/[0.08]",
            )}
          >
            Buy (open)
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            transition={springs.snappy}
            onClick={() => setAction("sell")}
            disabled={ticketDisabled}
            className={cn(
              "h-10 rounded-lg text-[12px] font-semibold transition-colors disabled:pointer-events-none",
              action === "sell"
                ? "bg-white/[0.1] text-white"
                : "bg-white/[0.04] text-white/55 hover:bg-white/[0.08]",
            )}
          >
            Sell (close)
          </motion.button>
        </div>

        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wide text-white/55 mb-2">
            Contracts
          </label>
          <input
            type="number"
            min={1}
            value={size}
            onChange={(e) => setSize(e.target.value)}
            disabled={ticketDisabled}
            className="w-full h-11 px-3 rounded-lg bg-white/[0.04] focus:bg-white/[0.06] border border-transparent text-white font-mono tabular-nums text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7F24FF]/45 disabled:cursor-not-allowed"
          />
        </div>
      </fieldset>

      <div className="bg-[#0C0319] border border-white/[0.06] rounded-lg px-3 py-2 space-y-1.5">
        <SummaryRow label="Side" value={side.toUpperCase()} />
        <SummaryRow label="Action" value={action.charAt(0).toUpperCase() + action.slice(1)} />
        <SummaryRow
          label="Notional max"
          value={formatCurrency(
            (Number(size) || 0) * (side === "yes" ? market.yes_ask : market.no_ask),
          )}
          mono
        />
      </div>

      {submitError && (
        <div className="bg-[#FF1C1C]/[0.14] border border-[#FF1C1C]/30 rounded-lg px-3 py-2 text-[12px] text-[#FF1C1C] flex items-start gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {lastFill && (
        <div className="bg-[#12DFBA]/[0.14] border border-[#12DFBA]/30 rounded-lg px-3 py-2 text-[12px] text-[#12DFBA] flex items-start gap-2">
          <CheckCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Filled <span className="font-mono tabular-nums">{lastFill.sizeContracts}</span>{" "}
            {lastFill.side} @{" "}
            <span className="font-mono tabular-nums">{lastFill.fillPriceCents}¢</span>
          </span>
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        whileHover={{ y: -1 }}
        transition={springs.snappy}
        onClick={onSubmit}
        disabled={submitting || !activeAccount || !signedIn}
        className={cn(
          "w-full h-11 rounded-lg text-[14px] font-semibold transition-colors",
          "bg-[#7F24FF] hover:bg-[#A769FF] text-white",
          "disabled:opacity-40 disabled:cursor-not-allowed",
        )}
        style={
          primary
            ? { boxShadow: "0 8px 24px -6px rgba(127, 36, 255, 0.55)" }
            : undefined
        }
      >
        {submitting
          ? "Submitting…"
          : `Submit ${action} ${size || 0} ${side.toUpperCase()}`}
      </motion.button>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className="text-white/55">{label}</span>
      <span
        className={cn(
          "font-semibold text-white",
          mono && "font-mono tabular-nums",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// -- Mobile drawer --------------------------------------------------------

function OrderDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Close on Esc.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="lg:hidden fixed inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={springs.gentle}
            className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-[#1f0a3d] border-t border-white/10 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="block w-10 h-1 mx-auto rounded-full bg-white/15" />
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// -- Recent fills ---------------------------------------------------------

function RecentFillsCard({
  trades,
  onRefresh,
}: {
  trades: TradeRow[] | null;
  onRefresh: () => void;
}) {
  return (
    <div className="bg-[#180630] border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[16px] font-semibold text-white">Your fills on this market</h2>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1 text-[12px] text-white/55 hover:text-white transition-colors"
        >
          <ArrowPathIcon className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
      {trades === null ? (
        <div className="py-6 text-center text-[13px] text-white/55">Loading…</div>
      ) : trades.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-white/55">
          No fills on this market yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-[11px] font-mono uppercase tracking-wider text-white/45">
                <th className="text-left py-2 pr-4 font-semibold">Time</th>
                <th className="text-left py-2 pr-4 font-semibold">Side</th>
                <th className="text-left py-2 pr-4 font-semibold">Type</th>
                <th className="text-right py-2 pr-4 font-semibold">Size</th>
                <th className="text-right py-2 pr-4 font-semibold">Price</th>
                <th className="text-right py-2 pr-4 font-semibold">Realised P&amp;L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {trades.map((t) => {
                const pnl = t.realizedPnlCents ? Number(t.realizedPnlCents) : null;
                return (
                  <tr
                    key={t.id}
                    className="h-14 hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-2 pr-4 text-white/85 text-[12px] font-mono tabular-nums">
                      {new Date(t.executedAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 capitalize text-white">{t.side}</td>
                    <td className="py-2 pr-4 capitalize text-[12px] text-white/55">
                      {t.isOpening ? "Open" : "Close"}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono tabular-nums text-white">
                      {t.sizeContracts}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono tabular-nums text-white">
                      {t.priceCents}¢
                    </td>
                    <td
                      className={cn(
                        "py-2 pr-4 text-right font-mono tabular-nums",
                        pnl === null
                          ? "text-white/45"
                          : pnl >= 0
                            ? "text-[#12DFBA]"
                            : "text-[#FF1C1C]",
                      )}
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
    </div>
  );
}
