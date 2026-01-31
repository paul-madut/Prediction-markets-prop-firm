// Admin Dashboard TypeScript Interfaces
// All monetary values are in cents to match existing codebase

import { UserAccount, Trade, Position, ChallengePlan, ChallengeType } from './index';

// ============================================
// ADMIN USER & AUTHENTICATION
// ============================================

export interface AdminUser {
  adminId: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'support' | 'compliance';
  permissions: AdminPermission[];
  lastLogin: string;
  avatar?: string;
}

export type AdminPermission =
  | 'traders:read' | 'traders:write' | 'traders:freeze'
  | 'challenges:read' | 'challenges:write'
  | 'payouts:read' | 'payouts:approve'
  | 'risk:read' | 'risk:alert'
  | 'compliance:read' | 'compliance:approve'
  | 'audit:read'
  | 'settings:read' | 'settings:write';

// ============================================
// TRADER MANAGEMENT (Extended UserAccount)
// ============================================

export interface AdminTraderView extends UserAccount {
  // Additional admin-visible fields
  createdAt: string;
  lastActiveAt: string;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'expired';
  accountStatus: 'active' | 'frozen' | 'suspended' | 'closed';
  freezeReason?: string;
  frozenAt?: string;
  frozenBy?: string;
  totalPaidOut: number;          // cents
  totalFeesPaid: number;         // cents
  challengesPurchased: number;
  challengesPassed: number;
  challengesFailed: number;
  riskScore: number;             // 0-100
  notes: AdminNote[];
  tags: string[];
  // Include trades and positions for detail view
  trades?: Trade[];
  positions?: Position[];
}

export interface AdminNote {
  noteId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  type: 'general' | 'warning' | 'compliance' | 'support';
}

export interface TraderAction {
  actionId: string;
  traderId: string;
  action: 'freeze' | 'unfreeze' | 'reset' | 'suspend' | 'close' | 'message' | 'refund';
  performedBy: string;
  performedAt: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// CHALLENGE CONFIGURATION
// ============================================

export interface AdminChallengeConfig {
  configId: string;
  name: string;
  description: string;
  challengeTypeId: 'blitz' | '2step' | '3step';

  // Pricing
  basePrice: number;              // cents
  discountedPrice?: number;       // cents (promotional)
  discountExpiresAt?: string;

  // Targets and limits
  accountSize: number;            // cents
  profitTargetPercent: number;
  dailyLossLimitPercent: number;
  maxDrawdownPercent: number;
  drawdownType: 'EOD' | 'realtime' | 'trailing';

  // Requirements
  minTradingDays: number;
  maxTradingDays?: number;        // optional deadline

  // Status
  isEnabled: boolean;
  isPromotion: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================
// RISK MANAGEMENT
// ============================================

export interface RiskAlert {
  alertId: string;
  traderId: string;
  traderName: string;
  traderEmail: string;
  accountId: string;

  alertType: 'approaching_daily_limit' | 'approaching_max_drawdown' |
             'unusual_activity' | 'large_position' | 'breach';
  severity: 'low' | 'medium' | 'high' | 'critical';

  currentValue: number;           // Current drawdown/exposure percentage
  thresholdValue: number;         // Limit value percentage
  percentageUsed: number;         // 0-100

  message: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface AggregatedExposure {
  totalAccounts: number;
  totalExposure: number;          // cents
  byCategory: {
    category: string;
    exposure: number;             // cents
    accountCount: number;
  }[];
  byRiskLevel: {
    level: 'low' | 'medium' | 'high';
    accountCount: number;
    exposure: number;
  }[];
}

export interface BreachRecord {
  breachId: string;
  traderId: string;
  traderName: string;
  accountId: string;
  breachType: 'daily_drawdown' | 'max_drawdown' | 'rule_violation';
  breachValue: number;
  limitValue: number;
  breachDate: string;
  accountPhaseAtBreach: string;
  accountBalanceAtBreach: number;
  consequenceApplied: 'account_failed' | 'warning' | 'none';
}

// ============================================
// FINANCIAL OPERATIONS
// ============================================

export interface PayoutRequest {
  payoutId: string;
  traderId: string;
  traderName: string;
  traderEmail: string;

  amount: number;                 // cents
  currency: 'USD';
  paymentMethod: 'bank_transfer' | 'crypto' | 'paypal' | 'wire';
  paymentDetails: Record<string, string>;  // Bank account, wallet address, etc.

  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'failed';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  processedAt?: string;
  rejectionReason?: string;

  // For profit split calculation
  grossProfit: number;            // cents
  firmShare: number;              // cents
  traderShare: number;            // cents (payout amount)
  processingFee: number;          // cents
}

export interface RevenueRecord {
  recordId: string;
  date: string;

  // Revenue sources
  challengeFees: number;          // cents
  profitShare: number;            // cents (firm's share)
  resetFees: number;              // cents

  // Costs
  payoutsProcessed: number;       // cents
  refundsIssued: number;          // cents
  processingFees: number;         // cents

