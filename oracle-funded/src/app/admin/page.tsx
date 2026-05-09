"use client";

// Admin home — top-level summary of pending work + nav into wired admin
// surfaces. Replaces the mock-data dashboard.

import { useEffect, useState } from "react";
import Link from "next/link";
import { CurrencyDollarIcon, ClockIcon, ListBulletIcon } from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { api, ApiError } from "@/lib/api-client";

interface PayoutRow { id: string; status: string; }

export default function AdminHome() {
  const [requestedCount, setRequestedCount] = useState<number | null>(null);
  const [approvedCount, setApprovedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<PayoutRow[]>("/api/payouts?status=requested"),
      api.get<PayoutRow[]>("/api/payouts?status=approved"),
    ])
      .then(([req, app]) => {
        setRequestedCount(req.length);
        setApprovedCount(app.length);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : String(err));
        setRequestedCount(0);
        setApprovedCount(0);
      });
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Admin</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Operational hub. Backend coverage is full; UI surfaces light up incrementally.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Failed to load admin summary: {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/admin/payouts" className="group">
          <TextureCard>
            <TextureCardContent className="p-6">
              <CurrencyDollarIcon className="w-5 h-5 text-amber-600 mb-2" />
              <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium mb-1">
                Awaiting review
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {requestedCount ?? "—"}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 group-hover:text-blue-600">
                Open payout queue →
              </div>
            </TextureCardContent>
          </TextureCard>
        </Link>
        <Link href="/admin/payouts" className="group">
          <TextureCard>
            <TextureCardContent className="p-6">
              <ClockIcon className="w-5 h-5 text-blue-600 mb-2" />
              <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium mb-1">
                To process (approved, awaiting wire)
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {approvedCount ?? "—"}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 group-hover:text-blue-600">
                Mark paid →
              </div>
            </TextureCardContent>
          </TextureCard>
        </Link>
      </div>

      <TextureCard interactive={false}>
        <TextureCardContent className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Other admin areas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Link href="/admin/audit" className="px-4 py-3 bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-gray-100 inline-flex items-center gap-2">
                <ListBulletIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                Audit log
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Wired</span>
            </Link>
            <Link href="/admin/traders" className="px-4 py-3 bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-gray-100">Traders</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Wired</span>
            </Link>
            <Link href="/admin/configs" className="px-4 py-3 bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-gray-100">Configs</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Wired</span>
            </Link>
            <Link href="/admin/firm" className="px-4 py-3 bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-gray-100">Firm settings</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Wired</span>
            </Link>
            <Link href="/admin/news" className="px-4 py-3 bg-gray-50 dark:bg-slate-950 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-gray-100">News events</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Wired</span>
            </Link>
          </div>
        </TextureCardContent>
      </TextureCard>
    </div>
  );
}
