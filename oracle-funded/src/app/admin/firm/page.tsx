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
  SunIcon,
  MoonIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  mockAdminFirm,
  mockAdminFirmMembers,
  Firm,
  FirmMember,
  ThemeMode,
} from "@/data/mockAdminFirm";
import { useFirmBranding } from "@/context/FirmBrandingContext";
import { cn } from "@/lib/utils";

type Venue = "kalshi" | "polymarket";

export default function AdminFirmPage() {
  const { brand, firmName, setBrand, setFirmName, resetToDefaults } =
    useFirmBranding();

  // Non-branding firm fields are still locally simulated.
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
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 -mx-6 -mt-6 px-6 py-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-500/15 rounded-xl">
            <BuildingOffice2Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Firm settings
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Branding, venues, members, risk defaults, and audit access for{" "}
              {firmName}.
            </p>
          </div>
        </div>
      </div>

      <Tabs.Root
        defaultValue="general"
        className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800"
      >
        <Tabs.List className="flex border-b border-gray-200 dark:border-slate-800 px-2 overflow-x-auto">
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
                "px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent inline-flex items-center gap-2",
                "data-[state=active]:text-indigo-600 data-[state=active]:border-indigo-600",
                "dark:data-[state=active]:text-indigo-400 dark:data-[state=active]:border-indigo-400",
                "hover:text-gray-900 dark:hover:text-gray-200 transition whitespace-nowrap"
              )}
            >
              {icon}
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* General — branding + theme */}
        <Tabs.Content value="general" className="p-6 space-y-6">
          <section className="space-y-4">
            <Field label="Firm name">
              <input
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </Field>
            <Field label="Slug" hint="URL-safe identifier; appears in customer-facing URLs.">
              <input
                value={firm.slug}
                onChange={(e) => updateFirm("slug", e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
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
                className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </Field>
          </section>

          {/* Brand colors */}
          <section className="border-t border-gray-200 dark:border-slate-800 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Brand colors
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Applied across the trader and admin surfaces in real time.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ColorPicker
                label="Primary"
                value={brand.primaryColor}
                onChange={(c) => setBrand({ primaryColor: c })}
              />
              <ColorPicker
                label="Secondary"
                value={brand.secondaryColor}
                onChange={(c) => setBrand({ secondaryColor: c })}
              />
              <ColorPicker
                label="Accent"
                value={brand.accentColor}
                onChange={(c) => setBrand({ accentColor: c })}
              />
            </div>

            {/* Live preview */}
            <div className="mt-5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                Live preview
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm"
                  style={{ backgroundColor: brand.primaryColor }}
                >
                  Primary action
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm"
                  style={{ backgroundColor: brand.secondaryColor }}
                >
                  Secondary
                </button>
                <span
                  className="px-2.5 py-1 text-xs font-semibold rounded-full text-white"
                  style={{ backgroundColor: brand.accentColor }}
                >
                  Accent badge
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: brand.primaryColor }}
                >
                  Link tone
                </span>
              </div>
            </div>
          </section>

          {/* Theme */}
          <section className="border-t border-gray-200 dark:border-slate-800 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Appearance
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Toggle between light and dark themes. Persists across reloads.
            </p>

            <div className="grid grid-cols-2 gap-3 max-w-md">
              <ThemeOption
                mode="light"
                active={brand.theme === "light"}
                onSelect={() => setBrand({ theme: "light" })}
              />
              <ThemeOption
                mode="dark"
                active={brand.theme === "dark"}
                onSelect={() => setBrand({ theme: "dark" })}
              />
            </div>
          </section>

          {/* Reset */}
          <section className="border-t border-gray-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={resetToDefaults}
              className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Reset to defaults
            </button>
          </section>
        </Tabs.Content>

        {/* Venues */}
        <Tabs.Content value="venues" className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl">
            Controls which market data providers are active for your firm&apos;s traders.
            Markets and orders for disabled venues are hidden / rejected.
          </p>
          {(["kalshi", "polymarket"] as Venue[]).map((venue) => {
            const enabled = firm.enabledVenues.includes(venue);
            return (
              <div
                key={venue}
                className="flex items-center justify-between max-w-2xl bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {venue}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {venue === "kalshi"
                      ? "WebSocket-based · US-regulated · primary"
                      : "REST polling (CLOB upgrade post-MVP) · non-US"}
                  </p>
                </div>
                <button
                  onClick={() => toggleVenue(venue)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition",
                    enabled ? "bg-indigo-600" : "bg-gray-300 dark:bg-slate-700"
                  )}
                  aria-pressed={enabled}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-900 transition",
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
            <thead className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="pb-2 pr-4 font-medium">Member</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">2FA</th>
                <th className="pb-2 pr-4 font-medium">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{m.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.email}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={m.role}
                      onChange={(e) =>
                        updateMemberRole(m.id, e.target.value as FirmMember["role"])
                      }
                      className="px-2 py-1 border border-gray-300 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100 rounded text-sm bg-white dark:bg-slate-900"
                    >
                      <option value="trader">trader</option>
                      <option value="admin">admin</option>
                      <option value="owner">owner</option>
                    </select>
                  </td>
                  <td className="py-3 pr-4">
                    {m.twoFactorEnrolled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                        <CheckBadgeIcon className="h-3 w-3" />
                        Enrolled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300 text-xs font-medium">
                        <ExclamationCircleIcon className="h-3 w-3" />
                        Missing
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400">
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
              className="w-32 px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              className="w-32 px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              className="w-32 px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-950 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </Field>
          <label className="flex items-center gap-2 max-w-2xl bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-4 py-3 cursor-pointer">
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
              className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-slate-700 rounded"
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Refund disables account
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                When a challenge fee is refunded, the account is disabled. Recommended
                — challenge fee is risk capital.
              </p>
            </div>
          </label>
        </Tabs.Content>

        {/* Audit preview */}
        <Tabs.Content value="audit" className="p-6">
          <div className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg p-6 max-w-2xl">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Audit log
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Every admin action — freeze, override, payout decision, refund — writes
              an entry with before/after state and reviewer notes. Defense in disputes.
            </p>
            <Link
              href="/admin/audit"
              className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
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

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-lg p-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded cursor-pointer border-0"
          aria-label={`${label} color`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          className="flex-1 px-2 py-1 text-sm font-mono bg-transparent text-gray-700 dark:text-gray-300 dark:text-gray-200 focus:outline-none"
          aria-label={`${label} hex`}
        />
      </div>
    </div>
  );
}

function ThemeOption({
  mode,
  active,
  onSelect,
}: {
  mode: ThemeMode;
  active: boolean;
  onSelect: () => void;
}) {
  const isLight = mode === "light";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-stretch gap-2 p-3 rounded-xl border-2 transition text-left",
        active
          ? "border-indigo-500 ring-2 ring-indigo-500/20"
          : "border-gray-200 dark:border-slate-800 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
      )}
    >
      <div
        className={cn(
          "h-16 rounded-lg overflow-hidden flex items-center justify-center text-2xl",
          isLight
            ? "bg-gradient-to-br from-white to-gray-100 text-amber-500 border border-gray-200 dark:border-slate-800"
            : "bg-gradient-to-br from-slate-900 to-slate-950 text-blue-300 border border-slate-700"
        )}
      >
        {isLight ? <SunIcon className="h-7 w-7" /> : <MoonIcon className="h-7 w-7" />}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
          {mode}
        </span>
        {active && (
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Active
          </span>
        )}
      </div>
    </button>
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
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>
      )}
    </div>
  );
}
