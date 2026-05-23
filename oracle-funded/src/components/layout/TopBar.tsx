"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  BellIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  UserIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Motion presets per DESIGN.md
const SPRING_GENTLE = { type: "spring" as const, stiffness: 150, damping: 20 };
const SPRING_SNAPPY = { type: "spring" as const, stiffness: 500, damping: 35 };
const EASE_DEFAULT: [number, number, number, number] = [0.4, 0, 0.2, 1];

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/challenge": "Challenge",
  "/dashboard/new-challenge": "New Challenge",
  "/dashboard/markets": "Markets",
  "/dashboard/portfolio": "Portfolio",
  "/dashboard/history": "Trade History",
  "/dashboard/analytics": "Analytics",
  "/dashboard/rules": "Rules",
  "/dashboard/payouts": "Payouts",
  "/dashboard/settings": "Settings",
  "/dashboard/help": "Help Center",
};

function pageTitle(pathname: string | null): string {
  if (!pathname) return "";
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.keys(pageTitles)
    .filter((p) => pathname.startsWith(p + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return match ? pageTitles[match] : "";
}

// Initials from a full name ("Jane Doe" → "JD") or from an email local-part
// when no name is available.
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

// Display name. Prefer the Google-supplied full_name; fall back to an
// email-local-part Title Case derivation.
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

export const TopBar = () => {
  const { user, activeAccount } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notificationCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const title = pageTitle(pathname);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  async function signOut(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  const phaseLabel =
    activeAccount?.currentPhase?.name ??
    (user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : "");

  return (
    // 64px tall, solid #0C0319, 1px white/10 bottom border, no shadow.
    <div className="h-16 bg-[#0C0319] border-b border-white/10 px-3 sm:px-6 flex items-center justify-between">
      {/* Breadcrumb-style page title that crossfades on route change. */}
      <div className="relative h-6 flex items-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={title || "topbar-title"}
            role="presentation"
            aria-hidden="true"
            initial={{ opacity: 0, y: 4 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.2, ease: EASE_DEFAULT },
            }}
            exit={{
              opacity: 0,
              y: -4,
              transition: { duration: 0.15, ease: EASE_DEFAULT },
            }}
            className="text-base sm:text-lg font-semibold text-white tracking-tight truncate"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {title}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative" ref={notificationRef}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={SPRING_SNAPPY}
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors duration-150 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(127,36,255,0.45)]"
            style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
            aria-label="Notifications"
          >
            <BellIcon className="h-5 w-5 text-white/75" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-[#7F24FF] rounded-full text-white text-xs flex items-center justify-center font-semibold shadow-[0_0_0_2px_#0C0319]">
                {notificationCount}
              </span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.97,
                  y: 4,
                  transition: { duration: 0.15, ease: EASE_DEFAULT },
                }}
                transition={{ ...SPRING_GENTLE, opacity: { duration: 0.2 } }}
                style={{ transformOrigin: "top right" }}
                // Level-3 popover: surface-2 with shadow allowed per DESIGN.md.
                className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#1f0a3d] rounded-xl border border-white/10 z-50 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]"
              >
                <div className="p-4 border-b border-white/10">
                  <h3 className="font-semibold text-white">Notifications</h3>
                </div>
                <div className="p-6 text-center text-sm text-white/60">
                  You&apos;re all caught up.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Link
          href="/dashboard/settings"
          className="hidden sm:flex p-2 hover:bg-white/[0.06] rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(127,36,255,0.45)]"
          style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
          aria-label="Settings"
        >
          <Cog6ToothIcon className="h-5 w-5 text-white/75" />
        </Link>

        <div
          className="relative pl-2 sm:pl-3 border-l border-white/10"
          ref={profileRef}
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={SPRING_SNAPPY}
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 sm:gap-3 hover:bg-white/[0.06] rounded-lg px-1.5 sm:px-2 py-1.5 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(127,36,255,0.45)]"
            style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
          >
            {user?.profile?.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.profile.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover bg-white/[0.06]"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#7F24FF] to-[#A769FF] flex items-center justify-center text-white font-semibold text-sm">
                {userInitial(user?.profile?.fullName, user?.email)}
              </div>
            )}
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-semibold text-white">
                {userDisplay(user?.profile?.fullName, user?.email)}
              </span>
              {phaseLabel && (
                <span className="text-xs text-white/55">{phaseLabel}</span>
              )}
            </div>
            <ChevronDownIcon
              className={cn(
                "h-4 w-4 hidden sm:block text-white/50 transition-transform duration-200",
                showProfileMenu && "rotate-180",
              )}
              style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
          </motion.button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.97,
                  y: 4,
                  transition: { duration: 0.15, ease: EASE_DEFAULT },
                }}
                transition={{ ...SPRING_GENTLE, opacity: { duration: 0.2 } }}
                style={{ transformOrigin: "top right" }}
                // Level-3 popover.
                className="absolute right-0 mt-2 w-56 bg-[#1f0a3d] rounded-xl border border-white/10 z-50 py-1 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]"
              >
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/85 hover:bg-white/[0.06] transition-colors duration-150"
                  style={{
                    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  <UserIcon className="w-4 h-4" />
                  Profile & Settings
                </Link>
                <div className="border-t border-white/10 my-1" />
                <button
                  onClick={signOut}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#FF1C1C] hover:bg-[#FF1C1C]/10 transition-colors duration-150 w-full"
                  style={{
                    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
