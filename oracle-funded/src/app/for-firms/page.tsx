"use client";

import Link from "next/link";
import {
  Rocket,
  TrendingUp,
  Palette,
  Layers,
  Zap,
  Shield,
  BarChart3,
  Users,
  Clock,
  CheckCircle2,
  ArrowRight,
  Globe,
  DollarSign,
  Target,
  Menu,
  X,
} from "lucide-react";
import { MovingBorderCard } from "@/components/ui/moving-border";
import { useState } from "react";
import { motion } from "framer-motion";

const features = [
  {
    icon: BarChart3,
    title: "Complete Dashboard",
    description: "P&L tracking, equity curves, objectives monitoring, and trading calendar - all production-ready.",
  },
  {
    icon: Layers,
    title: "Flexible Challenge System",
    description: "Blitz, 2-Step, 3-Step challenges with customizable rules, profit targets, and drawdown limits.",
  },
  {
    icon: Globe,
    title: "Multi-Platform Integration",
    description: "Connect to Kalshi, Polymarket, and other prediction market platforms through unified APIs.",
  },
  {
    icon: Shield,
    title: "Risk Management",
    description: "Real-time drawdown monitoring, position limits, and automated rule enforcement.",
  },
  {
    icon: Users,
    title: "Trader Management",
    description: "Track trader performance, manage payouts, and monitor account status across your firm.",
  },
  {
    icon: DollarSign,
    title: "Payment Integration",
    description: "Challenge purchases, profit payouts, and subscription management ready to connect.",
  },
];

const customizations = [
  { label: "Branding & Colors", description: "Your logo, color scheme, and visual identity throughout" },
  { label: "Challenge Rules", description: "Define profit targets, drawdown limits, trading days, and phases" },
  { label: "Profit Splits", description: "Set your own split ratios for funded traders" },
  { label: "Pricing Structure", description: "Custom pricing for each account size and challenge type" },
  { label: "Market Selection", description: "Choose which prediction markets to offer traders" },
  { label: "Trading Rules", description: "Prohibited strategies, position limits, and risk parameters" },
];

const processSteps = [
  {
    step: "01",
    title: "Discovery Call",
    description: "We discuss your vision, target market, and specific requirements for your prop firm.",
  },
  {
    step: "02",
    title: "Customization",
    description: "We configure the platform with your branding, rules, pricing, and market integrations.",
  },
  {
    step: "03",
    title: "Testing & Launch",
    description: "Thorough testing with your team, then launch to your first traders.",
  },
  {
    step: "04",
    title: "Ongoing Support",
    description: "Continuous updates, feature additions, and technical support as you scale.",
  },
];

const marketStats = [
  { value: "$1B+", label: "Kalshi 2024 Volume" },
  { value: "3x", label: "YoY Growth Rate" },
  { value: "CFTC", label: "Regulated Markets" },
  { value: "24/7", label: "Trading Hours" },
];

