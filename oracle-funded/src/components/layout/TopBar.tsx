"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, Settings } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

const getPageTitle = (pathname: string): string => {
  const routes: Record<string, string> = {
    "/": "Dashboard",
    "/new-challenge": "New Challenge",
    "/markets": "Markets",
    "/portfolio": "Portfolio",
    "/history": "History",
    "/analytics": "Analytics",
    "/rules": "Rules",
    "/help": "Help",
    "/settings": "Settings",
  };
  return routes[pathname] || "Dashboard";
};

export const TopBar = () => {
  const { user } = useApp();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount] = useState(3);
  const notificationRef = useRef<HTMLDivElement>(null);

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

  const accountPhaseLabels: Record<string, string> = {
    evaluation_1: "Phase 1 - Evaluation",
    evaluation_2: "Phase 2 - Verification",
    funded: "Funded Trader",
  };

  return (
    <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      {/* Left: Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
      </div>

      {/* Right: Actions and Profile */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-gray-100 hover:scale-110 rounded-lg transition-all duration-200 relative"
          >
            <Bell size={20} className="text-gray-600" />
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
                className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
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
          href="/settings"
          className="p-2 hover:bg-gray-100 hover:scale-110 hover:rotate-45 rounded-lg transition-all duration-300"
        >
          <Settings size={20} className="text-gray-600" />
        </Link>

        {/* Profile Section */}
        <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
          {/* Avatar - Clickable */}
          <Link href="/settings">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold cursor-pointer hover:shadow-lg hover:scale-105 transition-all">
              {user.username.charAt(0).toUpperCase()}
            </div>
          </Link>

          {/* Name and Account Phase */}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900">
              {user.username}
            </span>
            <span className="text-xs text-gray-500">
              {accountPhaseLabels[user.accountPhase]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
