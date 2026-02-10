"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Globe,
  Bell,
  Shield,
  Users,
  Save,
  RotateCcw,
  Check,
  Mail,
  Slack,
} from "lucide-react";
import { useToast } from "@/components/admin/shared/Toast";
import { cn } from "@/lib/utils";

interface GeneralSettings {
  platformName: string;
  timezone: string;
  dateFormat: string;
  currencySymbol: string;
  supportEmail: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  newTraderRegistration: boolean;
  payoutSubmitted: boolean;
  kycPending: boolean;
  riskAlertHighCritical: boolean;
  fraudAlertCreated: boolean;
  digestMode: "realtime" | "daily";
  slackWebhookUrl: string;
}

interface RiskSettings {
  alertThreshold: number;
  autoFreezeOnBreach: boolean;
  highRiskThreshold: number;
  breachGracePeriod: number;
}

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "support" | "compliance";
  lastLogin: string;
  status: "active" | "inactive";
}

type TabType = "general" | "notifications" | "risk" | "users";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const DATE_FORMATS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2025)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2025)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2025-12-31)" },
];

const CURRENCY_SYMBOLS = [
  { value: "$", label: "$ (USD)" },
  { value: "€", label: "€ (EUR)" },
  { value: "£", label: "£ (GBP)" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showSuccess, showInfo } = useToast();

  // Settings state
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    platformName: "OracleFunded",
    timezone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
    currencySymbol: "$",
    supportEmail: "support@oraclefunded.com",
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    newTraderRegistration: true,
    payoutSubmitted: true,
    kycPending: true,
    riskAlertHighCritical: true,
    fraudAlertCreated: true,
    digestMode: "realtime",
    slackWebhookUrl: "",
  });

  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    alertThreshold: 80,
    autoFreezeOnBreach: false,
    highRiskThreshold: 70,
    breachGracePeriod: 3,
  });

  const [adminUsers] = useState<AdminUserRow[]>([
    {
      id: "admin_001",
      name: "John Admin",
      email: "admin@oraclefunded.com",
      role: "super_admin",
      lastLogin: new Date().toISOString(),
      status: "active",
    },
    {
      id: "admin_002",
      name: "Sarah Manager",
      email: "sarah@oraclefunded.com",
      role: "admin",
      lastLogin: new Date(Date.now() - 86400000).toISOString(),
      status: "active",
    },
    {
      id: "admin_003",
      name: "Mike Support",
      email: "mike@oraclefunded.com",
      role: "support",
      lastLogin: new Date(Date.now() - 172800000).toISOString(),
      status: "active",
    },
  ]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("admin_settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.general) setGeneralSettings(parsed.general);
        if (parsed.notifications) setNotificationSettings(parsed.notifications);
        if (parsed.risk) setRiskSettings(parsed.risk);
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
  }, []);

  // Auto-save with debounce
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 500);

    return () => clearTimeout(timer);
  }, [generalSettings, notificationSettings, riskSettings, hasUnsavedChanges]);

  // Keyboard shortcut for Cmd/Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasUnsavedChanges) {
          handleSave();
        } else {
          showInfo("Settings Saved", "All changes are already saved");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasUnsavedChanges]);

  const handleSave = async () => {
    setIsSaving(true);

    // Simulate save delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const settingsData = {
      general: generalSettings,
      notifications: notificationSettings,
      risk: riskSettings,
    };

    localStorage.setItem("admin_settings", JSON.stringify(settingsData));

    setHasUnsavedChanges(false);
    setIsSaving(false);
    showSuccess("Settings Saved", "Your changes have been saved successfully");
  };

  const handleReset = (section: TabType) => {
    if (section === "general") {
      setGeneralSettings({
        platformName: "OracleFunded",
        timezone: "America/New_York",
        dateFormat: "MM/DD/YYYY",
        currencySymbol: "$",
        supportEmail: "support@oraclefunded.com",
      });
    } else if (section === "notifications") {
      setNotificationSettings({
        emailNotifications: true,
        newTraderRegistration: true,
        payoutSubmitted: true,
        kycPending: true,
        riskAlertHighCritical: true,
        fraudAlertCreated: true,
        digestMode: "realtime",
        slackWebhookUrl: "",
      });
    } else if (section === "risk") {
      setRiskSettings({
        alertThreshold: 80,
        autoFreezeOnBreach: false,
        highRiskThreshold: 70,
        breachGracePeriod: 3,
      });
    }
    setHasUnsavedChanges(true);
    showInfo("Reset to Defaults", "Settings have been reset to default values");
  };

  const tabs = [
    { id: "general" as TabType, label: "General", icon: Globe },
    { id: "notifications" as TabType, label: "Notifications", icon: Bell },
    { id: "risk" as TabType, label: "Risk", icon: Shield },
    { id: "users" as TabType, label: "Users", icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Settings className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-500 mt-1">
                Configure platform settings and preferences
              </p>
            </div>
          </div>

          {/* Save Indicator */}
          {(hasUnsavedChanges || isSaving) && (
            <div className="flex items-center gap-2 text-sm">
              {isSaving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Save className="h-4 w-4 text-indigo-600" />
                  </motion.div>
                  <span className="text-indigo-600 font-medium">Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">Auto-saved</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative",
                  activeTab === tab.id
                    ? "text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* General Settings */}
          {activeTab === "general" && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
                <button
                  onClick={() => handleReset("general")}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Defaults
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform Name
                  </label>
                  <input
                    type="text"
                    value={generalSettings.platformName}
                    onChange={(e) => {
                      setGeneralSettings({ ...generalSettings, platformName: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Timezone
                  </label>
                  <select
                    value={generalSettings.timezone}
                    onChange={(e) => {
                      setGeneralSettings({ ...generalSettings, timezone: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Format
                  </label>
                  <select
                    value={generalSettings.dateFormat}
                    onChange={(e) => {
                      setGeneralSettings({ ...generalSettings, dateFormat: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {DATE_FORMATS.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency Symbol
                  </label>
                  <select
                    value={generalSettings.currencySymbol}
                    onChange={(e) => {
                      setGeneralSettings({ ...generalSettings, currencySymbol: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {CURRENCY_SYMBOLS.map((currency) => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(e) => {
                      setGeneralSettings({ ...generalSettings, supportEmail: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === "notifications" && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
                <button
                  onClick={() => handleReset("notifications")}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Defaults
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-500">Receive notifications via email</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailNotifications}
                    onChange={(e) => {
                      setNotificationSettings({
                        ...notificationSettings,
                        emailNotifications: e.target.checked,
                      });
                      setHasUnsavedChanges(true);
                    }}
                    className="h-4 w-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="border-l-2 border-indigo-200 pl-6 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Notification Triggers
                  </h4>

                  {[
                    {
                      key: "newTraderRegistration" as keyof NotificationSettings,
                      label: "New Trader Registration",
                    },
                    {
                      key: "payoutSubmitted" as keyof NotificationSettings,
                      label: "Payout Request Submitted",
                    },
                    { key: "kycPending" as keyof NotificationSettings, label: "KYC Submission Pending" },
                    {
                      key: "riskAlertHighCritical" as keyof NotificationSettings,
                      label: "Risk Alert (High/Critical Only)",
                    },
                    {
                      key: "fraudAlertCreated" as keyof NotificationSettings,
                      label: "Fraud Alert Created",
                    },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <label className="text-sm text-gray-700">{item.label}</label>
                      <input
                        type="checkbox"
                        checked={notificationSettings[item.key] as boolean}
                        onChange={(e) => {
                          setNotificationSettings({
                            ...notificationSettings,
                            [item.key]: e.target.checked,
                          });
                          setHasUnsavedChanges(true);
                        }}
                        className="h-4 w-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Digest Mode
                  </label>
                  <select
                    value={notificationSettings.digestMode}
                    onChange={(e) => {
                      setNotificationSettings({
                        ...notificationSettings,
                        digestMode: e.target.value as "realtime" | "daily",
                      });
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="realtime">Real-time</option>
                    <option value="daily">Daily Summary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Slack className="h-4 w-4 inline mr-2" />
                    Slack Webhook URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={notificationSettings.slackWebhookUrl}
                    onChange={(e) => {
                      setNotificationSettings({
                        ...notificationSettings,
                        slackWebhookUrl: e.target.value,
                      });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Risk Management Settings */}
          {activeTab === "risk" && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Risk Management</h3>
                <button
                  onClick={() => handleReset("risk")}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Defaults
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Threshold: {riskSettings.alertThreshold}%
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Alert when trader is within this percentage of drawdown limit
                  </p>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={riskSettings.alertThreshold}
                    onChange={(e) => {
                      setRiskSettings({
                        ...riskSettings,
                        alertThreshold: parseInt(e.target.value),
                      });
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div>
                    <p className="font-medium text-gray-900">Auto-freeze on Breach</p>
                    <p className="text-sm text-gray-600">
                      Automatically freeze accounts that breach limits
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={riskSettings.autoFreezeOnBreach}
                    onChange={(e) => {
                      setRiskSettings({
                        ...riskSettings,
                        autoFreezeOnBreach: e.target.checked,
                      });
                      setHasUnsavedChanges(true);
                    }}
                    className="h-4 w-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    High-Risk Threshold
                  </label>
                  <input
                    type="number"
                    value={riskSettings.highRiskThreshold}
                    onChange={(e) => {
                      setRiskSettings({
                        ...riskSettings,
                        highRiskThreshold: parseInt(e.target.value),
                      });
                      setHasUnsavedChanges(true);
                    }}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Risk score above this value is considered high-risk
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Breach Grace Period
                  </label>
                  <input
                    type="number"
                    value={riskSettings.breachGracePeriod}
                    onChange={(e) => {
                      setRiskSettings({
                        ...riskSettings,
                        breachGracePeriod: parseInt(e.target.value),
                      });
                      setHasUnsavedChanges(true);
                    }}
                    min="0"
                    max="10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of violations allowed before auto-freeze
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* User Management */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Admin Users</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <Users className="h-4 w-4" />
                  Add Admin
                </button>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {adminUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded uppercase">
                            {user.role.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(user.lastLogin).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={cn(
                              "px-2 py-1 text-xs font-medium rounded",
                              user.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            )}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button className="text-indigo-600 hover:text-indigo-700 font-medium">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
