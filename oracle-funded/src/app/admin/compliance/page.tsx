"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Shield,
  UserCheck,
  AlertOctagon,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { FraudAlert } from "@/types/admin";
import { cn } from "@/lib/utils";
import FraudAlertModal from "@/components/admin/compliance/FraudAlertModal";

export default function CompliancePage() {
  const { kycQueue, fraudAlerts, auditLogs, dashboardStats } = useAdmin();
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);

  const pendingKYC = kycQueue.filter(
    (k) => k.status === "pending" || k.status === "under_review"
  );
  const openFraud = fraudAlerts.filter(
    (f) => f.status === "open" || f.status === "investigating"
  );
  const recentLogs = auditLogs.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <Shield className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Compliance Center
            </h1>
            <p className="text-gray-500 mt-1">
              KYC verification, fraud detection, and audit logs
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <UserCheck className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending KYC</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats.pendingKYC}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertOctagon className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Open Fraud Alerts</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardStats.openFraudAlerts}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Approved KYC</p>
              <p className="text-2xl font-bold text-gray-900">
                {kycQueue.filter((k) => k.status === "approved").length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Audit Entries</p>
              <p className="text-2xl font-bold text-gray-900">
                {auditLogs.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KYC Verification */}
        <Link
          href="/admin/compliance/kyc"
          className="block bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-start justify-between">
            <div className="p-3 bg-amber-100 rounded-xl">
              <UserCheck className="h-6 w-6 text-amber-600" />
            </div>
            {pendingKYC.length > 0 && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-semibold rounded-full">
                {pendingKYC.length}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4 group-hover:text-indigo-600 transition-colors">
            KYC Verification
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Review identity verification documents
          </p>
          <div className="flex items-center gap-1 text-indigo-600 text-sm font-medium mt-4 group-hover:gap-2 transition-all">
            Review queue <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* Fraud Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertOctagon className="h-6 w-6 text-red-600" />
            </div>
            {openFraud.length > 0 && (
              <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
                {openFraud.length}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">
            Fraud Alerts
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Investigate suspicious activity
          </p>
          <div className="mt-4 space-y-2">
            {openFraud.slice(0, 3).map((alert) => (
              <button
                key={alert.alertId}
                onClick={() => setSelectedAlert(alert)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{alert.traderName}</p>
                <p className="text-xs text-gray-500 capitalize">{alert.alertType.replace(/_/g, " ")}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Audit Logs */}
        <Link
          href="/admin/compliance/audit"
          className="block bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-blue-100 rounded-xl w-fit">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4 group-hover:text-indigo-600 transition-colors">
            Audit Logs
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            View all administrative actions
          </p>
          <div className="flex items-center gap-1 text-indigo-600 text-sm font-medium mt-4 group-hover:gap-2 transition-all">
            View logs <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending KYC List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Pending KYC</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingKYC.slice(0, 5).map((kyc) => (
              <div key={kyc.submissionId} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{kyc.traderName}</p>
                    <p className="text-sm text-gray-500">{kyc.traderEmail}</p>
                  </div>
                  <span
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-full capitalize",
                      kyc.status === "pending"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    )}
                  >
                    {kyc.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
            {pendingKYC.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                No pending verifications
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {recentLogs.map((log) => (
              <div key={log.logId} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {log.action.replace(/\./g, " ").replace(/_/g, " ")}
                    </p>
                    <p className="text-sm text-gray-500">by {log.actorName}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fraud Alert Modal */}
      <FraudAlertModal
        alert={selectedAlert}
        isOpen={selectedAlert !== null}
        onClose={() => setSelectedAlert(null)}
      />
    </div>
  );
}
