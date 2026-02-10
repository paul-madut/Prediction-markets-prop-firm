"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import {
  AdminContextType,
  AdminUser,
  AdminTraderView,
  AdminChallengeConfig,
  RiskAlert,
  AggregatedExposure,
  BreachRecord,
  PayoutRequest,
  RevenueRecord,
  RefundRequest,
  KYCSubmission,
  FraudAlert,
  AuditLogEntry,
  AdminDashboardStats,
  TraderFilters,
} from "@/types/admin";
import { mockTraders } from "@/data/mockTraders";
import { mockPayouts, mockRefundRequests, mockRevenueData } from "@/data/mockPayouts";
import { mockRiskAlerts, mockBreachHistory, mockAggregatedExposure } from "@/data/mockRiskAlerts";
import { mockKYCQueue, mockFraudAlerts } from "@/data/mockKYCQueue";
import { mockAuditLogs, mockDashboardStats } from "@/data/mockAuditLogs";

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Notification callback type
type NotificationCallback = (notification: {
  type: "info" | "warning" | "success" | "error";
  message: string;
  actionUrl?: string;
}) => void;

let notificationCallback: NotificationCallback | null = null;

export function setNotificationCallback(callback: NotificationCallback) {
  notificationCallback = callback;
}

// Mock admin user
const mockAdminUser: AdminUser = {
  adminId: "admin_001",
  email: "admin@oraclefunded.com",
  name: "John Admin",
  role: "super_admin",
  permissions: [
    "traders:read",
    "traders:write",
    "traders:freeze",
    "challenges:read",
    "challenges:write",
    "payouts:read",
    "payouts:approve",
    "risk:read",
    "risk:alert",
    "compliance:read",
    "compliance:approve",
    "audit:read",
    "settings:read",
    "settings:write",
  ],
  lastLogin: new Date().toISOString(),
  avatar: "",
};

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  // Admin user state
  const [adminUser] = useState<AdminUser | null>(mockAdminUser);
  const [isAuthenticated] = useState(true); // Mock auth for MVP

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState<AdminDashboardStats>(mockDashboardStats);

  // Traders state
  const [traders, setTraders] = useState<AdminTraderView[]>(mockTraders);

  // Challenge configs (derived from existing mockPlans for now)
  const [challengeConfigs, setChallengeConfigs] = useState<AdminChallengeConfig[]>([
    {
      configId: "config_blitz_10k",
      name: "Blitz $10,000",
      description: "Fast-paced single phase evaluation",
      challengeTypeId: "blitz",
      basePrice: 4800,
      accountSize: 1000000,
      profitTargetPercent: 10,
      dailyLossLimitPercent: 4,
      maxDrawdownPercent: 8,
      drawdownType: "realtime",
      minTradingDays: 5,
      isEnabled: true,
      isPromotion: false,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
      createdBy: "admin_001",
    },
    {
      configId: "config_blitz_25k",
      name: "Blitz $25,000",
      description: "Fast-paced single phase evaluation",
      challengeTypeId: "blitz",
      basePrice: 9600,
      accountSize: 2500000,
      profitTargetPercent: 10,
      dailyLossLimitPercent: 4,
      maxDrawdownPercent: 8,
      drawdownType: "realtime",
      minTradingDays: 5,
      isEnabled: true,
      isPromotion: false,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
      createdBy: "admin_001",
    },
    {
      configId: "config_2step_50k",
      name: "2-Step $50,000",
      description: "Standard two-phase evaluation",
      challengeTypeId: "2step",
      basePrice: 4000,
      accountSize: 5000000,
      profitTargetPercent: 8,
      dailyLossLimitPercent: 5,
      maxDrawdownPercent: 10,
      drawdownType: "EOD",
      minTradingDays: 10,
      isEnabled: true,
      isPromotion: false,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
      createdBy: "admin_001",
    },
    {
      configId: "config_2step_100k",
      name: "2-Step $100,000",
      description: "Standard two-phase evaluation",
      challengeTypeId: "2step",
      basePrice: 6400,
      discountedPrice: 5120,
      discountExpiresAt: "2026-02-28T23:59:59Z",
      accountSize: 10000000,
      profitTargetPercent: 8,
      dailyLossLimitPercent: 5,
      maxDrawdownPercent: 10,
      drawdownType: "EOD",
      minTradingDays: 10,
      isEnabled: true,
      isPromotion: true,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2026-01-15T00:00:00Z",
      createdBy: "admin_001",
    },
    {
      configId: "config_3step_200k",
      name: "3-Step $200,000",
      description: "Extended three-phase evaluation",
      challengeTypeId: "3step",
      basePrice: 9600,
      accountSize: 20000000,
      profitTargetPercent: 6,
      dailyLossLimitPercent: 5,
      maxDrawdownPercent: 10,
      drawdownType: "EOD",
      minTradingDays: 15,
      isEnabled: true,
      isPromotion: false,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
      createdBy: "admin_001",
    },
  ]);

  // Risk state
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>(mockRiskAlerts);
  const [aggregatedExposure] = useState<AggregatedExposure>(mockAggregatedExposure);
  const [breachHistory] = useState<BreachRecord[]>(mockBreachHistory);

  // Financials state
  const [payoutQueue, setPayoutQueue] = useState<PayoutRequest[]>(mockPayouts);
  const [revenueData] = useState<RevenueRecord[]>(mockRevenueData);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>(mockRefundRequests);

  // Compliance state
  const [kycQueue, setKycQueue] = useState<KYCSubmission[]>(mockKYCQueue);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>(mockFraudAlerts);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(mockAuditLogs);

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Helper to add audit log
  const addAuditLog = useCallback((
    action: string,
    resource: string,
    resourceId: string,
    details: Record<string, unknown>
  ) => {
    const newLog: AuditLogEntry = {
      logId: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: adminUser?.adminId || "unknown",
      actorName: adminUser?.name || "Unknown",
      actorRole: adminUser?.role || "unknown",
      action,
      resource,
      resourceId,
      details,
      ipAddress: "192.168.1.100", // Mock IP
      outcome: "success",
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  }, [adminUser]);

  // ==================== TRADER FUNCTIONS ====================

  const getTraderById = useCallback((traderId: string): AdminTraderView | undefined => {
    return traders.find((t) => t.userId === traderId);
  }, [traders]);

  const searchTraders = useCallback((query: string, filters?: TraderFilters): AdminTraderView[] => {
    let result = traders;

    // Text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(
        (t) =>
          t.username.toLowerCase().includes(lowerQuery) ||
          t.email.toLowerCase().includes(lowerQuery) ||
          t.userId.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply filters
    if (filters) {
      if (filters.status) {
        result = result.filter((t) => t.accountStatus === filters.status);
      }
      if (filters.kycStatus) {
        result = result.filter((t) => t.kycStatus === filters.kycStatus);
      }
      if (filters.accountPhase) {
        result = result.filter((t) => t.accountPhase === filters.accountPhase);
      }
      if (filters.riskLevel) {
        result = result.filter((t) => {
          if (filters.riskLevel === "low") return t.riskScore <= 33;
          if (filters.riskLevel === "medium") return t.riskScore > 33 && t.riskScore <= 66;
          return t.riskScore > 66;
        });
      }
    }

    return result;
  }, [traders]);

  const freezeTrader = useCallback((traderId: string, reason: string) => {
    setTraders((prev) =>
      prev.map((t) =>
        t.userId === traderId
          ? {
              ...t,
              accountStatus: "frozen" as const,
              freezeReason: reason,
              frozenAt: new Date().toISOString(),
              frozenBy: adminUser?.adminId,
            }
          : t
      )
    );

    // Update stats
    setDashboardStats((prev) => ({
      ...prev,
      frozenTraders: prev.frozenTraders + 1,
      activeTraders: prev.activeTraders - 1,
    }));

    addAuditLog("trader.freeze", "trader", traderId, { reason });
  }, [adminUser, addAuditLog]);

  const unfreezeTrader = useCallback((traderId: string) => {
    setTraders((prev) =>
      prev.map((t) =>
        t.userId === traderId
          ? {
              ...t,
              accountStatus: "active" as const,
              freezeReason: undefined,
              frozenAt: undefined,
              frozenBy: undefined,
            }
          : t
      )
    );

    // Update stats
    setDashboardStats((prev) => ({
      ...prev,
      frozenTraders: prev.frozenTraders - 1,
      activeTraders: prev.activeTraders + 1,
    }));

    addAuditLog("trader.unfreeze", "trader", traderId, {});
  }, [addAuditLog]);

  const resetTraderAccount = useCallback((traderId: string) => {
    const trader = traders.find((t) => t.userId === traderId);
    if (!trader) return;

    setTraders((prev) =>
      prev.map((t) =>
        t.userId === traderId
          ? {
              ...t,
              accountBalance: t.startingBalance,
              currentProfit: 0,
              currentDailyDrawdown: 0,
              currentMaxDrawdown: 0,
              peakBalance: t.startingBalance,
              tradingDaysCompleted: 0,
              status: "active" as const,
            }
          : t
      )
    );

    addAuditLog("trader.reset", "trader", traderId, {
      previousBalance: trader.accountBalance,
      newBalance: trader.startingBalance,
    });
  }, [traders, addAuditLog]);

  // Batch trader operations
  const freezeTraders = useCallback((traderIds: string[], reason: string) => {
    setTraders((prev) =>
      prev.map((t) =>
        traderIds.includes(t.userId)
          ? {
              ...t,
              accountStatus: "frozen" as const,
              freezeReason: reason,
              frozenAt: new Date().toISOString(),
              frozenBy: adminUser?.adminId,
            }
          : t
      )
    );

    const frozenCount = traderIds.length;
    setDashboardStats((prev) => ({
      ...prev,
      frozenTraders: prev.frozenTraders + frozenCount,
      activeTraders: Math.max(0, prev.activeTraders - frozenCount),
    }));

    traderIds.forEach((traderId) => {
      addAuditLog("trader.freeze", "trader", traderId, { reason, batch: true });
    });
  }, [adminUser, addAuditLog]);

  const unfreezeTraders = useCallback((traderIds: string[]) => {
    setTraders((prev) =>
      prev.map((t) =>
        traderIds.includes(t.userId)
          ? {
              ...t,
              accountStatus: "active" as const,
              freezeReason: undefined,
              frozenAt: undefined,
              frozenBy: undefined,
            }
          : t
      )
    );

    const unfrozenCount = traderIds.length;
    setDashboardStats((prev) => ({
      ...prev,
      frozenTraders: Math.max(0, prev.frozenTraders - unfrozenCount),
      activeTraders: prev.activeTraders + unfrozenCount,
    }));

    traderIds.forEach((traderId) => {
      addAuditLog("trader.unfreeze", "trader", traderId, { batch: true });
    });
  }, [addAuditLog]);

  // ==================== CHALLENGE CONFIG FUNCTIONS ====================

  const createChallengeConfig = useCallback((
    config: Omit<AdminChallengeConfig, "configId" | "createdAt" | "updatedAt">
  ) => {
    const newConfig: AdminChallengeConfig = {
      ...config,
      configId: `config_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setChallengeConfigs((prev) => [...prev, newConfig]);
    addAuditLog("challenge.create", "challenge_config", newConfig.configId, { name: config.name });
  }, [addAuditLog]);

  const updateChallengeConfig = useCallback((
    configId: string,
    updates: Partial<AdminChallengeConfig>
  ) => {
    setChallengeConfigs((prev) =>
      prev.map((c) =>
        c.configId === configId
          ? { ...c, ...updates, updatedAt: new Date().toISOString() }
          : c
      )
    );
    addAuditLog("challenge.update", "challenge_config", configId, updates);
  }, [addAuditLog]);

  const toggleChallengeStatus = useCallback((configId: string, enabled: boolean) => {
    setChallengeConfigs((prev) =>
      prev.map((c) =>
        c.configId === configId
          ? { ...c, isEnabled: enabled, updatedAt: new Date().toISOString() }
          : c
      )
    );
    addAuditLog("challenge.toggle", "challenge_config", configId, { enabled });
  }, [addAuditLog]);

  // ==================== RISK FUNCTIONS ====================

  const acknowledgeAlert = useCallback((alertId: string) => {
    setRiskAlerts((prev) =>
      prev.map((a) =>
        a.alertId === alertId
          ? {
              ...a,
              acknowledgedAt: new Date().toISOString(),
              acknowledgedBy: adminUser?.adminId,
            }
          : a
      )
    );

    setDashboardStats((prev) => ({
      ...prev,
      activeAlerts: Math.max(0, prev.activeAlerts - 1),
    }));

    addAuditLog("risk.acknowledge", "risk_alert", alertId, {});
  }, [adminUser, addAuditLog]);

  // ==================== FINANCIAL FUNCTIONS ====================

  const approvePayout = useCallback((payoutId: string) => {
    setPayoutQueue((prev) =>
      prev.map((p) =>
        p.payoutId === payoutId
          ? {
              ...p,
              status: "approved" as const,
              reviewedAt: new Date().toISOString(),
              reviewedBy: adminUser?.adminId,
            }
          : p
      )
    );

    const payout = payoutQueue.find((p) => p.payoutId === payoutId);
    setDashboardStats((prev) => ({
      ...prev,
      pendingPayouts: Math.max(0, prev.pendingPayouts - 1),
      pendingPayoutAmount: Math.max(0, prev.pendingPayoutAmount - (payout?.amount || 0)),
    }));

    addAuditLog("payout.approve", "payout", payoutId, {
      amount: payout?.amount,
      traderId: payout?.traderId,
    });

    // Send notification
    if (notificationCallback && payout) {
      notificationCallback({
        type: "success",
        message: `Payout approved for ${payout.traderName}`,
        actionUrl: "/admin/financials/payouts",
      });
    }
  }, [adminUser, payoutQueue, addAuditLog]);

  const rejectPayout = useCallback((payoutId: string, reason: string) => {
    setPayoutQueue((prev) =>
      prev.map((p) =>
        p.payoutId === payoutId
          ? {
              ...p,
              status: "rejected" as const,
              reviewedAt: new Date().toISOString(),
              reviewedBy: adminUser?.adminId,
              rejectionReason: reason,
            }
          : p
      )
    );

    const payout = payoutQueue.find((p) => p.payoutId === payoutId);
    setDashboardStats((prev) => ({
      ...prev,
      pendingPayouts: Math.max(0, prev.pendingPayouts - 1),
      pendingPayoutAmount: Math.max(0, prev.pendingPayoutAmount - (payout?.amount || 0)),
    }));

    addAuditLog("payout.reject", "payout", payoutId, { reason });
  }, [adminUser, payoutQueue, addAuditLog]);

  const processRefund = useCallback((refundId: string, approved: boolean) => {
    setRefundRequests((prev) =>
      prev.map((r) =>
        r.refundId === refundId
          ? {
              ...r,
              status: approved ? ("processed" as const) : ("rejected" as const),
              processedAt: new Date().toISOString(),
              processedBy: adminUser?.adminId,
            }
          : r
      )
    );

    addAuditLog(approved ? "refund.approve" : "refund.reject", "refund", refundId, {});
  }, [adminUser, addAuditLog]);

  // ==================== COMPLIANCE FUNCTIONS ====================

  const approveKYC = useCallback((submissionId: string) => {
    setKycQueue((prev) =>
      prev.map((k) =>
        k.submissionId === submissionId
          ? {
              ...k,
              status: "approved" as const,
              reviewedAt: new Date().toISOString(),
              reviewedBy: adminUser?.adminId,
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
            }
          : k
      )
    );

    // Update trader KYC status
    const kyc = kycQueue.find((k) => k.submissionId === submissionId);
    if (kyc) {
      setTraders((prev) =>
        prev.map((t) =>
          t.userId === kyc.traderId ? { ...t, kycStatus: "approved" as const } : t
        )
      );

      // Send notification
      if (notificationCallback) {
        notificationCallback({
          type: "success",
          message: `KYC approved for ${kyc.traderName}`,
          actionUrl: "/admin/compliance/kyc",
        });
      }
    }

    setDashboardStats((prev) => ({
      ...prev,
      pendingKYC: Math.max(0, prev.pendingKYC - 1),
    }));

    addAuditLog("kyc.approve", "kyc", submissionId, {});
  }, [adminUser, kycQueue, addAuditLog]);

  const rejectKYC = useCallback((submissionId: string, reason: string) => {
    setKycQueue((prev) =>
      prev.map((k) =>
        k.submissionId === submissionId
          ? {
              ...k,
              status: "rejected" as const,
              reviewedAt: new Date().toISOString(),
              reviewedBy: adminUser?.adminId,
              rejectionReason: reason,
            }
          : k
      )
    );

    // Update trader KYC status
    const kyc = kycQueue.find((k) => k.submissionId === submissionId);
    if (kyc) {
      setTraders((prev) =>
        prev.map((t) =>
          t.userId === kyc.traderId ? { ...t, kycStatus: "rejected" as const } : t
        )
      );
    }

    setDashboardStats((prev) => ({
      ...prev,
      pendingKYC: Math.max(0, prev.pendingKYC - 1),
    }));

    addAuditLog("kyc.reject", "kyc", submissionId, { reason });
  }, [adminUser, kycQueue, addAuditLog]);

  const updateFraudAlert = useCallback((
    alertId: string,
    updates: Partial<FraudAlert>
  ) => {
    setFraudAlerts((prev) =>
      prev.map((a) => (a.alertId === alertId ? { ...a, ...updates } : a))
    );

    if (updates.status === "resolved" || updates.status === "dismissed") {
      setDashboardStats((prev) => ({
        ...prev,
        openFraudAlerts: Math.max(0, prev.openFraudAlerts - 1),
      }));
    }

    addAuditLog("fraud.update", "fraud_alert", alertId, updates);
  }, [addAuditLog]);

  // ==================== CONTEXT VALUE ====================

  const value: AdminContextType = {
    // Admin user
    adminUser,
    isAuthenticated,

    // Dashboard stats
    dashboardStats,

    // Traders
    traders,
    getTraderById,
    searchTraders,
    freezeTrader,
    unfreezeTrader,
    resetTraderAccount,
    freezeTraders,
    unfreezeTraders,

    // Challenge configurations
    challengeConfigs,
    createChallengeConfig,
    updateChallengeConfig,
    toggleChallengeStatus,

    // Risk
    riskAlerts,
    aggregatedExposure,
    breachHistory,
    acknowledgeAlert,

    // Financials
    payoutQueue,
    approvePayout,
    rejectPayout,
    revenueData,
    refundRequests,
    processRefund,

    // Compliance
    kycQueue,
    approveKYC,
    rejectKYC,
    fraudAlerts,
    updateFraudAlert,

    // Audit
    auditLogs,

    // Loading
    isLoading,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};
