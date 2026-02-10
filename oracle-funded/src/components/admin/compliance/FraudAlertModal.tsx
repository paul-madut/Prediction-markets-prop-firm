"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Mail,
  MapPin,
  Monitor,
  TrendingUp,
  FileText,
  Link as LinkIcon,
} from "lucide-react";
import { FraudAlert } from "@/types/admin";
import { useAdmin } from "@/context/AdminContext";
import { useToast } from "@/components/admin/shared/Toast";
import { cn } from "@/lib/utils";

interface FraudAlertModalProps {
  alert: FraudAlert | null;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "overview" | "evidence" | "related" | "activity";

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "text-red-600 bg-red-100 border-red-200";
    case "high":
      return "text-orange-600 bg-orange-100 border-orange-200";
    case "medium":
      return "text-amber-600 bg-amber-100 border-amber-200";
    default:
      return "text-gray-600 bg-gray-100 border-gray-200";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "resolved":
      return "text-green-600 bg-green-100";
    case "investigating":
      return "text-blue-600 bg-blue-100";
    case "dismissed":
      return "text-gray-600 bg-gray-100";
    default:
      return "text-amber-600 bg-amber-100";
  }
};

export default function FraudAlertModal({ alert, isOpen, onClose }: FraudAlertModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [status, setStatus] = useState<string>(alert?.status || "open");
  const [assignedTo, setAssignedTo] = useState<string>(alert?.assignedTo || "");
  const [resolutionNote, setResolutionNote] = useState("");
  const { updateFraudAlert } = useAdmin();
  const { showSuccess } = useToast();

  if (!alert) return null;

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    updateFraudAlert(alert.alertId, { status: newStatus as any });
    showSuccess("Status Updated", `Alert status changed to ${newStatus}`);
  };

  const handleAssign = () => {
    updateFraudAlert(alert.alertId, { assignedTo: "admin_001" });
    setAssignedTo("admin_001");
    showSuccess("Alert Assigned", "Alert has been assigned to you");
  };

  const handleResolve = () => {
    if (!resolutionNote.trim()) return;
    updateFraudAlert(alert.alertId, {
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      resolution: resolutionNote,
    });
    showSuccess("Alert Resolved", "Fraud alert has been marked as resolved");
    onClose();
  };

  const tabs = [
    { id: "overview" as TabType, label: "Overview", icon: FileText },
    { id: "evidence" as TabType, label: "Evidence", icon: AlertTriangle },
    { id: "related" as TabType, label: "Related Accounts", icon: LinkIcon },
    { id: "activity" as TabType, label: "Activity Log", icon: Clock },
  ];

  // Mock related accounts
  const relatedAccounts = [
    {
      userId: "user_002",
      username: "traderpro2",
      email: "trader2@example.com",
      similarity: 85,
      reason: "Same IP address",
    },
    {
      userId: "user_003",
      username: "mastertrader",
      email: "master@example.com",
      similarity: 72,
      reason: "Similar trading patterns",
    },
  ];

  // Mock activity log
  const activityLog = [
    {
      timestamp: new Date().toISOString(),
      action: "Alert created",
      actor: "System",
      details: "Automatic fraud detection triggered",
    },
    {
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      action: "Status changed to investigating",
      actor: "Admin User",
      details: "Started investigation",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="fixed inset-4 md:inset-8 z-50 overflow-hidden"
          >
            <div className="h-full bg-white rounded-2xl shadow-2xl flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "p-3 rounded-xl border-2",
                      getSeverityColor(alert.severity)
                    )}
                  >
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-gray-900">
                        Fraud Alert #{alert.alertId.slice(-6)}
                      </h2>
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-semibold uppercase",
                          getSeverityColor(alert.severity)
                        )}
                      >
                        {alert.severity}
                      </span>
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-semibold uppercase",
                          getStatusColor(status)
                        )}
                      >
                        {status}
                      </span>
                    </div>
                    <p className="text-gray-500 mt-1">
                      {alert.alertType.replace(/_/g, " ").toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 px-8 flex gap-1 bg-white">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
                        activeTab === tab.id
                          ? "text-indigo-600"
                          : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="activeAlertTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-8">
                  {/* Main Content - 2 columns */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Overview Tab */}
                    {activeTab === "overview" && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        {/* Trader Info */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Trader Information
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                              <User className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-500">Trader</p>
                                <p className="font-medium text-gray-900">{alert.traderName}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Mail className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium text-gray-900">{alert.traderEmail}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Alert Details */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Alert Details
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Description</p>
                              <p className="text-gray-900">{alert.description}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Created</p>
                              <p className="text-gray-900">
                                {new Date(alert.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Timeline */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                <Clock className="h-4 w-4 text-indigo-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">Alert Created</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(alert.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {status === "investigating" && (
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <TrendingUp className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">Investigation Started</p>
                                  <p className="text-sm text-gray-500">In progress</p>
                                </div>
                              </div>
                            )}
                            {status === "resolved" && (
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">Alert Resolved</p>
                                  <p className="text-sm text-gray-500">
                                    {alert.resolvedAt
                                      ? new Date(alert.resolvedAt).toLocaleString()
                                      : "Just now"}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Evidence Tab */}
                    {activeTab === "evidence" && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Evidence</h3>
                          <div className="space-y-4">
                            {alert.evidence.map((item, index) => (
                              <div
                                key={index}
                                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                              >
                                <div className="flex items-start gap-3">
                                  <Monitor className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-900">{item}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Additional Evidence Details based on alert type */}
                        {alert.alertType === "duplicate_account" && (
                          <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                              Account Comparison
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm font-medium text-blue-900 mb-2">
                                  Primary Account
                                </p>
                                <p className="text-sm text-blue-700">{alert.traderName}</p>
                                <p className="text-xs text-blue-600 mt-1">{alert.traderEmail}</p>
                              </div>
                              <div className="p-4 bg-amber-50 rounded-lg">
                                <p className="text-sm font-medium text-amber-900 mb-2">
                                  Suspected Duplicate
                                </p>
                                <p className="text-sm text-amber-700">Similar Account</p>
                                <p className="text-xs text-amber-600 mt-1">
                                  Detected by system
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {alert.alertType === "suspicious_ip" && (
                          <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                              IP Information
                            </h3>
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <MapPin className="h-5 w-5 text-gray-400" />
                                <div>
                                  <p className="text-sm text-gray-500">Location</p>
                                  <p className="font-medium text-gray-900">Multiple countries</p>
                                </div>
                              </div>
                              <div className="p-3 bg-red-50 rounded-lg">
                                <p className="text-sm text-red-800">
                                  ⚠️ Suspicious: Account accessed from 5 different countries in 24
                                  hours
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Related Accounts Tab */}
                    {activeTab === "related" && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl border border-gray-200 p-6"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Related Accounts
                        </h3>
                        <div className="space-y-3">
                          {relatedAccounts.map((account) => (
                            <div
                              key={account.userId}
                              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{account.username}</p>
                                  <p className="text-sm text-gray-500">{account.email}</p>
                                  <p className="text-xs text-gray-400 mt-1">{account.reason}</p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-red-500"
                                        style={{ width: `${account.similarity}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                      {account.similarity}%
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">Similarity</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Activity Log Tab */}
                    {activeTab === "activity" && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl border border-gray-200 p-6"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h3>
                        <div className="space-y-4">
                          {activityLog.map((log, index) => (
                            <div key={index} className="flex items-start gap-3 pb-4 border-b last:border-0">
                              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <Clock className="h-4 w-4 text-gray-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{log.action}</p>
                                <p className="text-sm text-gray-600">{log.details}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-gray-500">{log.actor}</p>
                                  <span className="text-xs text-gray-400">•</span>
                                  <p className="text-xs text-gray-500">
                                    {new Date(log.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Actions Panel - 1 column */}
                  <div className="space-y-4">
                    <div className="sticky top-0 space-y-4">
                      {/* Status Control */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                          Alert Status
                        </h3>
                        <div className="space-y-2">
                          {["open", "investigating", "resolved", "dismissed"].map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(s)}
                              className={cn(
                                "w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                                status === s
                                  ? "bg-indigo-600 text-white"
                                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                              )}
                            >
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Assignment */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Assignment</h3>
                        {assignedTo ? (
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-800">Assigned to you</p>
                          </div>
                        ) : (
                          <button
                            onClick={handleAssign}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            Assign to Me
                          </button>
                        )}
                      </div>

                      {/* Resolution Form */}
                      {status === "investigating" && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">
                            Resolve Alert
                          </h3>
                          <textarea
                            value={resolutionNote}
                            onChange={(e) => setResolutionNote(e.target.value)}
                            placeholder="Enter resolution notes..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none mb-3"
                            rows={4}
                          />
                          <button
                            onClick={handleResolve}
                            disabled={!resolutionNote.trim()}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Mark as Resolved
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
