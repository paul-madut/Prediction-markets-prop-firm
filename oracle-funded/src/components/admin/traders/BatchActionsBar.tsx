"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NoSymbolIcon, PowerIcon, ArrowDownTrayIcon, XMarkIcon } from "@heroicons/react/16/solid";
import ConfirmationModal from "@/components/admin/shared/ConfirmationModal";
import { useToast } from "@/components/admin/shared/Toast";
import { cn } from "@/lib/utils";

interface BatchActionsBarProps {
  selectedCount: number;
  onFreeze: (reason: string) => Promise<void>;
  onUnfreeze: () => Promise<void>;
  onExport: () => void;
  onClearSelection: () => void;
  className?: string;
}

type ConfirmationState = null | "freeze" | "unfreeze";

export default function BatchActionsBar({
  selectedCount,
  onFreeze,
  onUnfreeze,
  onExport,
  onClearSelection,
  className,
}: BatchActionsBarProps) {
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleFreeze = async (reason?: string) => {
    if (!reason) return;
    setIsProcessing(true);
    try {
      await onFreeze(reason);
      showSuccess(
        "Traders Frozen",
        `Successfully froze ${selectedCount} trader${selectedCount !== 1 ? "s" : ""}`
      );
      onClearSelection();
    } catch (error) {
      showError("Failed to freeze traders", "An error occurred while freezing traders");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnfreeze = async () => {
    setIsProcessing(true);
    try {
      await onUnfreeze();
      showSuccess(
        "Traders Unfrozen",
        `Successfully unfroze ${selectedCount} trader${selectedCount !== 1 ? "s" : ""}`
      );
      onClearSelection();
    } catch (error) {
      showError("Failed to unfreeze traders", "An error occurred while unfreezing traders");
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className={cn(
              "fixed bottom-6 left-1/2 -translate-x-1/2 z-40",
              className
            )}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 px-6 py-4 flex items-center gap-6">
              {/* Selected Count */}
              <div className="flex items-center gap-3 border-r border-gray-200 dark:border-slate-800 pr-6">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <motion.span
                    key={selectedCount}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-sm font-bold text-indigo-600"
                  >
                    {selectedCount}
                  </motion.span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {selectedCount} trader{selectedCount !== 1 ? "s" : ""} selected
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Choose an action below</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmationState("freeze")}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <NoSymbolIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Freeze</span>
                </button>

                <button
                  onClick={() => setConfirmationState("unfreeze")}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <PowerIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Unfreeze</span>
                </button>

                <button
                  onClick={onExport}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Export</span>
                </button>
              </div>

              {/* Clear Selection */}
              <button
                onClick={onClearSelection}
                disabled={isProcessing}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 ml-2"
                title="Clear selection"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Freeze Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationState === "freeze"}
        onClose={() => setConfirmationState(null)}
        onConfirm={handleFreeze}
        title="Freeze Traders"
        message={`You are about to freeze ${selectedCount} trader${
          selectedCount !== 1 ? "s" : ""
        }. Please provide a reason for this action.`}
        confirmText="Freeze Traders"
        confirmVariant="warning"
        requireInput
        inputPlaceholder="e.g., Suspicious trading activity detected"
        inputLabel="Reason for freezing *"
      />

      {/* Unfreeze Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationState === "unfreeze"}
        onClose={() => setConfirmationState(null)}
        onConfirm={handleUnfreeze}
        title="Unfreeze Traders"
        message={`You are about to unfreeze ${selectedCount} trader${
          selectedCount !== 1 ? "s" : ""
        }. This will restore their access immediately.`}
        confirmText="Unfreeze Traders"
        confirmVariant="primary"
      />
    </>
  );
}
