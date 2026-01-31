import { AuditLogEntry, AdminDashboardStats } from '@/types/admin';

export const mockAuditLogs: AuditLogEntry[] = [
  {
    logId: 'log_001',
    timestamp: '2026-01-24T11:30:00Z',
    actorId: 'admin_001',
    actorName: 'John Admin',
    actorRole: 'super_admin',
    action: 'payout.view',
    resource: 'payout',
    resourceId: 'payout_001',
    details: { payoutAmount: 225000, traderId: 'trader_001' },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    outcome: 'success',
  },
  {
    logId: 'log_002',
    timestamp: '2026-01-24T10:45:00Z',
    actorId: 'admin_002',
    actorName: 'Sarah Compliance',
    actorRole: 'compliance',
    action: 'kyc.review_start',
    resource: 'kyc',
    resourceId: 'kyc_005',
    details: { traderId: 'trader_new_001', traderName: 'Mark Johnson' },
    ipAddress: '192.168.1.101',
    outcome: 'success',
  },
  {
    logId: 'log_003',
    timestamp: '2026-01-24T09:30:00Z',
    actorId: 'admin_001',
    actorName: 'John Admin',
    actorRole: 'super_admin',
    action: 'risk.alert_acknowledge',
    resource: 'risk_alert',
    resourceId: 'alert_003',
    details: { alertType: 'unusual_activity', traderId: 'trader_010' },
    ipAddress: '192.168.1.100',
    outcome: 'success',
  },
  {
    logId: 'log_004',
    timestamp: '2026-01-23T18:00:00Z',
    actorId: 'admin_001',
    actorName: 'John Admin',
    actorRole: 'super_admin',
    action: 'trader.freeze',
    resource: 'trader',
    resourceId: 'trader_010',
    details: {
      reason: 'Unusual trading pattern detected - under review',
      traderName: 'Amanda Taylor',
    },
    ipAddress: '192.168.1.100',
    outcome: 'success',
  },
  {
    logId: 'log_005',
    timestamp: '2026-01-23T16:00:00Z',
    actorId: 'admin_001',
    actorName: 'John Admin',
    actorRole: 'super_admin',
    action: 'trader.add_note',
    resource: 'trader',
    resourceId: 'trader_003',
    details: {
      noteType: 'warning',
      content: 'Approaching max drawdown limit. Monitor closely.',
    },
    ipAddress: '192.168.1.100',
    outcome: 'success',
  },
  {
    logId: 'log_006',
    timestamp: '2026-01-23T14:30:00Z',
    actorId: 'admin_001',
    actorName: 'John Admin',
    actorRole: 'super_admin',
    action: 'refund.approve',
    resource: 'refund',
    resourceId: 'refund_002',
    details: { amount: 3200, traderId: 'trader_006', reason: 'Platform issue' },
    ipAddress: '192.168.1.100',
    outcome: 'success',
  },
  {
    logId: 'log_007',
    timestamp: '2026-01-22T14:20:00Z',
    actorId: 'system',
    actorName: 'System',
    actorRole: 'system',
    action: 'account.breach',
    resource: 'trader',
    resourceId: 'trader_006',
    details: {
      breachType: 'max_drawdown',
      breachValue: 10.5,
      limitValue: 10,
      consequence: 'account_failed',
    },
    ipAddress: '0.0.0.0',
    outcome: 'success',
  },
  {
    logId: 'log_008',
    timestamp: '2026-01-22T10:00:00Z',
    actorId: 'admin_002',
    actorName: 'Sarah Compliance',
    actorRole: 'compliance',
    action: 'kyc.reject',
    resource: 'kyc',
    resourceId: 'kyc_003',
    details: {
      traderId: 'trader_012',
      reason: 'ID document is expired',
    },
    ipAddress: '192.168.1.101',
    outcome: 'success',
  },
  {
    logId: 'log_009',
    timestamp: '2026-01-21T09:00:00Z',
    actorId: 'admin_001',
    actorName: 'John Admin',
    actorRole: 'super_admin',
    action: 'payout.approve',
    resource: 'payout',
    resourceId: 'payout_003',
    details: { amount: 160000, traderId: 'trader_004', paymentMethod: 'crypto' },
    ipAddress: '192.168.1.100',
    outcome: 'success',
  },
  {
    logId: 'log_010',
    timestamp: '2026-01-20T16:30:00Z',
    actorId: 'admin_001',
    actorName: 'John Admin',
    actorRole: 'super_admin',
    action: 'challenge.config_update',
    resource: 'challenge_config',
    resourceId: 'config_blitz_50k',
    details: {
      field: 'discountedPrice',
      oldValue: null,
      newValue: 3840,
      isPromotion: true,
    },
    ipAddress: '192.168.1.100',
    outcome: 'success',
  },
  {
    logId: 'log_011',
    timestamp: '2026-01-20T14:00:00Z',
    actorId: 'admin_002',
    actorName: 'Sarah Compliance',
    actorRole: 'compliance',
    action: 'fraud.assign',
    resource: 'fraud_alert',
    resourceId: 'fraud_001',
    details: { alertType: 'pattern_trading', traderId: 'trader_010' },
    ipAddress: '192.168.1.101',
    outcome: 'success',
  },
  {
    logId: 'log_012',
    timestamp: '2026-01-19T14:00:00Z',
    actorId: 'admin_002',
    actorName: 'Sarah Compliance',
    actorRole: 'compliance',
    action: 'payout.reject',
    resource: 'payout',
    resourceId: 'payout_005',
    details: {
      amount: 90000,
      traderId: 'trader_010',
      reason: 'Account under review for suspicious activity',
    },
    ipAddress: '192.168.1.101',
    outcome: 'success',
  },
  {
    logId: 'log_013',
    timestamp: '2026-01-19T10:00:00Z',
    actorId: 'admin_001',
    actorName: 'John Admin',
    actorRole: 'super_admin',
    action: 'admin.login',
    resource: 'session',
    resourceId: 'session_001',
    details: { method: 'password' },
    ipAddress: '192.168.1.100',
    outcome: 'success',
  },
  {
    logId: 'log_014',
    timestamp: '2026-01-18T11:00:00Z',
    actorId: 'admin_003',
    actorName: 'Mike Support',
    actorRole: 'support',
    action: 'trader.view',
    resource: 'trader',
    resourceId: 'trader_003',
    details: { viewType: 'detail' },
    ipAddress: '192.168.1.102',
    outcome: 'success',
  },
  {
    logId: 'log_015',
    timestamp: '2026-01-16T09:00:00Z',
    actorId: 'admin_002',
    actorName: 'Sarah Compliance',
    actorRole: 'compliance',
    action: 'refund.reject',
    resource: 'refund',
    resourceId: 'refund_003',
    details: {
      amount: 3200,
      traderId: 'trader_003',
      reason: 'Refund request does not meet criteria',
    },
    ipAddress: '192.168.1.101',
    outcome: 'success',
  },
];

