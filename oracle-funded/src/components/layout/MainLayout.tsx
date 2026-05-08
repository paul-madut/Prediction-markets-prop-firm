"use client";

// Trader-facing layout shell. Sidebar + top bar + content area. No mock
// context dependencies — each child fetches its own data.

import React, { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export const MainLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white dark:bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950 p-4 pb-16 md:p-6 md:pb-20">
          {children}
        </main>
      </div>
    </div>
  );
};
