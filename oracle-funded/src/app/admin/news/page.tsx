"use client";

// /admin/news — news event CRUD wired to /api/admin/news.
//
// Each row defines a window during which orders matching marketFilter (or all
// markets, if filter is empty) are blocked, plus an additional cooldownMinutes
// after the window closes.

import { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { TextureButton } from "@/components/ui/texture-button";
import { api, ApiError } from "@/lib/api-client";

interface NewsRow {
  id: string;
  firmId: string | null;
  eventName: string;
  marketFilter: string | null;
  startsAt: string;
  endsAt: string;
  cooldownMinutes: number;
  createdAt: string;
}

interface DraftRow {
  id?: string;
  eventName: string;
  marketFilter: string;
  startsAt: string; // datetime-local
  endsAt: string;
  cooldownMinutes: string;
}

function emptyDraft(): DraftRow {
  // Default a 2-hour window starting in 1 hour
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return {
    eventName: "",
    marketFilter: "",
    startsAt: toLocalDateTime(start),
    endsAt: toLocalDateTime(end),
    cooldownMinutes: "2",
  };
}

function toLocalDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(localDateTime: string): string {
  return new Date(localDateTime).toISOString();
}

function fromIso(iso: string): string {
  return toLocalDateTime(new Date(iso));
}

function classifyWindow(row: NewsRow): "active" | "upcoming" | "past" {
  const now = Date.now();
  const start = new Date(row.startsAt).getTime();
  const end =
    new Date(row.endsAt).getTime() + row.cooldownMinutes * 60 * 1000;
  if (now < start) return "upcoming";
  if (now > end) return "past";
  return "active";
}

function StateBadge({ state }: { state: "active" | "upcoming" | "past" }) {
  const palette: Record<string, string> = {
    active: "bg-amber-50 text-amber-700 border-amber-200",
    upcoming: "bg-blue-50 text-blue-700 border-blue-200",
    past: "bg-gray-50 text-gray-600 border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${palette[state]}`}
    >
      {state}
    </span>
  );
}

export default function AdminNewsPage() {
  const [rows, setRows] = useState<NewsRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<DraftRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<NewsRow[]>("/api/admin/news");
      setRows(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sorted = useMemo(() => {
    if (!rows) return [];
    return [...rows].sort(
      (a, b) =>
        new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
    );
  }, [rows]);

  async function submit(): Promise<void> {
    if (!draft) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        eventName: draft.eventName.trim(),
        marketFilter: draft.marketFilter.trim() || null,
        startsAt: toIso(draft.startsAt),
        endsAt: toIso(draft.endsAt),
        cooldownMinutes: Number(draft.cooldownMinutes || 0),
      };
      if (draft.id) {
        await api.patch(`/api/admin/news/${draft.id}`, payload);
      } else {
        await api.post("/api/admin/news", payload);
      }
      setDraft(null);
      await load();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string): Promise<void> {
    if (!confirm("Delete this news event?")) return;
    try {
      await api.delete(`/api/admin/news/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            News events
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Schedule cooldown windows during which order validation rejects
            orders matching the filter.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-blue-300 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <TextureButton
            variant="primary"
            size="sm"
            onClick={() => setDraft(emptyDraft())}
          >
            <PlusIcon className="w-4 h-4" />
            New event
          </TextureButton>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <TextureCard interactive={false}>
        <TextureCardContent className="p-0">
          {rows === null && !error ? (
            <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
              Loading…
            </div>
          ) : sorted.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
              No news events. Create one to enforce a cooldown window.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-950 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Event</th>
                    <th className="text-left py-3 px-4 font-semibold">Filter</th>
                    <th className="text-left py-3 px-4 font-semibold">Window</th>
                    <th className="text-right py-3 px-4 font-semibold">Cooldown</th>
                    <th className="text-left py-3 px-4 font-semibold">State</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {sorted.map((r) => {
                    const isFirmRow = r.firmId !== null;
                    const state = classifyWindow(r);
                    return (
                      <tr key={r.id}>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {r.eventName}
                          </div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {isFirmRow ? "Firm-scoped" : "Cross-firm"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                          {r.marketFilter ? (
                            <code className="font-mono text-xs">{r.marketFilter}</code>
                          ) : (
                            <span className="text-gray-400">— all markets</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-700 dark:text-gray-300">
                          <div>{new Date(r.startsAt).toLocaleString()}</div>
                          <div>→ {new Date(r.endsAt).toLocaleString()}</div>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          {r.cooldownMinutes} min
                        </td>
                        <td className="py-3 px-4">
                          <StateBadge state={state} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {isFirmRow ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() =>
                                  setDraft({
                                    id: r.id,
                                    eventName: r.eventName,
                                    marketFilter: r.marketFilter ?? "",
                                    startsAt: fromIso(r.startsAt),
                                    endsAt: fromIso(r.endsAt),
                                    cooldownMinutes: String(r.cooldownMinutes),
                                  })
                                }
                                className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 text-xs"
                              >
                                <PencilSquareIcon className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={() => void remove(r.id)}
                                className="text-red-600 hover:text-red-700 inline-flex items-center gap-1 text-xs"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">read-only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TextureCardContent>
      </TextureCard>

      {draft && (
        <DraftModal
          draft={draft}
          onChange={setDraft}
          onClose={() => {
            setDraft(null);
            setSubmitError(null);
          }}
          onSubmit={() => void submit()}
          submitting={submitting}
          submitError={submitError}
        />
      )}
    </div>
  );
}

function DraftModal({
  draft,
  onChange,
  onClose,
  onSubmit,
  submitting,
  submitError,
}: {
  draft: DraftRow;
  onChange: (d: DraftRow) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
}) {
  const set = <K extends keyof DraftRow>(k: K, v: DraftRow[K]) =>
    onChange({ ...draft, [k]: v });
  const isEdit = !!draft.id;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-start justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {isEdit ? "Edit news event" : "New news event"}
          </h3>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <Field label="Event name">
            <input
              type="text"
              value={draft.eventName}
              onChange={(e) => set("eventName", e.target.value)}
              placeholder="e.g. FOMC rate decision"
              className={inputCls}
            />
          </Field>
          <Field label="Market filter (substring or empty for all)">
            <input
              type="text"
              value={draft.marketFilter}
              onChange={(e) => set("marketFilter", e.target.value)}
              placeholder="e.g. fed-rate"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts at">
              <input
                type="datetime-local"
                value={draft.startsAt}
                onChange={(e) => set("startsAt", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Ends at">
              <input
                type="datetime-local"
                value={draft.endsAt}
                onChange={(e) => set("endsAt", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Cooldown after end (minutes)">
            <input
              type="number"
              min={0}
              max={60}
              value={draft.cooldownMinutes}
              onChange={(e) => set("cooldownMinutes", e.target.value)}
              className={inputCls}
            />
          </Field>
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex items-start gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <TextureButton
            variant="primary"
            size="sm"
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
          </TextureButton>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500";

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
