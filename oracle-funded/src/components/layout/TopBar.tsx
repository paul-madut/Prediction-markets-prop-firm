"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  BellIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  UserIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/challenge": "Challenge",
  "/dashboard/new-challenge": "New Challenge",
  "/dashboard/markets": "Markets",
  "/dashboard/crypto": "Crypto",
  "/dashboard/portfolio": "Portfolio",
  "/dashboard/history": "Trade History",
  "/dashboard/analytics": "Analytics",
  "/dashboard/rules": "Rules",
  "/dashboard/payouts": "Payouts",
  "/dashboard/settings": "Settings",
  "/dashboard/help": "Help Center",
};

function pageTitle(pathname: string | null): string {
  if (!pathname) return "";
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.keys(pageTitles)
    .filter((p) => pathname.startsWith(p + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return match ? pageTitles[match] : "";
}

function userInitial(email: string | null | undefined): string {
  if (!email) return "?";
  return (email[0] ?? "?").toUpperCase();
}

function userDisplay(email: string | null | undefined): string {
  if (!email) return "Account";
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

export const TopBar = () => {
  const { user, activeAccount } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notificationCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const title = pageTitle(pathname);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  async function signOut(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  const phaseLabel =
    activeAccount?.currentPhase?.name ??
    (user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : "");

  return (
    <div className="h-14 sm:h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between">
      <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
        {title}
      </h1>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 hover:scale-110 rounded-lg transition-all duration-200 relative"
            aria-label="Notifications"
          >
            <BellIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-semibold">
                {notificationCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-gray-200 dark:border-slate-800 z-50"
              >
                <div className="p-4 border-b border-gray-200 dark:border-slate-800">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Notifications
                  </h3>
                </div>
                <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  You&apos;re all caught up.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Link
          href="/dashboard/settings"
          className="hidden sm:flex p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Settings"
        >
          <Cog6ToothIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </Link>

        <div
          className="relative pl-2 sm:pl-3 border-l border-gray-200 dark:border-slate-800"
          ref={profileRef}
        >
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 sm:gap-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg px-1.5 sm:px-2 py-1.5 transition-colors"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold text-sm sm:text-base">
              {userInitial(user?.email)}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {userDisplay(user?.email)}
              </span>
              {phaseLabel && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {phaseLabel}
                </span>
              )}
            </div>
            <ChevronDownIcon
              className={cn(
                "h-4 w-4 hidden sm:block text-gray-400 dark:text-gray-500 transition-transform duration-200",
                showProfileMenu && "rotate-180",
              )}
            />
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-gray-200 dark:border-slate-800 z-50 py-1"
              >
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  Profile & Settings
                </Link>
                <div className="border-t border-gray-200 dark:border-slate-800 my-1" />
                <button
                  onClick={signOut}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors w-full"
                >
                  <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