  // Net
  netRevenue: number;             // cents
}

export interface RefundRequest {
  refundId: string;
  traderId: string;
  traderName: string;
  originalTransactionId: string;
  amount: number;                 // cents
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
}

// ============================================
// COMPLIANCE & KYC
// ============================================

export interface KYCSubmission {
  submissionId: string;
  traderId: string;
  traderName: string;
  traderEmail: string;

  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  expiresAt?: string;

  documents: KYCDocument[];
  rejectionReason?: string;
  notes?: string;

  // Personal info
  fullName: string;
  dateOfBirth: string;
  country: string;
  address: string;
}

export interface KYCDocument {
  documentId: string;
  type: 'id_front' | 'id_back' | 'passport' | 'proof_of_address' | 'selfie';
  fileName: string;
  fileUrl: string;                // Mock URL for demo
  uploadedAt: string;
  verified: boolean;
}

export interface FraudAlert {
  alertId: string;
  traderId: string;
  traderName: string;
  traderEmail: string;

  alertType: 'duplicate_account' | 'suspicious_ip' | 'pattern_trading' |
             'identity_mismatch' | 'chargeback' | 'payment_fraud';
  severity: 'low' | 'medium' | 'high' | 'critical';

  description: string;
  evidence: string[];

  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: string;
  assignedTo?: string;
  resolvedAt?: string;
  resolution?: string;
}

// ============================================
// AUDIT LOGGING
// ============================================

export interface AuditLogEntry {
  logId: string;
  timestamp: string;

  actorId: string;
  actorName: string;
  actorRole: string;

  action: string;                 // e.g., 'trader.freeze', 'payout.approve'
  resource: string;               // e.g., 'trader', 'payout', 'challenge'
  resourceId: string;

  details: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;

  outcome: 'success' | 'failure';
  failureReason?: string;
}

// ============================================
// DASHBOARD STATS
// ============================================

export interface AdminDashboardStats {
  // Traders
  totalTraders: number;
  activeTraders: number;
  frozenTraders: number;
  newTradersToday: number;

  // Challenges
  activeChallenges: number;
  passedToday: number;
  failedToday: number;

  // Financial
  revenueToday: number;           // cents
  revenueThisMonth: number;       // cents
  pendingPayouts: number;
  pendingPayoutAmount: number;    // cents

  // Risk
  highRiskAccounts: number;
  activeAlerts: number;
  breachesToday: number;

  // Compliance
  pendingKYC: number;
  openFraudAlerts: number;
}

// ============================================
// ADMIN CONTEXT TYPE
// ============================================

export interface AdminContextType {
  // Admin user
  adminUser: AdminUser | null;
  isAuthenticated: boolean;

  // Dashboard stats
  dashboardStats: AdminDashboardStats;

  // Traders
  traders: AdminTraderView[];
  getTraderById: (traderId: string) => AdminTraderView | undefined;
  searchTraders: (query: string, filters?: TraderFilters) => AdminTraderView[];
  freezeTrader: (traderId: string, reason: string) => void;
  unfreezeTrader: (traderId: string) => void;
  resetTraderAccount: (traderId: string) => void;

  // Challenge configurations
  challengeConfigs: AdminChallengeConfig[];
  createChallengeConfig: (config: Omit<AdminChallengeConfig, 'configId' | 'createdAt' | 'updatedAt'>) => void;
  updateChallengeConfig: (configId: string, updates: Partial<AdminChallengeConfig>) => void;
  toggleChallengeStatus: (configId: string, enabled: boolean) => void;

  // Risk
  riskAlerts: RiskAlert[];
  aggregatedExposure: AggregatedExposure;
  breachHistory: BreachRecord[];
  acknowledgeAlert: (alertId: string) => void;

  // Financials
  payoutQueue: PayoutRequest[];
  approvePayout: (payoutId: string) => void;
  rejectPayout: (payoutId: string, reason: string) => void;
  revenueData: RevenueRecord[];
  refundRequests: RefundRequest[];
  processRefund: (refundId: string, approved: boolean) => void;

  // Compliance
  kycQueue: KYCSubmission[];
  approveKYC: (submissionId: string) => void;
  rejectKYC: (submissionId: string, reason: string) => void;
  fraudAlerts: FraudAlert[];
  updateFraudAlert: (alertId: string, updates: Partial<FraudAlert>) => void;

  // Audit
  auditLogs: AuditLogEntry[];

  // Loading states
  isLoading: boolean;
}

// ============================================
// FILTER TYPES
// ============================================

export interface TraderFilters {
  status?: 'active' | 'frozen' | 'suspended' | 'closed';
  kycStatus?: 'pending' | 'approved' | 'rejected' | 'expired';
  accountPhase?: 'evaluation_1' | 'evaluation_2' | 'funded';
  riskLevel?: 'low' | 'medium' | 'high';
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface PayoutFilters {
  status?: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  paymentMethod?: 'bank_transfer' | 'crypto' | 'paypal' | 'wire';
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface AuditLogFilters {
  actorId?: string;
  action?: string;
  resource?: string;
  outcome?: 'success' | 'failure';
  dateRange?: {
    start: string;
    end: string;
  };
}
