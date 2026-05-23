"use client";

// /dashboard/portfolio — open positions + realised P&L history.
//
// Sources:
//   GET /api/accounts/[id]           — open positions list (netContracts ≠ 0)
//   GET /api/accounts/[id]/equity    — live equity / floor / open-PnL
//   GET /api/trades?accountId=<id>   — recent fills (realised P&L)
//
// Layout: top stats grid (Balance / Equity / Open P&L / Realised) → Holdings
// table with 56px rows, mono numbers, hover paint → Recent fills table.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
} from "@heroicons/react/16/solid";
import { motion, useReducedMotion } from "framer-motion";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { useApp } from "@/context/AppContext";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/formatters";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FilterChip } from "@/components/dashboard/FilterChip";
import { cn } from "@/lib/utils";

interface Position {
  id: string;
  venue: string;
  externalMarketId: string;
  side: string;
  netContracts: number;
  avgEntryPriceCents: number;
  unrealizedPnlCents: string;
  lastPricedAt: string | null;
}

interface AccountDetail {
  id: string;
  status: string;
  startingBalanceCents: string;
  currentBalanceCents: string;
  drawdownFloorCents: string;
  positions: Position[];
}

interface EquitySnapshot {
  balanceCents: string;
  openPositionsPnlCents: string;
  equityCents: string;
  drawdownFloorCents: string;
  distanceToFloorPct: number;
  isBreach: boolean;
}

interface TradeRow {
  id: string;
  side: string;
  sizeContracts: number;
  priceCents: number;
  feesCents: number;
  realizedPnlCents: string | null;
  isOpening: boolean;
  externalMarketId: string;
  executedAt: string;
}

type SideFilter = "all" | "yes" | "no";

