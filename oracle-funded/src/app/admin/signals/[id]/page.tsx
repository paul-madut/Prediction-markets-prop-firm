"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, ClockIcon } from "@heroicons/react/24/outline";

export default function AdminSignalDetailPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";

  return (
    <div className="space-y-6">
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6 mb-6">
        <Link
          href="/admin/signals"
          className="text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to signals
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-3">
          Signal <code className="text-base bg-gray-100 px-2 py-0.5 rounded">{id}</code>
        </h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-amber-100">
          <ClockIcon className="h-7 w-7 text-amber-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mt-4">
          Signal detail not yet enabled
        </h2>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
          Coming in beta weeks 3–5. Each detection rule ships with evidence,
          comparison data, charts, and Mark Legitimate / Mark Violating actions
          (each requiring reviewer notes).
        </p>
      </div>
    </div>
  );
}
