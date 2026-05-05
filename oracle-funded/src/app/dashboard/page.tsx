"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent, formatDate } from "@/lib/formatters";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { ChevronDownIcon, CalendarIcon, KeyIcon, ShareIcon, CurrencyDollarIcon, CheckCircleIcon, XCircleIcon, ClockIcon, ArrowTrendingUpIcon, RocketLaunchIcon, ChartBarIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, DocumentDuplicateIcon, CheckIcon, EyeIcon, EyeSlashIcon, ServerIcon, GlobeAltIcon, ArrowDownTrayIcon } from "@heroicons/react/16/solid";
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
import { TextureCard, TextureCardContent, TextureSeparator } from "@/components/ui/texture-card";
import { TextureButton } from "@/components/ui/texture-button";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { AnimatePresence, motion } from "framer-motion";

// Credentials Modal
const CredentialsModal = ({
  isOpen,
  onClose,
  user,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: { userId: string; email: string; accountPhase: string };
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const credentials = [
    { label: "Login ID", value: user.userId.toUpperCase(), icon: User2Icon },
    { label: "Password", value: "••••••••••", secret: "xK9#mP2$vL", icon: KeyIcon },
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
          className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account Credentials</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Your trading account access details</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {credentials.map((cred) => {
              const isPassword = cred.label === "Password";
              const displayValue = isPassword
                ? showPassword
                  ? cred.secret!
                  : cred.value
                : cred.value;
              const copyValue = isPassword ? cred.secret! : cred.value;

              return (
                <div key={cred.label} className="bg-gray-50 dark:bg-slate-950 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                      {cred.label}
                    </span>
                    <div className="flex items-center gap-1">
                      {isPassword && (
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                          ) : (
                            <EyeIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => copyToClipboard(cred.label, copyValue)}
                        className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                      >
                        {copiedField === cred.label ? (
                          <CheckIcon className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <DocumentDuplicateIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                    {displayValue}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-6 pb-6">
            <button
              onClick={() => {
                const allCreds = credentials
                  .map((c) => `${c.label}: ${c.label === "Password" ? c.secret : c.value}`)
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

// Placeholder icon for user
const User2Icon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// Share Metrics Modal
const ShareMetricsModal = ({
  isOpen,
  onClose,
  user,
  trades,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: {
    username: string;
    accountBalance: number;
    startingBalance: number;
    winRate: number;
    tradingDaysCompleted: number;
    currentProfit: number;
    accountPhase: string;
  };
  trades: { pnl: number }[];
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const profitPercent = ((user.accountBalance - user.startingBalance) / user.startingBalance * 100).toFixed(2);

  const shareText = [
    `${user.username}'s Trading Performance`,
    ``,
    `Account Balance: ${formatCurrency(user.accountBalance)}`,
    `Total P&L: ${totalPnL >= 0 ? "+" : ""}${formatCurrency(totalPnL)}`,
    `ROI: ${Number(profitPercent) >= 0 ? "+" : ""}${profitPercent}%`,
    `Win Rate: ${formatPercent(user.winRate, 0)}`,
    `Trading Days: ${user.tradingDaysCompleted}`,
    `Status: ${user.accountPhase === "evaluation_1" ? "Phase 1" : user.accountPhase === "evaluation_2" ? "Phase 2" : "Funded"}`,
    ``,
    `Powered by OracleFunded`,
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
          className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Share Metrics</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Share your trading performance</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </button>
          </div>

          {/* Preview Card */}
          <div className="p-6">
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl p-6 text-white">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{user.username}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {user.accountPhase === "evaluation_1" ? "Phase 1" : user.accountPhase === "evaluation_2" ? "Phase 2" : "Funded Trader"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Balance</div>
                  <div className="text-lg font-bold">{formatCurrency(user.accountBalance)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Total P&L</div>
                  <div className={`text-lg font-bold ${totalPnL >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {totalPnL >= 0 ? "+" : ""}{formatCurrency(totalPnL)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Win Rate</div>
                  <div className="text-lg font-bold">{formatPercent(user.winRate, 0)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">ROI</div>
                  <div className={`text-lg font-bold ${Number(profitPercent) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {Number(profitPercent) >= 0 ? "+" : ""}{profitPercent}%
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>OracleFunded</span>
                <span>{user.tradingDaysCompleted} trading days</span>
              </div>
            </div>
          </div>

          {/* Actions */}
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
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
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

// Mock P&L calendar data
const mockPnLCalendarData: Record<string, { pnl: number; trades: number; volume: number }> = {
  "2025-01-05": { pnl: 7000, trades: 1, volume: 13000 },
  "2025-01-08": { pnl: 7200, trades: 1, volume: 7800 },
  "2025-01-09": { pnl: -3600, trades: 1, volume: 3600 },
  "2025-01-10": { pnl: 2100, trades: 2, volume: 5100 },
  "2025-01-11": { pnl: -6400, trades: 1, volume: 6400 },
  "2025-01-12": { pnl: 1200, trades: 1, volume: 5680 },
  "2025-01-13": { pnl: 300, trades: 1, volume: 4200 },
  "2025-01-14": { pnl: 150, trades: 1, volume: 9600 },
  "2025-01-15": { pnl: 1800, trades: 2, volume: 3900 },
  "2025-01-16": { pnl: 2340, trades: 1, volume: 4500 },
  "2025-01-17": { pnl: -1020, trades: 1, volume: 3200 },
  "2025-01-18": { pnl: 7560, trades: 2, volume: 8900 },
  "2025-01-19": { pnl: 6890, trades: 1, volume: 7200 },
  "2025-01-20": { pnl: -2360, trades: 1, volume: 5100 },
  "2025-01-21": { pnl: 5340, trades: 2, volume: 9800 },
  "2025-01-22": { pnl: 1370, trades: 1, volume: 4200 },
  "2025-01-23": { pnl: 2240, trades: 1, volume: 5600 },
  "2025-01-24": { pnl: 2140, trades: 2, volume: 6300 },
  "2025-01-25": { pnl: 3330, trades: 1, volume: 4800 },
  "2025-01-26": { pnl: 2050, trades: 1, volume: 3900 },
  "2025-01-27": { pnl: -1170, trades: 1, volume: 2800 },
  "2025-01-28": { pnl: -7140, trades: 2, volume: 8100 },
};

// Circular Progress Component
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

// Time Since Counter Component
const TimeSinceCounter = ({ startDate }: { startDate: string }) => {
  const [timeElapsed, setTimeElapsed] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(startDate).getTime();
      const now = Date.now();
      const diff = now - start;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeElapsed({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startDate]);

  return (
    <div className="flex justify-between text-center">
      <div className="flex-1">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{String(timeElapsed.days).padStart(2, "0")}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">DAY</div>
      </div>
      <div className="flex-1">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{String(timeElapsed.hours).padStart(2, "0")}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">HR</div>
      </div>
      <div className="flex-1">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{String(timeElapsed.minutes).padStart(2, "0")}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">MIN</div>
      </div>
      <div className="flex-1">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{String(timeElapsed.seconds).padStart(2, "0")}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">SEC</div>
      </div>
    </div>
  );
};

// P&L CalendarIcon Component
const PnLCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 0, 1)); // January 2025
  const [viewMode, setViewMode] = useState<"month" | "year">("month");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week for the first day (0 = Sunday)
  const startDay = getDay(monthStart);

  // Create padding for days before the month starts
  const paddingDays = Array(startDay).fill(null);

  const formatPnL = (pnlCents: number) => {
    const dollars = pnlCents / 100;
    if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
    return `$${dollars.toFixed(0)}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">P&L Calendar</h3>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode("month")}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition ${
                viewMode === "month" ? "bg-white dark:bg-slate-900 shadow text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode("year")}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition ${
                viewMode === "year" ? "bg-white dark:bg-slate-900 shadow text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              Year
            </button>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
            >
              <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[80px] sm:min-w-[100px] text-center">
              {format(currentMonth, "yyyy-MM")}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
            >
              <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <div key={`${day}-${i}`} className="text-center text-[10px] sm:text-sm font-medium text-gray-500 dark:text-gray-400 py-1 sm:py-2">
            <span className="hidden sm:inline">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}</span>
            <span className="sm:hidden">{day}</span>
          </div>
        ))}
      </div>

      {/* CalendarIcon grid */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {paddingDays.map((_, index) => (
          <div key={`padding-${index}`} className="h-12 sm:h-20 bg-gray-50/50 rounded-md sm:rounded-lg" />
        ))}
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayData = mockPnLCalendarData[dateKey];
          const isToday = isSameDay(day, new Date());
          const hasData = !!dayData;

          return (
            <div
              key={dateKey}
              className={`h-12 sm:h-20 rounded-md sm:rounded-lg border p-1 sm:p-1.5 relative ${
                isToday ? "border-blue-500 border-2" : "border-gray-100 dark:border-slate-800"
              } ${
                hasData
                  ? dayData.pnl >= 0
                    ? "bg-green-50"
                    : "bg-red-50"
                  : "bg-white dark:bg-slate-900"
              }`}
            >
              <div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mb-0.5">{format(day, "d")}</div>
              {hasData && (
                <>
                  <div
                    className={`text-[10px] sm:text-sm font-bold ${
                      dayData.pnl >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {dayData.pnl >= 0 ? "+" : ""}
                    {formatPnL(dayData.pnl)}
                  </div>
                  <div className="hidden sm:block text-xs text-gray-400 dark:text-gray-500">
                    {dayData.trades} trade{dayData.trades > 1 ? "s" : ""}
                  </div>
                  <div className="hidden sm:block text-xs text-gray-300 dark:text-gray-600">${(dayData.volume / 100).toFixed(0)}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user, equityHistory, trades, positions, accounts, activeAccountId, setActiveAccount } = useApp();
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
      if (accountSwitcherRef.current && !accountSwitcherRef.current.contains(e.target as Node)) {
        setAccountSwitcherOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [accountSwitcherOpen]);

  if (!ready) return <DashboardSkeleton />;

  // Calculate stats
  const todaysProfit = 12690; // Mock for today's profit in cents
  // Calculate highest and lowest volume from trades
  const highestVolume = trades.reduce(
    (max, trade) => Math.max(max, trade.shares * trade.entryPrice),
    0
  );
  const lowestVolume = trades.reduce(
    (min, trade) => Math.min(min, trade.shares * trade.entryPrice),
    Infinity
  );

  const chartData = equityHistory.map((point) => ({
    date: formatDate(point.date, "d"),
    equity: point.equity / 100,
    balance: point.balance / 100,
  }));

  // Progress calculations
  const profitProgress = (user.currentProfit / user.profitTarget) * 100;
  const dailyDDProgress = (Math.abs(user.currentDailyDrawdown) / user.dailyDrawdownLimit) * 100;
  const maxDDProgress = (Math.abs(user.currentMaxDrawdown) / user.maxDrawdownLimit) * 100;
  const tradingDaysProgress = (user.tradingDaysCompleted / user.tradingDaysRequired) * 100;

  return (
    <div className="space-y-8">
      {/* Demo Mode Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg px-3 sm:px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-amber-100 rounded-full">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Demo</span>
          </div>
          <span className="text-xs sm:text-sm text-amber-800">
            Sample data. Fully customizable for your brand.
          </span>
        </div>
        <Link
          href="/"
          className="text-xs sm:text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2 flex-shrink-0"
        >
          Learn more
        </Link>
      </div>

      {/* Account Selector Bar — relative z-30 lifts the dropdown's stacking
          context above the Welcome Back card (TextureCard creates its own
          stacking context, so a child z-50 alone wasn't enough). */}
      <div className="relative z-30">
      <TextureCard>
        <TextureCardContent className="py-3 sm:py-4 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-5">
              {/* Account switcher (was previously in sidebar) */}
              <div className="relative" ref={accountSwitcherRef}>
                <button
                  onClick={() => setAccountSwitcherOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={accountSwitcherOpen}
                  className="flex items-center gap-2 sm:gap-3 group rounded-lg -m-1 p-1 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                    <CurrencyDollarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">Account Size</div>
                    <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                      <AnimatedNumber
                        value={user.accountSize / 100}
                        format={(v) => `$${v.toLocaleString()}`}
                      />
                    </div>
                  </div>
                  <ChevronDownIcon
                    className={`w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-all ${
                      accountSwitcherOpen ? "rotate-180 text-blue-500" : ""
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
                      className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-200 dark:border-slate-800 overflow-hidden z-[100]"
                      role="listbox"
                    >
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-800">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">
                          Switch account
                        </p>
                      </div>
                      <div className="p-2 max-h-80 overflow-y-auto">
                        {accounts.map((a) => {
                          const pct =
                            ((a.accountBalance - a.startingBalance) / a.startingBalance) * 100;
                          const isActive = a.accountId === activeAccountId;
                          const phaseLabel =
                            a.accountPhase === "evaluation_1"
                              ? "Phase 1"
                              : a.accountPhase === "evaluation_2"
                              ? "Phase 2"
                              : "Funded";
                          const phaseBadge =
                            a.accountPhase === "funded"
                              ? "bg-green-100 text-green-800"
                              : a.accountPhase === "evaluation_2"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800";
                          return (
                            <button
                              key={a.accountId}
                              onClick={() => {
                                setActiveAccount(a.accountId);
                                setAccountSwitcherOpen(false);
                              }}
                              role="option"
                              aria-selected={isActive}
                              className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${
                                isActive ? "bg-blue-50 hover:bg-blue-50" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${phaseBadge}`}
                                >
                                  {phaseLabel}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  ${(a.accountSize / 100000).toFixed(0)}K
                                </span>
                                {isActive && (
                                  <span className="ml-auto text-[10px] font-semibold text-blue-600 inline-flex items-center gap-1">
                                    <CheckCircleIcon className="w-3 h-3" />
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums text-sm">
                                  {formatCurrency(a.accountBalance)}
                                </span>
                                <span
                                  className={`text-xs font-semibold tabular-nums ${
                                    pct >= 0 ? "text-green-600" : "text-red-600"
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
                        className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-slate-800 text-blue-600 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800/50"
                      >
                        <RocketLaunchIcon className="w-4 h-4" />
                        Start New Challenge
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Vertical Separator */}
              <div className="h-10 w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent hidden sm:block" />

              {/* Inline Status Items */}
              <div className="hidden sm:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-500 dark:text-gray-400">{formatDate(user.challengeStartDate, "MMM dd, yyyy")}</span>
                </div>

                <div className="h-4 w-px bg-gray-200" />

                <div className="flex items-center gap-1.5">
                  <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-gray-500 dark:text-gray-400">90% split</span>
                </div>

                <div className="h-4 w-px bg-gray-200" />

                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${
                    user.accountPhase === "funded" ? "bg-green-500" : "bg-blue-500"
                  } animate-pulse`} />
                  <span className={`font-medium ${
                    user.accountPhase === "funded" ? "text-green-600" : "text-blue-600"
                  }`}>
                    {user.accountPhase === "evaluation_1" ? "Phase 1" : user.accountPhase === "evaluation_2" ? "Phase 2" : "Funded"}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile status row */}
            <div className="flex sm:hidden items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${
                  user.accountPhase === "funded" ? "bg-green-500" : "bg-blue-500"
                } animate-pulse`} />
                <span className={`font-medium ${
                  user.accountPhase === "funded" ? "text-green-600" : "text-blue-600"
                }`}>
                  {user.accountPhase === "evaluation_1" ? "Phase 1" : user.accountPhase === "evaluation_2" ? "Phase 2" : "Funded"}
                </span>
              </div>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="text-gray-500 dark:text-gray-400">90% split</span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <code className="font-mono text-gray-400 dark:text-gray-500">PFLP8QMCPA</code>
            </div>

            {/* Account ID - Desktop */}
            <code className="hidden sm:block text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-950 px-3 py-1.5 rounded-md border border-gray-100 dark:border-slate-800">
              PFLP8QMCPA
            </code>
          </div>
        </TextureCardContent>
      </TextureCard>
      </div>

      {/* Welcome Back Section */}
      <TextureCard interactive={false}>
        <TextureCardContent className="p-0 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Left — Greeting + CTAs */}
            <div className="flex-1 p-8 relative">
              <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-gradient-to-tr from-blue-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <h1 className="text-lg font-medium text-gray-400 dark:text-gray-500 mb-0.5">
                  Welcome back,
                </h1>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-5">
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

            {/* Vertical Separator */}
            <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent my-6" />
            <div className="lg:hidden mx-8">
              <TextureSeparator className="mx-0" />
            </div>

            {/* Right — Quick Stats */}
            <div className="flex-1 p-8 flex items-center">
              <div className="grid grid-cols-3 gap-6 w-full text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatPercent(user.winRate, 0)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mt-1">Win Rate</div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${user.currentProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {user.currentProfit >= 0 ? "+" : ""}{formatPercent(user.currentProfit)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mt-1">Profit</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {user.tradingDaysCompleted}<span className="text-gray-300 dark:text-gray-600 font-normal">/{user.tradingDaysRequired}</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mt-1">Trading Days</div>
                </div>
              </div>
            </div>
          </div>
        </TextureCardContent>
      </TextureCard>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Chart and Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* KeyIcon Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TextureCard>
              <TextureCardContent className="px-4 py-5">
                <div className="text-xs text-green-600 font-medium mb-2">Account Balance</div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(user.accountBalance)}</div>
              </TextureCardContent>
            </TextureCard>
            <TextureCard>
              <TextureCardContent className="px-4 py-5">
                <div className="text-xs text-blue-600 font-medium mb-2">Today&apos;s P&L</div>
                <div className={`text-xl font-bold ${todaysProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {todaysProfit >= 0 ? "+" : ""}{formatCurrency(todaysProfit)}
                </div>
              </TextureCardContent>
            </TextureCard>
            <TextureCard>
              <TextureCardContent className="px-4 py-5">
                <div className="text-xs text-purple-600 font-medium mb-2">Open Positions</div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{positions.length}</div>
              </TextureCardContent>
            </TextureCard>
            <TextureCard>
              <TextureCardContent className="px-4 py-5">
                <div className="text-xs text-amber-600 font-medium mb-2">Total Trades</div>
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{trades.length}</div>
              </TextureCardContent>
            </TextureCard>
          </div>

          {/* Account Performance Chart */}
          <TextureCard interactive={false}>
          <TextureCardContent>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account Performance</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                user.currentProfit >= 0
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}>
                Profit: {user.currentProfit >= 0 ? "+" : ""}{formatPercent(user.currentProfit)}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: "12px" }} />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, "Equity"]}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#2563eb"
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Objectives</h3>
              <Link href="/dashboard/rules" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View Rules
                <ChevronRightIcon className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Profit Target */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Profit Target</span>
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <CircularProgress progress={Math.min(profitProgress, 100)} size={56} strokeWidth={6} color="#22c55e" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{Math.round(profitProgress)}%</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                      {formatCurrency(user.currentProfit * user.startingBalance)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      of {formatCurrency(user.profitTarget * user.startingBalance)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Drawdown */}
              <div className={`rounded-xl p-4 border ${dailyDDProgress > 80 ? "bg-gradient-to-br from-red-50 to-orange-50 border-red-100" : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-100"}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${dailyDDProgress > 80 ? "text-red-700" : "text-green-700"}`}>Daily Drawdown</span>
                  {dailyDDProgress > 80 ? (
                    <XCircleIcon className="w-4 h-4 text-red-500" />
                  ) : (
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <CircularProgress
                      progress={Math.min(dailyDDProgress, 100)}
                      size={56}
                      strokeWidth={6}
                      color={dailyDDProgress > 80 ? "#ef4444" : "#22c55e"}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{Math.round(dailyDDProgress)}%</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                      {formatCurrency(Math.abs(user.currentDailyDrawdown) * user.peakBalance)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      of {formatCurrency(user.dailyDrawdownLimit * user.peakBalance)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Maximum Loss */}
              <div className={`rounded-xl p-4 border ${maxDDProgress > 80 ? "bg-gradient-to-br from-red-50 to-orange-50 border-red-100" : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-100"}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${maxDDProgress > 80 ? "text-red-700" : "text-green-700"}`}>Max Drawdown</span>
                  {maxDDProgress > 80 ? (
                    <XCircleIcon className="w-4 h-4 text-red-500" />
                  ) : (
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <CircularProgress
                      progress={Math.min(maxDDProgress, 100)}
                      size={56}
                      strokeWidth={6}
                      color={maxDDProgress > 80 ? "#ef4444" : "#22c55e"}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{Math.round(maxDDProgress)}%</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                      {formatCurrency(Math.abs(user.currentMaxDrawdown) * user.startingBalance)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      of {formatCurrency(user.maxDrawdownLimit * user.startingBalance)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Trading Days */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Trading Days</span>
                  <CheckCircleIcon className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <CircularProgress progress={Math.min(tradingDaysProgress, 100)} size={56} strokeWidth={6} color="#2563eb" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{Math.round(tradingDaysProgress)}%</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {user.tradingDaysCompleted} <span className="text-gray-400 dark:text-gray-500 font-normal">/ {user.tradingDaysRequired}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      days completed
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TextureCardContent>
          </TextureCard>

        </div>

        {/* Right Column - Account Data */}
        <div className="space-y-6">
          {/* Account Data Card */}
          <TextureCard>
          <TextureCardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Account Data</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Login
                </div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{user.userId.toUpperCase()}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Start
                </div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{formatDate(user.challengeStartDate, "MM/dd/yyyy")}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  Result
                </div>
                <div className={`font-medium ${
                  user.status === "active" ? "text-green-600" : user.status === "passed" ? "text-blue-600" : "text-red-600"
                }`}>
                  {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-200 w-full my-5" />

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={() => setShowCredentials(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 hover:shadow-md hover:scale-[1.02] transition-all duration-200 font-medium"
              >
                <KeyIcon className="w-4 h-4" />
                Credentials
              </button>
              <button
                onClick={() => setShowShareMetrics(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-slate-950 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 hover:shadow-md hover:scale-[1.02] transition-all duration-200 font-medium"
              >
                <ShareIcon className="w-4 h-4" />
                Share Metrics
              </button>
              <Link
                href="/dashboard/payouts"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 hover:shadow-md hover:scale-[1.02] transition-all duration-200 font-medium"
              >
                <CurrencyDollarIcon className="w-4 h-4" />
                Request Payout
              </Link>
            </div>
          </TextureCardContent>
          </TextureCard>

          {/* Volume Stats */}
          <TextureCard>
          <TextureCardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <ArrowTrendingUpIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Volume</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Highest volume</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(highestVolume)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Lowest volume</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(lowestVolume === Infinity ? 0 : lowestVolume)}</span>
              </div>
            </div>
          </TextureCardContent>
          </TextureCard>

          {/* Time Since First Trade */}
          <TextureCard>
          <TextureCardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <ClockIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Time since first trade</h3>
            </div>
            <div className="h-px bg-gray-200 w-full mb-3" />
            <TimeSinceCounter startDate={user.challengeStartDate} />
          </TextureCardContent>
          </TextureCard>

        </div>
      </div>

      {/* Tabs Section - Full Width */}
      <TextureCard interactive={false}>
      <Tabs.Root defaultValue="calendar">
        <Tabs.List className="flex border-b border-gray-200 dark:border-slate-800 px-2 sm:px-4 overflow-x-auto">
          <Tabs.Trigger
            value="statistics"
            className="px-2.5 sm:px-4 py-3 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-700 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 whitespace-nowrap"
          >
            Statistics
          </Tabs.Trigger>
          <Tabs.Trigger
            value="journal"
            className="px-2.5 sm:px-4 py-3 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-700 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 whitespace-nowrap"
          >
            Journal
          </Tabs.Trigger>
          <Tabs.Trigger
            value="calendar"
            className="px-2.5 sm:px-4 py-3 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-700 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 whitespace-nowrap"
          >
            CalendarIcon
          </Tabs.Trigger>
          <Tabs.Trigger
            value="rules"
            className="px-2.5 sm:px-4 py-3 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-700 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 whitespace-nowrap"
          >
            Rules
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="statistics" className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{trades.length}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Trades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {trades.filter((t) => t.result === "won").length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Winning Trades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {trades.filter((t) => t.result === "lost").length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Losing Trades</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatPercent(user.winRate, 0)}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Win Rate</div>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="journal" className="p-6">
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {trades.slice(0, 5).map((trade) => (
              <div
                key={trade.tradeId}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-950 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{trade.market_title.substring(0, 40)}...</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(trade.entryDate, "MMM dd, yyyy")} &bull; {trade.shares} shares @ {trade.entryPrice}¢
                  </div>
                </div>
                <div
                  className={`font-bold ${
                    trade.pnl >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {trade.pnl >= 0 ? "+" : ""}
                  {formatCurrency(trade.pnl)}
                </div>
              </div>
            ))}
          </div>
        </Tabs.Content>

        <Tabs.Content value="calendar" className="p-6">
          <PnLCalendar />
        </Tabs.Content>

        <Tabs.Content value="rules" className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Profit Target: {formatPercent(user.profitTarget, 0)}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Reach {formatCurrency(user.profitTarget * user.startingBalance)} in profit</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
              <ClockIcon className="w-5 h-5 text-amber-500" />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Min. Trading Days: {user.tradingDaysRequired}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Trade on at least {user.tradingDaysRequired} different days</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
              <XCircleIcon className="w-5 h-5 text-red-500" />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Daily Loss Limit: {formatPercent(user.dailyDrawdownLimit, 0)}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Do not lose more than {formatCurrency(user.dailyDrawdownLimit * user.peakBalance)} in a day</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
              <XCircleIcon className="w-5 h-5 text-red-500" />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Max Drawdown: {formatPercent(user.maxDrawdownLimit, 0)}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Do not draw down more than {formatCurrency(user.maxDrawdownLimit * user.startingBalance)} total</div>
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
        trades={trades}
      />
    </div>
  );
}
