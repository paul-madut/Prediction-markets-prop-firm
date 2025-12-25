"use client";

import React from "react";
import { Target, Shield, TrendingUp, DollarSign } from "lucide-react";
import { RuleCard } from "@/components/rules/RuleCard";

export default function RulesPage() {
  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Challenge Rules</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Everything you need to know about our evaluation process
        </p>
      </div>

      {/* Challenge Phases */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 text-center">Challenge Phases</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <RuleCard
            title="Phase 1: Evaluation"
            description="Demonstrate your trading skills"
            icon={Target}
            accentColor="blue"
            items={[
              "Profit Target: 8% of account size",
              "Daily Loss Limit: 5% of account size",
              "Max Drawdown: 10% of account size",
              "Minimum Trading Days: 10 days",
              "Maximum 25% of account on single market",
            ]}
          />

          <RuleCard
            title="Phase 2: Verification"
            description="Prove consistency in your approach"
            icon={Shield}
            accentColor="purple"
            items={[
              "Same rules as Phase 1",
              "Prove consistency in trading approach",
              "Complete at least 10 trading days",
              "Maintain risk management discipline",
            ]}
          />

          <RuleCard
            title="Funded Trader"
            description="Start earning real profits"
            icon={TrendingUp}
            accentColor="green"
            items={[
              "80/20 profit split (you keep 80%)",
              "Bi-weekly payouts",
              "Minimum withdrawal: $100",
              "Same risk rules apply",
              "Scale up to larger accounts",
            ]}
          />
        </div>
      </div>

      {/* Trading Rules */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 text-center">Trading Rules</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <RuleCard
            title="Position Size Limit"
            accentColor="blue"
            items={[
              "Maximum 25% of account on any single market",
              "Prevents over-concentration risk",
              "Encourages portfolio diversification",
            ]}
          />

          <RuleCard
            title="Daily Loss Limit"
            accentColor="blue"
            items={[
              "Cannot lose more than 5% in a single day",
              "Calculated end-of-day (EOD)",
              "Protects your account from large drawdowns",
            ]}
          />

          <RuleCard
            title="Maximum Drawdown"
            accentColor="blue"
            items={[
              "Account cannot fall below 90% of peak balance",
              "Calculated daily at market close",
              "Encourages consistent risk management",
            ]}
          />

          <RuleCard
            title="Minimum Trading Days"
            accentColor="blue"
            items={[
              "Must execute trades on at least 10 different calendar days",
              "Weekends and holidays count",
              "Ensures consistency over time",
            ]}
          />

          <RuleCard
            title="Prohibited Strategies"
            accentColor="blue"
            items={[
              "No martingale strategies",
              "No grid trading",
              "No excessive hedging",
              "Focus on sustainable trading approaches",
            ]}
          />
        </div>
      </div>

      {/* Payouts */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 text-center">Payout Information</h2>

        <div className="max-w-2xl mx-auto">
          <RuleCard
            title="Payment Details"
            description="How and when you get paid"
            icon={DollarSign}
            accentColor="green"
            items={[
              "Frequency: Bi-weekly (every 14 days)",
              "Minimum Withdrawal: $100",
              "Processing Time: 24-48 hours",
              "Profit Split: 80% to trader, 20% to OracleFunded",
            ]}
          />
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {[
            {
              q: "What happens if I violate a rule?",
              a: "Your account will be flagged and may be reset. Repeated violations result in disqualification.",
            },
            {
              q: "Can I trade on weekends?",
              a: "Yes, prediction markets are open 24/7. Trading days count toward your minimum requirement.",
            },
            {
              q: "How is drawdown calculated?",
              a: "Drawdown is calculated end-of-day (EOD) based on your peak balance. It's the difference between your peak and current balance.",
            },
            {
              q: "Can I have multiple accounts?",
              a: "Yes, you can purchase multiple challenge accounts and trade them simultaneously.",
            },
          ].map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
            >
              <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
              <p className="text-gray-700">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
