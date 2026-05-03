"use client";

import { useEffect } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { setNotificationCallback } from "@/context/AdminContext";

/**
 * Bridge component that connects AdminContext actions to NotificationContext
 * This allows admin actions to trigger notifications
 */
export default function AdminNotificationBridge() {
  const { addNotification } = useNotifications();

  useEffect(() => {
    // Set up the callback so AdminContext can send notifications
    setNotificationCallback(addNotification);

    // Generate mock notifications every 30-60 seconds for demo
    const interval = setInterval(() => {
      const mockNotifications = [
        {
          type: "info" as const,
          message: "New trader registration: @traderpro",
          actionUrl: "/admin/traders",
        },
        {
          type: "warning" as const,
          message: "Trader approaching drawdown limit",
          actionUrl: "/admin/signals",
        },
        {
          type: "success" as const,
          message: "Challenge configuration updated",
          actionUrl: "/admin/configs",
        },
        {
          type: "info" as const,
          message: "New payout request submitted",
          actionUrl: "/admin/payouts",
        },
      ];

      const randomNotif = mockNotifications[Math.floor(Math.random() * mockNotifications.length)];
      addNotification(randomNotif);
    }, 45000); // Every 45 seconds

    return () => {
      clearInterval(interval);
      setNotificationCallback(() => {});
    };
  }, [addNotification]);

  return null;
}
