"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, ArrowDownTrayIcon, CurrencyDollarIcon, ViewfinderCircleIcon, ArrowTrendingDownIcon, CalendarIcon, TagIcon, ExclamationCircleIcon } from "@heroicons/react/16/solid";
import { AdminChallengeConfig } from "@/types/admin";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: Omit<AdminChallengeConfig, "configId" | "createdAt" | "updatedAt">) => void;
  editMode?: boolean;
  existingConfig?: AdminChallengeConfig;
}

interface FormData {
  name: string;
  description: string;
  challengeTypeId: "blitz" | "2step" | "3step";
  accountSize: number;
  basePrice: number;
  profitTargetPercent: number;
  dailyLossLimitPercent: number;
  maxDrawdownPercent: number;
  drawdownType: "EOD" | "realtime" | "trailing";
  minTradingDays: number;
  maxTradingDays?: number;
  isPromotion: boolean;
  discountedPrice?: number;
  discountExpiresAt?: string;
  isEnabled: boolean;
  createdBy: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function ChallengeModal({
  isOpen,
  onClose,
  onSave,
  editMode = false,
  existingConfig,
}: ChallengeModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    challengeTypeId: "2step",
    accountSize: 5000000, // $50,000
    basePrice: 4000, // $40
    profitTargetPercent: 8,
    dailyLossLimitPercent: 5,
    maxDrawdownPercent: 10,
    drawdownType: "EOD",
    minTradingDays: 10,
    isPromotion: false,
    isEnabled: true,
    createdBy: "admin_001",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // Pre-populate form if editing
  useEffect(() => {
    if (editMode && existingConfig) {
      setFormData({
        name: existingConfig.name,
        description: existingConfig.description,
        challengeTypeId: existingConfig.challengeTypeId,
        accountSize: existingConfig.accountSize,
        basePrice: existingConfig.basePrice,
        profitTargetPercent: existingConfig.profitTargetPercent,
        dailyLossLimitPercent: existingConfig.dailyLossLimitPercent,
        maxDrawdownPercent: existingConfig.maxDrawdownPercent,
        drawdownType: existingConfig.drawdownType,
        minTradingDays: existingConfig.minTradingDays,
        maxTradingDays: existingConfig.maxTradingDays,
        isPromotion: existingConfig.isPromotion,
        discountedPrice: existingConfig.discountedPrice,
        discountExpiresAt: existingConfig.discountExpiresAt,
        isEnabled: existingConfig.isEnabled,
        createdBy: existingConfig.createdBy,
      });
    }
  }, [editMode, existingConfig]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.length > 100) {
      newErrors.name = "Name must be 100 characters or less";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length > 500) {
      newErrors.description = "Description must be 500 characters or less";
    }

    if (formData.accountSize < 1000000) {
      newErrors.accountSize = "Account size must be at least $10,000";
    }

    if (formData.basePrice < 100) {
      newErrors.basePrice = "Base price must be at least $1.00";
    }

    if (formData.profitTargetPercent < 1 || formData.profitTargetPercent > 50) {
      newErrors.profitTargetPercent = "Profit target must be between 1% and 50%";
    }

    if (formData.dailyLossLimitPercent < 1 || formData.dailyLossLimitPercent > 20) {
      newErrors.dailyLossLimitPercent = "Daily loss limit must be between 1% and 20%";
    }

    if (formData.maxDrawdownPercent < 1 || formData.maxDrawdownPercent > 50) {
      newErrors.maxDrawdownPercent = "Max drawdown must be between 1% and 50%";
    }

    if (formData.minTradingDays < 1 || formData.minTradingDays > 100) {
      newErrors.minTradingDays = "Min trading days must be between 1 and 100";
    }

    if (formData.isPromotion && !formData.discountedPrice) {
      newErrors.discountedPrice = "Discounted price is required for promotions";
    }

    if (formData.isPromotion && formData.discountedPrice && formData.discountedPrice >= formData.basePrice) {
      newErrors.discountedPrice = "Discounted price must be less than base price";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    // Simulate save delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const configToSave: Omit<AdminChallengeConfig, "configId" | "createdAt" | "updatedAt"> = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      challengeTypeId: formData.challengeTypeId,
      accountSize: formData.accountSize,
      basePrice: formData.basePrice,
      profitTargetPercent: formData.profitTargetPercent,
      dailyLossLimitPercent: formData.dailyLossLimitPercent,
      maxDrawdownPercent: formData.maxDrawdownPercent,
      drawdownType: formData.drawdownType,
      minTradingDays: formData.minTradingDays,
      maxTradingDays: formData.maxTradingDays,
      isPromotion: formData.isPromotion,
      discountedPrice: formData.isPromotion ? formData.discountedPrice : undefined,
      discountExpiresAt: formData.isPromotion ? formData.discountExpiresAt : undefined,
      isEnabled: formData.isEnabled,
      createdBy: formData.createdBy,
    };

    onSave(configToSave);
    setIsSaving(false);
    onClose();
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  // Calculated preview values
  const profitTargetAmount = formData.accountSize * (formData.profitTargetPercent / 100);
  const dailyLossAmount = formData.accountSize * (formData.dailyLossLimitPercent / 100);
  const maxDrawdownAmount = formData.accountSize * (formData.maxDrawdownPercent / 100);
  const discountSavings = formData.isPromotion && formData.discountedPrice
    ? formData.basePrice - formData.discountedPrice
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="fixed inset-4 md:inset-10 z-50 overflow-hidden"
          >
            <div className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 dark:border-slate-800">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {editMode ? "Edit Challenge" : "New Challenge"}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {editMode ? "Update challenge configuration" : "Create a new evaluation program"}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  disabled={isSaving}
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
                  {/* Form - 2 columns */}
                  <div className="lg:col-span-2 space-y-8">
                    <form onSubmit={handleSubmit} id="challenge-form">
                      {/* Basic Info Section */}
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <ViewfinderCircleIcon className="h-5 w-5 text-indigo-600" />
                          Basic Information
                        </h3>

                        <div className="space-y-4">
                          {/* Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Challenge Name *
                            </label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className={cn(
                                "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                errors.name ? "border-red-500" : "border-gray-300 dark:border-slate-700"
                              )}
                              placeholder="e.g., Blitz $10,000"
                              maxLength={100}
                            />
                            {errors.name && (
                              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                <ExclamationCircleIcon className="h-4 w-4" />
                                {errors.name}
                              </p>
                            )}
                          </div>

                          {/* Description */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Description *
                            </label>
                            <textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className={cn(
                                "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none",
                                errors.description ? "border-red-500" : "border-gray-300 dark:border-slate-700"
                              )}
                              placeholder="Brief description of this challenge"
                              rows={3}
                              maxLength={500}
                            />
                            <div className="flex items-center justify-between mt-1">
                              {errors.description ? (
                                <p className="text-sm text-red-600 flex items-center gap-1">
                                  <ExclamationCircleIcon className="h-4 w-4" />
                                  {errors.description}
                                </p>
                              ) : (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {formData.description.length}/500
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Challenge Type */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Challenge Type *
                            </label>
                            <select
                              value={formData.challengeTypeId}
                              onChange={(e) => setFormData({ ...formData, challengeTypeId: e.target.value as "blitz" | "2step" | "3step" })}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="blitz">Blitz (Single Phase)</option>
                              <option value="2step">2-Step (Two Phases)</option>
                              <option value="3step">3-Step (Three Phases)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Pricing Section */}
                      <div className="space-y-6 mt-8">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <CurrencyDollarIcon className="h-5 w-5 text-indigo-600" />
                          Pricing
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Account Size */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Account Size * (USD)
                            </label>
                            <input
                              type="number"
                              value={formData.accountSize / 100}
                              onChange={(e) => setFormData({ ...formData, accountSize: parseFloat(e.target.value) * 100 || 0 })}
                              className={cn(
                                "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                errors.accountSize ? "border-red-500" : "border-gray-300 dark:border-slate-700"
                              )}
                              placeholder="50000"
                              step="1000"
                            />
                            {errors.accountSize && (
                              <p className="text-sm text-red-600 mt-1">{errors.accountSize}</p>
                            )}
                          </div>

                          {/* Base Price */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Base Price * (USD)
                            </label>
                            <input
                              type="number"
                              value={formData.basePrice / 100}
                              onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) * 100 || 0 })}
                              className={cn(
                                "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                errors.basePrice ? "border-red-500" : "border-gray-300 dark:border-slate-700"
                              )}
                              placeholder="40.00"
                              step="1"
                            />
                            {errors.basePrice && (
                              <p className="text-sm text-red-600 mt-1">{errors.basePrice}</p>
                            )}
                          </div>
                        </div>

