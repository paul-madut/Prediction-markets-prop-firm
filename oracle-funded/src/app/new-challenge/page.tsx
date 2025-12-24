"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";
import { PricingCard } from "@/components/challenge/PricingCard";

export default function NewChallengePage() {
  const { plans, selectPlan, selectedPlan } = useApp();
  const router = useRouter();
  const [accountSize, setAccountSize] = useState(5000000); // 50k in cents

  // Find the plan that matches selected account size
  const currentPlan = plans.find((p) => p.accountSize === accountSize);

  const handleProceed = () => {
    if (currentPlan) {
      selectPlan(currentPlan.planId);
      alert(
        `Plan selected: ${formatCurrency(currentPlan.accountSize)} account\n\nThis is a demo - in production, this would proceed to checkout.`
      );
      router.push("/");
    }
  };

  const accountSizes = [1000000, 2500000, 5000000, 10000000, 20000000];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Find Your Perfect Prediction Plan
        </h1>
        <p className="text-gray-500">
          Start your journey to becoming a funded prediction trader
        </p>
      </div>

      {/* Account Size Slider */}
      <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Select Account Size
        </h2>
        <div className="space-y-4">
          <input
            type="range"
            min="0"
            max="4"
            step="1"
            value={accountSizes.indexOf(accountSize)}
            onChange={(e) => setAccountSize(accountSizes[parseInt(e.target.value)])}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600">
              {formatCurrency(accountSize)}
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            {accountSizes.map((size) => (
              <span key={size}>{formatCurrency(size)}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Card */}
      {currentPlan && (
        <div className="max-w-md mx-auto">
          <PricingCard
            plan={currentPlan}
            isSelected={true}
            onSelect={() => {}}
          />
          <button
            onClick={handleProceed}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-lg transition-colors"
          >
            Proceed to Checkout
          </button>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">What's Included</h3>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Unlimited trading on all markets</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>80/20 profit split after passing evaluation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Bi-weekly payouts</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Access to all market categories</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">•</span>
            <span>Real-time analytics and performance tracking</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
