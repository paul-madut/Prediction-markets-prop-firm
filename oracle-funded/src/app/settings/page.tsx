"use client";

import React from "react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account preferences</p>
      </div>

      {/* Settings Sections */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Account Settings
        </h2>
        <p className="text-gray-600">
          Settings page coming soon. This is a placeholder for future account
          management features.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Notifications
        </h2>
        <p className="text-gray-600">
          Configure how and when you receive notifications about your trades and
          account status.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Trading Preferences
        </h2>
        <p className="text-gray-600">
          Customize your trading experience with default stake amounts, quick
          trade options, and more.
        </p>
      </div>
    </div>
  );
}
