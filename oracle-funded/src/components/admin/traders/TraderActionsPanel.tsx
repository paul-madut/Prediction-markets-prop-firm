"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Snowflake,
  Sun,
  RotateCcw,
  Mail,
  DollarSign,
  AlertTriangle,
  X,
  StickyNote,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { AdminTraderView } from "@/types/admin";
import { useAdmin } from "@/context/AdminContext";
import { useToast } from "@/components/admin/shared/Toast";
import { cn } from "@/lib/utils";

interface TraderActionsPanelProps {
  trader: AdminTraderView;
}

interface ActionModalProps {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: "danger" | "warning" | "primary";
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  requireReason?: boolean;
  isProcessing?: boolean;
  actionComplete?: boolean;
}

const ActionModal = ({
  title,
  description,
  confirmLabel,
  confirmVariant,
  onConfirm,
  onCancel,
  requireReason = true,
  isProcessing = false,
  actionComplete = false,
}: ActionModalProps) => {
  const [reason, setReason] = useState("");

  const variantStyles = {
    danger: "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-amber-600 hover:bg-amber-700 text-white",
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-black/50" onClick={!isProcessing ? onCancel : undefined} />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
        >
          {!isProcessing && !actionComplete && (
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          {actionComplete ? (
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4"
              >
                <CheckCircle className="h-8 w-8 text-green-600" />
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-900">Success!</h3>
              <p className="text-sm text-gray-500 mt-2">Action completed successfully</p>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-2">{description}</p>

              {requireReason && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason for this action..."
                    disabled={isProcessing}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:bg-gray-50 disabled:text-gray-500"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={onCancel}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onConfirm(reason)}
                  disabled={(requireReason && !reason.trim()) || isProcessing}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
                    variantStyles[confirmVariant]
                  )}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    confirmLabel
                  )}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export const TraderActionsPanel = ({ trader }: TraderActionsPanelProps) => {
  const { freezeTrader, unfreezeTrader, resetTraderAccount } = useAdmin();
  const { showSuccess, showError } = useToast();
  const [activeModal, setActiveModal] = useState<
    "freeze" | "unfreeze" | "reset" | "message" | "note" | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionComplete, setActionComplete] = useState(false);

  const handleFreeze = async (reason: string) => {
    setIsProcessing(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      freezeTrader(trader.userId, reason);
      setActionComplete(true);
      showSuccess("Account Frozen", `${trader.username}'s account has been frozen`);
      setTimeout(() => {
        setActionComplete(false);
        setActiveModal(null);
      }, 1500);
    } catch (error) {
      showError("Failed to freeze account", "An error occurred");
      setActiveModal(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnfreeze = async () => {
    setIsProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      unfreezeTrader(trader.userId);
      setActionComplete(true);
      showSuccess("Account Unfrozen", `${trader.username} can now resume trading`);
      setTimeout(() => {
        setActionComplete(false);
        setActiveModal(null);
      }, 1500);
    } catch (error) {
      showError("Failed to unfreeze account", "An error occurred");
      setActiveModal(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async (reason: string) => {
    setIsProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      resetTraderAccount(trader.userId);
      setActionComplete(true);
      showSuccess("Account Reset", `${trader.username}'s account has been reset`);
      setTimeout(() => {
        setActionComplete(false);
        setActiveModal(null);
      }, 1500);
    } catch (error) {
      showError("Failed to reset account", "An error occurred");
      setActiveModal(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddNote = (note: string) => {
    showSuccess("Note Added", "Note has been saved to trader's profile");
    setActiveModal(null);
  };

  const isFrozen = trader.accountStatus === "frozen";
  const isClosed = trader.accountStatus === "closed";

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>

        <div className="space-y-3">
          {/* Freeze/Unfreeze */}
          {isFrozen ? (
            <button
              onClick={() => setActiveModal("unfreeze")}
              disabled={isClosed}
              className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sun className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Unfreeze Account</p>
                <p className="text-sm text-blue-600">
                  Restore trading access
                </p>
              </div>
            </button>
          ) : (
            <button
              onClick={() => setActiveModal("freeze")}
              disabled={isClosed}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Snowflake className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Freeze Account</p>
                <p className="text-sm text-gray-500">
                  Temporarily disable trading
                </p>
              </div>
            </button>
          )}

          {/* Reset Account */}
          <button
            onClick={() => setActiveModal("reset")}
            disabled={isClosed}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-5 w-5" />
            <div className="text-left">
              <p className="font-medium">Reset Account</p>
              <p className="text-sm text-gray-500">
                Reset to starting balance
              </p>
            </div>
          </button>

          {/* Add Note */}
          <button
            onClick={() => setActiveModal("note")}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <StickyNote className="h-5 w-5" />
            <div className="text-left">
              <p className="font-medium">Add Note</p>
              <p className="text-sm text-gray-500">
                Add internal note to profile
              </p>
            </div>
          </button>

          {/* Send Message */}
          <button
            onClick={() => setActiveModal("message")}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Mail className="h-5 w-5" />
            <div className="text-left">
              <p className="font-medium">Send Message</p>
              <p className="text-sm text-gray-500">
                Email or in-app notification
              </p>
            </div>
          </button>

          {/* Process Payout (for funded accounts) */}
          {trader.accountPhase === "funded" && (
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
              <DollarSign className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Process Payout</p>
                <p className="text-sm text-green-600">
                  Initiate profit payout
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Warning for frozen accounts */}
        {isFrozen && trader.freezeReason && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Account Frozen
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  {trader.freezeReason}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {activeModal === "freeze" && (
        <ActionModal
          title="Freeze Account"
          description={`Are you sure you want to freeze ${trader.username}'s account? They will not be able to trade until unfrozen.`}
          confirmLabel="Freeze Account"
          confirmVariant="danger"
          onConfirm={handleFreeze}
          onCancel={() => setActiveModal(null)}
          isProcessing={isProcessing}
          actionComplete={actionComplete}
        />
      )}

      {activeModal === "unfreeze" && (
        <ActionModal
          title="Unfreeze Account"
          description={`Are you sure you want to unfreeze ${trader.username}'s account? They will be able to resume trading.`}
          confirmLabel="Unfreeze Account"
          confirmVariant="primary"
          onConfirm={handleUnfreeze}
          onCancel={() => setActiveModal(null)}
          requireReason={false}
          isProcessing={isProcessing}
          actionComplete={actionComplete}
        />
      )}

      {activeModal === "reset" && (
        <ActionModal
          title="Reset Account"
          description={`Are you sure you want to reset ${trader.username}'s account? This will restore the balance to ${(
            trader.startingBalance / 100
          ).toFixed(0)} and reset all progress.`}
          confirmLabel="Reset Account"
          confirmVariant="warning"
          onConfirm={handleReset}
          onCancel={() => setActiveModal(null)}
          isProcessing={isProcessing}
          actionComplete={actionComplete}
        />
      )}

      {activeModal === "note" && (
        <ActionModal
          title="Add Note"
          description={`Add an internal note to ${trader.username}'s profile. This note will be visible to all admins.`}
          confirmLabel="Save Note"
          confirmVariant="primary"
          onConfirm={handleAddNote}
          onCancel={() => setActiveModal(null)}
        />
      )}

      {activeModal === "message" && (
        <ActionModal
          title="Send Message"
          description={`Send a message to ${trader.username}. This will be sent via email and shown in-app.`}
          confirmLabel="Send Message"
          confirmVariant="primary"
          onConfirm={() => setActiveModal(null)}
          onCancel={() => setActiveModal(null)}
        />
      )}
    </>
  );
};
