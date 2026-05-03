"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ShieldExclamationIcon,
  SignalIcon,
  ClockIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";
import { useAdmin } from "@/context/AdminContext";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  getAccountsNearFloor,
  getRecentBreaches,
} from "@/data/mockAdminAccounts";

type ToneStatus = "ok" | "warning" | "critical";

const toneStyles: Record<ToneStatus, { bg: string; border: string; text: string; dot: string }> = {
  ok: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  critical: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    dot: "bg-red-500",
  },
};

function AlertTile({
  title,
  detail,
  tone,
  href,
  icon,
}: {
  title: string;
  detail: string;
  tone: ToneStatus;
  href: string;
  icon: React.ReactNode;
}) {
  const t = toneStyles[tone];
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl border p-5 transition hover:shadow-sm",
        t.bg,
        t.border
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg bg-white/70", t.text)}>{icon}</div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className={cn("text-xs mt-0.5", t.text)}>{detail}</p>
          </div>
        </div>
        <span className={cn("h-2.5 w-2.5 rounded-full mt-1", t.dot)} />
      </div>
    </Link>
  );
}

function NumberCard({
  label,
  value,
  href,
  emphasis,
}: {
  label: string;
  value: string | number;
  href: string;
  emphasis?: "danger" | "warning";
}) {
  return (
    <Link
      href={href}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition"
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={cn(
          "text-3xl font-bold mt-1",
          emphasis === "danger" && "text-red-600",
          emphasis === "warning" && "text-amber-600",
          !emphasis && "text-gray-900"
        )}
      >
        {value}
      </p>
      <span className="inline-flex items-center text-xs text-indigo-600 mt-3 font-medium">
        View list
        <ArrowRightIcon className="h-3 w-3 ml-1" />
      </span>
    </Link>
  );
}

function QueueCard({
  title,
  count,
  emptyMessage,
  viewAllHref,
  children,
}: {
  title: string;
  count: number;
  emptyMessage: string;
  viewAllHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500">{count} item{count === 1 ? "" : "s"}</span>
      </div>
      <div className="divide-y divide-gray-100 min-h-[140px]">
        {count === 0 ? (
          <div className="px-5 py-10 text-center">
            <CheckCircleIcon className="h-8 w-8 text-gray-300 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
        <Link
          href={viewAllHref}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
        >
          View all
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function FreshnessIndicator() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Render nothing on the server to avoid hydration mismatch
  if (!now) return null;

  return (
    <div className="fixed bottom-4 right-4 z-30 bg-white/90 backdrop-blur border border-gray-200 rounded-full px-3 py-1.5 shadow-sm flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-xs text-gray-700 font-mono">
        {now.toLocaleTimeString([], { hour12: false })}
      </span>
      <span className="text-xs text-gray-400">live</span>
    </div>
  );
}

export default function AdminOverviewPage() {
  const { dashboardStats, payoutQueue } = useAdmin();

  const pendingPayouts = payoutQueue.filter((p) => p.status === "pending");
  const accountsNearFloor = getAccountsNearFloor(2);
  const recentBreaches = getRecentBreaches();

  // For demo: Kalshi tile assumed healthy unless dashboardStats says otherwise.
  // Stuck payments tile = pending > 24h (mock heuristic).
  const stuckPayments = pendingPayouts.filter((p) => {
    const ageMs = Date.now() - new Date(p.requestedAt).getTime();
    return ageMs > 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Live state of trading, risk, and payouts across the firm.
        </p>
      </motion.div>

      {/* Row 1 — Alert tiles */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AlertTile
            title="Kalshi market data"
            detail="Last message 2s ago · all venues subscribed"
            tone="ok"
            href="/admin/firm"
            icon={<SignalIcon className="h-5 w-5" />}
          />
          <AlertTile
            title="Stuck payments"
            detail={
              stuckPayments > 0
                ? `${stuckPayments} pending > 24h`
                : "No payments stuck"
            }
            tone={stuckPayments > 0 ? "warning" : "ok"}
            href="/admin/payouts"
            icon={<ClockIcon className="h-5 w-5" />}
          />
          <AlertTile
            title="Pending signals"
            detail={
              dashboardStats.activeAlerts > 0
                ? `${dashboardStats.activeAlerts} awaiting review`
                : "No signals pending — detection enables in beta"
            }
            tone={dashboardStats.activeAlerts > 0 ? "critical" : "ok"}
            href="/admin/signals"
            icon={<ShieldExclamationIcon className="h-5 w-5" />}
          />
        </div>
      </section>

      {/* Row 2 — Number cards */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <NumberCard
            label="Active accounts"
            value={dashboardStats.activeTraders}
            href="/admin/traders?status=active"
          />
          <NumberCard
            label="Currently trading"
            value={dashboardStats.activeChallenges}
            href="/admin/traders?status=active"
          />
          <NumberCard
            label="Within 2% of DD floor"
            value={accountsNearFloor.length}
            href="/admin/traders?risk=near_floor"
            emphasis={accountsNearFloor.length > 0 ? "danger" : undefined}
          />
          <NumberCard
            label="Awaiting payout"
            value={dashboardStats.pendingPayouts}
            href="/admin/payouts?status=pending"
            emphasis={dashboardStats.pendingPayouts > 0 ? "warning" : undefined}
          />
        </div>
      </section>

      {/* Row 3 — Action queues */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payout requests */}
          <QueueCard
            title="Payout requests"
            count={pendingPayouts.length}
            emptyMessage="No payouts awaiting approval."
            viewAllHref="/admin/payouts"
          >
            {pendingPayouts.slice(0, 5).map((p) => (
              <Link
                key={p.payoutId}
                href={`/admin/payouts/${p.payoutId}`}
                className="block px-5 py-3 hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.traderName}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {p.paymentMethod.replace("_", " ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(p.amount)}
                    </span>
                    <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))}
          </QueueCard>

          {/* Pending signals */}
          <QueueCard
            title="Pending signals"
            count={0}
            emptyMessage="Detection rules enable in beta weeks 3–5."
            viewAllHref="/admin/signals"
          >
            {null}
          </QueueCard>

          {/* Recent breaches */}
          <QueueCard
            title="Recent breaches"
            count={recentBreaches.length}
            emptyMessage="No accounts breached recently."
            viewAllHref="/admin/traders?status=breached"
          >
            {recentBreaches.slice(0, 5).map((acct) => (
              <Link
                key={acct.snapshot.accountId}
                href={`/admin/accounts/${acct.snapshot.accountId}`}
                className="block px-5 py-3 hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {acct.snapshot.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {acct.configName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-red-600">
                    <ArrowTrendingDownIcon className="h-4 w-4" />
                    <span className="text-xs font-semibold">Breached</span>
                  </div>
                </div>
              </Link>
            ))}
          </QueueCard>
        </div>
      </section>

      <FreshnessIndicator />
    </div>
  );
}
