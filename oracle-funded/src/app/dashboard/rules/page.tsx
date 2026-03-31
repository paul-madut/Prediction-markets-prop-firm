"use client";

import React from "react";
import { DollarSign } from "lucide-react";

import { RuleCard } from "@/components/rules/RuleCard";
import { FAQAccordion } from "@/components/rules/FAQAccordion";
import { SectionHeader } from "@/components/rules/SectionHeader";
import { PhaseTimeline } from "@/components/rules/PhaseTimeline";
import { SectionNav } from "@/components/rules/SectionNav";

const sections = [
  { id: "phases", label: "Challenge Phases" },
  { id: "rules", label: "Trading Rules" },
  { id: "payouts", label: "Payouts" },
  { id: "faq", label: "FAQ" },
];

const faqItems = [
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
  {
    q: "What markets can I trade?",
    a: "You can trade any prediction market available on our supported platforms, including political, sports, entertainment, and financial prediction markets.",
  },
  {
    q: "How long do I have to complete the challenge?",
    a: "There is no time limit to complete the challenge phases. Take as long as you need, as long as you maintain the risk parameters.",
  },
];

export default function RulesPage() {
  return (
    <>
      <SectionNav sections={sections} />

      <div className="space-y-16 md:space-y-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Challenge Phases */}
        <section id="phases" className="space-y-8 scroll-mt-20">
          <SectionHeader
            title="Challenge Phases"
            subtitle="Progress through our three-stage evaluation to become a funded trader"
            accentColor="blue"
          />
          <PhaseTimeline />
        </section>

        {/* Trading Rules */}
        <section id="rules" className="space-y-8 scroll-mt-20">
          <SectionHeader
            title="Trading Rules"
            subtitle="Follow these guidelines to maintain your account in good standing"
            accentColor="purple"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RuleCard
              title="Position Size Limit"
              accentColor="purple"
              index={0}
              items={[
                "Maximum 25% of account on any single market",
                "Prevents over-concentration risk",
                "Encourages portfolio diversification",
              ]}
            />

            <RuleCard
              title="Daily Loss Limit"
              accentColor="purple"
              index={1}
              items={[
                "Cannot lose more than 5% in a single day",
                "Calculated end-of-day (EOD)",
                "Protects your account from large drawdowns",
              ]}
            />

            <RuleCard
              title="Maximum Drawdown"
              accentColor="purple"
              index={2}
              items={[
                "Account cannot fall below 90% of peak balance",
                "Calculated daily at market close",
                "Encourages consistent risk management",
              ]}
            />

            <RuleCard
              title="Minimum Trading Days"
              accentColor="purple"
              index={3}
              items={[
                "Must execute trades on at least 10 different calendar days",
                "Weekends and holidays count",
                "Ensures consistency over time",
              ]}
            />

            <RuleCard
              title="Prohibited Strategies"
              accentColor="purple"
              index={4}
              items={[
                "No martingale strategies",
                "No grid trading",
                "No excessive hedging",
                "Focus on sustainable trading approaches",
              ]}
            />
          </div>
        </section>

        {/* Payouts */}
        <section id="payouts" className="space-y-8 scroll-mt-20">
          <SectionHeader
            title="Payout Information"
            subtitle="Learn how and when you'll receive your trading profits"
            accentColor="green"
          />

          <div className="max-w-2xl mx-auto">
            <RuleCard
              title="Payment Details"
              description="How and when you get paid"
              icon={DollarSign}
              accentColor="green"
              index={0}
              items={[
                "Frequency: Bi-weekly (every 14 days)",
                "Minimum Withdrawal: $100",
                "Processing Time: 24-48 hours",
                "Profit Split: 80% to trader, 20% to OracleFunded",
                "Payment Methods: Bank transfer, crypto, PayPal",
              ]}
            />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="space-y-8 scroll-mt-20">
          <SectionHeader
            title="Frequently Asked Questions"
            subtitle="Quick answers to common questions about our program"
            accentColor="blue"
          />

          <div className="max-w-3xl mx-auto">
            <FAQAccordion items={faqItems} />
          </div>
        </section>
      </div>
    </>
  );
}
