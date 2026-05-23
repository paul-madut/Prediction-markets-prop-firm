"use client";

// Trader dashboard. Visual structure ported verbatim from origin/main
// (the live build at app.webflux.ca). Data shape adapted: gold standard
// reads `user.{username, accountBalance, winRate, ...}` from a mock-data
// provider; we map our real `useApp()` (user/email, accounts[], activeAccount
// with cents balances) into the same view shape via `deriveView()` below.
// Where mvp has no real data source yet (trades, positions, intra-day
// drawdown, win rate), values fall back to zero so zero-state UIs render.

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useApp, type AccountRow } from "@/context/AppContext";
import { formatCurrency, formatPercent, formatDate } from "@/lib/formatters";
import {
 XAxis,
 YAxis,
 Tooltip,
 ResponsiveContainer,
 Area,
 AreaChart,
} from "recharts";
import {
 ChevronDownIcon,
 CalendarIcon,
 KeyIcon,
 ShareIcon,
 CurrencyDollarIcon,
 CheckCircleIcon,
 XCircleIcon,
 ClockIcon,
 ArrowTrendingUpIcon,
 RocketLaunchIcon,
 ChartBarIcon,
 ChevronLeftIcon,
 ChevronRightIcon,
 XMarkIcon,
 DocumentDuplicateIcon,
 CheckIcon,
 EyeIcon,
 EyeSlashIcon,
 ServerIcon,
 GlobeAltIcon,
 ArrowDownTrayIcon,
} from "@heroicons/react/16/solid";
import * as Tabs from "@radix-ui/react-tabs";
import {
 format,
 startOfMonth,
 endOfMonth,
 eachDayOfInterval,
 isSameDay,
 addMonths,
 subMonths,
 getDay,
} from "date-fns";
import {
 TextureCard,
 TextureCardContent,
 TextureSeparator,
} from "@/components/ui/texture-card";
import { TextureButton } from "@/components/ui/texture-button";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { AnimatePresence, motion } from "framer-motion";
import { DemoBanner } from "@/components/DemoBanner";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { RecentActivity, type ActivityItem } from "@/components/dashboard/RecentActivity";

// ────────────────────────────────────────────────────────────────────────────
// Adapter: map AccountRow + UserClaims → the shape the gold-standard JSX wants
// ────────────────────────────────────────────────────────────────────────────

type Phase = "evaluation_1" | "evaluation_2" | "funded";
type AccountStatus = "active" | "passed" | "breached" | "funded";

interface DashboardUserView {
 username: string;
 userId: string;
 email: string;
 accountId: string;
 accountSize: number; // cents
 accountBalance: number; // cents
 startingBalance: number; // cents
 peakBalance: number; // cents
 challengeStartDate: string; // ISO
 accountPhase: Phase;
 status: AccountStatus;
 winRate: number; // 0..1
 currentProfit: number; // ratio (balance-start)/start
 tradingDaysCompleted: number;
 tradingDaysRequired: number;
 profitTarget: number; // ratio (e.g. 0.08)
 dailyDrawdownLimit: number; // ratio (e.g. 0.05)
 maxDrawdownLimit: number; // ratio (e.g. 0.10)
 currentDailyDrawdown: number; // ratio (negative)
 currentMaxDrawdown: number; // ratio (negative)
}

interface DashboardAccountView {
 accountId: string;
 accountBalance: number;
 startingBalance: number;
 accountSize: number;
 accountPhase: Phase;
}

function displayName(
 fullName: string | null | undefined,
 email: string | null | undefined,
): string {
 if (fullName && fullName.trim()) return fullName.trim();
 if (!email) return "Trader";
 const local = email.split("@")[0] ?? email;
 return local
 .split(/[._-]+/)
 .filter(Boolean)
 .map((p) => p[0].toUpperCase() + p.slice(1))
 .join(" ");
}

function phaseFromAccount(a: AccountRow): Phase {
 if (a.status === "funded") return "funded";
 return a.currentPhase.phaseNumber === 2 ? "evaluation_2" : "evaluation_1";
}

function statusFromAccount(a: AccountRow): AccountStatus {
 if (a.status === "funded") return "funded";
 if (a.status === "breached") return "breached";
 if (a.status === "passed_phase") return "passed";
 return "active";
}

function deriveUserView(
 userId: string | undefined,
 email: string | undefined,
 account: AccountRow | null,
 fullName?: string | null,
): DashboardUserView {
 const acct = account;
 const balance = acct ? Number(acct.currentBalanceCents) : 0;
 const starting = acct ? Number(acct.startingBalanceCents) : 0;
 const peak = acct ? Number(acct.highestEodBalanceCents) : starting;
 const accountSize = acct ? Number(acct.config.accountSizeCents) : 0;
 const profitTarget = acct
 ? Number(acct.currentPhase.profitTargetPct) / 100
 : 0;
 const dailyDrawdownLimit = acct?.config.dailyDrawdownPct
 ? Number(acct.config.dailyDrawdownPct) / 100
 : 0;
 const maxDrawdownLimit = acct
 ? Number(acct.config.totalDrawdownPct) / 100
 : 0;
 const currentProfit = starting > 0 ? (balance - starting) / starting : 0;
 const currentMaxDrawdown =
 peak > 0 ? Math.min(0, (balance - peak) / peak) : 0;

 return {
 username: displayName(fullName, email),
 userId: userId ?? "—",
 email: email ?? "",
 accountId: acct?.id ?? "—",
 accountSize,
 accountBalance: balance,
 startingBalance: starting,
 peakBalance: peak,
 challengeStartDate: acct?.createdAt ?? new Date().toISOString(),
 accountPhase: acct ? phaseFromAccount(acct) : "evaluation_1",
 status: acct ? statusFromAccount(acct) : "active",
 winRate: 0, // no trades endpoint yet
 currentProfit,
 tradingDaysCompleted: acct?.tradingDaysCount ?? 0,
 tradingDaysRequired: 10, // not yet on schema; firm-default
 profitTarget,
 dailyDrawdownLimit,
 maxDrawdownLimit,
 currentDailyDrawdown: 0, // no intra-day snapshot yet
 currentMaxDrawdown,
 };
}

function deriveAccounts(rows: AccountRow[]): DashboardAccountView[] {
 return rows.map((a) => ({
 accountId: a.id,
 accountBalance: Number(a.currentBalanceCents),
 startingBalance: Number(a.startingBalanceCents),
 accountSize: Number(a.config.accountSizeCents),
 accountPhase: phaseFromAccount(a),
 }));
}

