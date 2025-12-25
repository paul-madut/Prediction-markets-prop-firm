"use client";

import React from "react";
import { Bell } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/formatters";

export const TopBar = () => {
  const { user } = useApp();

  return (
    <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Welcome back, {user.username}</h2>
        <p className="text-sm text-gray-500">
          Account number: 123456789
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Account Balance */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Balance:</span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(user.accountBalance)}
          </span>
        </div>

        {/* Notification Bell */}
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={20} className="text-gray-600" />
        </button>

        {/* User Avatar */}
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
          {user.username.charAt(0)}
        </div>
      </div>
    </div>
  );
};
