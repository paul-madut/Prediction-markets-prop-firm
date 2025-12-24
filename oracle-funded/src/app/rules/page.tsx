"use client";

import React from "react";
import { formatCurrency } from "@/lib/formatters";

export default function RulesPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Challenge Rules</h1>
        <p className="text-gray-500">
          Everything you need to know about our evaluation process
        </p>
      </div>

      {/* Challenge Phases */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Challenge Phases</h2>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-blue-600 mb-3">
            Phase 1: Evaluation
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li>• Profit Target: 8% of account size</li>
            <li>• Daily Loss Limit: 5% of account size</li>
            <li>• Max Drawdown: 10% of account size</li>
            <li>• Minimum Trading Days: 10 days</li>
            <li>• Maximum 25% of account on single market</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-blue-600 mb-3">
            Phase 2: Verification
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li>• Same rules as Phase 1</li>
            <li>• Prove consistency in trading approach</li>
            <li>• Complete at least 10 trading days</li>
            <li>• Maintain risk management discipline</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-green-600 mb-3">
            Funded Trader
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li>• 80/20 profit split (you keep 80%)</li>
            <li>• Bi-weekly payouts</li>
            <li>• Minimum withdrawal: $100</li>
            <li>• Same risk rules apply</li>
            <li>• Scale up to larger accounts</li>
          </ul>
        </div>
      </div>

      {/* Trading Rules */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Trading Rules</h2>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </span>
              <div>
                <div className="font-semibold text-gray-900">
                  Position Size Limit
                </div>
                <div className="text-sm text-gray-600">
                  Maximum 25% of account on any single market
                </div>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </span>
              <div>
                <div className="font-semibold text-gray-900">
                  Daily Loss Limit
                </div>
                <div className="text-sm text-gray-600">
                  Cannot lose more than 5% in a single day (calculated EOD)
                </div>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </span>
              <div>
                <div className="font-semibold text-gray-900">
                  Maximum Drawdown
                </div>
                <div className="text-sm text-gray-600">
                  Account cannot fall below 90% of peak balance
                </div>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                4
              </span>
              <div>
                <div className="font-semibold text-gray-900">
                  Minimum Trading Days
                </div>
                <div className="text-sm text-gray-600">
                  Must execute trades on at least 10 different calendar days
                </div>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                5
              </span>
              <div>
                <div className="font-semibold text-gray-900">
                  No Prohibited Strategies
                </div>
                <div className="text-sm text-gray-600">
                  No martingale, grid trading, or excessive hedging
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Payouts */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Payout Information</h2>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <ul className="space-y-3 text-gray-700">
            <li>
              <span className="font-semibold text-gray-900">Frequency:</span>{" "}
              Bi-weekly (every 14 days)
            </li>
            <li>
              <span className="font-semibold text-gray-900">
                Minimum Withdrawal:
              </span>{" "}
              $100
            </li>
            <li>
              <span className="font-semibold text-gray-900">
                Processing Time:
              </span>{" "}
              24-48 hours
            </li>
            <li>
              <span className="font-semibold text-gray-900">Profit Split:</span>{" "}
              80% to trader, 20% to OracleFunded
            </li>
          </ul>
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
