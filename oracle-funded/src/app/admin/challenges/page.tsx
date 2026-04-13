"use client";

import React, { useState } from "react";
import { ViewfinderCircleIcon, PlusIcon, PencilIcon, StopIcon, PlayIcon, TagIcon } from "@heroicons/react/16/solid";
import { useAdmin } from "@/context/AdminContext";
import { AdminChallengeConfig } from "@/types/admin";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import ChallengeModal from "@/components/admin/challenges/ChallengeModal";

type ModalState = null | 'create' | { mode: 'edit'; config: AdminChallengeConfig };

export default function ChallengesPage() {
  const { challengeConfigs, toggleChallengeStatus, createChallengeConfig, updateChallengeConfig } = useAdmin();
  const [modalState, setModalState] = useState<ModalState>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <ViewfinderCircleIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Challenge Configuration
              </h1>
              <p className="text-gray-500 mt-1">
                Create and manage evaluation programs
              </p>
            </div>
          </div>

          <button
            onClick={() => setModalState('create')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            New Challenge
          </button>
        </div>
      </div>

      {/* Challenge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {challengeConfigs.map((config) => (
          <div
            key={config.configId}
            className={cn(
              "bg-white rounded-xl border overflow-hidden transition-all",
              config.isEnabled
                ? "border-gray-200"
                : "border-gray-200 opacity-60"
            )}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {config.name}
                    </h3>
                    {config.isPromotion && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                        Promo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {config.description}
                  </p>
                </div>
                <button
                  onClick={() =>
                    toggleChallengeStatus(config.configId, !config.isEnabled)
                  }
                  className="text-gray-400 hover:text-gray-600"
                >
                  {config.isEnabled ? (
                    <PlayIcon className="h-6 w-6 text-green-500" />
                  ) : (
                    <StopIcon className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
              {/* Pricing */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Price</span>
                <div className="text-right">
                  {config.discountedPrice ? (
                    <>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(config.discountedPrice)}
                      </span>
                      <span className="text-sm text-gray-400 line-through ml-2">
                        {formatCurrency(config.basePrice)}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(config.basePrice)}
                    </span>
                  )}
                </div>
              </div>

              {/* Account Size */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Account Size</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(config.accountSize)}
                </span>
              </div>

              {/* Profit ViewfinderCircleIcon */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Profit Target</span>
                <span className="font-medium text-green-600">
                  {config.profitTargetPercent}%
                </span>
              </div>

              {/* Daily Loss Limit */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Daily Loss Limit</span>
                <span className="font-medium text-red-600">
                  {config.dailyLossLimitPercent}%
                </span>
              </div>

              {/* Max Drawdown */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Max Drawdown</span>
                <span className="font-medium text-red-600">
                  {config.maxDrawdownPercent}%
                </span>
              </div>

              {/* Min Trading Days */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Min Trading Days</span>
                <span className="font-medium text-gray-900">
                  {config.minTradingDays} days
                </span>
              </div>

              {/* Drawdown Type */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Drawdown Type</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded uppercase">
                  {config.drawdownType}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setModalState({ mode: 'edit', config })}
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <PencilIcon className="h-4 w-4" />
                Edit Configuration
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">Total Configurations</p>
            <p className="text-2xl font-bold text-gray-900">
              {challengeConfigs.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {challengeConfigs.filter((c) => c.isEnabled).length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Disabled</p>
            <p className="text-2xl font-bold text-gray-400">
              {challengeConfigs.filter((c) => !c.isEnabled).length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Promotions</p>
            <p className="text-2xl font-bold text-amber-600">
              {challengeConfigs.filter((c) => c.isPromotion).length}
            </p>
          </div>
        </div>
      </div>

      {/* Challenge Modal */}
      <ChallengeModal
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
        onSave={(config) => {
          if (modalState === 'create') {
            createChallengeConfig(config);
          } else if (modalState && typeof modalState === 'object' && modalState.mode === 'edit') {
            updateChallengeConfig(modalState.config.configId, config);
          }
        }}
        editMode={modalState !== null && typeof modalState === 'object' && modalState.mode === 'edit'}
        existingConfig={modalState && typeof modalState === 'object' && modalState.mode === 'edit' ? modalState.config : undefined}
      />
    </div>
  );
}