export default function ForFirmsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/for-firms" className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">OF</span>
              </div>
              <span className="font-bold text-xl text-gray-900">OracleFunded</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition">Features</a>
              <a href="#customization" className="text-sm text-gray-600 hover:text-gray-900 transition">Customization</a>
              <a href="#process" className="text-sm text-gray-600 hover:text-gray-900 transition">Process</a>
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-gray-900 transition"
              >
                View Demo
              </Link>
            </nav>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="mailto:hello@oraclefunded.com"
                className="btn-hover px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 hover:scale-105 transition-all duration-200 text-sm"
              >
                Schedule Demo
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white border-b border-gray-100 px-4 py-4 space-y-3"
          >
            <a href="#features" className="block text-gray-600 hover:text-gray-900">Features</a>
            <a href="#customization" className="block text-gray-600 hover:text-gray-900">Customization</a>
            <a href="#process" className="block text-gray-600 hover:text-gray-900">Process</a>
            <Link href="/" className="block text-gray-600 hover:text-gray-900">View Demo</Link>
            <Link
              href="mailto:hello@oraclefunded.com"
              className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
            >
              Schedule Demo
            </Link>
          </motion.div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="space-y-20 py-16">
          {/* Hero Section */}
          <section className="text-center space-y-6 pt-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-700 text-sm font-medium">
              <Rocket className="w-4 h-4" />
              Whitelabel Platform for Prop Firms
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Launch Your Prediction Market<br />
              <span className="text-blue-600">Prop Firm in 30 Days</span>
            </h1>

            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get a complete, customizable trading platform without the 12+ months of development time.
              We handle the technology so you can focus on funding traders.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="mailto:hello@oraclefunded.com"
                className="btn-hover px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 hover:scale-105 hover:shadow-xl transition-all duration-200 shadow-lg shadow-blue-600/25 flex items-center gap-2"
              >
                Schedule a Demo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="btn-hover px-8 py-3 bg-white text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:scale-105 hover:shadow-lg transition-all duration-200 border border-gray-200 flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                View Live Demo
              </Link>
            </div>
          </section>

          {/* Why Prediction Markets */}
          <section className="space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold text-gray-900">Why Prediction Markets?</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                The next frontier in proprietary trading. Here&apos;s why smart firms are entering now.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {marketStats.map((stat) => (
                <div key={stat.label} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 text-center card-hover">
                  <div className="text-3xl font-bold text-blue-600">{stat.value}</div>
                  <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            <MovingBorderCard borderRadius="0.75rem" className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <TrendingUp className="w-5 h-5" />
                    <span className="font-semibold">Explosive Growth</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Prediction markets saw record volume during 2024 elections. The space is growing 3x year-over-year with regulatory clarity.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Target className="w-5 h-5" />
                    <span className="font-semibold">Untapped Market</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Unlike saturated forex/futures prop trading, prediction market prop firms are a blue ocean opportunity.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-purple-600">
                    <Users className="w-5 h-5" />
                    <span className="font-semibold">New Trader Demographic</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Prediction markets attract informed bettors, policy analysts, and news followers - a different trader profile.
                  </p>
                </div>
              </div>
            </MovingBorderCard>
          </section>

          {/* Platform Features */}
          <section id="features" className="space-y-8 scroll-mt-20">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold text-gray-900">Production-Ready Platform</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Everything you need to run a professional prop firm, built and tested.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-white rounded-xl border border-gray-200 p-6 card-hover"
                >
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Customization */}
          <section id="customization" className="space-y-8 scroll-mt-20">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold text-gray-900">Fully Customizable</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                This isn&apos;t a rigid template. Every aspect adapts to your brand and business model.
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customizations.map((item) => (
                  <div key={item.label} className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{item.label}</div>
                      <div className="text-sm text-gray-500">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Process */}
          <section id="process" className="space-y-8 scroll-mt-20">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold text-gray-900">Simple Process</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                From first call to live platform in weeks, not months.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {processSteps.map((item, index) => (
                <div key={item.step} className="relative">
                  {index < processSteps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-blue-200 to-transparent -translate-x-1/2" />
                  )}
                  <div className="bg-white rounded-xl border border-gray-200 p-6 relative z-10 card-hover">
                    <div className="text-4xl font-bold text-blue-100 mb-2">{item.step}</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tech Stack Credibility */}
          <section className="bg-gray-900 rounded-xl p-8 text-white">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Built With Modern Technology</h2>
                <p className="text-gray-400">
                  Enterprise-grade stack that scales with your business. Fast, secure, and maintainable.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Next.js 16", "React 19", "TypeScript", "Tailwind CSS", "Framer Motion", "Radix UI"].map((tech) => (
                    <span key={tech} className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300 hover:bg-gray-700 transition">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4 text-center hover:bg-gray-750 transition">
                  <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-400">Fast Performance</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center hover:bg-gray-750 transition">
                  <Shield className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-400">Type-Safe Code</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center hover:bg-gray-750 transition">
                  <Palette className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-400">Modern Design</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-center hover:bg-gray-750 transition">
                  <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-400">Real-Time Updates</div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center space-y-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-12 text-white">
            <h2 className="text-3xl font-bold">Ready to Launch Your Prop Firm?</h2>
            <p className="text-blue-100 max-w-xl mx-auto">
              Let&apos;s discuss how we can build your prediction market prop firm.
              Schedule a call to see the full platform and talk through your requirements.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="mailto:hello@oraclefunded.com"
                className="btn-hover px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 hover:scale-105 hover:shadow-xl transition-all duration-200 flex items-center gap-2"
              >
                Schedule a Demo Call
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="btn-hover px-8 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 hover:scale-105 transition-all duration-200 border border-blue-400"
              >
                Explore the Dashboard
              </Link>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">OF</span>
              </div>
              <span className="font-bold text-gray-900">OracleFunded</span>
            </div>
            <p className="text-sm text-gray-500">
              Whitelabel prediction market prop firm technology
            </p>
            <div className="flex items-center gap-6">
              <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 transition">
                Demo Dashboard
              </Link>
              <Link href="mailto:hello@oraclefunded.com" className="text-sm text-gray-600 hover:text-gray-900 transition">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
