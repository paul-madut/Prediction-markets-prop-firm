"use client";

import React, { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { PageTransition } from "./PageTransition";
import { LoadingOverlay } from "@/components/ui/loader";
import { useApp } from "@/context/AppContext";
import { AnimatePresence } from "framer-motion";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { loadingState } = useApp();

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <AnimatePresence mode="wait">
            <PageTransition>
              {children}
            </PageTransition>
          </AnimatePresence>
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
