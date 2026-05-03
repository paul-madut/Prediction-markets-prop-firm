"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, DocumentTextIcon, ClockIcon, TagIcon } from "@heroicons/react/16/solid";
import { useAdmin } from "@/context/AdminContext";
import { TraderDetailCard } from "@/components/admin/traders/TraderDetailCard";
import { TraderActionsPanel } from "@/components/admin/traders/TraderActionsPanel";
import { cn } from "@/lib/utils";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function TraderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getTraderById, auditLogs } = useAdmin();

  const traderId = params.traderId as string;
  const trader = getTraderById(traderId);

  // Get audit logs for this trader
  const traderLogs = auditLogs.filter(
    (log) => log.resourceId === traderId || log.details?.traderId === traderId
  );

  if (!trader) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500 dark:text-gray-400 text-lg">Trader not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 -mx-6 -mt-6 px-6 py-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/traders"
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{trader.username}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{trader.email}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Detail Card & History */}
        <div className="lg:col-span-2 space-y-6">
          <TraderDetailCard trader={trader} />

          {/* Notes Section */}
          {trader.notes && trader.notes.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  Admin Notes
                </h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {trader.notes.map((note) => (
                  <div key={note.noteId} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 text-xs font-medium rounded capitalize mb-2",
                            note.type === "warning"
                              ? "bg-amber-100 text-amber-700"
                              : note.type === "compliance"
                              ? "bg-red-100 text-red-700"
                              : note.type === "support"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300"
                          )}
                        >
                          {note.type}
                        </span>
                        <p className="text-gray-900 dark:text-gray-100">{note.content}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          by {note.authorName} on {formatDate(note.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Log for this Trader */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                Activity Log
              </h3>
            </div>
            {traderLogs.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                {traderLogs.slice(0, 10).map((log) => (
                  <div key={log.logId} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {log.action.replace(/\./g, " ").replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          by {log.actorName}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                No activity recorded yet
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Actions & Tags */}
        <div className="space-y-6">
          <TraderActionsPanel trader={trader} />

          {/* Tags */}
          {trader.tags && trader.tags.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                <TagIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {trader.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Lifetime Stats
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Challenges Purchased</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {trader.challengesPurchased}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Challenges Passed</span>
                <span className="font-medium text-green-600">
                  {trader.challengesPassed}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Challenges Failed</span>
                <span className="font-medium text-red-600">
                  {trader.challengesFailed}
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-slate-800 pt-4 flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Pass Rate</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {trader.challengesPurchased > 0
                    ? (
                        (trader.challengesPassed / trader.challengesPurchased) *
                        100
                      ).toFixed(0)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
