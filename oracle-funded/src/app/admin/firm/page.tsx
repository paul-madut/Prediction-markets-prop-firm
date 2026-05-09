"use client";

// /admin/firm — firm settings page wired to /api/admin/firm.
//
// Editable: name, brand colours (jsonb subset), enabled venues, price-history
// sample interval, status. Slug is immutable.

import { useEffect, useState } from "react";
import { ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { TextureButton } from "@/components/ui/texture-button";
import { api, ApiError } from "@/lib/api-client";

interface FirmRow {
  id: string;
  name: string;
  slug: string;
  brandConfig: Record<string, unknown>;
  enabledVenues: string[];
  status: string;
  priceHistorySampleIntervalSeconds: number;
  createdAt: string;
}

const VENUE_OPTIONS = [
  { id: "polymarket", label: "Polymarket" },
  { id: "kalshi", label: "Kalshi" },
] as const;

const STATUS_OPTIONS = ["active", "paused", "disabled"] as const;

export default function AdminFirmPage() {
  const [firm, setFirm] = useState<FirmRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Draft state
  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("#4F46E5");
  const [secondary, setSecondary] = useState("#0EA5E9");
  const [accent, setAccent] = useState("#F59E0B");
  const [venues, setVenues] = useState<string[]>([]);
  const [interval, setIntervalValue] = useState("30");
  const [status, setStatus] = useState<string>("active");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function applyToDraft(f: FirmRow): void {
    setName(f.name);
    const brand = (f.brandConfig ?? {}) as Record<string, unknown>;
    setPrimary(typeof brand.primary === "string" ? brand.primary : "#4F46E5");
    setSecondary(typeof brand.secondary === "string" ? brand.secondary : "#0EA5E9");
    setAccent(typeof brand.accent === "string" ? brand.accent : "#F59E0B");
    setVenues(f.enabledVenues);
    setIntervalValue(String(f.priceHistorySampleIntervalSeconds));
    setStatus(f.status);
  }

  async function load(): Promise<void> {
    setLoadError(null);
    try {
      const f = await api.get<FirmRow>("/api/admin/firm");
      setFirm(f);
      applyToDraft(f);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : String(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(): Promise<void> {
    setSubmitting(true);
    setSubmitError(null);
    setSavedAt(null);
    try {
      const intervalNum = Number(interval);
      if (!Number.isFinite(intervalNum) || intervalNum < 5 || intervalNum > 3600) {
        throw new Error("Sample interval must be between 5 and 3600 seconds");
      }
      if (venues.length === 0) {
        throw new Error("At least one venue must be enabled");
      }
      const updated = await api.patch<FirmRow>("/api/admin/firm", {
        name: name.trim(),
        brandConfig: { primary, secondary, accent },
        enabledVenues: venues,
        priceHistorySampleIntervalSeconds: intervalNum,
        status,
      });
      setFirm(updated);
      applyToDraft(updated);
      setSavedAt(Date.now());
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function toggleVenue(v: string): void {
    setVenues((cur) =>
      cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
    );
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto py-12 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  if (!firm) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-sm text-gray-500 dark:text-gray-400">
        Loading firm…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Firm settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Brand identity, enabled venues, sampling cadence. Slug is immutable
            once created.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-blue-300"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Reload
        </button>
      </div>

      {savedAt && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-sm text-emerald-800 inline-flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4" />
          Saved
        </div>
      )}

      <TextureCard interactive={false}>
        <TextureCardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Identity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Slug (immutable)">
              <input type="text" value={firm.slug} disabled className={inputCls} />
            </Field>
            <Field label="Firm ID">
              <input type="text" value={firm.id} disabled className={`${inputCls} font-mono text-xs`} />
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputCls}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </TextureCardContent>
      </TextureCard>

      <TextureCard interactive={false}>
        <TextureCardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Brand colours
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Stored on <code className="font-mono">firms.brand_config</code>;
            picked up by the FirmBrandingProvider on mount in production.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ColorField label="Primary" value={primary} onChange={setPrimary} />
            <ColorField label="Secondary" value={secondary} onChange={setSecondary} />
            <ColorField label="Accent" value={accent} onChange={setAccent} />
          </div>
        </TextureCardContent>
      </TextureCard>

      <TextureCard interactive={false}>
        <TextureCardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Enabled venues
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Order engine refuses orders on disabled venues. Worker stops
            polling them on next reconnect.
          </p>
          <div className="space-y-2">
            {VENUE_OPTIONS.map((v) => (
              <label
                key={v.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 cursor-pointer hover:border-blue-300"
              >
                <input
                  type="checkbox"
                  checked={venues.includes(v.id)}
                  onChange={() => toggleVenue(v.id)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {v.label}
                </span>
                <code className="ml-auto text-xs text-gray-400 dark:text-gray-500 font-mono">
                  {v.id}
                </code>
              </label>
            ))}
          </div>
        </TextureCardContent>
      </TextureCard>

      <TextureCard interactive={false}>
        <TextureCardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Operational
          </h2>
          <Field label="Price history sample interval (seconds)">
            <input
              type="number"
              min={5}
              max={3600}
              value={interval}
              onChange={(e) => setIntervalValue(e.target.value)}
              className={inputCls}
            />
          </Field>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            How often the worker writes a price snapshot per active market.
            Tighter = more disk + better detection backtests.
          </p>
        </TextureCardContent>
      </TextureCard>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pb-4">
        <button
          onClick={() => firm && applyToDraft(firm)}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          Reset
        </button>
        <TextureButton
          variant="primary"
          onClick={() => void save()}
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Save changes"}
        </TextureButton>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 rounded border border-gray-200 dark:border-slate-800 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} flex-1 font-mono text-xs`}
        />
      </div>
    </div>
  );
}
