"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
    sm: { container: "w-8 h-8", dot: "w-2 h-2" },
    md: { container: "w-12 h-12", dot: "w-3 h-3" },
    lg: { container: "w-16 h-16", dot: "w-4 h-4" },
  };

  const config = sizeConfig[size];

  if (variant === "dots") {
    return (
      <div className={cn("flex items-center justify-center gap-2", className)}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn("rounded-full bg-blue-600", config.dot)}
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
          className={cn("rounded-full bg-blue-600", config.container)}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
    );
  }

  // Default spinner variant
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <motion.div
        className={cn("rounded-full border-4 border-blue-600 border-t-transparent", config.container)}
        animate={{ rotate: 360 }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: "linear",
        }}
      />
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
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[#180630] rounded-2xl p-8 flex flex-col items-center gap-6 max-w-sm mx-4 shadow-2xl border border-white/10"
          >
            <Loader size="lg" variant="spinner" />

            {message && (
              <p className="text-white text-center font-medium text-lg">
                {message}
              </p>
            )}

            {progress !== undefined && (
              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm text-white/70">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
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
