"use client";

import React, { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { PageTransition } from "./PageTransition";
import { LoadingOverlay } from "@/components/ui/loader";
import { useApp } from "@/context/AppContext";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { loadingState } = useApp();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-white dark:bg-slate-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950 p-4 pb-16 md:p-6 md:pb-20">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>

      {/* Global Loading Overlay */}
      <LoadingOverlay
        isLoading={loadingState.isLoading}
        message={loadingState.message}
      />
    </div>
  );
};
