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
  FileText,
  Rocket,
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

  const mainLinks = [
    {
      label: "Dashboard",
      href: "/",
      icon: <Home />,
    },
    {
      label: "New Challenge",
      href: "/new-challenge",
      icon: <PlusCircle />,
    },
    {
      label: "Markets",
      href: "/markets",
      icon: <TrendingUp />,
    },
    {
      label: "Portfolio",
      href: "/portfolio",
      icon: <Briefcase />,
    },
    {
      label: "History",
      href: "/history",
      icon: <History />,
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: <BarChart3 />,
    },
    {
      label: "Rules",
      href: "/rules",
      icon: <FileText />,
    },
  ];

  const bottomLinks = [
    {
      label: "Help",
      href: "/help",
      icon: <HelpCircle />,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings />,
    },
  ];

  return (
    <AceternitySidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {open ? <Logo /> : <LogoIcon />}

          {/* Divider below logo */}
          <div className="h-px bg-gray-200 w-full mb-6" />

          <div className="flex flex-col gap-1">
            {mainLinks.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </div>
        </div>

        {/* Bottom Section with Divider */}
        <div className="flex flex-col gap-3">
          {/* Divider */}
          <div className="h-px bg-gray-200 w-full" />

          {/* Get Funded CTA */}
          <Link
            href="/new-challenge"
            className={cn(
              "flex items-center gap-2 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg",
              open && "justify-center px-4 py-3",
              !open && "justify-center px-2 py-2"
            )}
          >
            <Rocket className="h-5 w-5 flex-shrink-0" />
            {open && <span className="text-sm whitespace-nowrap">Get Funded</span>}
          </Link>

          {/* Help and Settings Links */}
          <div className="flex flex-col gap-1">
            {bottomLinks.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </div>

          {/* User Account */}
          <div
            className={cn(
              "flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer",
              !open && "justify-center px-0"
            )}
          >
            <div className="h-7 w-7 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-xs font-semibold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            {open && (
              <span className="text-base font-medium text-neutral-700 whitespace-nowrap">
                {user.username}
              </span>
            )}
          </div>
        </div>
      </SidebarBody>
    </AceternitySidebar>
  );
};

export const Logo = () => {
  return (
    <Link
      href="/"
      className="font-normal flex space-x-2 items-center text-sm py-1 relative z-20 mb-2"
    >
      <div className="h-6 w-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-bold text-blue-600 whitespace-pre text-lg"
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
      className="font-normal flex justify-center items-center text-sm py-1 relative z-20 mb-2"
    >
      <div className="h-6 w-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </Link>
  );
};
