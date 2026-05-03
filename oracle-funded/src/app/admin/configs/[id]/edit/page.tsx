"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import ChallengeModal from "@/components/admin/challenges/ChallengeModal";
import { useAdmin } from "@/context/AdminContext";

export default function EditChallengeConfigPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";
  const { challengeConfigs, updateChallengeConfig } = useAdmin();
  const config = challengeConfigs.find((c) => c.configId === id);

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
        <h1 className="text-2xl font-bold text-gray-900 mt-3">
          {config ? `Edit "${config.name}"` : "Config not found"}
        </h1>
      </div>

      {config ? (
        <ChallengeModal
          isOpen
          editMode
          existingConfig={config}
          onClose={() => router.push("/admin/configs")}
          onSave={(updates) => {
            updateChallengeConfig(config.configId, updates);
            router.push("/admin/configs");
          }}
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-sm text-gray-500">
            ID <code className="px-1 py-0.5 bg-gray-100 rounded">{id}</code> doesn&apos;t exist.
          </p>
        </div>
      )}
    </div>
  );
}
