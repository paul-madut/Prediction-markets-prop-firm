"use client";

import React, { useState } from "react";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import {
  BuildingOffice2Icon,
  GlobeAltIcon,
  UsersIcon,
  AdjustmentsHorizontalIcon,
  DocumentMagnifyingGlassIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import {
  mockAdminFirm,
  mockAdminFirmMembers,
  Firm,
  FirmMember,
} from "@/data/mockAdminFirm";
import { cn } from "@/lib/utils";

type Venue = "kalshi" | "polymarket";

export default function AdminFirmPage() {
  const [firm, setFirm] = useState<Firm>(mockAdminFirm);
  const [members, setMembers] = useState<FirmMember[]>(mockAdminFirmMembers);

  const updateFirm = <K extends keyof Firm>(key: K, value: Firm[K]) =>
    setFirm((f) => ({ ...f, [key]: value }));

  const toggleVenue = (venue: Venue) => {
    setFirm((f) => ({
      ...f,
      enabledVenues: f.enabledVenues.includes(venue)
        ? f.enabledVenues.filter((v) => v !== venue)
        : [...f.enabledVenues, venue],
    }));
  };

  const updateMemberRole = (id: string, role: FirmMember["role"]) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <BuildingOffice2Icon className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Firm settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Branding, venues, members, risk defaults, and audit access for{" "}
              {firm.name}.
            </p>
          </div>
        </div>
      </div>

      <Tabs.Root defaultValue="general" className="bg-white rounded-xl border border-gray-200">
        <Tabs.List className="flex border-b border-gray-200 px-2 overflow-x-auto">
          {[
            ["general", "General", <BuildingOffice2Icon key="i" className="h-4 w-4" />],
            ["venues", "Venues", <GlobeAltIcon key="i" className="h-4 w-4" />],
            ["members", "Members", <UsersIcon key="i" className="h-4 w-4" />],
            [
              "risk",
              "Risk defaults",
              <AdjustmentsHorizontalIcon key="i" className="h-4 w-4" />,
            ],
            [
              "audit",
              "Audit preview",
              <DocumentMagnifyingGlassIcon key="i" className="h-4 w-4" />,
            ],
          ].map(([value, label, icon]) => (
            <Tabs.Trigger
              key={value as string}
              value={value as string}
              className={cn(
                "px-4 py-3 text-sm font-medium text-gray-500 border-b-2 border-transparent inline-flex items-center gap-2",
                "data-[state=active]:text-indigo-600 data-[state=active]:border-indigo-600",
                "hover:text-gray-900 transition whitespace-nowrap"
              )}
            >
              {icon}
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* General */}
        <Tabs.Content value="general" className="p-6 space-y-4">
          <Field label="Firm name">
            <input
              value={firm.name}
              onChange={(e) => updateFirm("name", e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </Field>
          <Field label="Slug" hint="URL-safe identifier; appears in customer-facing URLs.">
            <input
              value={firm.slug}
              onChange={(e) => updateFirm("slug", e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </Field>
          <Field label="Primary color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={firm.brandConfig.primaryColor}
                onChange={(e) =>
                  setFirm((f) => ({
                    ...f,
                    brandConfig: { ...f.brandConfig, primaryColor: e.target.value },
                  }))
                }
                className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
              />
              <code className="text-sm text-gray-700">
                {firm.brandConfig.primaryColor}
              </code>
            </div>
          </Field>
          <Field label="Support email">
            <input
              type="email"
              value={firm.brandConfig.supportEmail}
              onChange={(e) =>
                setFirm((f) => ({
                  ...f,
                  brandConfig: { ...f.brandConfig, supportEmail: e.target.value },
                }))
              }
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </Field>
        </Tabs.Content>

        {/* Venues */}
        <Tabs.Content value="venues" className="p-6 space-y-4">
          <p className="text-sm text-gray-600 max-w-2xl">
            Controls which market data providers are active for your firm&apos;s traders.
            Markets and orders for disabled venues are hidden / rejected.
          </p>
          {(["kalshi", "polymarket"] as Venue[]).map((venue) => {
            const enabled = firm.enabledVenues.includes(venue);
            return (
              <div
                key={venue}
                className="flex items-center justify-between max-w-2xl bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {venue}
                  </p>
                  <p className="text-xs text-gray-500">
                    {venue === "kalshi"
                      ? "WebSocket-based · US-regulated · primary"
                      : "REST polling (CLOB upgrade post-MVP) · non-US"}
                  </p>
                </div>
                <button
                  onClick={() => toggleVenue(venue)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition",
                    enabled ? "bg-indigo-600" : "bg-gray-300"
                  )}
                  aria-pressed={enabled}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition",
                      enabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            );
          })}
        </Tabs.Content>

        {/* Members */}
        <Tabs.Content value="members" className="p-6">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="pb-2 pr-4 font-medium">Member</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">2FA</th>
                <th className="pb-2 pr-4 font-medium">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.email}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={m.role}
                      onChange={(e) =>
                        updateMemberRole(m.id, e.target.value as FirmMember["role"])
                      }
                      className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                    >
                      <option value="trader">trader</option>
                      <option value="admin">admin</option>
                      <option value="owner">owner</option>
                    </select>
                  </td>
                  <td className="py-3 pr-4">
                    {m.twoFactorEnrolled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                        <CheckBadgeIcon className="h-3 w-3" />
                        Enrolled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                        <ExclamationCircleIcon className="h-3 w-3" />
                        Missing
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-xs text-gray-500">
                    {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tabs.Content>

        {/* Risk defaults */}
        <Tabs.Content value="risk" className="p-6 space-y-4">
          <Field
            label="Minimum order age (ms)"
            hint="Orders submitted within this many ms of the latest price tick wait for the next tick."
          >
            <input
              type="number"
              min={0}
              value={firm.riskDefaults.minOrderAgeMs}
              onChange={(e) =>
                setFirm((f) => ({
                  ...f,
                  riskDefaults: {
                    ...f.riskDefaults,
                    minOrderAgeMs: parseInt(e.target.value || "0", 10),
                  },
                }))
              }
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </Field>
          <Field label="Max positions per market">
            <input
              type="number"
              min={1}
              value={firm.riskDefaults.maxPositionsPerMarket}
              onChange={(e) =>
                setFirm((f) => ({
                  ...f,
                  riskDefaults: {
                    ...f.riskDefaults,
                    maxPositionsPerMarket: parseInt(e.target.value || "1", 10),
                  },
                }))
              }
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </Field>
          <Field label="Max positions total">
            <input
              type="number"
              min={1}
              value={firm.riskDefaults.maxPositionsTotal}
              onChange={(e) =>
                setFirm((f) => ({
                  ...f,
                  riskDefaults: {
                    ...f.riskDefaults,
                    maxPositionsTotal: parseInt(e.target.value || "1", 10),
                  },
                }))
              }
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </Field>
          <label className="flex items-center gap-2 max-w-2xl bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={firm.riskDefaults.refundDisablesAccount}
              onChange={(e) =>
                setFirm((f) => ({
                  ...f,
                  riskDefaults: {
                    ...f.riskDefaults,
                    refundDisablesAccount: e.target.checked,
                  },
                }))
              }
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Refund disables account
              </p>
              <p className="text-xs text-gray-500">
                When a challenge fee is refunded, the account is disabled. Recommended
                — challenge fee is risk capital.
              </p>
            </div>
          </label>
        </Tabs.Content>

        {/* Audit preview */}
        <Tabs.Content value="audit" className="p-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-2xl">
            <h3 className="text-sm font-semibold text-gray-900">Audit log</h3>
            <p className="text-sm text-gray-600 mt-1">
              Every admin action — freeze, override, payout decision, refund — writes
              an entry with before/after state and reviewer notes. Defense in disputes.
            </p>
            <Link
              href="/admin/audit"
              className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Open audit log
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}
