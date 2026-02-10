"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  UserCheck,
  CheckCircle,
  XCircle,
  Eye,
  ArrowLeft,
  FileText,
  Calendar,
  MapPin,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { cn } from "@/lib/utils";
import { KYCSubmission } from "@/types/admin";
import {
  KYCStatusBadge,
  KYCEmptyState,
  TableSkeleton,
  StickyTableHeader,
  RowActions,
  ActionButton,
  TableContainer,
} from "@/components/admin/shared/TableUI";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Verified badge for documents
const DocumentVerifiedBadge = ({ verified }: { verified: boolean }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border",
      verified
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-gray-50 text-gray-600 border-gray-200"
    )}
  >
    {verified ? (
      <>
        <CheckCircle className="h-3 w-3" />
        Verified
      </>
    ) : (
      "Pending"
    )}
  </span>
);

// Filter tabs with animated indicator
const FilterTabs = ({
  filter,
  setFilter,
}: {
  filter: KYCSubmission["status"] | "all";
  setFilter: (filter: KYCSubmission["status"] | "all") => void;
}) => {
  const tabs = ["all", "pending", "under_review", "approved", "rejected"] as const;

  return (
    <LayoutGroup>
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        {tabs.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              "relative px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize",
              filter === status ? "text-indigo-700" : "text-gray-600 hover:text-gray-900"
            )}
          >
            {filter === status && (
              <motion.div
                layoutId="activeKYCFilter"
                className="absolute inset-0 bg-white shadow-sm rounded-md"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">{status.replace("_", " ")}</span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
};

interface VerificationChecks {
  [key: string]: boolean;
}

export default function KYCQueuePage() {
  const { kycQueue, approveKYC, rejectKYC } = useAdmin();
  const [filter, setFilter] = useState<KYCSubmission["status"] | "all">("all");
  const [selectedKYC, setSelectedKYC] = useState<KYCSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [isLoading] = useState(false); // Can be connected to actual loading state
  const [verificationChecks, setVerificationChecks] = useState<VerificationChecks>({});

  // Reset verification checks when selecting a new KYC
  const handleSelectKYC = (kyc: KYCSubmission) => {
    setSelectedKYC(kyc);
    setVerificationChecks({});
  };

  const toggleCheck = (checkId: string) => {
    setVerificationChecks((prev) => ({
      ...prev,
      [checkId]: !prev[checkId],
    }));
  };

  // Checklist items based on document types
  const getChecklistItems = (kyc: KYCSubmission) => {
    const items: { id: string; label: string; required: boolean }[] = [];

    kyc.documents.forEach((doc) => {
      switch (doc.type) {
        case "id_front":
        case "id_back":
        case "passport":
          items.push(
            { id: `${doc.documentId}_valid`, label: "ID is valid and not expired", required: true },
            { id: `${doc.documentId}_clear`, label: "Photo is clear and readable", required: true },
            { id: `${doc.documentId}_name`, label: "Name matches trader profile", required: true }
          );
          break;
        case "proof_of_address":
          items.push(
            { id: `${doc.documentId}_recent`, label: "Document is within 3 months", required: true },
            { id: `${doc.documentId}_address`, label: "Address is clearly visible", required: true },
            { id: `${doc.documentId}_name_match`, label: "Name matches ID", required: true }
          );
          break;
        case "selfie":
          items.push(
            { id: `${doc.documentId}_face`, label: "Face is clearly visible", required: true },
            { id: `${doc.documentId}_matches`, label: "Face matches ID photo", required: true },
            { id: `${doc.documentId}_filters`, label: "No filters or editing detected", required: true }
          );
          break;
      }
    });

    return items;
  };

  const allChecksCompleted = (kyc: KYCSubmission) => {
    const items = getChecklistItems(kyc);
    const requiredItems = items.filter((item) => item.required);
    return requiredItems.every((item) => verificationChecks[item.id]);
  };

  const filteredQueue =
    filter === "all" ? kycQueue : kycQueue.filter((k) => k.status === filter);

  const handleApprove = (submissionId: string) => {
    approveKYC(submissionId);
    setSelectedKYC(null);
  };

  const handleReject = (submissionId: string) => {
    if (rejectReason.trim()) {
      rejectKYC(submissionId, rejectReason);
      setShowRejectModal(false);
      setRejectReason("");
      setSelectedKYC(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/compliance"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <UserCheck className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                KYC Verification Queue
              </h1>
              <p className="text-gray-500 mt-1">
                Review and verify trader identity documents
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters with animated indicator */}
      <FilterTabs filter={filter} setFilter={setFilter} />

      {/* Loading State */}
      {isLoading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : filteredQueue.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-gray-200">
          <KYCEmptyState />
        </div>
      ) : (
        /* KYC Table */
        <TableContainer maxHeight="calc(100vh - 340px)">
          <table className="w-full">
            <StickyTableHeader>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                  Trader
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                  Full Name
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                  Country
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                  Documents
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                  Status
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                  Submitted
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                  Actions
                </th>
              </tr>
            </StickyTableHeader>
            <tbody className="divide-y divide-gray-200">
              <AnimatePresence mode="popLayout">
                {filteredQueue.map((kyc, index) => {
                  const isHovered = hoveredRow === kyc.submissionId;
                  const canAction =
                    kyc.status === "pending" || kyc.status === "under_review";

                  return (
                    <motion.tr
                      key={kyc.submissionId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      onMouseEnter={() => setHoveredRow(kyc.submissionId)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={cn(
                        "group transition-colors duration-150 ease-in-out",
                        isHovered ? "bg-amber-50/50" : "hover:bg-gray-50/80"
                      )}
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/traders/${kyc.traderId}`}
                          className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                        >
                          {kyc.traderName}
                        </Link>
                        <p className="text-sm text-gray-500">{kyc.traderEmail}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{kyc.fullName}</td>
                      <td className="px-6 py-4 text-gray-900">{kyc.country}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                          <FileText className="h-3.5 w-3.5" />
                          {kyc.documents.length} docs
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <KYCStatusBadge status={kyc.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(kyc.submittedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <RowActions alwaysVisible={canAction}>
                          <ActionButton
                            onClick={() => handleSelectKYC(kyc)}
                            icon={Eye}
                            title="Review"
                            variant="primary"
                          />
                          {canAction && (
                            <>
                              <ActionButton
                                onClick={() => handleApprove(kyc.submissionId)}
                                icon={CheckCircle}
                                title="Approve"
                                variant="success"
                              />
                              <ActionButton
                                onClick={() => {
                                  handleSelectKYC(kyc);
                                  setShowRejectModal(true);
                                }}
                                icon={XCircle}
                                title="Reject"
                                variant="danger"
                              />
                            </>
                          )}
                        </RowActions>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </TableContainer>
      )}

      {/* KYC Detail Modal */}
      <AnimatePresence>
        {selectedKYC && !showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setSelectedKYC(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    KYC Review
                  </h3>
                  <KYCStatusBadge status={selectedKYC.status} />
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Personal Info */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="font-medium text-gray-900">
                        {selectedKYC.fullName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {selectedKYC.dateOfBirth}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Country</p>
                      <p className="font-medium text-gray-900">
                        {selectedKYC.country}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {selectedKYC.address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                    Documents ({selectedKYC.documents.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedKYC.documents.map((doc) => (
                      <motion.div
                        key={doc.documentId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <FileText className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 capitalize">
                              {doc.type.replace(/_/g, " ")}
                            </p>
                            <p className="text-sm text-gray-500">{doc.fileName}</p>
                          </div>
                        </div>
                        <DocumentVerifiedBadge verified={doc.verified} />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Verification Checklist */}
                {(selectedKYC.status === "pending" || selectedKYC.status === "under_review") && (() => {
                  const checklistItems = getChecklistItems(selectedKYC);
                  const completedCount = checklistItems.filter((i) => verificationChecks[i.id]).length;
                  const totalCount = checklistItems.filter((i) => i.required).length;
                  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

                  return (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                        Verification Checklist
                      </h4>
                      <div className="space-y-2">
                        {checklistItems.map((item) => {
                          const isChecked = verificationChecks[item.id];

                          return (
                            <motion.button
                              key={item.id}
                              onClick={() => toggleCheck(item.id)}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                                isChecked
                                  ? "bg-green-50 border-green-200"
                                  : "bg-white border-gray-200 hover:border-gray-300"
                              )}
                            >
                              <div
                                className={cn(
                                  "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                  isChecked
                                    ? "bg-green-600 border-green-600"
                                    : "border-gray-300"
                                )}
                              >
                                {isChecked && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                              </div>
                              <span
                                className={cn(
                                  "text-sm font-medium transition-colors",
                                  isChecked ? "text-green-900" : "text-gray-700"
                                )}
                              >
                                {item.label}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600">Verification Progress</span>
                          <span className="font-semibold text-gray-900">
                            {completedCount}/{totalCount} checks completed
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className={cn(
                              "h-full rounded-full transition-colors",
                              progress === 100 ? "bg-green-600" : "bg-indigo-600"
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Rejection Reason (if rejected) */}
                {selectedKYC.rejectionReason && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <p className="text-sm font-medium text-red-800">
                      Rejection Reason
                    </p>
                    <p className="text-sm text-red-600 mt-1">
                      {selectedKYC.rejectionReason}
                    </p>
                  </motion.div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedKYC(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Close
                </button>
                {(selectedKYC.status === "pending" ||
                  selectedKYC.status === "under_review") && (
                  <>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selectedKYC.submissionId)}
                      disabled={!allChecksCompleted(selectedKYC)}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!allChecksCompleted(selectedKYC) ? "Complete all verification checks first" : ""}
                    >
                      Approve
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedKYC && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                setShowRejectModal(false);
                setRejectReason("");
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900">Reject KYC</h3>
              <p className="text-sm text-gray-500 mt-2">
                Please provide a reason for rejecting this KYC submission.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Rejection reason..."
                className="w-full mt-4 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-shadow"
                rows={3}
                autoFocus
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedKYC.submissionId)}
                  disabled={!rejectReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reject KYC
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
