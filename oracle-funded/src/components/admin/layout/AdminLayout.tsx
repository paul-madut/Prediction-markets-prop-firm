"use client";

import React, { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";
import { AdminProvider } from "@/context/AdminContext";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const AdminLayoutContent = ({ children, title, subtitle }: AdminLayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="pl-[280px] min-h-screen transition-all duration-300">
        {/* TopBar */}
        <AdminTopBar title={title} subtitle={subtitle} />

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export const AdminLayout = ({ children, title, subtitle }: AdminLayoutProps) => {
  return (
    <AdminProvider>
      <AdminLayoutContent title={title} subtitle={subtitle}>
        {children}
      </AdminLayoutContent>
    </AdminProvider>
  );
};
