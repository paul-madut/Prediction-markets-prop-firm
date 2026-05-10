"use client";

// /dashboard/portfolio — open positions + realised P&L history.
//
// Sources:
//   GET /api/accounts/[id]              — open positions list (netContracts ≠ 0)
//   GET /api/accounts/[id]/equity       — live equity / floor / open-PnL
//   GET /api/trades?accountId=<id>      — recent fills (realised P&L)
//
// Layout: top stats grid (balance, equity, open P&L, exposure) → Open
// positions table with allocation bars → Recent realised fills table.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { useApp } from "@/context/AppContext";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/formatters";

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

function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "bad";
}) {
  const valueCls =
    tone === "good"
      ? "text-emerald-700"
      : tone === "bad"
        ? "text-red-700"
        : "text-gray-900 dark:text-gray-100";
  return (
    <TextureCard interactive={false}>
      <TextureCardContent className="p-4">
        <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
          {label}
        </div>
        <div className={`mt-1 text-2xl font-bold tabular-nums ${valueCls}`}>
          {value}
        </div>
        {hint && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</div>
        )}
      </TextureCardContent>
    </TextureCard>
  );
}

export default function PortfolioPage() {
  const { activeAccount, signedIn } = useApp();
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [equity, setEquity] = useState<EquitySnapshot | null>(null);
  const [trades, setTrades] = useState<TradeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  // Compute total exposure (sum of |netContracts × avgEntryPriceCents|).
  const totalExposureCents = useMemo(() => {
    if (!account) return 0;
    return account.positions.reduce(
      (sum, p) => sum + Math.abs(p.netContracts) * p.avgEntryPriceCents,
      0,
    );
  }, [account]);

  if (!signedIn) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Sign in to view your portfolio.
        </div>
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Portfolio
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You don&apos;t have an active challenge account yet.
        </p>
        <Link
          href="/dashboard/new-challenge"
          className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
        >
          Buy a challenge
        </Link>
      </div>
    );
  }

  const balance = equity ? Number(equity.balanceCents) : 0;
  const equityValue = equity ? Number(equity.equityCents) : 0;
  const openPnl = equity ? Number(equity.openPositionsPnlCents) : 0;
  const floor = equity ? Number(equity.drawdownFloorCents) : 0;
  const realisedTotal = (trades ?? []).reduce(
    (sum, t) => sum + (t.realizedPnlCents ? Number(t.realizedPnlCents) : 0),
    0,
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Portfolio
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Open positions, realised history, and live equity for the active challenge account.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-blue-300 disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Failed to load portfolio: {error}
        </div>
      )}

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Balance" value={formatCurrency(balance)} />
        <StatTile
          label="Equity"
          value={formatCurrency(equityValue)}
          hint={`floor ${formatCurrency(floor)}`}
        />
        <StatTile
          label="Open P&L"
          value={`${openPnl >= 0 ? "+" : ""}${formatCurrency(openPnl)}`}
          tone={openPnl >= 0 ? "good" : "bad"}
        />
        <StatTile
          label="Realised P&L"
          value={`${realisedTotal >= 0 ? "+" : ""}${formatCurrency(realisedTotal)}`}
          hint={`${trades?.length ?? 0} fills`}
          tone={realisedTotal >= 0 ? "good" : "bad"}
        />
      </div>

      {/* Open positions */}
      <TextureCard interactive={false}>
        <TextureCardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Open positions
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {account?.positions.length ?? 0} open · exposure{" "}
              {formatCurrency(totalExposureCents)}
            </span>
          </div>
          {!account ? (
            <PositionsSkeleton />
          ) : account.positions.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No open positions. Browse{" "}
              <Link
                href="/dashboard/markets"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                markets
              </Link>{" "}
              to place your first trade.
            </div>
          ) : (
            <div className="space-y-2">
              {account.positions.map((p) => (
                <PositionRow
                  key={p.id}
                  position={p}
                  accountId={account.id}
                  totalExposureCents={totalExposureCents}
                  onClosed={() => void load()}
                />
              ))}
            </div>
          )}
        </TextureCardContent>
      </TextureCard>

      {/* Realised history */}
      <TextureCard interactive={false}>
        <TextureCardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recent fills
            </h2>
            <Link
              href="/dashboard/history"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Full history →
            </Link>
          </div>
          {!trades ? (
            <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading…
            </div>
          ) : trades.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No fills yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="text-left py-2 pr-4 font-semibold">Time</th>
                    <th className="text-left py-2 pr-4 font-semibold">Market</th>
                    <th className="text-left py-2 pr-4 font-semibold">Side</th>
                    <th className="text-left py-2 pr-4 font-semibold">Type</th>
                    <th className="text-right py-2 pr-4 font-semibold">Size</th>
                    <th className="text-right py-2 pr-4 font-semibold">Price</th>
                    <th className="text-right py-2 pr-4 font-semibold">Realised</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {trades.slice(0, 25).map((t) => {
                    const pnl = t.realizedPnlCents ? Number(t.realizedPnlCents) : null;
                    return (
                      <tr key={t.id}>
                        <td className="py-2 pr-4 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(t.executedAt).toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs">
                          <Link
                            href={`/dashboard/markets/${encodeURIComponent(t.externalMarketId)}`}
                            className="text-gray-900 dark:text-gray-100 hover:text-blue-600"
                          >
                            {t.externalMarketId.slice(0, 14)}
                            {t.externalMarketId.length > 14 ? "…" : ""}
                          </Link>
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
          )}
        </TextureCardContent>
      </TextureCard>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PositionRow — collapsed: side badge + market + value + chevron.
//               expanded: entry/current/shares/P&L %, "View" link, "Close".
// ────────────────────────────────────────────────────────────────────────────

function PositionRow({
  position: p,
  accountId,
  totalExposureCents,
  onClosed,
}: {
  position: Position;
  accountId: string;
  totalExposureCents: number;
  onClosed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  const upnl = Number(p.unrealizedPnlCents);
  const exposure = Math.abs(p.netContracts) * p.avgEntryPriceCents;
  const allocPct =
    totalExposureCents > 0 ? (exposure / totalExposureCents) * 100 : 0;

  // Imply current per-contract price from unrealised P&L. This avoids needing
  // a separate live-price field on the Position model.
  //   long  YES @ 30¢, +5¢/contract upnl → current ≈ 35¢
  //   short YES @ 30¢, +5¢/contract upnl → current ≈ 25¢
  const sign = p.netContracts >= 0 ? 1 : -1;
  const currentCents =
    Math.abs(p.netContracts) > 0
      ? p.avgEntryPriceCents + sign * (upnl / Math.abs(p.netContracts))
      : p.avgEntryPriceCents;

  const pnlPct =
    p.avgEntryPriceCents > 0 && Math.abs(p.netContracts) > 0
      ? (upnl / (Math.abs(p.netContracts) * p.avgEntryPriceCents)) * 100
      : 0;

  const positionValueCents = Math.round(
    Math.abs(p.netContracts) * currentCents,
  );

  const sideUpper = p.side.toUpperCase();
  const sideBadge =
    p.side.toLowerCase() === "yes"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
      : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";

  async function close(): Promise<void> {
    setClosing(true);
    setCloseError(null);
    try {
      // Closing = opposite action on the same side.
      // Long position (netContracts > 0) opened with action=buy → close with sell.
      // Short position (netContracts < 0) opened with action=sell → close with buy.
      const action = p.netContracts > 0 ? "sell" : "buy";
      await api.post<{
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
      }).then((r) => {
        if (r.fillError) throw new Error(r.fillError);
      });
      onClosed();
    } catch (err) {
      setCloseError(err instanceof ApiError ? err.message : String(err));
      setClosing(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
        aria-expanded={open}
      >
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${sideBadge}`}
        >
          {sideUpper}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs text-gray-900 dark:text-gray-100 truncate">
            {p.externalMarketId}
          </div>
          <div className="text-[10px] uppercase text-gray-400 dark:text-gray-500">
            {p.venue}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {formatCurrency(positionValueCents)}
          </div>
          <div
            className={`text-xs tabular-nums ${
              upnl >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {upnl >= 0 ? "+" : ""}
            {formatCurrency(upnl)}
          </div>
        </div>
        {open ? (
          <ChevronUpIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-slate-800 px-4 py-3 bg-gray-50/40 dark:bg-slate-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="grid grid-cols-4 gap-6 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Entry
                </div>
                <div className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
                  {p.avgEntryPriceCents.toFixed(1)}¢
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Current
                </div>
                <div className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
                  {currentCents.toFixed(1)}¢
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Shares
                </div>
                <div className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
                  {Math.abs(p.netContracts)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  P&amp;L %
                </div>
                <div
                  className={`font-medium tabular-nums ${
                    pnlPct >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {pnlPct >= 0 ? "+" : ""}
                  {pnlPct.toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/dashboard/markets/${encodeURIComponent(p.externalMarketId)}`}
                aria-label="View market"
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={close}
                disabled={closing}
                className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {closing ? (
                  <>
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Closing…
                  </>
                ) : (
                  "Close"
                )}
              </button>
            </div>
          </div>
          {closeError && (
            <div className="mt-3 text-xs text-red-600 dark:text-red-400">
              Failed to close: {closeError}
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
            <span>Allocation</span>
            <div className="flex-1 max-w-[200px] h-1 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${Math.min(100, allocPct)}%` }}
              />
            </div>
            <span className="tabular-nums">{allocPct.toFixed(0)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PositionsSkeleton() {
  return (
    <div className="space-y-2 animate-pulse" aria-hidden>
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-14 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900"
        />
      ))}
    </div>
  );
}