export default function PortfolioPage() {
  const { activeAccount, signedIn } = useApp();
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [equity, setEquity] = useState<EquitySnapshot | null>(null);
  const [trades, setTrades] = useState<TradeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sideFilter, setSideFilter] = useState<SideFilter>("all");

  async function load(): Promise<void> {
    if (!activeAccount) return;
    setLoading(true);
    setError(null);
    try {
      const [acc, eq, t] = await Promise.all([
        api.get<AccountDetail>(`/api/accounts/${activeAccount.id}`),
        api.get<EquitySnapshot>(`/api/accounts/${activeAccount.id}/equity`),
        api.get<TradeRow[]>(`/api/trades?accountId=${activeAccount.id}`),
      ]);
      setAccount(acc);
      setEquity(eq);
      setTrades(t);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount?.id]);

  const totalExposureCents = useMemo(() => {
    if (!account) return 0;
    return account.positions.reduce(
      (sum, p) => sum + Math.abs(p.netContracts) * p.avgEntryPriceCents,
      0,
    );
  }, [account]);

  const filteredPositions = useMemo(() => {
    const all = account?.positions ?? [];
    if (sideFilter === "all") return all;
    return all.filter((p) => p.side.toLowerCase() === sideFilter);
  }, [account, sideFilter]);

  if (!signedIn) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <div className="text-sm text-[#ADADAD]">
          Sign in to view your portfolio.
        </div>
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <EmptyState
        title="No active challenge"
        body="Open a challenge to start tracking holdings and realised P&L on this page."
        ctaLabel="Buy a challenge"
        ctaHref="/dashboard/new-challenge"
      />
    );
  }

  const balance = equity ? Number(equity.balanceCents) : 0;
  const equityValue = equity ? Number(equity.equityCents) : 0;
  const openPnl = equity ? Number(equity.openPositionsPnlCents) : 0;
  const realisedTotal = (trades ?? []).reduce(
    (sum, t) => sum + (t.realizedPnlCents ? Number(t.realizedPnlCents) : 0),
    0,
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Portfolio</h1>
          <p className="text-sm text-[#ADADAD] mt-1">
            Open positions, realised history, and live equity for the active
            challenge account.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 h-10 rounded-lg text-sm font-medium text-white bg-white/[0.06] hover:bg-white/[0.10] transition-colors disabled:opacity-40"
        >
          <ArrowPathIcon
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-[rgba(255,28,28,0.14)] border border-[#FF1C1C]/30 rounded-xl px-4 py-3 text-sm text-[#FF1C1C]">
          Failed to load portfolio: {error}
        </div>
      )}

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Balance"
          value={balance / 100}
          format={(v) =>
            `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
          }
        />
        <MetricCard
          label="Equity"
          value={equityValue / 100}
          format={(v) =>
            `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
          }
        />
        <MetricCard
          label="Open P&L"
          value={openPnl / 100}
          format={(v) =>
            `${v >= 0 ? "+" : ""}$${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
          }
          tone={openPnl > 0 ? "good" : openPnl < 0 ? "bad" : "default"}
        />
        <MetricCard
          label="Realised P&L"
          value={realisedTotal / 100}
          format={(v) =>
            `${v >= 0 ? "+" : ""}$${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
          }
          hint={`${trades?.length ?? 0} fills`}
          tone={
            realisedTotal > 0
              ? "good"
              : realisedTotal < 0
                ? "bad"
                : "default"
          }
        />
      </div>

      {/* Filter chips + holdings header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Holdings</h2>
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] tabular-nums">
            {account?.positions.length ?? 0} open · exposure{" "}
            {formatCurrency(totalExposureCents)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={sideFilter === "all"}
            onClick={() => setSideFilter("all")}
          >
            All
          </FilterChip>
          <FilterChip
            active={sideFilter === "yes"}
            onClick={() => setSideFilter("yes")}
          >
            YES
          </FilterChip>
          <FilterChip
            active={sideFilter === "no"}
            onClick={() => setSideFilter("no")}
          >
            NO
          </FilterChip>
        </div>

        <TextureCard interactive={false}>
          <TextureCardContent className="p-0">
            {!account ? (
              <PositionsSkeleton />
            ) : filteredPositions.length === 0 ? (
              <EmptyState
                title={
                  account.positions.length === 0
                    ? "No open positions"
                    : "No positions match this filter"
                }
                body={
                  account.positions.length === 0
                    ? "Place your first market order to see your holdings here."
                    : "Adjust the filter to see your other positions."
                }
                ctaLabel={
                  account.positions.length === 0 ? "Browse markets" : undefined
                }
                ctaHref="/dashboard/markets"
                compact
              />
            ) : (
              <HoldingsTable
                positions={filteredPositions}
                totalExposureCents={totalExposureCents}
                onChanged={() => void load()}
                accountId={account.id}
              />
            )}
          </TextureCardContent>
        </TextureCard>
      </div>

      {/* Realised history */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent fills</h2>
          <Link
            href="/dashboard/history"
            className="text-xs font-mono uppercase tracking-[0.08em] text-[#A769FF] hover:text-white transition-colors"
          >
            Full history →
          </Link>
        </div>
        <TextureCard interactive={false}>
          <TextureCardContent className="p-0">
            {!trades ? (
              <div className="py-10 text-center text-sm text-[#ADADAD]">
                Loading…
              </div>
            ) : trades.length === 0 ? (
              <EmptyState
                title="No fills yet"
                body="When you close a position, it will land here with realised P&L."
                compact
              />
            ) : (
              <FillsTable trades={trades.slice(0, 12)} />
            )}
          </TextureCardContent>
        </TextureCard>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// HoldingsTable
// 56px rows, mono numbers, hover paints bg-white/[0.03], staggered enter.
// ────────────────────────────────────────────────────────────────────────────

function HoldingsTable({
  positions,
  totalExposureCents,
  onChanged,
  accountId,
}: {
  positions: Position[];
  totalExposureCents: number;
  onChanged: () => void;
  accountId: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-[#180630] text-[11px] font-mono uppercase tracking-[0.08em] text-[#ADADAD]">
          <tr className="border-b border-white/10">
            <th className="text-left px-6 py-3 font-medium">Market</th>
            <th className="text-left px-4 py-3 font-medium">Side</th>
            <th className="text-right px-4 py-3 font-medium">Size</th>
            <th className="text-right px-4 py-3 font-medium">Entry</th>
            <th className="text-right px-4 py-3 font-medium">Current</th>
            <th className="text-right px-4 py-3 font-medium">Value</th>
            <th className="text-right px-4 py-3 font-medium">Unrealised P&L</th>
            <th className="text-right px-6 py-3 font-medium">Alloc</th>
            <th className="px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {positions.map((p, i) => (
            <HoldingRow
              key={p.id}
              position={p}
              index={i}
              totalExposureCents={totalExposureCents}
              accountId={accountId}
              onClosed={onChanged}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HoldingRow({
  position: p,
  index,
  totalExposureCents,
  accountId,
  onClosed,
}: {
  position: Position;
  index: number;
  totalExposureCents: number;
  accountId: string;
  onClosed: () => void;
}) {
  const reduce = useReducedMotion();
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  const upnl = Number(p.unrealizedPnlCents);
  const exposure = Math.abs(p.netContracts) * p.avgEntryPriceCents;
  const allocPct =
    totalExposureCents > 0 ? (exposure / totalExposureCents) * 100 : 0;

  // Imply current per-contract price from unrealised P&L.
  const sign = p.netContracts >= 0 ? 1 : -1;
  const currentCents =
    Math.abs(p.netContracts) > 0
      ? p.avgEntryPriceCents + sign * (upnl / Math.abs(p.netContracts))
      : p.avgEntryPriceCents;

  const positionValueCents = Math.round(
    Math.abs(p.netContracts) * currentCents,
  );
  const sideKey = p.side.toLowerCase() === "yes" ? "yes" : "no";

  async function close(): Promise<void> {
    setClosing(true);
    setCloseError(null);
    try {
      const action = p.netContracts > 0 ? "sell" : "buy";
      await api
        .post<{
          id: string;
          status: string;
          fillError?: string;
        }>("/api/orders", {
          accountId,
          venue: p.venue,
          externalMarketId: p.externalMarketId,
          externalMarketTicker: p.externalMarketId,
          side: p.side,
          action,
          sizeContracts: Math.abs(p.netContracts),
          idempotencyKey: crypto.randomUUID(),
        })
        .then((r) => {
          if (r.fillError) throw new Error(r.fillError);
        });
      onClosed();
    } catch (err) {
      setCloseError(err instanceof ApiError ? err.message : String(err));
      setClosing(false);
    }
  }

  const delay = reduce ? 0 : Math.min(index, 7) * 0.03;

  return (
    <motion.tr
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: [0, 0, 0.2, 1] }}
      className="h-14 border-b border-white/10 last:border-b-0 transition-colors hover:bg-white/[0.03]"
    >
      <td className="px-6 align-middle">
        <Link
          href={`/dashboard/markets/${encodeURIComponent(p.externalMarketId)}`}
          className="block max-w-[260px] truncate font-mono text-xs text-white hover:text-[#A769FF] transition-colors"
        >
          {p.externalMarketId}
        </Link>
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#5A6476]">
          {p.venue}
        </div>
      </td>
      <td className="px-4 align-middle">
        <span
          className={cn(
            "inline-flex h-[22px] items-center rounded-full px-2.5 text-[12px] font-semibold uppercase",
            sideKey === "yes"
              ? "bg-[rgba(18,223,186,0.14)] text-[#12DFBA]"
              : "bg-[rgba(255,28,28,0.14)] text-[#FF1C1C]",
          )}
        >
          {p.side}
        </span>
      </td>
      <td className="px-4 text-right font-mono text-sm text-white tabular-nums">
        {Math.abs(p.netContracts).toLocaleString()}
      </td>
      <td className="px-4 text-right font-mono text-sm text-white tabular-nums">
        {p.avgEntryPriceCents.toFixed(1)}¢
      </td>
      <td className="px-4 text-right font-mono text-sm text-white tabular-nums">
        {currentCents.toFixed(1)}¢
      </td>
      <td className="px-4 text-right font-mono text-sm text-white tabular-nums">
        {formatCurrency(positionValueCents)}
      </td>
      <td
        className={cn(
          "px-4 text-right font-mono text-sm font-medium tabular-nums",
          upnl > 0
            ? "text-[#12DFBA]"
            : upnl < 0
              ? "text-[#FF1C1C]"
              : "text-white",
        )}
      >
        {upnl >= 0 ? "+" : ""}
        {formatCurrency(upnl)}
      </td>
      <td className="px-6 align-middle">
        <div className="flex items-center gap-2 justify-end">
          <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-[#A769FF]"
              style={{ width: `${Math.min(100, allocPct)}%` }}
            />
          </div>
          <span className="font-mono text-xs text-[#ADADAD] tabular-nums w-9 text-right">
            {allocPct.toFixed(0)}%
          </span>
        </div>
      </td>
      <td className="px-2 align-middle">
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/dashboard/markets/${encodeURIComponent(p.externalMarketId)}`}
            aria-label="View market"
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-[#ADADAD] hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={close}
            disabled={closing}
            className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-xs font-semibold text-[#FF1C1C] bg-[rgba(255,28,28,0.10)] hover:bg-[rgba(255,28,28,0.16)] disabled:opacity-40 transition-colors"
          >
            {closing ? "…" : "Close"}
          </button>
        </div>
        {closeError && (
          <div className="mt-1 font-mono text-[10px] text-[#FF1C1C]">
            {closeError}
          </div>
        )}
      </td>
    </motion.tr>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// FillsTable — small companion table for recent realised fills.
// ────────────────────────────────────────────────────────────────────────────

function FillsTable({ trades }: { trades: TradeRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-[#180630] text-[11px] font-mono uppercase tracking-[0.08em] text-[#ADADAD]">
          <tr className="border-b border-white/10">
            <th className="text-left px-6 py-3 font-medium">Time</th>
            <th className="text-left px-4 py-3 font-medium">Market</th>
            <th className="text-left px-4 py-3 font-medium">Side</th>
            <th className="text-left px-4 py-3 font-medium">Type</th>
            <th className="text-right px-4 py-3 font-medium">Size</th>
            <th className="text-right px-4 py-3 font-medium">Price</th>
            <th className="text-right px-6 py-3 font-medium">Realised</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const pnl = t.realizedPnlCents ? Number(t.realizedPnlCents) : null;
            const sideKey = t.side.toLowerCase() === "yes" ? "yes" : "no";
            return (
              <tr
                key={t.id}
                className="h-14 border-b border-white/10 last:border-b-0 transition-colors hover:bg-white/[0.03]"
              >
                <td className="px-6 font-mono text-xs text-[#ADADAD] tabular-nums whitespace-nowrap">
                  {new Date(t.executedAt).toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-4">
                  <Link
                    href={`/dashboard/markets/${encodeURIComponent(t.externalMarketId)}`}
                    className="block max-w-[260px] truncate font-mono text-xs text-white hover:text-[#A769FF] transition-colors"
                  >
                    {t.externalMarketId}
                  </Link>
                </td>
                <td className="px-4">
                  <span
                    className={cn(
                      "inline-flex h-[22px] items-center rounded-full px-2.5 text-[12px] font-semibold uppercase",
                      sideKey === "yes"
                        ? "bg-[rgba(18,223,186,0.14)] text-[#12DFBA]"
                        : "bg-[rgba(255,28,28,0.14)] text-[#FF1C1C]",
                    )}
                  >
                    {t.side}
                  </span>
                </td>
                <td className="px-4 text-xs text-[#ADADAD] capitalize">
                  {t.isOpening ? "Open" : "Close"}
                </td>
                <td className="px-4 text-right font-mono text-sm text-white tabular-nums">
                  {t.sizeContracts.toLocaleString()}
                </td>
                <td className="px-4 text-right font-mono text-sm text-white tabular-nums">
                  {t.priceCents}¢
                </td>
                <td
                  className={cn(
                    "px-6 text-right font-mono text-sm font-medium tabular-nums",
                    pnl === null
                      ? "text-[#5A6476]"
                      : pnl > 0
                        ? "text-[#12DFBA]"
                        : pnl < 0
                          ? "text-[#FF1C1C]"
                          : "text-white",
                  )}
                >
                  {pnl === null
                    ? "—"
                    : `${pnl >= 0 ? "+" : ""}${formatCurrency(pnl)}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Shared empty + skeleton states
// ────────────────────────────────────────────────────────────────────────────

function EmptyState({
  title,
  body,
  ctaLabel,
  ctaHref,
  compact,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "text-center",
        compact ? "px-6 py-12" : "max-w-3xl mx-auto py-16",
      )}
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06]">
        <ChartBarIcon className="h-5 w-5 text-[#A769FF]" />
      </div>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#ADADAD]">{body}</p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-[#7F24FF] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(127,36,255,0.55)] hover:bg-[#A769FF] transition-colors"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

function PositionsSkeleton() {
  return (
    <div className="divide-y divide-white/10" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 bg-white/[0.02] animate-pulse" />
      ))}
    </div>
  );
}