// 14-point monotone interpolation from starting balance → current.
// Visual placeholder until /api/accounts/:id/equity-history exists.
function synthEquityHistory(
 startCents: number,
 currentCents: number,
): { date: string; equity: number; balance: number }[] {
 const points = 14;
 const today = new Date();
 const out: { date: string; equity: number; balance: number }[] = [];
 for (let i = 0; i < points; i++) {
 const t = i / (points - 1);
 const cents = Math.round(startCents + (currentCents - startCents) * t);
 const d = new Date(today);
 d.setDate(today.getDate() - (points - 1 - i));
 out.push({
 date: format(d, "d"),
 equity: cents,
 balance: cents,
 });
 }
 return out;
}

// Format an account ID for visual display: take first 8 hex chars uppercase.
function shortAccountId(id: string): string {
 return id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase();
}

// ────────────────────────────────────────────────────────────────────────────
// Credentials Modal
// ────────────────────────────────────────────────────────────────────────────

const CredentialsModal = ({
 isOpen,
 onClose,
 user,
}: {
 isOpen: boolean;
 onClose: () => void;
 user: DashboardUserView;
}) => {
 const [showPassword, setShowPassword] = useState(false);
 const [copiedField, setCopiedField] = useState<string | null>(null);

 // No fake password. Show the real Login (Supabase user id) and account-id-derived
 // server label. Password row is informational only — users reset via account settings.
 const credentials = [
 { label: "Login ID", value: shortAccountId(user.userId), icon: User2Icon },
 { label: "Email", value: user.email || "—", icon: KeyIcon },
 { label: "Server", value: "oracle-live-01.webflux.io", icon: ServerIcon },
 { label: "Platform", value: "WebFlux Terminal", icon: GlobeAltIcon },
 ];

 const copyToClipboard = (field: string, value: string) => {
 navigator.clipboard.writeText(value);
 setCopiedField(field);
 setTimeout(() => setCopiedField(null), 2000);
 };

 if (!isOpen) return null;

 return (
 <AnimatePresence>
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-center justify-center"
 >
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="absolute inset-0 bg-black/50 backdrop-blur-sm"
 onClick={onClose}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 transition={{ type: "spring", stiffness: 300, damping: 30 }}
 className="relative bg-[#180630] rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
 >
 <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
 <div>
 <h3 className="text-lg font-semibold text-white">
 Account Credentials
 </h3>
 <p className="text-sm text-white/55 mt-0.5">
 Your trading account access details
 </p>
 </div>
 <button
 onClick={onClose}
 className="p-2 hover:bg-gray-100 dark:hover:bg-[#1f0a3d] rounded-lg transition-colors"
 >
 <XMarkIcon className="w-5 h-5 text-white/45" />
 </button>
 </div>
 <div className="p-6 space-y-4">
 {credentials.map((cred) => (
 <div
 key={cred.label}
 className="bg-[#0C0319] dark:bg-[#0C0319] rounded-xl p-4"
 >
 <div className="flex items-center justify-between mb-1.5">
 <span className="text-xs font-medium text-white/45 uppercase tracking-wide">
 {cred.label}
 </span>
 <button
 onClick={() => copyToClipboard(cred.label, cred.value)}
 className="p-1.5 hover:bg-white/10 dark:hover:bg-[#1f0a3d] rounded-md transition-colors"
 >
 {copiedField === cred.label ? (
 <CheckIcon className="w-3.5 h-3.5 text-[#12DFBA]" />
 ) : (
 <DocumentDuplicateIcon className="w-3.5 h-3.5 text-white/45" />
 )}
 </button>
 </div>
 <div className="font-mono text-sm font-medium text-white break-all">
 {cred.value}
 </div>
 </div>
 ))}
 <div className="bg-[#7F24FF]/10 bg-[#1f0a3d]/40 rounded-xl p-4 text-xs text-[#7F24FF] text-[#A769FF] flex items-start gap-2">
 <KeyIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
 <span>
 Reset your password from the{" "}
 <Link href="/dashboard/settings" className="underline">
 account settings
 </Link>{" "}
 page.
 </span>
 </div>
 </div>
 <div className="px-6 pb-6">
 <button
 onClick={() => {
 const allCreds = credentials
 .map((c) => `${c.label}: ${c.value}`)
 .join("\n");
 navigator.clipboard.writeText(allCreds);
 setCopiedField("all");
 setTimeout(() => setCopiedField(null), 2000);
 }}
 className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium text-sm"
 >
 {copiedField === "all" ? (
 <>
 <CheckIcon className="w-4 h-4" />
 Copied All Credentials
 </>
 ) : (
 <>
 <DocumentDuplicateIcon className="w-4 h-4" />
 Copy All Credentials
 </>
 )}
 </button>
 </div>
 </motion.div>
 </motion.div>
 </AnimatePresence>
 );
};

// Inline user icon (gold-standard had a one-off SVG, kept verbatim)
const User2Icon = ({ className }: { className?: string }) => (
 <svg
 className={className}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 >
 <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
 <circle cx="12" cy="7" r="4" />
 </svg>
);

// ────────────────────────────────────────────────────────────────────────────
// Share Metrics Modal
// ────────────────────────────────────────────────────────────────────────────

