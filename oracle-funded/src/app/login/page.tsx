"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Wallet, TrendingUp } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    // Mock login delay
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsLoading(false);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950 relative overflow-hidden">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="OracleFunded" width={40} height={40} className="shadow-lg shadow-blue-500/25" />
            <span className="font-bold text-2xl text-white">OracleFunded</span>
          </Link>

          {/* Center content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-white leading-tight">
                Trade Prediction Markets.<br />
                <span className="text-blue-400">Get Funded.</span>
              </h1>
              <p className="text-gray-400 text-lg max-w-md">
                Prove your edge in prediction markets and trade with our capital. No risk, all reward.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "$250K", label: "Max Funding" },
                { value: "90%", label: "Profit Split" },
                { value: "24/7", label: "Trading" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <p className="text-gray-300 text-sm italic">
              &quot;OracleFunded gave me the capital to trade prediction markets full-time. Passed the challenge in 12 days.&quot;
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">AK</span>
              </div>
              <div>
                <div className="text-white text-sm font-medium">Alex K.</div>
                <div className="text-gray-500 text-xs">Funded Trader</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Image src="/logo.png" alt="OracleFunded" width={36} height={36} />
            <span className="font-bold text-xl text-gray-900">OracleFunded</span>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back
            </h2>
            <p className="text-gray-500">
              Sign in to your trading account to continue.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <LabelInputContainer>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" placeholder="trader@example.com" type="email" />
            </LabelInputContainer>

            <LabelInputContainer>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition z-10"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </LabelInputContainer>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <button type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Forgot password?
              </button>
            </div>

            <button
              className="group/btn relative block h-11 w-full rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 font-medium text-white shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <>
                  Sign in
                  <BottomGradient />
                </>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-sm text-gray-400">or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                className="group/btn relative flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                type="button"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="12" fill="#0052FF"/>
                  <path d="M12 4.5C7.86 4.5 4.5 7.86 4.5 12S7.86 19.5 12 19.5 19.5 16.14 19.5 12 16.14 4.5 12 4.5zm-1.8 10.2H9.6c-.33 0-.6-.27-.6-.6v-4.2c0-.33.27-.6.6-.6h.6c.33 0 .6.27.6.6v3h2.4c.33 0 .6.27.6.6v.6c0 .33-.27.6-.6.6h-3z" fill="white"/>
                </svg>
                <span className="text-sm">Coinbase</span>
                <BottomGradient />
              </button>
              <button
                className="group/btn relative flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                type="button"
              >
                <Wallet className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Wallet</span>
                <BottomGradient />
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Start your challenge
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

const BottomGradient = () => {
  return (
    <>
      <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  );
};

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex w-full flex-col space-y-2", className)}>
      {children}
    </div>
  );
};
