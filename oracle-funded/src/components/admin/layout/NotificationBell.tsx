"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { BellIcon, CheckIcon, TrashIcon, ArrowTopRightOnSquareIcon, ExclamationCircleIcon, InformationCircleIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useNotifications } from "@/context/NotificationContext";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  compact?: boolean;
}

export default function NotificationBell({ compact = false }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const recentNotifications = notifications.slice(0, 5);

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case "error":
        return <ExclamationCircleIcon className="h-4 w-4 text-red-500" />;
      case "warning":
        return <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />;
      default:
        return <InformationCircleIcon className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-lg transition-colors",
          compact
            ? "hover:bg-slate-800 text-slate-400 hover:text-white"
            : "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 hover:text-gray-900"
        )}
      >
        <BellIcon className="h-5 w-5" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}

        {/* Pulse Animation for Unread */}
        {unreadCount > 0 && (
          <motion.span
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full"
          />
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-50 w-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden",
              compact ? "left-full ml-2 top-0" : "right-0 mt-2"
            )}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-950">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Mark all as read"
                  >
                    <CheckIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Clear all"
                  >
                    <TrashIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <BellIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {recentNotifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group",
                        !notification.isRead && "bg-indigo-50/50"
                      )}
                      onClick={() => {
                        markAsRead(notification.id);
                        if (notification.actionUrl) {
                          window.location.href = notification.actionUrl;
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm",
                              notification.isRead ? "text-gray-600 dark:text-gray-300" : "text-gray-900 dark:text-gray-100 font-medium"
                            )}
                          >
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTimestamp(notification.timestamp)}
                            </p>
                            {notification.actionUrl && (
                              <ArrowTopRightOnSquareIcon className="h-3 w-3 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        </div>

                        {/* Unread Indicator */}
                        {!notification.isRead && (
                          <div className="flex-shrink-0">
                            <div className="h-2 w-2 bg-indigo-600 rounded-full" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 5 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
                <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium w-full text-center">
                  View all notifications ({notifications.length})
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
