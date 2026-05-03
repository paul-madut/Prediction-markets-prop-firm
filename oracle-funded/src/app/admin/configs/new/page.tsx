"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import ChallengeModal from "@/components/admin/challenges/ChallengeModal";
import { useAdmin } from "@/context/AdminContext";

export default function NewChallengeConfigPage() {
  const router = useRouter();
  const { createChallengeConfig } = useAdmin();

  return (
    <div className="space-y-6">
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6 mb-6">
        <Link
          href="/admin/configs"
          className="text-sm text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to configs
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-3">New challenge config</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define rules for a new evaluation program.
        </p>
      </div>

      <ChallengeModal
        isOpen
        onClose={() => router.push("/admin/configs")}
        onSave={(config) => {
          createChallengeConfig(config);
          router.push("/admin/configs");
        }}
      />
    </div>
  );
}
