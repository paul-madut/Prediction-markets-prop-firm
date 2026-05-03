"use client";

import { AdminProvider } from "@/context/AdminContext";
import { ToastProvider } from "@/components/admin/shared/Toast";
import { NotificationProvider } from "@/context/NotificationContext";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import AdminNotificationBridge from "@/components/admin/AdminNotificationBridge";
import { ErrorBoundary } from "@/components/admin/shared/ErrorBoundary";
import KeyboardShortcutsHelp from "@/components/admin/shared/KeyboardShortcutsHelp";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <NotificationProvider>
        <ToastProvider>
          <AdminNotificationBridge />
          <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
            {/* Sidebar */}
            <AdminSidebar />

            {/* Main Content - offset for sidebar */}
            <div className="pl-20 lg:pl-[280px] min-h-screen transition-all duration-300 pb-8">
              <main className="p-6">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
            </div>

            {/* Keyboard Shortcuts Help */}
            <KeyboardShortcutsHelp />
          </div>
        </ToastProvider>
      </NotificationProvider>
    </AdminProvider>
  );
}