const ShareMetricsModal = ({
 isOpen,
 onClose,
 user,
}: {
 isOpen: boolean;
 onClose: () => void;
 user: DashboardUserView;
}) => {
 const [copied, setCopied] = useState(false);
 const [downloading, setDownloading] = useState(false);

 const totalPnL = user.accountBalance - user.startingBalance;
 const profitPercent = (
 user.startingBalance > 0
 ? ((user.accountBalance - user.startingBalance) / user.startingBalance) *
 100
 : 0
 ).toFixed(2);

 const phaseLabel =
 user.accountPhase === "evaluation_1"
 ? "Phase 1"
 : user.accountPhase === "evaluation_2"
 ? "Phase 2"
 : "Funded Trader";

 const shareText = [
 `${user.username}'s Trading Performance`,
 ``,
 `Account Balance: ${formatCurrency(user.accountBalance)}`,
 `Total P&L: ${totalPnL >= 0 ? "+" : ""}${formatCurrency(totalPnL)}`,
 `ROI: ${Number(profitPercent) >= 0 ? "+" : ""}${profitPercent}%`,
 `Win Rate: ${formatPercent(user.winRate, 0)}`,
 `Trading Days: ${user.tradingDaysCompleted}`,
 `Status: ${phaseLabel}`,
 ``,
 `Powered by Blueberry Funded`,
 ].join("\n");

 const handleCopy = () => {
 navigator.clipboard.writeText(shareText);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 const handleDownload = () => {
 setDownloading(true);
 const blob = new Blob([shareText], { type: "text/plain" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `trading-metrics-${new Date().toISOString().split("T")[0]}.txt`;
 a.click();
 URL.revokeObjectURL(url);
 setTimeout(() => setDownloading(false), 1000);
 };

 if (!isOpen) return null;

 return (
 <AnimatePresence>
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-center justify-center"
 >
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="absolute inset-0 bg-black/50 backdrop-blur-sm"
 onClick={onClose}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 transition={{ type: "spring", stiffness: 300, damping: 30 }}
 className="relative bg-[#180630] rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
 >
 <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
 <div>
 <h3 className="text-lg font-semibold text-white">
 Share Metrics
 </h3>
 <p className="text-sm text-white/55 mt-0.5">
 Share your trading performance
 </p>
 </div>
 <button
 onClick={onClose}
 className="p-2 hover:bg-gray-100 dark:hover:bg-[#1f0a3d] rounded-lg transition-colors"
 >
 <XMarkIcon className="w-5 h-5 text-white/45" />
 </button>
 </div>

 <div className="p-6">
 <div className="bg-gradient-to-br from-[#0C0319] via-[#180630] to-[#0C0319] rounded-xl p-6 text-white">
 <div className="flex items-center gap-3 mb-5">
 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#A769FF] to-[#7F24FF] flex items-center justify-center text-white font-bold text-lg shadow-[0_4px_14px_-2px_rgba(127,36,255,0.5)]">
 {user.username.charAt(0).toUpperCase()}
 </div>
 <div>
 <div className="font-semibold">{user.username}</div>
 <div className="text-xs text-white/45">
 {phaseLabel}
 </div>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] mb-1">Balance</div>
 <div className="font-mono text-lg font-bold text-white tabular-nums">{formatCurrency(user.accountBalance)}</div>
 </div>
 <div>
 <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] mb-1">Total P&L</div>
 <div className={`font-mono text-lg font-bold tabular-nums ${totalPnL > 0 ? "text-[#12DFBA]" : totalPnL < 0 ? "text-[#FF1C1C]" : "text-white"}`}>
 {totalPnL >= 0 ? "+" : ""}{formatCurrency(totalPnL)}
 </div>
 </div>
 <div>
 <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] mb-1">Win Rate</div>
 <div className="font-mono text-lg font-bold text-white tabular-nums">{formatPercent(user.winRate, 0)}</div>
 </div>
 <div>
 <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] mb-1">ROI</div>
 <div className={`font-mono text-lg font-bold tabular-nums ${Number(profitPercent) > 0 ? "text-[#12DFBA]" : Number(profitPercent) < 0 ? "text-[#FF1C1C]" : "text-white"}`}>
 {Number(profitPercent) >= 0 ? "+" : ""}{profitPercent}%
 </div>
 </div>
 </div>
 <div className="mt-4 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-white/55">
 <span>Blueberry Funded</span>
 <span className="font-mono tabular-nums">{user.tradingDaysCompleted} trading days</span>
 </div>
 </div>
 </div>

 <div className="px-6 pb-6 flex gap-3">
 <button
 onClick={handleCopy}
 className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium text-sm"
 >
 {copied ? (
 <>
 <CheckIcon className="w-4 h-4" />
 Copied!
 </>
 ) : (
 <>
 <DocumentDuplicateIcon className="w-4 h-4" />
 Copy Text
 </>
 )}
 </button>
 <button
 onClick={handleDownload}
 className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#7F24FF] text-white rounded-xl hover:bg-[#6c14ee] transition-colors font-medium text-sm"
 >
 {downloading ? (
 <>
 <CheckIcon className="w-4 h-4" />
 Downloaded!
 </>
 ) : (
 <>
 <ArrowDownTrayIcon className="w-4 h-4" />
 Download
 </>
 )}
 </button>
 </div>
 </motion.div>
 </motion.div>
 </AnimatePresence>
 );
};

// ────────────────────────────────────────────────────────────────────────────
// Circular Progress
// ────────────────────────────────────────────────────────────────────────────

const CircularProgress = ({
 progress,
 size = 80,
 strokeWidth = 8,
 color,
 backgroundColor = "#e5e7eb",
}: {
 progress: number;
 size?: number;
 strokeWidth?: number;
 color: string;
 backgroundColor?: string;
}) => {
 const radius = (size - strokeWidth) / 2;
 const circumference = radius * 2 * Math.PI;
 const offset = circumference - (progress / 100) * circumference;

 return (
 <svg width={size} height={size} className="transform -rotate-90">
 <circle
 cx={size / 2}
 cy={size / 2}
 r={radius}
 fill="none"
 stroke={backgroundColor}
 strokeWidth={strokeWidth}
 />
 <circle
 cx={size / 2}
 cy={size / 2}
 r={radius}
 fill="none"
 stroke={color}
 strokeWidth={strokeWidth}
 strokeDasharray={circumference}
 strokeDashoffset={offset}
 strokeLinecap="round"
 className="transition-all duration-500"
 />
 </svg>
 );
};

// ────────────────────────────────────────────────────────────────────────────
// Time Since Counter
// ────────────────────────────────────────────────────────────────────────────

const TimeSinceCounter = ({ startDate }: { startDate: string }) => {
 const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

 useEffect(() => {
 const calc = () => {
 const start = new Date(startDate).getTime();
 const now = Date.now();
 const diff = Math.max(0, now - start);
 setT({
 days: Math.floor(diff / 86400000),
 hours: Math.floor((diff % 86400000) / 3600000),
 minutes: Math.floor((diff % 3600000) / 60000),
 seconds: Math.floor((diff % 60000) / 1000),
 });
 };
 calc();
 const interval = setInterval(calc, 1000);
 return () => clearInterval(interval);
 }, [startDate]);

 return (
 <div className="flex justify-between text-center">
 <div className="flex-1">
 <div className="font-mono text-2xl font-bold text-white tabular-nums">
 {String(t.days).padStart(2, "0")}
 </div>
 <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] mt-1">DAY</div>
 </div>
 <div className="flex-1">
 <div className="font-mono text-2xl font-bold text-white tabular-nums">
 {String(t.hours).padStart(2, "0")}
 </div>
 <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] mt-1">HR</div>
 </div>
 <div className="flex-1">
 <div className="font-mono text-2xl font-bold text-white tabular-nums">
 {String(t.minutes).padStart(2, "0")}
 </div>
 <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] mt-1">MIN</div>
 </div>
 <div className="flex-1">
 <div className="font-mono text-2xl font-bold text-white tabular-nums">
 {String(t.seconds).padStart(2, "0")}
 </div>
 <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] mt-1">SEC</div>
 </div>
 </div>
 );
};

// ────────────────────────────────────────────────────────────────────────────
// P&L Calendar (zero-state until trades endpoint is wired)
// ────────────────────────────────────────────────────────────────────────────