                        {/* Promotion Toggle */}
                        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                          <input
                            type="checkbox"
                            checked={formData.isPromotion}
                            onChange={(e) => setFormData({ ...formData, isPromotion: e.target.checked })}
                            className="h-4 w-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <label className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <TagIcon className="h-4 w-4 text-amber-600" />
                              This is a promotional offer
                            </label>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                              Offer a discounted price with expiration date
                            </p>
                          </div>
                        </div>

                        {/* Promotion Fields */}
                        {formData.isPromotion && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Discounted Price * (USD)
                              </label>
                              <input
                                type="number"
                                value={formData.discountedPrice ? formData.discountedPrice / 100 : ""}
                                onChange={(e) => setFormData({ ...formData, discountedPrice: parseFloat(e.target.value) * 100 || 0 })}
                                className={cn(
                                  "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                  errors.discountedPrice ? "border-red-500" : "border-gray-300 dark:border-slate-700"
                                )}
                                placeholder="32.00"
                                step="1"
                              />
                              {errors.discountedPrice && (
                                <p className="text-sm text-red-600 mt-1">{errors.discountedPrice}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Expires At
                              </label>
                              <input
                                type="datetime-local"
                                value={formData.discountExpiresAt ? formData.discountExpiresAt.slice(0, 16) : ""}
                                onChange={(e) => setFormData({ ...formData, discountExpiresAt: e.target.value ? `${e.target.value}:00Z` : undefined })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Rules Section */}
                      <div className="space-y-6 mt-8">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <ArrowTrendingDownIcon className="h-5 w-5 text-indigo-600" />
                          Trading Rules
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Profit ViewfinderCircleIcon */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Profit ViewfinderCircleIcon * (%)
                            </label>
                            <input
                              type="number"
                              value={formData.profitTargetPercent}
                              onChange={(e) => setFormData({ ...formData, profitTargetPercent: parseFloat(e.target.value) || 0 })}
                              className={cn(
                                "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                errors.profitTargetPercent ? "border-red-500" : "border-gray-300 dark:border-slate-700"
                              )}
                              placeholder="8"
                              step="0.1"
                              min="1"
                              max="50"
                            />
                            {errors.profitTargetPercent && (
                              <p className="text-sm text-red-600 mt-1">{errors.profitTargetPercent}</p>
                            )}
                          </div>

                          {/* Daily Loss Limit */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Daily Loss Limit * (%)
                            </label>
                            <input
                              type="number"
                              value={formData.dailyLossLimitPercent}
                              onChange={(e) => setFormData({ ...formData, dailyLossLimitPercent: parseFloat(e.target.value) || 0 })}
                              className={cn(
                                "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                errors.dailyLossLimitPercent ? "border-red-500" : "border-gray-300 dark:border-slate-700"
                              )}
                              placeholder="5"
                              step="0.1"
                              min="1"
                              max="20"
                            />
                            {errors.dailyLossLimitPercent && (
                              <p className="text-sm text-red-600 mt-1">{errors.dailyLossLimitPercent}</p>
                            )}
                          </div>

                          {/* Max Drawdown */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Max Drawdown * (%)
                            </label>
                            <input
                              type="number"
                              value={formData.maxDrawdownPercent}
                              onChange={(e) => setFormData({ ...formData, maxDrawdownPercent: parseFloat(e.target.value) || 0 })}
                              className={cn(
                                "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                errors.maxDrawdownPercent ? "border-red-500" : "border-gray-300 dark:border-slate-700"
                              )}
                              placeholder="10"
                              step="0.1"
                              min="1"
                              max="50"
                            />
                            {errors.maxDrawdownPercent && (
                              <p className="text-sm text-red-600 mt-1">{errors.maxDrawdownPercent}</p>
                            )}
                          </div>
                        </div>

                        {/* Drawdown Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Drawdown Type *
                          </label>
                          <select
                            value={formData.drawdownType}
                            onChange={(e) => setFormData({ ...formData, drawdownType: e.target.value as "EOD" | "realtime" | "trailing" })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="EOD">End of Day (EOD)</option>
                            <option value="realtime">Real-time</option>
                            <option value="trailing">Trailing</option>
                          </select>
                        </div>
                      </div>

                      {/* Advanced Section */}
                      <div className="space-y-6 mt-8">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <CalendarIcon className="h-5 w-5 text-indigo-600" />
                          Requirements
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Min Trading Days */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Minimum Trading Days *
                            </label>
                            <input
                              type="number"
                              value={formData.minTradingDays}
                              onChange={(e) => setFormData({ ...formData, minTradingDays: parseInt(e.target.value) || 0 })}
                              className={cn(
                                "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                errors.minTradingDays ? "border-red-500" : "border-gray-300 dark:border-slate-700"
                              )}
                              placeholder="10"
                              min="1"
                              max="100"
                            />
                            {errors.minTradingDays && (
                              <p className="text-sm text-red-600 mt-1">{errors.minTradingDays}</p>
                            )}
                          </div>

                          {/* Max Trading Days */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Maximum Trading Days (Optional)
                            </label>
                            <input
                              type="number"
                              value={formData.maxTradingDays || ""}
                              onChange={(e) => setFormData({ ...formData, maxTradingDays: e.target.value ? parseInt(e.target.value) : undefined })}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Leave empty for no limit"
                              min="1"
                            />
                          </div>
                        </div>

                        {/* Enable/Disable */}
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-950 rounded-lg border border-gray-200 dark:border-slate-800">
                          <input
                            type="checkbox"
                            checked={formData.isEnabled}
                            onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                            className="h-4 w-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                          />
                          <label className="font-medium text-gray-900 dark:text-gray-100">
                            Enable this challenge immediately
                          </label>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Preview Panel - 1 column */}
                  <div className="space-y-4">
                    <div className="sticky top-0 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preview</h3>

                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200 space-y-4">
                        {/* Account Info */}
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Account Size</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {formatCurrency(formData.accountSize)}
                          </p>
                        </div>

                        <div className="h-px bg-indigo-200" />

                        {/* Profit ViewfinderCircleIcon */}
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Profit Target</p>
                          <p className="text-lg font-semibold text-green-600">
                            {formatCurrency(profitTargetAmount)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formData.profitTargetPercent}% of account
                          </p>
                        </div>

                        {/* Daily Loss Limit */}
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Daily Loss Limit</p>
                          <p className="text-lg font-semibold text-red-600">
                            {formatCurrency(dailyLossAmount)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formData.dailyLossLimitPercent}% of account
                          </p>
                        </div>

                        {/* Max Drawdown */}
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Max Drawdown</p>
                          <p className="text-lg font-semibold text-red-600">
                            {formatCurrency(maxDrawdownAmount)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formData.maxDrawdownPercent}% of account ({formData.drawdownType})
                          </p>
                        </div>

                        {/* Pricing */}
                        <div className="h-px bg-indigo-200" />

                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Price</p>
                          {formData.isPromotion && formData.discountedPrice ? (
                            <>
                              <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-bold text-amber-600">
                                  {formatCurrency(formData.discountedPrice)}
                                </p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 line-through">
                                  {formatCurrency(formData.basePrice)}
                                </p>
                              </div>
                              <p className="text-xs text-green-600 font-medium mt-1">
                                Save {formatCurrency(discountSavings)}
                              </p>
                            </>
                          ) : (
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(formData.basePrice)}
                            </p>
                          )}
                        </div>

                        {/* Requirements */}
                        <div className="h-px bg-indigo-200" />

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Min Trading Days</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{formData.minTradingDays}</span>
                          </div>
                          {formData.maxTradingDays && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 dark:text-gray-300">Max Trading Days</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{formData.maxTradingDays}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Challenge Type</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100 uppercase">{formData.challengeTypeId}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-8 py-6 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  * Required fields
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSaving}
                    className="px-6 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="challenge-form"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </motion.div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <ArrowDownTrayIcon className="h-5 w-5" />
                        {editMode ? "Update Challenge" : "Create Challenge"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
