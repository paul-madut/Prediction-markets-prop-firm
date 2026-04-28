"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HomeIcon, PlusCircleIcon, ArrowTrendingUpIcon, BriefcaseIcon, ChartBarIcon, QuestionMarkCircleIcon, Cog6ToothIcon, RocketLaunchIcon, WalletIcon, Bars3Icon } from "@heroicons/react/24/outline";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import {
  Sidebar as AceternitySidebar,
  SidebarBody,
  SidebarLink,
  useSidebar,
} from "@/components/ui/sidebar";

export const Sidebar = () => {
  const pathname = usePathname();
  const { user } = useApp();
  const [open, setOpen] = useState(false);

  const mainLinks = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <HomeIcon />,
    },
    {
      label: "New Challenge",
      href: "/dashboard/new-challenge",
      icon: <PlusCircleIcon />,
    },
    {
      label: "Markets",
      href: "/dashboard/markets",
      icon: <ArrowTrendingUpIcon />,
    },
    {
      label: "Portfolio",
      href: "/dashboard/portfolio",
      icon: <BriefcaseIcon />,
    },
    {
      label: "Analytics",
      href: "/dashboard/analytics",
      icon: <ChartBarIcon />,
    },
    {
      label: "Payouts",
      href: "/dashboard/payouts",
      icon: <WalletIcon />,
    },
  ];

  const bottomLinks = [
    {
      label: "Help",
      href: "/dashboard/help",
      icon: <QuestionMarkCircleIcon />,
    },
    {
      label: "Settings",
      href: "/dashboard/settings",
      icon: <Cog6ToothIcon />,
    },
  ];

  return (
    <AceternitySidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <SidebarHeader />

          {/* Divider below header */}
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
          <div className={cn("px-3", !open && "flex justify-center px-0")}>
            <Link
              href="/dashboard/new-challenge"
              className={cn(
                "flex items-center justify-center rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg",
                open ? "w-full py-3 px-4 gap-2" : "h-10 w-10"
              )}
            >
              <RocketLaunchIcon className="h-5 w-5 flex-shrink-0" />
              {open && (
                <span className="text-sm whitespace-nowrap">
                  Get Funded
                </span>
              )}
            </Link>
          </div>

          {/* Help and Settings Links */}
          <div className="flex flex-col gap-1">
            {bottomLinks.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </div>

          {/* User Account */}
          <motion.div
            className="flex items-center gap-3 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            animate={{
              justifyContent: open ? "flex-start" : "center",
              paddingLeft: open ? "12px" : "0px",
              paddingRight: open ? "12px" : "0px",
            }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <div className="h-7 w-7 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-xs font-semibold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <motion.span
              animate={{
                opacity: open ? 1 : 0,
                width: open ? "auto" : 0,
              }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="text-base font-medium text-neutral-700 whitespace-nowrap overflow-hidden"
            >
              {user.username}
            </motion.span>
          </motion.div>
        </div>
      </SidebarBody>
    </AceternitySidebar>
  );
};

const SidebarHeader = () => {
  const { open, setOpen } = useSidebar();
  return (
    <div className="flex items-center gap-2 py-1 pl-1 relative z-20 mb-2">
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 text-neutral-700"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>
      <motion.span
        animate={{
          opacity: open ? 1 : 0,
          width: open ? "auto" : 0,
        }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="font-bold text-blue-600 whitespace-pre text-lg overflow-hidden"
      >
        OracleFunded
      </motion.span>
    </div>
  );
};
