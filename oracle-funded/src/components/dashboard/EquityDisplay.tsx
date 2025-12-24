"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/formatters";

export const EquityDisplay = () => {
  const { user } = useApp();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="text-sm text-gray-500 mb-2">Current Equity</div>
      <div className="text-4xl font-bold text-gray-900">
        {formatCurrency(user.accountBalance)}
      </div>
      <div className={`text-sm mt-2 ${user.currentProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {user.currentProfit >= 0 ? '+' : ''}{(user.currentProfit * 100).toFixed(2)}% from start
      </div>
    </div>
  );
};
