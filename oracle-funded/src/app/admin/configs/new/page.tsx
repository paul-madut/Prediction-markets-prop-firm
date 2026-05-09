"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/16/solid";
import { ConfigForm, EMPTY_DRAFT } from "@/components/admin/configs/ConfigForm";

export default function NewConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/configs"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          All configs
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          New challenge config
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Define an account size, drawdown rules, and phases. Saved configs
          appear immediately on the trader Buy Challenge page.
        </p>
      </div>
      <ConfigForm mode="create" initialDraft={EMPTY_DRAFT} />
    </div>
  );
}
