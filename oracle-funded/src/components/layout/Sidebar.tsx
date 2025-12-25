"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  PlusCircle,
  TrendingUp,
  Briefcase,
  History,
  BarChart3,
  HelpCircle,
  Settings,
  LogOut,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import {
  Sidebar as AceternitySidebar,
  SidebarBody,
  SidebarLink,
} from "@/components/ui/sidebar";

export const Sidebar = () => {
  const pathname = usePathname();
  const { user } = useApp();
  const [open, setOpen] = useState(false);

  const links = [
    {
      label: "Dashboard",
      href: "/",
      icon: (
        <Home
          className={cn(
            "text-neutral-700 h-8 w-8flex-shrink-0",
            pathname === "/" && "text-blue-600"
          )}
        />
      ),
    },
    {
      label: "New Challenge",
      href: "/new-challenge",
      icon: (
        <PlusCircle
          className={cn(
            "text-neutral-700 h-8 w-8flex-shrink-0",
            pathname === "/new-challenge" && "text-blue-600"
          )}
        />
      ),
    },
    {
      label: "Markets",
      href: "/markets",
      icon: (
        <TrendingUp
          className={cn(
            "text-neutral-700 h-8 w-8flex-shrink-0",
            pathname === "/markets" && "text-blue-600"
          )}
        />
      ),
    },
    {
      label: "Portfolio",
      href: "/portfolio",
      icon: (
        <Briefcase
          className={cn(
            "text-neutral-700 h-8 w-8flex-shrink-0",
            pathname === "/portfolio" && "text-blue-600"
          )}
        />
      ),
    },
    {
      label: "History",
      href: "/history",
      icon: (
        <History
          className={cn(
            "text-neutral-700 h-8 w-8flex-shrink-0",
            pathname === "/history" && "text-blue-600"
          )}
        />
      ),
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: (
        <BarChart3
          className={cn(
            "text-neutral-700 h-8 w-8flex-shrink-0",
            pathname === "/analytics" && "text-blue-600"
          )}
        />
      ),
    },
    {
      label: "Rules",
      href: "/rules",
      icon: (
        <HelpCircle
          className={cn(
            "text-neutral-700 h-8 w-8flex-shrink-0",
            pathname === "/rules" && "text-blue-600"
          )}
        />
      ),
    },
    {
      label: "Settings",
      href: "/settings",
      icon: (
        <Settings
          className={cn(
            "text-neutral-700 h-8 w-8flex-shrink-0",
            pathname === "/settings" && "text-blue-600"
          )}
        />
      ),
    },
  ];

  return (
    <AceternitySidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {open ? <Logo /> : <LogoIcon />}
          <div className="mt-8 flex flex-col gap-2">
            {links.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </div>
        </div>
        <div>
          <SidebarLink
            link={{
              label: user.username,
              href: "#",
              icon: (
                <div className="h-7 w-7 flex-shrink-0 rounded-full bg-linear-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-xs font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              ),
            }}
          />
        </div>
      </SidebarBody>
    </AceternitySidebar>
  );
};

export const Logo = () => {
  return (
    <Link
      href="/"
      className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-linear-to-br from-blue-600 to-blue-700 rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-bold text-blue-600 whitespace-pre"
      >
        OracleFunded
      </motion.span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="/"
      className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-linear-to-br from-blue-600 to-blue-700 rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </Link>
  );
};
