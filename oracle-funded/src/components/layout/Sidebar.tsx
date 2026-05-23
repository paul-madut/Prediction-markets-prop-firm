"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  HomeIcon,
  ArrowTrendingUpIcon,
  BriefcaseIcon,
  ChartBarIcon,
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
  RocketLaunchIcon,
  WalletIcon,
  Bars3Icon,
  TrophyIcon,
  ClockIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import {
  Sidebar as AceternitySidebar,
  SidebarBody,
  SidebarLink,
  useSidebar,
} from "@/components/ui/sidebar";

function userInitial(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1) return parts[0][0].toUpperCase();
  }
  if (email) return (email[0] ?? "?").toUpperCase();
  return "?";
}

function userDisplay(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string {
  if (fullName && fullName.trim()) return fullName.trim();
  if (!email) return "Account";
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

export const Sidebar = () => {
  const { user } = useApp();
  const [open, setOpen] = useState(false);

  const mainLinks = [
    { label: "Dashboard", href: "/dashboard", icon: <HomeIcon /> },
    { label: "Challenge", href: "/dashboard/challenge", icon: <TrophyIcon /> },
    { label: "Markets", href: "/dashboard/markets", icon: <ArrowTrendingUpIcon /> },
    { label: "Portfolio", href: "/dashboard/portfolio", icon: <BriefcaseIcon /> },
    { label: "History", href: "/dashboard/history", icon: <ClockIcon /> },
    { label: "Analytics", href: "/dashboard/analytics", icon: <ChartBarIcon /> },
    { label: "Rules", href: "/dashboard/rules", icon: <BookOpenIcon /> },
    { label: "Payouts", href: "/dashboard/payouts", icon: <WalletIcon /> },
  ];

  const bottomLinks = [
    { label: "Help", href: "/dashboard/help", icon: <QuestionMarkCircleIcon /> },
    { label: "Settings", href: "/dashboard/settings", icon: <Cog6ToothIcon /> },
  ];

  return (
    <AceternitySidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <SidebarHeader />

          <div className="h-px bg-white/10 w-full mb-6" />

          <div className="flex flex-col gap-2">
            {mainLinks.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="h-px bg-white/10 w-full" />

          <div className={cn("px-3", !open && "flex justify-center px-0")}>
            <Link
              href="/dashboard/new-challenge"
              className={cn(
                "flex items-center justify-center rounded-[10px] font-semibold text-white bg-[#7F24FF] hover:bg-[#A769FF] transition-all duration-300 shadow-[0_8px_24px_-6px_rgba(127,36,255,0.55)] hover:shadow-[0_12px_28px_-6px_rgba(127,36,255,0.7)] hover:-translate-y-px",
                open ? "w-full py-3 px-4 gap-2" : "h-10 w-10",
              )}
            >
              <RocketLaunchIcon className="h-5 w-5 flex-shrink-0" />
              {open && (
                <span className="text-sm whitespace-nowrap">Get Funded</span>
              )}
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            {bottomLinks.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </div>

          <div
            className={cn(
              "flex items-center gap-3 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer",
              open
                ? "py-2 px-3 justify-start"
                : "h-10 w-10 mx-auto justify-center",
            )}
          >
            {user?.profile?.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.profile.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-7 w-7 flex-shrink-0 rounded-full object-cover bg-white/[0.06]"
              />
            ) : (
              <div className="h-7 w-7 flex-shrink-0 rounded-full bg-gradient-to-br from-[#7F24FF] to-[#A769FF] flex items-center justify-center text-white text-xs font-semibold">
                {userInitial(user?.profile?.fullName, user?.email)}
              </div>
            )}
            <motion.span
              animate={{
                opacity: open ? 1 : 0,
                width: open ? "auto" : 0,
              }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="text-base font-medium text-white/85 whitespace-nowrap overflow-hidden"
            >
              {userDisplay(user?.profile?.fullName, user?.email)}
            </motion.span>
          </div>
        </div>
      </SidebarBody>
    </AceternitySidebar>
  );
};

const SidebarHeader = () => {
  const { open, setOpen } = useSidebar();
  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1 relative z-20 mb-2",
        open ? "pl-1" : "justify-center",
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors flex-shrink-0 text-white/80"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>
      <motion.div
        animate={{
          opacity: open ? 1 : 0,
          width: open ? "auto" : 0,
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex items-center whitespace-pre overflow-hidden"
      >
        <Image
          src="/blueberry-logo.png"
          alt="Blueberry Funded"
          width={520}
          height={200}
          priority
          className="h-7 w-auto"
        />
      </motion.div>
    </div>
  );
};
