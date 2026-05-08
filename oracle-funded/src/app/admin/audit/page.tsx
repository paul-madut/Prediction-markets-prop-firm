"use client";

// /admin/audit — wired audit log search backed by GET /api/admin/audit.
// Filters by action substring + actor user id + entity type. Keyset
// pagination via the nextCursor returned by the route.

import { useEffect, useState } from "react";
import { ArrowPathIcon, MagnifyingGlassIcon } from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { api, ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";

interface AuditRow {
  id: string;
  firmId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: unknown;
  afterState: unknown;
  metadata: unknown;
  createdAt: string;
}

interface AuditResponse {
  rows: AuditRow[];
  nextCursor: string | null;
  count: number;
}

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [entityType, setEntityType] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (action.trim()) params.set("action", action.trim());
      if (actor.trim()) params.set("actorUserId", actor.trim());
      if (entityType.trim()) params.set("entityType", entityType.trim());
      params.set("limit", "100");
      const data = await api.get<AuditResponse>(`/api/admin/audit?${params}`);
      setRows(data.rows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Audit log</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Every admin action and system state change is recorded here.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
            Live data
          </span>
        </div>
      </div>

      {/* Filters */}
      <TextureCard interactive={false}>
        <TextureCardContent className="p-4 flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Action</label>
            <input
              type="text"
              placeholder="e.g. payout.approved"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Actor user id</label>
            <input
              type="text"
              placeholder="UUID"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Entity type</label>
            <input
              type="text"
              placeholder="account / payment / payout / order"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <MagnifyingGlassIcon className="w-4 h-4" />}
            Search
          </button>
        </TextureCardContent>
      </TextureCard>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <TextureCard interactive={false}>
        <TextureCardContent className="p-0">
          {rows === null && (
            <div className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          )}
          {rows !== null && rows.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              No audit rows match those filters.
            </div>
          )}
          {rows !== null && rows.length > 0 && (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {rows.map((r) => {
                const expanded = expandedId === r.id;
                return (
                  <li
                    key={r.id}
                    className="px-6 py-3 hover:bg-gray-50 dark:hover:bg-slate-950/50 cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : r.id)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {r.action}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 uppercase">{r.entityType}</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono truncate">
                          actor {r.actorUserId ? `${r.actorUserId.slice(0, 8)}…` : "system"} · entity {r.entityId.slice(0, 8)}…
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                        {formatDate(r.createdAt, "MMM dd HH:mm:ss")}
                      </span>
                    </div>
                    {expanded && (
                      <div className="mt-3 pl-3 border-l-2 border-blue-300 dark:border-blue-700 grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
                        <div>
                          <div className="text-gray-400 dark:text-gray-500 uppercase font-semibold mb-1">Before</div>
                          <pre className="bg-gray-50 dark:bg-slate-950 rounded p-2 overflow-x-auto text-gray-700 dark:text-gray-300">{JSON.stringify(r.beforeState ?? null, null, 2)}</pre>
                        </div>
                        <div>
                          <div className="text-gray-400 dark:text-gray-500 uppercase font-semibold mb-1">After</div>
                          <pre className="bg-gray-50 dark:bg-slate-950 rounded p-2 overflow-x-auto text-gray-700 dark:text-gray-300">{JSON.stringify(r.afterState ?? null, null, 2)}</pre>
                        </div>
                        <div>
                          <div className="text-gray-400 dark:text-gray-500 uppercase font-semibold mb-1">Metadata</div>
                          <pre className="bg-gray-50 dark:bg-slate-950 rounded p-2 overflow-x-auto text-gray-700 dark:text-gray-300">{JSON.stringify(r.metadata ?? {}, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </TextureCardContent>
      </TextureCard>
    </div>
  );
}
