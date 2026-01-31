"use client";

import { AdminProvider } from "@/context/AdminContext";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content - offset for sidebar */}
        <div className="pl-20 lg:pl-[280px] min-h-screen transition-all duration-300">
          {children}
        </div>
      </div>
    </AdminProvider>
  );
}