const PnLCalendar = () => {
 const [currentMonth, setCurrentMonth] = useState(new Date());
 const [viewMode, setViewMode] = useState<"month" | "year">("month");

 const monthStart = startOfMonth(currentMonth);
 const monthEnd = endOfMonth(currentMonth);
 const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
 const startDay = getDay(monthStart);
 const paddingDays = Array(startDay).fill(null);

 return (
 <div className="bg-[#180630]/85 rounded-2xl border border-white/10 p-3 sm:p-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
 <h3 className="text-base sm:text-lg font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
 P&amp;L Calendar
 </h3>
 <div className="flex items-center gap-2 sm:gap-4">
 <div className="flex bg-white/[0.04] border border-white/10 rounded-lg p-1">
 <button
 onClick={() => setViewMode("month")}
 className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition ${
 viewMode === "month"
 ? "bg-[#7F24FF] text-white shadow-[0_4px_12px_-4px_rgba(127,36,255,0.55)]"
 : "text-white/55 hover:text-white"
 }`}
 >
 Month
 </button>
 <button
 onClick={() => setViewMode("year")}
 className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition ${
 viewMode === "year"
 ? "bg-[#7F24FF] text-white shadow-[0_4px_12px_-4px_rgba(127,36,255,0.55)]"
 : "text-white/55 hover:text-white"
 }`}
 >
 Year
 </button>
 </div>
 <div className="flex items-center gap-1 sm:gap-2">
 <button
 onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
 className="p-1 hover:bg-white/[0.06] rounded transition-colors"
 aria-label="Previous month"
 >
 <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white/55" />
 </button>
 <span className="text-xs sm:text-sm font-medium text-white/85 min-w-[80px] sm:min-w-[100px] text-center tabular-nums">
 {format(currentMonth, "yyyy-MM")}
 </span>
 <button
 onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
 className="p-1 hover:bg-white/[0.06] rounded transition-colors"
 aria-label="Next month"
 >
 <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white/55" />
 </button>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1">
 {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
 <div
 key={`${day}-${i}`}
 className="text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white/40 py-1 sm:py-2"
 >
 <span className="hidden sm:inline">
 {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}
 </span>
 <span className="sm:hidden">{day}</span>
 </div>
 ))}
 </div>

 <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
 {paddingDays.map((_, index) => (
 // Out-of-month placeholders: invisible, no fill, no border. Keeps grid
 // alignment without rendering as a heavy black slab.
 <div
 key={`padding-${index}`}
 className="h-12 sm:h-20"
 aria-hidden
 />
 ))}
 {days.map((day) => {
 const isToday = isSameDay(day, new Date());
 return (
 <div
 key={format(day, "yyyy-MM-dd")}
 className={`h-12 sm:h-20 rounded-md sm:rounded-lg p-1 sm:p-1.5 relative transition-colors ${
 isToday
 ? "border-2 border-[#A769FF] bg-[#7F24FF]/12 shadow-[inset_0_0_0_1px_rgba(167,105,255,0.25),0_0_20px_-4px_rgba(127,36,255,0.45)]"
 : "border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15"
 }`}
 >
 <div className={`text-[10px] sm:text-xs mb-0.5 ${isToday ? "font-semibold text-[#A769FF]" : "text-white/55"}`}>
 {format(day, "d")}
 </div>
 </div>
 );
 })}
 </div>
 <p className="text-xs text-white/40 mt-4 text-center">
 Trade activity will appear here once you place your first order.
 </p>
 </div>
 );
};

// ────────────────────────────────────────────────────────────────────────────
// Objective row (label, value/target, progress bar)
// ────────────────────────────────────────────────────────────────────────────

function ObjectiveRow({
 label,
 currentCents,
 targetCents,
 progress,
 tone,
}: {
 label: string;
 currentCents: number;
 targetCents: number;
 progress: number;
 tone: "brand" | "good" | "warn" | "bad";
}) {
 return (
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] font-medium">
 {label}
 </span>
 <span className="font-mono text-sm font-semibold text-white tabular-nums">
 {formatCurrency(currentCents)}
 <span className="text-[#5A6476] font-normal">
 {" "}/ {formatCurrency(targetCents)}
 </span>
 </span>
 </div>
 <ProgressBar value={progress} tone={tone} />
 </div>
 );
}

