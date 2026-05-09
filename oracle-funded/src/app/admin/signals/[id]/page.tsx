"use client";

// /admin/signals/[id] — review a single anti-cheat signal.
//
// Wires GET /api/admin/signals/[id] for detail, PATCH for review action
// (status: confirmed / dismissed, with reviewerNotes).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { TextureButton } from "@/components/ui/texture-button";
import { api, ApiError } from "@/lib/api-client";

interface SignalDetail {
  id: string;
  accountId: string;
  signalType: string;
  severity: string;
  score: string | null;
  evidence: Record<string, unknown>;
  status: string;
  reviewerNotes: string | null;
  reviewedAt: string | null;
  detectedAt: string;
}

export default function SignalDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [signal, setSignal] = useState<SignalDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setError(null);
    try {
      const data = await api.get<SignalDetail>(`/api/admin/signals/${id}`);
      setSignal(data);
      setNotes(data.reviewerNotes ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function review(status: "confirmed" | "dismissed"): Promise<void> {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.patch(`/api/admin/signals/${id}`, {
        status,
        reviewerNotes: notes.trim() || null,
      });
      await load();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-12 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-sm text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link
          href="/admin/signals"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          All signals
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 capitalize">
          {signal.signalType.replace(/_/g, " ")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {signal.severity} severity · detected{" "}
          {new Date(signal.detectedAt).toLocaleString()}
        </p>
      </div>

      <TextureCard interactive={false}>
        <TextureCardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Detail
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Account">
              <Link
                href={`/admin/accounts/${signal.accountId}`}
                className="text-blue-600 hover:text-blue-700 font-mono text-xs"
              >
                {signal.accountId}
              </Link>
            </Field>
            <Field label="Score">
              {signal.score ? Number(signal.score).toFixed(2) : "—"}
            </Field>
            <Field label="Status">{signal.status}</Field>
            <Field label="Reviewed">
              {signal.reviewedAt
                ? new Date(signal.reviewedAt).toLocaleString()
                : "—"}
            </Field>
          </div>
        </TextureCardContent>
      </TextureCard>

      <TextureCard interactive={false}>
        <TextureCardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Evidence
          </h2>
          <pre className="text-xs bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg p-3 overflow-x-auto">
            {JSON.stringify(signal.evidence, null, 2)}
          </pre>
        </TextureCardContent>
      </TextureCard>

      <TextureCard interactive={false}>
        <TextureCardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Reviewer notes
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            placeholder="What did you find when reviewing the evidence?"
          />
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              {submitError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <TextureButton
              variant="secondary"
              size="sm"
              onClick={() => void review("dismissed")}
              disabled={submitting || signal.status === "dismissed"}
            >
              Dismiss
            </TextureButton>
            <TextureButton
              variant="destructive"
              size="sm"
              onClick={() => void review("confirmed")}
              disabled={submitting || signal.status === "confirmed"}
            >
              Confirm violation
            </TextureButton>
          </div>
        </TextureCardContent>
      </TextureCard>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
        {label}
      </div>
      <div className="mt-1 text-sm text-gray-900 dark:text-gray-100 capitalize">
        {children}
      </div>
    </div>
  );
}
