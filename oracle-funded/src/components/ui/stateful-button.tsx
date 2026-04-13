"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckIcon, XMarkIcon, ArrowPathIcon } from "@heroicons/react/16/solid";
import { cn } from "@/lib/utils";

type ButtonState = "idle" | "loading" | "success" | "error";

interface StatefulButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  successDuration?: number;
  onSuccess?: () => void;
  onActionError?: (error: Error) => void;
}

export const StatefulButton = ({
  children,
  onClick,
  className,
  disabled,
  successDuration = 2000,
  onSuccess,
  onActionError,
  ...props
}: StatefulButtonProps) => {
  const [state, setState] = useState<ButtonState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (state === "loading" || disabled) return;

    setState("loading");
    setErrorMessage("");

    try {
      if (onClick) {
        await onClick(e);
      }

      setState("success");
      onSuccess?.();

      setTimeout(() => {
        setState("idle");
      }, successDuration);
    } catch (error) {
      setState("error");
      const err = error as Error;
      setErrorMessage(err.message || "An error occurred");
      onActionError?.(err);

      setTimeout(() => {
        setState("idle");
        setErrorMessage("");
      }, 3000);
    }
  };

  const isDisabled = disabled || state === "loading";

  const baseClasses =
    "relative px-6 py-3 rounded-lg font-semibold transition-all duration-200 overflow-hidden";

  const stateClasses = {
    idle: "bg-blue-600 hover:bg-blue-700 text-white",
    loading: "bg-blue-500 text-white cursor-wait",
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
  };

  const disabledClasses = "bg-gray-300 text-gray-500 cursor-not-allowed";

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={isDisabled}
      className={cn(
        baseClasses,
        isDisabled ? disabledClasses : stateClasses[state],
        className
      )}
    >
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center justify-center gap-2"
          >
            {children}
          </motion.span>
        )}

        {state === "loading" && (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center justify-center gap-2"
          >
            <ArrowPathIcon className="animate-spin" />
            <span>Processing...</span>
          </motion.span>
        )}

        {state === "success" && (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center justify-center gap-2"
          >
            <CheckIcon className="w-5 h-5" />
            <span>Success!</span>
          </motion.span>
        )}

        {state === "error" && (
          <motion.span
            key="error"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center justify-center gap-2"
          >
            <XMarkIcon className="w-5 h-5" />
            <span>{errorMessage || "Error"}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};
