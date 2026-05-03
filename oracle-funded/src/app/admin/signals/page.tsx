"use client";

import React, { useState } from "react";
import {
  ShieldExclamationIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "reviewed";
type SeverityFilter = "all" | "low" | "medium" | "high";
type SignalType =
  | "all"
  | "latency_arb"
  | "copy_trade"
  | "win_rate_anomaly"
  | "trade_timing_pattern"
  | "volume_anomaly"
  | "news_violation"
  | "position_concentration";

interface RoadmapEntry {
  signalType: Exclude<SignalType, "all">;
  label: string;
  description: string;
  enablement: "active" | { betaWeek: number };
}

const roadmap: RoadmapEntry[] = [
  {
    signalType: "news_violation",
    label: "News violation",
    description: "Order placed during a configured news cooldown window.",
    enablement: "active",
  },
  {
    signalType: "position_concentration",
    label: "Position concentration",
    description: "Per-market and per-account stacking limits exceeded.",
    enablement: "active",
  },
  {
    signalType: "win_rate_anomaly",
    label: "Win-rate anomaly",
    description: "Rolling 50-trade win rate above firm threshold.",
    enablement: { betaWeek: 3 },
  },
  {
    signalType: "latency_arb",
    label: "Latency arbitrage",
    description: "Systematic positive edge between fill price and post-fill 5–30s avg.",
    enablement: { betaWeek: 4 },
  },
  {
    signalType: "copy_trade",
    label: "Copy trade similarity",
    description: ">30% same-market same-side trades within 60s of another account.",
    enablement: { betaWeek: 4 },
  },
  {
    signalType: "trade_timing_pattern",
    label: "Trade timing pattern",
    description: "Low coefficient-of-variation in inter-trade gaps (bot-like rhythm).",
    enablement: { betaWeek: 5 },
  },
  {
    signalType: "volume_anomaly",
    label: "Volume anomaly",
    description: "Trade count >5x the trader's 4-week historical average.",
    enablement: { betaWeek: 5 },
  },
];

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-sm font-medium transition border",
        active
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
      )}
    >
      {children}
    </button>
  );
}

export default function AdminSignalsPage() {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [signalType, setSignalType] = useState<SignalType>("all");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-xl">
            <ShieldExclamationIcon className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cheat signals</h1>
            <p className="text-sm text-gray-500 mt-1">
              Statistical detection queue. Hard enforcement is active now; statistical
              detection enables progressively in beta.
            </p>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase text-gray-500 mr-2">Status</span>
          <FilterChip active={status === "all"} onClick={() => setStatus("all")}>
            All
          </FilterChip>
          <FilterChip
            active={status === "pending"}
            onClick={() => setStatus("pending")}
          >
            Pending
          </FilterChip>
          <FilterChip
            active={status === "reviewed"}
            onClick={() => setStatus("reviewed")}
          >
            Reviewed
          </FilterChip>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase text-gray-500 mr-2">
            Severity
          </span>
          {(["all", "low", "medium", "high"] as SeverityFilter[]).map((s) => (
            <FilterChip
              key={s}
              active={severity === s}
              onClick={() => setSeverity(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </FilterChip>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase text-gray-500 mr-2">
            Signal type
          </span>
          <select
            value={signalType}
            onChange={(e) => setSignalType(e.target.value as SignalType)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="all">All types</option>
            {roadmap.map((r) => (
              <option key={r.signalType} value={r.signalType}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Empty state */}
      <section className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gray-100">
          <ShieldCheckIcon className="h-7 w-7 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mt-4">No signals yet</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-xl mx-auto">
          Statistical detection rules will be enabled in beta weeks 3–5 once enough
          trader data exists for threshold tuning. Hard enforcement rules
          (stale-price rejection, position limits, news cooldowns) are{" "}
          <span className="font-semibold text-emerald-700">active now</span>.
        </p>
      </section>

      {/* Capability roadmap */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Detection capability roadmap
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Each rule enables in the listed beta week with admin co-review of
            initial signals before auto-running.
          </p>
        </header>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-500 uppercase">
            <tr className="border-b border-gray-200">
              <th className="px-5 py-2 font-medium">Signal</th>
              <th className="px-5 py-2 font-medium">Description</th>
              <th className="px-5 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {roadmap.map((r) => (
              <tr key={r.signalType}>
                <td className="px-5 py-3 font-medium text-gray-900">{r.label}</td>
                <td className="px-5 py-3 text-gray-600">{r.description}</td>
                <td className="px-5 py-3">
                  {r.enablement === "active" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      <CheckBadgeIcon className="h-3 w-3" />
                      Active now
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                      Beta week {r.enablement.betaWeek}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
