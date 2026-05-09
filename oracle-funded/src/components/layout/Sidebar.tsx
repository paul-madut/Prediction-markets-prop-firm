"use client";

// Minimal trader sidebar. Primary trading + account links above the divider;
// account utilities (history, settings, help) below.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  ChartBarIcon,
  RocketLaunchIcon,
  CurrencyDollarIcon,
  ChartPieIcon,
  PresentationChartLineIcon,
  ClockIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";

const wiredLinks = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/dashboard/markets", label: "Markets", icon: ChartBarIcon },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: ChartPieIcon },
  { href: "/dashboard/analytics", label: "Analytics", icon: PresentationChartLineIcon },
  { href: "/dashboard/challenge", label: "Challenge", icon: TrophyIcon },
  { href: "/dashboard/new-challenge", label: "Buy Challenge", icon: RocketLaunchIcon },
  { href: "/dashboard/payouts", label: "Payouts", icon: CurrencyDollarIcon },
];

const stubLinks = [
  { href: "/dashboard/history", label: "History", icon: ClockIcon },
  { href: "/dashboard/rules", label: "Rules", icon: ShieldCheckIcon },
  { href: "/dashboard/settings", label: "Settings", icon: Cog6ToothIcon },
  { href: "/dashboard/help", label: "Help", icon: QuestionMarkCircleIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="md:w-60 md:min-h-screen bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 px-3 py-4 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
      <div className="px-2 mb-2 hidden md:block">
        <Link href="/dashboard" className="text-base font-bold text-gray-900 dark:text-gray-100">
          OracleFunded
        </Link>
      </div>
      {wiredLinks.map((l) => {
        const active = pathname === l.href || (l.href !== "/dashboard" && pathname?.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              active
                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
            }`}
          >
            <l.icon className="w-4 h-4" />
            <span>{l.label}</span>
          </Link>
        );
      })}
      <div className="hidden md:block h-px bg-gray-100 dark:bg-slate-800 my-2" />
      {stubLinks.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          <l.icon className="w-4 h-4" />
          <span>{l.label}</span>
        </Link>
      ))}
    </aside>
  );
}