// ────────────────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
 const {
 user: authUser,
 accounts: rawAccounts,
 activeAccount,
 activeAccountId,
 setActiveAccount,
 loading,
 signedIn,
 } = useApp();

 const [ready, setReady] = useState(false);
 const [showCredentials, setShowCredentials] = useState(false);
 const [showShareMetrics, setShowShareMetrics] = useState(false);
 const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
 const accountSwitcherRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 setReady(true);
 }, []);

 useEffect(() => {
 if (!accountSwitcherOpen) return;
 const onClick = (e: MouseEvent) => {
 if (
 accountSwitcherRef.current &&
 !accountSwitcherRef.current.contains(e.target as Node)
 ) {
 setAccountSwitcherOpen(false);
 }
 };
 document.addEventListener("mousedown", onClick);
 return () => document.removeEventListener("mousedown", onClick);
 }, [accountSwitcherOpen]);

 const user = useMemo(
 () =>
 deriveUserView(
 authUser?.userId,
 authUser?.email,
 activeAccount,
 authUser?.profile?.fullName,
 ),
 [authUser, activeAccount],
 );
 const accounts = useMemo(() => deriveAccounts(rawAccounts), [rawAccounts]);
 const equityHistory = useMemo(
 () => synthEquityHistory(user.startingBalance, user.accountBalance),
 [user.startingBalance, user.accountBalance],
 );

 if (loading || !ready) return <DashboardSkeleton />;

 if (!signedIn) {
 return (
 <div className="max-w-2xl mx-auto py-16 text-center">
 <p className="text-white/55">
 Not signed in. Redirecting…
 </p>
 </div>
 );
 }

 if (!activeAccount) {
 return (
 <div className="max-w-2xl mx-auto py-12">
 <TextureCard interactive={false}>
 <TextureCardContent className="p-10 text-center">
 <RocketLaunchIcon className="w-10 h-10 text-[#A769FF] mx-auto mb-3" />
 <h2 className="text-2xl font-bold text-white mb-2">
 Welcome, {user.username}
 </h2>
 <p className="text-white/75 mb-6">
 You don&apos;t have a challenge account yet. Pick one to get
 started.
 </p>
 <TextureButton variant="primary" size="lg" asChild>
 <Link href="/dashboard/new-challenge">
 Browse Challenges
 </Link>
 </TextureButton>
 </TextureCardContent>
 </TextureCard>
 </div>
 );
 }

 // Stats
 const todaysProfit = 0; // no intra-day endpoint yet
 const trades: { pnl: number; result?: string }[] = [];
 const positions: unknown[] = [];
 const highestVolume = 0;
 const lowestVolume = 0;

 const chartData = equityHistory.map((p) => ({
 date: p.date,
 equity: p.equity / 100,
 balance: p.balance / 100,
 }));

 // Progress bars
 const profitProgress =
 user.profitTarget > 0
 ? (user.currentProfit / user.profitTarget) * 100
 : 0;
 const dailyDDProgress =
 user.dailyDrawdownLimit > 0
 ? (Math.abs(user.currentDailyDrawdown) / user.dailyDrawdownLimit) * 100
 : 0;
 const maxDDProgress =
 user.maxDrawdownLimit > 0
 ? (Math.abs(user.currentMaxDrawdown) / user.maxDrawdownLimit) * 100
 : 0;
 const tradingDaysProgress =
 user.tradingDaysRequired > 0
 ? (user.tradingDaysCompleted / user.tradingDaysRequired) * 100
 : 0;

 return (
 <div className="space-y-8">
 <DemoBanner />

 {/* Account Selector Bar */}
 <div className="relative z-30">
 <TextureCard>
 <TextureCardContent className="py-3 sm:py-4 px-4 sm:px-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
 <div className="flex items-center gap-3 sm:gap-5">
 <div className="relative" ref={accountSwitcherRef}>
 <button
 onClick={() => setAccountSwitcherOpen((v) => !v)}
 aria-haspopup="listbox"
 aria-expanded={accountSwitcherOpen}
 className="flex items-center gap-2 sm:gap-3 group rounded-lg -m-1 p-1 hover:bg-[#0C0319] dark:hover:bg-[#1f0a3d]/50 transition-colors"
 >
 <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#A769FF] to-[#7F24FF] flex items-center justify-center shadow-sm">
 <CurrencyDollarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
 </div>
 <div className="text-left">
 <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] font-medium">
 Account Size
 </div>
 <div className="font-mono text-lg sm:text-xl font-bold text-white tabular-nums">
 <AnimatedNumber
 value={user.accountSize / 100}
 format={(v) => `$${v.toLocaleString()}`}
 />
 </div>
 </div>
 <ChevronDownIcon
 className={`w-4 h-4 text-white/45 group-hover:text-[#A769FF] transition-all ${
 accountSwitcherOpen ? "rotate-180 text-[#A769FF]" : ""
 }`}
 />
 </button>

 <AnimatePresence>
 {accountSwitcherOpen && (
 <motion.div
 initial={{ opacity: 0, y: -4 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -4 }}
 transition={{ duration: 0.15 }}
 className="absolute left-0 top-full mt-2 w-80 bg-[#180630] rounded-xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden z-[100]"
 role="listbox"
 >
 <div className="px-4 py-2 border-b border-gray-100 dark:border-white/10">
 <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">
 Switch account
 </p>
 </div>
 <div className="p-2 max-h-80 overflow-y-auto">
 {accounts.map((a) => {
 const pct =
 a.startingBalance > 0
 ? ((a.accountBalance - a.startingBalance) /
 a.startingBalance) *
 100
 : 0;
 const isActive = a.accountId === activeAccountId;
 const phaseLabel =
 a.accountPhase === "evaluation_1"
 ? "Phase 1"
 : a.accountPhase === "evaluation_2"
 ? "Phase 2"
 : "Funded";
 const phaseBadge =
 a.accountPhase === "funded"
 ? "bg-[#12DFBA]/15 text-green-800"
 : a.accountPhase === "evaluation_2"
 ? "bg-[#7F24FF]/15 text-blue-800"
 : "bg-[#FFB539]/15 text-amber-800";
 return (
 <button
 key={a.accountId}
 onClick={() => {
 setActiveAccount(a.accountId);
 setAccountSwitcherOpen(false);
 }}
 role="option"
 aria-selected={isActive}
 className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#0C0319] dark:hover:bg-[#1f0a3d]/50 transition-colors ${
 isActive ? "bg-[#7F24FF]/10 hover:bg-[#7F24FF]/10" : ""
 }`}
 >
 <div className="flex items-center gap-2 mb-1">
 <span
 className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${phaseBadge}`}
 >
 {phaseLabel}
 </span>
 <span className="font-mono text-xs text-[#ADADAD] tabular-nums">
 ${(a.accountSize / 100000).toFixed(0)}K
 </span>
 {isActive && (
 <span className="ml-auto text-[10px] font-semibold text-[#A769FF] inline-flex items-center gap-1">
 <CheckCircleIcon className="w-3 h-3" />
 ACTIVE
 </span>
 )}
 </div>
 <div className="flex items-baseline gap-2">
 <span className="font-mono font-bold text-white tabular-nums text-sm">
 {formatCurrency(a.accountBalance)}
 </span>
 <span
 className={`font-mono text-xs font-semibold tabular-nums ${
 pct > 0 ? "text-[#12DFBA]" : pct < 0 ? "text-[#FF1C1C]" : "text-white"
 }`}
 >
 {pct >= 0 ? "+" : ""}
 {pct.toFixed(2)}%
 </span>
 </div>
 </button>
 );
 })}
 </div>
 <Link
 href="/dashboard/new-challenge"
 onClick={() => setAccountSwitcherOpen(false)}
 className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-white/10 text-[#A769FF] font-semibold text-sm hover:bg-[#0C0319] dark:hover:bg-[#1f0a3d]/50"
 >
 <RocketLaunchIcon className="w-4 h-4" />
 Start New Challenge
 </Link>
 </motion.div>
 )}
 </AnimatePresence>
 </div>

 <div className="h-10 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent hidden sm:block" />

 <div className="hidden sm:flex items-center gap-4 text-sm">
 <div className="flex items-center gap-1.5">
 <CalendarIcon className="w-3.5 h-3.5 text-[#5A6476]" />
 <span className="font-mono text-xs text-[#ADADAD] tabular-nums">
 {formatDate(user.challengeStartDate, "yyyy-MM-dd")}
 </span>
 </div>

 <div className="h-4 w-px bg-white/10 dark:bg-slate-700" />

 <div className="flex items-center gap-1.5">
 <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-[#A769FF]" />
 <span className="font-mono text-xs text-[#ADADAD] tabular-nums">
 {Math.round(
 Number(activeAccount.config.profitSplitPct ?? 90),
 )}
 % split
 </span>
 </div>

 <div className="h-4 w-px bg-white/10 dark:bg-slate-700" />

 <div className="flex items-center gap-1.5">
 <div
 className={`w-2 h-2 rounded-full ${
 user.accountPhase === "funded"
 ? "bg-[#12DFBA]"
 : "bg-[#A769FF]"
 } animate-pulse`}
 />
 <span
 className={`font-medium ${
 user.accountPhase === "funded"
 ? "text-[#12DFBA]"
 : "text-[#A769FF]"
 }`}
 >
 {user.accountPhase === "evaluation_1"
 ? "Phase 1"
 : user.accountPhase === "evaluation_2"
 ? "Phase 2"
 : "Funded"}
 </span>
 </div>
 </div>
 </div>

 <div className="flex sm:hidden items-center gap-3 text-xs">
 <div className="flex items-center gap-1.5">
 <div
 className={`w-2 h-2 rounded-full ${
 user.accountPhase === "funded"
 ? "bg-[#12DFBA]"
 : "bg-[#A769FF]"
 } animate-pulse`}
 />
 <span
 className={`font-medium ${
 user.accountPhase === "funded"
 ? "text-[#12DFBA]"
 : "text-[#A769FF]"
 }`}
 >
 {user.accountPhase === "evaluation_1"
 ? "Phase 1"
 : user.accountPhase === "evaluation_2"
 ? "Phase 2"
 : "Funded"}
 </span>
 </div>
 <span className="text-white/35 dark:text-white/70">|</span>
 <code className="font-mono text-white/45">
 {shortAccountId(user.accountId)}
 </code>
 </div>

 <code className="hidden sm:block text-xs font-mono text-white/45 bg-[#0C0319] dark:bg-[#0C0319] px-3 py-1.5 rounded-md border border-gray-100 dark:border-white/10">
 {shortAccountId(user.accountId)}
 </code>
 </div>
 </TextureCardContent>
 </TextureCard>
 </div>

 {/* Welcome Back Hero */}
 <TextureCard interactive={false}>
 <TextureCardContent className="p-0 relative overflow-hidden">
 <div className="flex flex-col lg:flex-row">
 <div className="flex-1 p-8 relative">
 <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-gradient-to-tr from-[#7F24FF]/25 to-transparent rounded-full blur-3xl pointer-events-none" />
 <div className="relative z-10">
 <h1 className="text-lg font-medium text-white/55 mb-0.5">
 Welcome back,
 </h1>
 <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-[#A769FF] to-[#7F24FF] bg-clip-text text-transparent mb-5" style={{ fontFamily: "var(--font-heading)" }}>
 {user.username}
 </h2>
 <div className="flex items-center gap-3">
 <TextureButton variant="primary" size="lg" asChild>
 <Link href="/dashboard/new-challenge">
 <RocketLaunchIcon className="w-5 h-5" />
 Get Funded
 </Link>
 </TextureButton>
 <TextureButton variant="secondary" size="lg" asChild>
 <Link href="/dashboard/markets">
 <ChartBarIcon className="w-5 h-5" />
 Browse Markets
 </Link>
 </TextureButton>
 </div>
 </div>
 </div>

 <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-white/15 to-transparent my-6" />
 <div className="lg:hidden mx-8">
 <TextureSeparator className="mx-0" />
 </div>

 <div className="flex-1 p-8 flex items-center">
 <div className="grid grid-cols-3 gap-6 w-full text-center">
 <div>
 <div className="font-mono text-2xl font-bold text-white tabular-nums">
 {formatPercent(user.winRate, 0)}
 </div>
 <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] font-medium mt-2">
 Win Rate
 </div>
 </div>
 <div>
 <div
 className={`font-mono text-2xl font-bold tabular-nums ${
 user.currentProfit > 0
 ? "text-[#12DFBA]"
 : user.currentProfit < 0
 ? "text-[#FF1C1C]"
 : "text-white"
 }`}
 >
 {user.currentProfit >= 0 ? "+" : ""}
 {formatPercent(user.currentProfit)}
 </div>
 <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] font-medium mt-2">
 Profit
 </div>
 </div>
 <div>
 <div className="font-mono text-2xl font-bold text-white tabular-nums">
 {user.tradingDaysCompleted}
 <span className="text-[#5A6476] font-normal">
 /{user.tradingDaysRequired}
 </span>
 </div>
 <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] font-medium mt-2">
 Trading Days
 </div>
 </div>
 </div>
 </div>
 </div>
 </TextureCardContent>
 </TextureCard>

 {/* Main Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Left Column */}
 <div className="lg:col-span-2 space-y-6">
 {/* KPI Row */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <MetricCard
 label="Account Balance"
 value={user.accountBalance / 100}
 format={(v) =>
 `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
 }
 hint={`Drawdown floor ${formatCurrency(
 Math.max(
 0,
 user.peakBalance -
 user.maxDrawdownLimit * user.startingBalance,
 ),
 )}`}
 />
 <MetricCard
 label="Today's P&L"
 value={todaysProfit / 100}
 format={(v) =>
 `${v >= 0 ? "+" : ""}$${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
 }
 tone={
 todaysProfit > 0 ? "good" : todaysProfit < 0 ? "bad" : "default"
 }
 />
 <MetricCard
 label="Open Positions"
 value={positions.length}
 format={(v) => v.toString()}
 hint="Active markets you hold"
 />
 <MetricCard
 label="Total Trades"
 value={trades.length}
 format={(v) => v.toString()}
 hint={`${formatPercent(user.winRate, 0)} win rate`}
 />
 </div>

 {/* Performance Chart */}
 <TextureCard interactive={false}>
 <TextureCardContent>
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-semibold text-white">
 Account Performance
 </h3>
 <span
 className={`px-3 py-1 rounded-full text-sm font-medium ${
 user.currentProfit >= 0
 ? "bg-[#12DFBA]/15 text-[#12DFBA]"
 : "bg-[#FF1C1C]/15 text-[#FF6B6B]"
 }`}
 >
 Profit: {user.currentProfit >= 0 ? "+" : ""}
 {formatPercent(user.currentProfit)}
 </span>
 </div>
 <ResponsiveContainer width="100%" height={280}>
 <AreaChart data={chartData}>
 <defs>
 <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#7F24FF" stopOpacity={0.3} />
 <stop offset="95%" stopColor="#7F24FF" stopOpacity={0} />
 </linearGradient>
 </defs>
 <XAxis
 dataKey="date"
 stroke="rgba(255,255,255,0.5)"
 style={{ fontSize: "12px" }}
 />
 <YAxis
 stroke="rgba(255,255,255,0.5)"
 style={{ fontSize: "12px" }}
 tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
 domain={["auto", "auto"]}
 />
 <Tooltip
 contentStyle={{
 backgroundColor: "#1f0a3d",
 border: "1px solid rgba(255,255,255,0.18)",
 borderRadius: "12px",
 color: "#ffffff",
 padding: "12px",
 fontFamily: "var(--font-mono)",
 fontSize: 12,
 }}
 labelStyle={{ color: "#ADADAD", fontFamily: "var(--font-mono)" }}
 itemStyle={{ color: "#A769FF" }}
 formatter={(value) => [
 `$${(typeof value === "number" ? value : Number(value) || 0).toFixed(2)}`,
 "Equity",
 ]}
 />
 <Area
 type="monotone"
 dataKey="equity"
 stroke="#7F24FF"
 strokeWidth={2}
 fill="url(#colorEquity)"
 />
 </AreaChart>
 </ResponsiveContainer>
 </TextureCardContent>
 </TextureCard>

 {/* Objectives */}
 <TextureCard interactive={false}>
 <TextureCardContent>
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-lg font-semibold text-white">
 Objectives
 </h3>
 <Link
 href="/dashboard/rules"
 className="text-sm text-[#A769FF] hover:text-white font-medium flex items-center gap-1 transition-colors"
 >
 View Rules
 <ChevronRightIcon className="w-4 h-4" />
 </Link>
 </div>
 <div className="space-y-5">
 <ObjectiveRow
 label="Profit Target"
 currentCents={user.currentProfit * user.startingBalance}
 targetCents={user.profitTarget * user.startingBalance}
 progress={Math.min(profitProgress, 100)}
 tone={profitProgress >= 100 ? "good" : "brand"}
 />
 <ObjectiveRow
 label="Daily Drawdown"
 currentCents={
 Math.abs(user.currentDailyDrawdown) * user.peakBalance
 }
 targetCents={user.dailyDrawdownLimit * user.peakBalance}
 progress={Math.min(dailyDDProgress, 100)}
 tone={
 dailyDDProgress > 80
 ? "bad"
 : dailyDDProgress > 60
 ? "warn"
 : "good"
 }
 />
 <ObjectiveRow
 label="Max Drawdown"
 currentCents={
 Math.abs(user.currentMaxDrawdown) * user.startingBalance
 }
 targetCents={user.maxDrawdownLimit * user.startingBalance}
 progress={Math.min(maxDDProgress, 100)}
 tone={
 maxDDProgress > 80
 ? "bad"
 : maxDDProgress > 60
 ? "warn"
 : "good"
 }
 />
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] font-medium">
 Trading Days
 </span>
 <span className="font-mono text-sm font-semibold text-white tabular-nums">
 {user.tradingDaysCompleted}
 <span className="text-[#5A6476] font-normal">
 {" "}/ {user.tradingDaysRequired}
 </span>
 </span>
 </div>
 <ProgressBar
 value={Math.min(tradingDaysProgress, 100)}
 tone="brand"
 />
 </div>
 </div>
 </TextureCardContent>
 </TextureCard>
 </div>

 {/* Right Column */}
 <div className="space-y-6">
 {/* Account Data */}
 <TextureCard>
 <TextureCardContent className="p-6">
 <h3 className="text-lg font-semibold text-white mb-4">
 Account Data
 </h3>
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-white/55">
 <div className="w-2 h-2 rounded-full bg-[#12DFBA]"></div>
 Login
 </div>
 <div className="font-medium text-white font-mono text-sm">
 {shortAccountId(user.userId)}
 </div>
 </div>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-white/55">
 <div className="w-2 h-2 rounded-full bg-[#A769FF]"></div>
 Start
 </div>
 <div className="font-mono text-sm font-medium text-white tabular-nums">
 {formatDate(user.challengeStartDate, "yyyy-MM-dd")}
 </div>
 </div>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-white/55">
 <div className="w-2 h-2 rounded-full bg-amber-500"></div>
 Result
 </div>
 <div
 className={`font-medium ${
 user.status === "active" || user.status === "funded"
 ? "text-[#12DFBA]"
 : user.status === "passed"
 ? "text-[#A769FF]"
 : "text-[#FF6B6B]"
 }`}
 >
 {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
 </div>
 </div>
 </div>

 <div className="h-px bg-white/10 dark:bg-slate-700 w-full my-5" />

 <div className="space-y-2.5">
 <button
 onClick={() => setShowCredentials(true)}
 className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#7F24FF]/10 bg-[#1f0a3d]/40 text-[#A769FF] text-[#A769FF] rounded-lg hover:bg-[#7F24FF]/15 dark:hover:bg-blue-950/60 hover:shadow-md hover:scale-[1.02] transition-all duration-200 font-medium"
 >
 <KeyIcon className="w-4 h-4" />
 Credentials
 </button>
 <button
 onClick={() => setShowShareMetrics(true)}
 className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0C0319] dark:bg-[#0C0319] text-white/85 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1f0a3d] hover:shadow-md hover:scale-[1.02] transition-all duration-200 font-medium"
 >
 <ShareIcon className="w-4 h-4" />
 Share Metrics
 </button>
 <Link
 href="/dashboard/payouts"
 className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#12DFBA]/10 dark:bg-green-950/40 text-[#12DFBA] dark:text-green-300 rounded-lg hover:bg-[#12DFBA]/15 dark:hover:bg-green-950/60 hover:shadow-md hover:scale-[1.02] transition-all duration-200 font-medium"
 >
 <CurrencyDollarIcon className="w-4 h-4" />
 Request Payout
 </Link>
 </div>
 </TextureCardContent>
 </TextureCard>

 {/* Volume */}
 <TextureCard>
 <TextureCardContent className="p-6">
 <div className="flex items-center gap-2 mb-3">
 <ArrowTrendingUpIcon className="w-5 h-5 text-white/55" />
 <h3 className="text-sm font-medium text-white/55">
 Volume
 </h3>
 </div>
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-white/55">
 Highest volume
 </span>
 <span className="font-mono text-sm font-semibold text-white tabular-nums">
 {formatCurrency(highestVolume)}
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-white/55">
 Lowest volume
 </span>
 <span className="font-mono text-sm font-semibold text-white tabular-nums">
 {formatCurrency(lowestVolume)}
 </span>
 </div>
 </div>
 </TextureCardContent>
 </TextureCard>

 {/* Time Since First Trade */}
 <TextureCard>
 <TextureCardContent className="p-6">
 <div className="flex items-center gap-2 mb-3">
 <ClockIcon className="w-5 h-5 text-white/55" />
 <h3 className="text-sm font-medium text-white/55">
 Time since challenge start
 </h3>
 </div>
 <div className="h-px bg-white/10 dark:bg-slate-700 w-full mb-3" />
 <TimeSinceCounter startDate={user.challengeStartDate} />
 </TextureCardContent>
 </TextureCard>
 </div>
 </div>

 {/* Tabs */}
 <TextureCard interactive={false}>
 <Tabs.Root defaultValue="calendar">
 <Tabs.List className="flex border-b border-gray-200 dark:border-white/10 px-2 sm:px-4 overflow-x-auto">
 <Tabs.Trigger
 value="statistics"
 className="px-2.5 sm:px-4 py-3 text-xs sm:text-sm font-medium text-white/55 border-b-2 border-transparent hover:text-white/90 dark:hover:text-white/35 data-[state=active]:text-[#A769FF] data-[state=active]:border-[#7F24FF] whitespace-nowrap"
 >
 Statistics
 </Tabs.Trigger>
 <Tabs.Trigger
 value="journal"
 className="px-2.5 sm:px-4 py-3 text-xs sm:text-sm font-medium text-white/55 border-b-2 border-transparent hover:text-white/90 dark:hover:text-white/35 data-[state=active]:text-[#A769FF] data-[state=active]:border-[#7F24FF] whitespace-nowrap"
 >
 Journal
 </Tabs.Trigger>
 <Tabs.Trigger
 value="calendar"
 className="px-2.5 sm:px-4 py-3 text-xs sm:text-sm font-medium text-white/55 border-b-2 border-transparent hover:text-white/90 dark:hover:text-white/35 data-[state=active]:text-[#A769FF] data-[state=active]:border-[#7F24FF] whitespace-nowrap"
 >
 Calendar
 </Tabs.Trigger>
 <Tabs.Trigger
 value="rules"
 className="px-2.5 sm:px-4 py-3 text-xs sm:text-sm font-medium text-white/55 border-b-2 border-transparent hover:text-white/90 dark:hover:text-white/35 data-[state=active]:text-[#A769FF] data-[state=active]:border-[#7F24FF] whitespace-nowrap"
 >
 Rules
 </Tabs.Trigger>
 </Tabs.List>

 <Tabs.Content value="statistics" className="p-6">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="text-center">
 <div className="font-mono text-2xl font-bold text-white tabular-nums">
 {trades.length}
 </div>
 <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] mt-2">
 Total Trades
 </div>
 </div>
 <div className="text-center">
 <div className="font-mono text-2xl font-bold text-[#12DFBA] tabular-nums">0</div>
 <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] mt-2">
 Winning Trades
 </div>
 </div>
 <div className="text-center">
 <div className="font-mono text-2xl font-bold text-[#FF1C1C] tabular-nums">0</div>
 <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] mt-2">
 Losing Trades
 </div>
 </div>
 <div className="text-center">
 <div className="font-mono text-2xl font-bold text-[#A769FF] tabular-nums">
 {formatPercent(user.winRate, 0)}
 </div>
 <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD] mt-2">
 Win Rate
 </div>
 </div>
 </div>
 </Tabs.Content>

 <Tabs.Content value="journal" className="p-6">
 <RecentActivity
 items={trades.slice(0, 8).map((t, i) => {
 const item: ActivityItem = {
 id: `trade-${i}`,
 title: "Recent fill",
 subtitle: undefined,
 pnlCents: t.pnl,
 };
 return item;
 })}
 />
 </Tabs.Content>

 <Tabs.Content value="calendar" className="p-6">
 <PnLCalendar />
 </Tabs.Content>

 <Tabs.Content value="rules" className="p-6">
 <div className="space-y-4">
 <div className="flex items-center gap-3 p-3 bg-[#12DFBA]/10 dark:bg-green-950/40 rounded-lg">
 <CheckCircleIcon className="w-5 h-5 text-[#12DFBA]" />
 <div>
 <div className="font-medium text-white">
 Profit Target: {formatPercent(user.profitTarget, 0)}
 </div>
 <div className="text-sm text-white/55">
 Reach{" "}
 {formatCurrency(user.profitTarget * user.startingBalance)}{" "}
 in profit
 </div>
 </div>
 </div>
 <div className="flex items-center gap-3 p-3 bg-[#FFB539]/10 dark:bg-amber-950/40 rounded-lg">
 <ClockIcon className="w-5 h-5 text-[#FFB539]" />
 <div>
 <div className="font-medium text-white">
 Min. Trading Days: {user.tradingDaysRequired}
 </div>
 <div className="text-sm text-white/55">
 Trade on at least {user.tradingDaysRequired} different days
 </div>
 </div>
 </div>
 {user.dailyDrawdownLimit > 0 && (
 <div className="flex items-center gap-3 p-3 bg-[#FF1C1C]/10 dark:bg-red-950/40 rounded-lg">
 <XCircleIcon className="w-5 h-5 text-[#FF6B6B]" />
 <div>
 <div className="font-medium text-white">
 Daily Loss Limit:{" "}
 {formatPercent(user.dailyDrawdownLimit, 0)}
 </div>
 <div className="text-sm text-white/55">
 Do not lose more than{" "}
 {formatCurrency(
 user.dailyDrawdownLimit * user.peakBalance,
 )}{" "}
 in a day
 </div>
 </div>
 </div>
 )}
 <div className="flex items-center gap-3 p-3 bg-[#FF1C1C]/10 dark:bg-red-950/40 rounded-lg">
 <XCircleIcon className="w-5 h-5 text-[#FF6B6B]" />
 <div>
 <div className="font-medium text-white">
 Max Drawdown: {formatPercent(user.maxDrawdownLimit, 0)}
 </div>
 <div className="text-sm text-white/55">
 Do not draw down more than{" "}
 {formatCurrency(user.maxDrawdownLimit * user.startingBalance)}{" "}
 total
 </div>
 </div>
 </div>
 </div>
 </Tabs.Content>
 </Tabs.Root>
 </TextureCard>

 {/* Modals */}
 <CredentialsModal
 isOpen={showCredentials}
 onClose={() => setShowCredentials(false)}
 user={user}
 />
 <ShareMetricsModal
 isOpen={showShareMetrics}
 onClose={() => setShowShareMetrics(false)}
 user={user}
 />
 </div>
 );
}

// ────────────────────────────────────────────────────────────────────────────
// Skeleton
// ────────────────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
 return (
 <div className="space-y-6 max-w-7xl mx-auto" aria-hidden>
 <div className="h-10 w-48 rounded bg-white/[0.06] animate-pulse" />
 <div className="h-44 rounded-xl border border-white/10 bg-[#180630] animate-pulse" />
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {[0, 1, 2, 3].map((i) => (
 <div
 key={i}
 className="h-[120px] rounded-xl border border-white/10 bg-[#180630] animate-pulse"
 />
 ))}
 </div>
 </div>
 );
}
