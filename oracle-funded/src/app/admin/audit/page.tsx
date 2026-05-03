"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DocumentTextIcon, ArrowLeftIcon, MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/16/solid";
import { useAdmin } from "@/context/AdminContext";
import { cn } from "@/lib/utils";

const formatDateTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatAction = (action: string): string => {
  return action.replace(/\./g, " ").replace(/_/g, " ");
};

const getActionColor = (action: string) => {
  if (action.includes("approve") || action.includes("unfreeze"))
    return "bg-green-100 text-green-700";
  if (action.includes("reject") || action.includes("freeze") || action.includes("breach"))
    return "bg-red-100 text-red-700";
  if (action.includes("login")) return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-700";
};

export default function AuditLogsPage() {
  const { auditLogs } = useAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [resourceFilter, setResourceFilter] = useState<string>("all");

  // Get unique resources for filter
  const resources = Array.from(new Set(auditLogs.map((log) => log.resource)));

  // FunnelIcon logs
  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      !searchQuery ||
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resourceId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesResource =
      resourceFilter === "all" || log.resource === resourceFilter;

    return matchesSearch && matchesResource;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
              <p className="text-gray-500 mt-1">
                Complete history of administrative actions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* MagnifyingGlassIcon */}
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by actor, action, or resource ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Resource FunnelIcon */}
        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Resources</option>
          {resources.map((resource) => (
            <option key={resource} value={resource}>
              {resource.charAt(0).toUpperCase() + resource.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        Showing {filteredLogs.length} of {auditLogs.length} entries
      </p>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Actor
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Outcome
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.logId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{log.actorName}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {log.actorRole.replace("_", " ")}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-full capitalize",
                        getActionColor(log.action)
                      )}
                    >
                      {formatAction(log.action)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900 capitalize">
                      {log.resource}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {log.resourceId}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-full capitalize",
                        log.outcome === "success"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {log.outcome}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            No audit logs found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
}
