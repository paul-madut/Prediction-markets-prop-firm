"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MegaphoneIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  mockAdminNews,
  NewsEvent,
  getNewsEventTag,
  NewsEventTag,
} from "@/data/mockAdminNews";
import { mockAdminFirm } from "@/data/mockAdminFirm";
import { cn } from "@/lib/utils";

interface FormState {
  id: string | null;
  eventName: string;
  marketFilter: string;
  startsAt: string; // local datetime-local string
  endsAt: string;
  cooldownMinutes: number;
  firmScope: "all" | string; // firm id or "all"
}

const emptyForm: FormState = {
  id: null,
  eventName: "",
  marketFilter: "",
  startsAt: "",
  endsAt: "",
  cooldownMinutes: 2,
  firmScope: "all",
};

function tagStyle(tag: NewsEventTag) {
  if (tag === "active") return "bg-emerald-100 text-emerald-700";
  if (tag === "upcoming") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400";
}

function isoToLocalInput(iso: string): string {
  // Convert ISO UTC to "yyyy-MM-ddTHH:mm" for datetime-local input
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function localInputToIso(local: string): string {
  return new Date(local).toISOString();
}

export default function AdminNewsPage() {
  const [events, setEvents] = useState<NewsEvent[]>(mockAdminNews);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const openNew = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (event: NewsEvent) => {
    setForm({
      id: event.id,
      eventName: event.eventName,
      marketFilter: event.marketFilter ?? "",
      startsAt: isoToLocalInput(event.startsAt),
      endsAt: isoToLocalInput(event.endsAt),
      cooldownMinutes: event.cooldownMinutes,
      firmScope: event.firmId ?? "all",
    });
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSave = () => {
    if (!form.eventName.trim() || !form.startsAt || !form.endsAt) return;

    const next: NewsEvent = {
      id: form.id ?? `news_${Date.now()}`,
      firmId: form.firmScope === "all" ? null : form.firmScope,
      marketFilter: form.marketFilter.trim() || null,
      eventName: form.eventName.trim(),
      startsAt: localInputToIso(form.startsAt),
      endsAt: localInputToIso(form.endsAt),
      cooldownMinutes: form.cooldownMinutes,
      createdAt: form.id
        ? events.find((e) => e.id === form.id)?.createdAt ?? new Date().toISOString()
        : new Date().toISOString(),
    };

    setEvents((prev) => {
      const exists = prev.some((e) => e.id === next.id);
      return exists ? prev.map((e) => (e.id === next.id ? next : e)) : [...prev, next];
    });

    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 -mx-6 -mt-6 px-6 py-6 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <MegaphoneIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">News events</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Cooldown windows around market-moving news. Order validation rejects
                trades inside an active window for matched markets.
              </p>
            </div>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <PlusIcon className="h-4 w-4" />
            New event
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
        {events.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No news events configured.</p>
            <button
              onClick={openNew}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-2"
            >
              Create one →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3 font-medium">Event</th>
                <th className="px-5 py-3 font-medium">Market filter</th>
                <th className="px-5 py-3 font-medium">Window</th>
                <th className="px-5 py-3 font-medium">Cooldown</th>
                <th className="px-5 py-3 font-medium">Scope</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {events.map((e) => {
                const tag = getNewsEventTag(e);
                return (
                  <tr key={e.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{e.eventName}</span>
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full",
                            tagStyle(tag)
                          )}
                        >
                          {tag}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {e.marketFilter ?? <span className="text-gray-400 dark:text-gray-500">all markets</span>}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300">
                      {new Date(e.startsAt).toLocaleString()}
                      <br />
                      <span className="text-gray-400 dark:text-gray-500">→</span>{" "}
                      {new Date(e.endsAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{e.cooldownMinutes}m</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">
                      {e.firmId === null ? (
                        <span className="italic text-gray-500 dark:text-gray-400">All firms</span>
                      ) : (
                        e.firmId
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEdit(e)}
                          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                          aria-label="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          aria-label="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {form.id ? "Edit news event" : "New news event"}
                  </h2>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <Field label="Event name" required>
                    <input
                      value={form.eventName}
                      onChange={(e) => setForm((f) => ({ ...f, eventName: e.target.value }))}
                      placeholder="e.g. FOMC Rate Decision — June 2026"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </Field>

                  <Field
                    label="Market filter"
                    hint="Ticker pattern with * wildcards. Empty = all markets."
                  >
                    <input
                      value={form.marketFilter}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, marketFilter: e.target.value }))
                      }
                      placeholder="KXFEDDECISION-*"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Starts at" required>
                      <input
                        type="datetime-local"
                        value={form.startsAt}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, startsAt: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </Field>
                    <Field label="Ends at" required>
                      <input
                        type="datetime-local"
                        value={form.endsAt}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, endsAt: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cooldown (minutes)">
                      <input
                        type="number"
                        min={0}
                        value={form.cooldownMinutes}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            cooldownMinutes: Math.max(0, parseInt(e.target.value || "0", 10)),
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </Field>
                    <Field label="Scope">
                      <select
                        value={form.firmScope}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, firmScope: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="all">All firms</option>
                        <option value={mockAdminFirm.id}>{mockAdminFirm.name}</option>
                      </select>
                    </Field>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!form.eventName || !form.startsAt || !form.endsAt}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {form.id ? "Save changes" : "Create event"}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