// Dashboard stats computed from mock data
export const mockDashboardStats: AdminDashboardStats = {
  // Traders
  totalTraders: 12,
  activeTraders: 9,
  frozenTraders: 1,
  newTradersToday: 0,

  // Challenges
  activeChallenges: 9,
  passedToday: 0,
  failedToday: 0,

  // Financial (in cents)
  revenueToday: 179500, // $1,795
  revenueThisMonth: 927600, // $9,276
  pendingPayouts: 2,
  pendingPayoutAmount: 825000, // $8,250

  // Risk
  highRiskAccounts: 3,
  activeAlerts: 5,
  breachesToday: 0,

  // Compliance
  pendingKYC: 3,
  openFraudAlerts: 4,
};

// Helper functions
export const getRecentAuditLogs = (limit: number = 10) => {
  return mockAuditLogs.slice(0, limit);
};

export const getAuditLogsByActor = (actorId: string) => {
  return mockAuditLogs.filter((log) => log.actorId === actorId);
};

export const getAuditLogsByResource = (resource: string) => {
  return mockAuditLogs.filter((log) => log.resource === resource);
};

export const getAuditLogsByAction = (action: string) => {
  return mockAuditLogs.filter((log) => log.action.includes(action));
};

export const getAuditLogsInDateRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return mockAuditLogs.filter((log) => {
    const logDate = new Date(log.timestamp);
    return logDate >= start && logDate <= end;
  });
};
