"use client";

import React from "react";
import { HelpCircle, Mail, MessageCircle, BookOpen, FileText } from "lucide-react";
import { RuleCard } from "@/components/rules/RuleCard";

export default function HelpPage() {
  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Help Center</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Get the support you need to succeed with OracleFunded
        </p>
      </div>

      {/* Help Categories */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 text-center">
          How Can We Help?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <RuleCard
            title="Getting Started"
            description="New to OracleFunded? Start here"
            icon={BookOpen}
            accentColor="blue"
            items={[
              "How to create your first challenge",
              "Understanding the evaluation process",
              "Setting up your trading account",
              "Navigating the dashboard",
            ]}
          />

          <RuleCard
            title="Trading Help"
            description="Learn how to trade effectively"
            icon={FileText}
            accentColor="purple"
            items={[
              "How to place a trade",
              "Understanding market probabilities",
              "Managing your positions",
              "Reading market data",
            ]}
          />

          <RuleCard
            title="Account & Billing"
            description="Manage your account settings"
            icon={HelpCircle}
            accentColor="blue"
            items={[
              "Upgrading your challenge",
              "Payment and billing questions",
              "Managing subscriptions",
              "Requesting payouts",
            ]}
          />
        </div>
      </div>

      {/* Contact Support */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 text-center">
          Contact Support
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <RuleCard
            title="Email Support"
            description="Get help via email"
            icon={Mail}
            accentColor="green"
            items={[
              "Email: support@oraclefunded.com",
              "Response time: 24-48 hours",
              "Available 7 days a week",
            ]}
          />

          <RuleCard
            title="Live Chat"
            description="Chat with our team"
            icon={MessageCircle}
            accentColor="green"
            items={[
              "Available Monday-Friday",
              "9 AM - 5 PM EST",
              "Average response: 5 minutes",
            ]}
          />
        </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 text-center">
          Frequently Asked Questions
        </h2>

        <div className="max-w-4xl mx-auto space-y-4">
          {[
            {
              q: "How do I reset my password?",
              a: "Go to Settings > Account > Change Password. Enter your current password and your new password twice to confirm.",
            },
            {
              q: "When will I receive my payout?",
              a: "Payouts are processed bi-weekly on the 1st and 15th of each month. Processing time is typically 24-48 hours after approval.",
            },
            {
              q: "Can I have multiple challenge accounts?",
              a: "Yes! You can purchase and trade multiple challenge accounts simultaneously. There's no limit to the number of accounts you can have.",
            },
            {
              q: "What happens if I violate a trading rule?",
              a: "Your account will be flagged and you'll receive a notification. First-time violations may result in a warning. Repeated violations can lead to account suspension or reset.",
            },
            {
              q: "How do I upgrade my account?",
              a: "Once you pass your current challenge, you can scale up to a larger account size. Visit the New Challenge page to select your next account size.",
            },
          ].map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
            >
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                {faq.q}
              </h3>
              <p className="text-gray-700">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Resources */}
      <div className="bg-blue-50 rounded-xl p-8 border border-blue-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
          Additional Resources
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <a
            href="/rules"
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="font-semibold text-gray-900">Trading Rules</div>
            <p className="text-sm text-gray-600 mt-1">
              Review all challenge rules
            </p>
          </a>
          <a
            href="/analytics"
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <BookOpen className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="font-semibold text-gray-900">Trading Guide</div>
            <p className="text-sm text-gray-600 mt-1">
              Learn trading strategies
            </p>
          </a>
          <a
            href="/settings"
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <HelpCircle className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="font-semibold text-gray-900">Account Settings</div>
            <p className="text-sm text-gray-600 mt-1">
              Manage your preferences
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
