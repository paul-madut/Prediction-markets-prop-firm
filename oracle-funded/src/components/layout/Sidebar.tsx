"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  PlusCircle,
  TrendingUp,
  Briefcase,
  History,
  BarChart3,
  HelpCircle,
  Settings,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const NavItem = ({ href, icon, label, isActive }: NavItemProps) => {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
        isActive
          ? "bg-blue-50 text-blue-600"
          : "text-gray-700 hover:bg-gray-100"
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export const Sidebar = () => {
  const pathname = usePathname();
  const { user } = useApp();

  const navItems = [
    { href: "/", icon: <Home size={20} />, label: "Dashboard" },
    { href: "/new-challenge", icon: <PlusCircle size={20} />, label: "New Challenge" },
    { href: "/markets", icon: <TrendingUp size={20} />, label: "Markets" },
    { href: "/portfolio", icon: <Briefcase size={20} />, label: "Portfolio" },
    { href: "/history", icon: <History size={20} />, label: "History" },
    { href: "/analytics", icon: <BarChart3 size={20} />, label: "Analytics" },
    { href: "/rules", icon: <HelpCircle size={20} />, label: "Rules" },
  ];

  return (
    <div className="w-64 h-screen bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">OracleFunded</h1>
      </div>

      {/* Start Challenge Button */}
      <div className="px-4 mb-4">
        <Link
          href="/new-challenge"
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
        >
          Start Challenge
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={pathname === item.href}
          />
        ))}
      </nav>

      {/* Settings */}
      <div className="px-4 py-2 border-t border-gray-200">
        <NavItem
          href="/settings"
          icon={<Settings size={20} />}
          label="Settings"
          isActive={pathname === "/settings"}
        />
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
            {user.username.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{user.username}</div>
            <div className="text-sm text-gray-500">Trader</div>
          </div>
        </div>
      </div>
    </div>
  );
};
