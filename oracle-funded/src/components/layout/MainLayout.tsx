"use client";

import React, { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { PageTransition } from "./PageTransition";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#180630]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto bg-[#0C0319] dark:bg-[#0C0319] p-4 pb-16 md:p-6 md:pb-20">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
};
