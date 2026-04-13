"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, ExclamationTriangleIcon, ExclamationCircleIcon, InformationCircleIcon } from "@heroicons/react/16/solid";
import { cn } from "@/lib/utils";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (inputValue?: string) => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "danger" | "warning" | "primary";
  requireInput?: boolean;
  inputPlaceholder?: string;
  inputLabel?: string;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "primary",
  requireInput = false,
  inputPlaceholder,
  inputLabel,
}: ConfirmationModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    if (requireInput && !inputValue.trim()) {
      return;
    }

    setIsProcessing(true);
    await onConfirm(inputValue);
    setIsProcessing(false);
    setInputValue("");
    onClose();
  };

  const handleClose = () => {
    if (!isProcessing) {
      setInputValue("");
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
    } else if (e.key === "Enter" && !requireInput) {
      handleConfirm();
    }
  };

  const getIcon = () => {
    switch (confirmVariant) {
      case "danger":
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />;
      case "warning":
        return <ExclamationCircleIcon className="h-6 w-6 text-amber-600" />;
      default:
        return <InformationCircleIcon className="h-6 w-6 text-indigo-600" />;
    }
  };

  const getConfirmButtonClass = () => {
    const baseClass = "px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50";
    switch (confirmVariant) {
      case "danger":
        return cn(baseClass, "bg-red-600 text-white hover:bg-red-700");
      case "warning":
        return cn(baseClass, "bg-amber-600 text-white hover:bg-amber-700");
      default:
        return cn(baseClass, "bg-indigo-600 text-white hover:bg-indigo-700");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              onKeyDown={handleKeyDown}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-start gap-4 p-6 border-b border-gray-200">
                <div className={cn(
                  "p-2 rounded-full",
                  confirmVariant === "danger" && "bg-red-100",
                  confirmVariant === "warning" && "bg-amber-100",
                  confirmVariant === "primary" && "bg-indigo-100"
                )}>
                  {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {message}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              {requireInput && (
                <div className="p-6">
                  {inputLabel && (
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {inputLabel}
                    </label>
                  )}
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={inputPlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    rows={3}
                    autoFocus
                    disabled={isProcessing}
                  />
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing || (requireInput && !inputValue.trim())}
                  className={getConfirmButtonClass()}
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      Processing...
                    </span>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
