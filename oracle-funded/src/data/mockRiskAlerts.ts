import { RiskAlert, BreachRecord, AggregatedExposure } from '@/types/admin';

export const mockRiskAlerts: RiskAlert[] = [
  {
    alertId: 'alert_001',
    traderId: 'trader_003',
    traderName: 'Michael Chen',
    traderEmail: 'mchen@email.com',
    accountId: 'acc_003',
    alertType: 'approaching_max_drawdown',
    severity: 'critical',
    currentValue: 8.8,
    thresholdValue: 10,
    percentageUsed: 88,
    message: 'Account is at 88% of maximum drawdown limit',
    createdAt: '2026-01-24T08:30:00Z',
    resolved: false,
  },
  {
    alertId: 'alert_002',
    traderId: 'trader_005',
    traderName: 'James Wilson',
    traderEmail: 'jwilson@email.com',
    accountId: 'acc_005',
    alertType: 'approaching_daily_limit',
    severity: 'high',
    currentValue: 4.8,
    thresholdValue: 5,
    percentageUsed: 96,
    message: 'Daily drawdown at 96% of limit',
    createdAt: '2026-01-24T07:45:00Z',
    resolved: false,
  },
  {
    alertId: 'alert_003',
    traderId: 'trader_010',
    traderName: 'Amanda Taylor',
    traderEmail: 'ataylor@email.com',
    accountId: 'acc_010',
    alertType: 'unusual_activity',
    severity: 'high',
    currentValue: 0,
    thresholdValue: 0,
    percentageUsed: 0,
    message: 'Unusual trading pattern detected: 15 trades in 5 minutes',
    createdAt: '2026-01-23T17:50:00Z',
    acknowledgedAt: '2026-01-23T18:00:00Z',
    acknowledgedBy: 'admin_001',
    resolved: false,
  },
  {
    alertId: 'alert_004',
    traderId: 'trader_009',
    traderName: 'David Lee',
    traderEmail: 'dlee@email.com',
    accountId: 'acc_009',
    alertType: 'large_position',
    severity: 'medium',
    currentValue: 45,
    thresholdValue: 50,
    percentageUsed: 90,
    message: 'Single position represents 45% of account balance',
    createdAt: '2026-01-24T10:15:00Z',
    resolved: false,
  },
  {
    alertId: 'alert_005',
    traderId: 'trader_002',
    traderName: 'Sarah Mitchell',
    traderEmail: 'sarah.m@email.com',
    accountId: 'acc_002',
    alertType: 'approaching_daily_limit',
    severity: 'low',
    currentValue: 3.5,
    thresholdValue: 5,
    percentageUsed: 70,
    message: 'Daily drawdown approaching limit (70%)',
    createdAt: '2026-01-24T11:00:00Z',
    resolved: false,
  },
  {
    alertId: 'alert_006',
    traderId: 'trader_006',
    traderName: 'Lisa Anderson',
    traderEmail: 'lisa.a@email.com',
    accountId: 'acc_006',
    alertType: 'breach',
    severity: 'critical',
    currentValue: 10.5,
    thresholdValue: 10,
    percentageUsed: 105,
    message: 'Maximum drawdown limit breached - account failed',
    createdAt: '2026-01-22T14:15:00Z',
    acknowledgedAt: '2026-01-22T14:20:00Z',
    acknowledgedBy: 'system',
    resolved: true,
    resolvedAt: '2026-01-22T14:20:00Z',
  },
];

export const mockBreachHistory: BreachRecord[] = [
  {
    breachId: 'breach_001',
    traderId: 'trader_006',
    traderName: 'Lisa Anderson',
    accountId: 'acc_006',
    breachType: 'max_drawdown',
    breachValue: 10.5,
    limitValue: 10,
    breachDate: '2026-01-22T14:15:00Z',
    accountPhaseAtBreach: 'evaluation_1',
    accountBalanceAtBreach: 2237500,
    consequenceApplied: 'account_failed',
  },
  {
    breachId: 'breach_002',
    traderId: 'trader_003',
    traderName: 'Michael Chen',
    accountId: 'acc_003_prev',
    breachType: 'daily_drawdown',
    breachValue: 5.2,
    limitValue: 5,
    breachDate: '2026-01-05T16:30:00Z',
    accountPhaseAtBreach: 'evaluation_1',
    accountBalanceAtBreach: 2370000,
    consequenceApplied: 'account_failed',
  },
  {
    breachId: 'breach_003',
    traderId: 'trader_003',
    traderName: 'Michael Chen',
    accountId: 'acc_003_prev2',
    breachType: 'max_drawdown',
    breachValue: 11.2,
    limitValue: 10,
    breachDate: '2025-12-18T11:00:00Z',
    accountPhaseAtBreach: 'evaluation_1',
    accountBalanceAtBreach: 2220000,
    consequenceApplied: 'account_failed',
  },
  {
    breachId: 'breach_004',
    traderId: 'trader_010',
    traderName: 'Amanda Taylor',
    accountId: 'acc_010_eval',
    breachType: 'rule_violation',
    breachValue: 0,
    limitValue: 0,
    breachDate: '2025-11-15T09:45:00Z',
    accountPhaseAtBreach: 'evaluation_2',
    accountBalanceAtBreach: 5120000,
    consequenceApplied: 'warning',
  },
];

export const mockAggregatedExposure: AggregatedExposure = {
  totalAccounts: 12,
  totalExposure: 8500000, // $85,000
  byCategory: [
    { category: 'Politics', exposure: 3200000, accountCount: 8 },
    { category: 'Crypto', exposure: 2100000, accountCount: 6 },
    { category: 'Sports', exposure: 1500000, accountCount: 5 },
    { category: 'Economics', exposure: 1200000, accountCount: 4 },
    { category: 'Entertainment', exposure: 500000, accountCount: 3 },
  ],
  byRiskLevel: [
    { level: 'low', accountCount: 6, exposure: 2500000 },
    { level: 'medium', accountCount: 4, exposure: 3500000 },
    { level: 'high', accountCount: 2, exposure: 2500000 },
  ],
};

// Helper functions
export const getActiveAlerts = () => {
  return mockRiskAlerts.filter((alert) => !alert.resolved);
};

export const getAlertsBySeverity = (severity: RiskAlert['severity']) => {
  return mockRiskAlerts.filter((alert) => alert.severity === severity && !alert.resolved);
};

export const getCriticalAlerts = () => {
  return mockRiskAlerts.filter(
    (alert) => (alert.severity === 'critical' || alert.severity === 'high') && !alert.resolved
  );
};

export const getRecentBreaches = (days: number = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return mockBreachHistory.filter(
    (breach) => new Date(breach.breachDate) >= cutoffDate
  );
};
