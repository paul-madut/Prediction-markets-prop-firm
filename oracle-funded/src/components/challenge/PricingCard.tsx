"use client";

import React from "react";
import { ChallengePlan } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { CheckIcon } from "@heroicons/react/16/solid";

interface PricingCardProps {
  plan: ChallengePlan;
  isSelected: boolean;
  onSelect: () => void;
}

export const PricingCard = ({ plan, isSelected, onSelect }: PricingCardProps) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-8 border-2 transition-all ${
        isSelected ? "border-blue-600" : "border-gray-200"
      }`}
    >
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {formatCurrency(plan.accountSize)} Account
        </h3>
        <div className="text-3xl font-bold text-blue-600">
          {formatCurrency(plan.monthlyPrice)}
          <span className="text-lg text-gray-500">/month</span>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-2">
          <CheckIcon className="text-green-600 flex-shrink-0 mt-0.5" />
          <span className="text-gray-700">
            Profit Target: {formatCurrency(plan.profitTarget)}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <CheckIcon className="text-green-600 flex-shrink-0 mt-0.5" />
          <span className="text-gray-700">
            Max Positions: {plan.maxPositions}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <CheckIcon className="text-green-600 flex-shrink-0 mt-0.5" />
          <span className="text-gray-700">
            Daily Loss Limit: {formatCurrency(plan.dailyLossLimit)}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <CheckIcon className="text-green-600 flex-shrink-0 mt-0.5" />
          <span className="text-gray-700">
            Max Drawdown: {formatCurrency(plan.maxDrawdown)}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <CheckIcon className="text-green-600 flex-shrink-0 mt-0.5" />
          <span className="text-gray-700">
            Drawdown Mode: {plan.drawdownMode}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <CheckIcon className="text-green-600 flex-shrink-0 mt-0.5" />
          <span className="text-gray-700">
            Reset Fee: {formatCurrency(plan.resetFee)}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <CheckIcon className="text-green-600 flex-shrink-0 mt-0.5" />
          <span className="text-gray-700">
            Activation Fee: {plan.activationFee ? "Yes" : "No"}
          </span>
        </div>
      </div>

      <button
        onClick={onSelect}
        className={`w-full py-3 rounded-lg font-semibold transition-colors ${
          isSelected
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        {isSelected ? "Selected" : "Choose Plan"}
      </button>
    </div>
  );
};
