"use client";

import React, { useState, useRef, useEffect } from "react";
import { BellIcon, Cog6ToothIcon, ArrowRightStartOnRectangleIcon, UserIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useApp } from "@/context/AppContext";
import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

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

export const TopBar = () => {
  const { user } = useApp();
  const { signOut } = useClerk();
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notificationCount] = useState(3);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const pageTitle = pageTitles[pathname] || "";

  // Close notifications when clicking outside
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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  const accountPhaseLabels: Record<string, string> = {
    evaluation_1: "Phase 1 - Evaluation",
    evaluation_2: "Phase 2 - Verification",
    funded: "Funded Trader",
  };

  return (
    <div className="h-14 sm:h-16 bg-white border-b border-gray-200 px-3 sm:px-6 flex items-center justify-between">
      {/* Page Title */}
      <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{pageTitle}</h1>

      {/* Actions and Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Bell */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-gray-100 hover:scale-110 rounded-lg transition-all duration-200 relative"
          >
            <BellIcon className="h-5 w-5 text-gray-600" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-semibold">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
              >
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">Challenge Update</p>
                    <p className="text-gray-500 text-xs mt-1">
                      You're 60% towards your profit target!
                    </p>
                  </div>
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">New Market Available</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Check out the latest prediction markets
                    </p>
                  </div>
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">Reminder</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Complete 3 more trading days to meet requirements
                    </p>
                  </div>
                </div>
                <div className="p-3 border-t border-gray-200 text-center">
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View All Notifications
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Settings */}
        <Link
          href="/dashboard/settings"
          className="hidden sm:flex p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Cog6ToothIcon className="h-5 w-5 text-gray-600" />
        </Link>

        {/* Profile Section */}
        <div className="relative pl-2 sm:pl-3 border-l border-gray-200" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 sm:gap-3 hover:bg-gray-50 rounded-lg px-1.5 sm:px-2 py-1.5 transition-colors"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold text-sm sm:text-base">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-semibold text-gray-900">
                {user.username}
              </span>
              <span className="text-xs text-gray-500">
                {accountPhaseLabels[user.accountPhase]}
              </span>
            </div>
            <ChevronDownIcon className={cn( "h-4 w-4 hidden sm:block text-gray-400 transition-transform duration-200", showProfileMenu && "rotate-180" )} />
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
              >
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  Profile & Settings
                </Link>
                <div className="border-t border-gray-200 my-1" />
                <button
                  onClick={() => signOut({ redirectUrl: "/sign-in" })}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
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
