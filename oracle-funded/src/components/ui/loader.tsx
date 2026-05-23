"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Blueberry loader spec (DESIGN.md):
// - Spinner colour: #A769FF, 1px stroke.
// - 800ms rotation, linear, infinite.
// - Wrapped in motion-safe so prefers-reduced-motion users see no spin.

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "spinner" | "dots" | "pulse";
}

export const Loader = ({
  size = "md",
  className,
  variant = "spinner",
}: LoaderProps) => {
  const sizeConfig = {
    sm: { container: "w-8 h-8", dot: "w-2 h-2", stroke: 1 },
    md: { container: "w-12 h-12", dot: "w-3 h-3", stroke: 1 },
    lg: { container: "w-16 h-16", dot: "w-4 h-4", stroke: 1.5 },
  };

  const config = sizeConfig[size];

  if (variant === "dots") {
    return (
      <div className={cn("flex items-center justify-center gap-2", className)}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn("rounded-full bg-[#A769FF]", config.dot)}
            animate={{
              y: ["0%", "-50%", "0%"],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <motion.div
          className={cn(
            "rounded-full bg-[#7F24FF] motion-safe:animate-pulse-soft",
            config.container,
          )}
        />
      </div>
    );
  }

  // Default spinner — SVG so we can control 1px stroke precisely.
  const dim = size === "sm" ? 20 : size === "md" ? 28 : 40;
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <motion.svg
        width={dim}
        height={dim}
        viewBox="0 0 50 50"
        // MotionConfig at MainLayout.tsx already collapses springs for
        // prefers-reduced-motion. Framer's `animate` honours that, so the
        // rotation pauses when the user opts out.
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        aria-hidden
      >
        <circle
          cx="25"
          cy="25"
          r="22"
          fill="none"
          stroke="rgba(167, 105, 255, 0.18)"
          strokeWidth={config.stroke}
        />
        <path
          d="M 25 3 A 22 22 0 0 1 47 25"
          fill="none"
          stroke="#A769FF"
          strokeWidth={config.stroke}
          strokeLinecap="round"
        />
      </motion.svg>
    </div>
  );
};

// Loading Overlay Component
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export const LoadingOverlay = ({
  isLoading,
  message,
  progress,
}: LoadingOverlayProps) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.97, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 150, damping: 20 }}
            className="bg-[#1f0a3d] rounded-2xl p-8 flex flex-col items-center gap-6 max-w-sm mx-4 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)] border border-white/10"
          >
            <Loader size="lg" variant="spinner" />

            {message && (
              <p className="text-white text-center font-medium text-base">
                {message}
              </p>
            )}

            {progress !== undefined && (
              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs text-white/70">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="h-full bg-[#7F24FF] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
