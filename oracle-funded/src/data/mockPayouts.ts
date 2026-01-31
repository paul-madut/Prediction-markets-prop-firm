import { PayoutRequest, RefundRequest, RevenueRecord } from '@/types/admin';

export const mockPayouts: PayoutRequest[] = [
  {
    payoutId: 'payout_001',
    traderId: 'trader_001',
    traderName: 'Alex Thompson',
    traderEmail: 'alex.thompson@email.com',
    amount: 225000, // $2,250
    currency: 'USD',
    paymentMethod: 'bank_transfer',
    paymentDetails: {
      bankName: 'Chase Bank',
      accountLast4: '4521',
      routingNumber: '****1234',
    },
    status: 'pending',
    requestedAt: '2026-01-23T14:30:00Z',
    grossProfit: 450000, // $4,500
    firmShare: 225000, // $2,250 (50%)
    traderShare: 225000, // $2,250 (50%)
    processingFee: 2500, // $25
  },
  {
    payoutId: 'payout_002',
    traderId: 'trader_007',
    traderName: 'Robert Brown',
    traderEmail: 'rbrown@email.com',
    amount: 600000, // $6,000
    currency: 'USD',
    paymentMethod: 'wire',
    paymentDetails: {
      bankName: 'Bank of America',
      accountLast4: '8934',
      swiftCode: 'BOFAUS3N',
    },
    status: 'pending',
    requestedAt: '2026-01-22T10:00:00Z',
    grossProfit: 1200000,
    firmShare: 600000,
    traderShare: 600000,
    processingFee: 5000,
  },
  {
    payoutId: 'payout_003',
    traderId: 'trader_004',
    traderName: 'Emma Davis',
    traderEmail: 'emma.davis@email.com',
    amount: 160000, // $1,600
    currency: 'USD',
    paymentMethod: 'crypto',
    paymentDetails: {
      network: 'Ethereum',
      walletAddress: '0x742d...8f3e',
    },
    status: 'approved',
    requestedAt: '2026-01-20T16:45:00Z',
    reviewedAt: '2026-01-21T09:00:00Z',
    reviewedBy: 'admin_001',
    grossProfit: 320000,
    firmShare: 160000,
    traderShare: 160000,
    processingFee: 1500,
  },
  {
    payoutId: 'payout_004',
    traderId: 'trader_001',
    traderName: 'Alex Thompson',
    traderEmail: 'alex.thompson@email.com',
    amount: 225000,
    currency: 'USD',
    paymentMethod: 'bank_transfer',
    paymentDetails: {
      bankName: 'Chase Bank',
      accountLast4: '4521',
      routingNumber: '****1234',
    },
    status: 'completed',
    requestedAt: '2026-01-10T12:00:00Z',
    reviewedAt: '2026-01-10T15:00:00Z',
    reviewedBy: 'admin_001',
    processedAt: '2026-01-12T10:00:00Z',
    grossProfit: 450000,
    firmShare: 225000,
    traderShare: 225000,
    processingFee: 2500,
  },
  {
    payoutId: 'payout_005',
    traderId: 'trader_010',
    traderName: 'Amanda Taylor',
    traderEmail: 'ataylor@email.com',
    amount: 90000, // $900
    currency: 'USD',
    paymentMethod: 'paypal',
    paymentDetails: {
      paypalEmail: 'ataylor@email.com',
    },
    status: 'rejected',
    requestedAt: '2026-01-18T11:30:00Z',
    reviewedAt: '2026-01-19T14:00:00Z',
    reviewedBy: 'admin_002',
    rejectionReason: 'Account under review for suspicious activity',
    grossProfit: 180000,
    firmShare: 90000,
    traderShare: 90000,
    processingFee: 1000,
  },
  {
    payoutId: 'payout_006',
    traderId: 'trader_007',
    traderName: 'Robert Brown',
    traderEmail: 'rbrown@email.com',
    amount: 600000,
    currency: 'USD',
    paymentMethod: 'wire',
    paymentDetails: {
      bankName: 'Bank of America',
      accountLast4: '8934',
      swiftCode: 'BOFAUS3N',
    },
    status: 'completed',
    requestedAt: '2026-01-05T08:00:00Z',
    reviewedAt: '2026-01-05T12:00:00Z',
    reviewedBy: 'admin_001',
    processedAt: '2026-01-07T10:00:00Z',
    grossProfit: 1200000,
    firmShare: 600000,
    traderShare: 600000,
    processingFee: 5000,
  },
];

export const mockRefundRequests: RefundRequest[] = [
  {
    refundId: 'refund_001',
    traderId: 'trader_005',
    traderName: 'James Wilson',
    originalTransactionId: 'txn_001234',
    amount: 4800, // $48
    reason: 'Duplicate charge for challenge subscription',
    status: 'pending',
    requestedAt: '2026-01-23T09:00:00Z',
  },
  {
    refundId: 'refund_002',
    traderId: 'trader_006',
    traderName: 'Lisa Anderson',
    originalTransactionId: 'txn_002345',
    amount: 3200, // $32
    reason: 'Account failed within first 24 hours - platform issue',
    status: 'approved',
    requestedAt: '2026-01-22T15:30:00Z',
    processedAt: '2026-01-23T10:00:00Z',
    processedBy: 'admin_001',
  },
  {
    refundId: 'refund_003',
    traderId: 'trader_003',
    traderName: 'Michael Chen',
    originalTransactionId: 'txn_003456',
    amount: 3200,
    reason: 'Requested refund after losing first challenge',
    status: 'rejected',
    requestedAt: '2026-01-15T11:00:00Z',
    processedAt: '2026-01-16T09:00:00Z',
    processedBy: 'admin_002',
  },
];

export const mockRevenueData: RevenueRecord[] = [
  {
    recordId: 'rev_001',
    date: '2026-01-24',
    challengeFees: 48000, // $480
    profitShare: 125000, // $1,250
    resetFees: 8000, // $80
    payoutsProcessed: 0,
    refundsIssued: 0,
    processingFees: 1500,
    netRevenue: 179500,
  },
  {
    recordId: 'rev_002',
    date: '2026-01-23',
    challengeFees: 96000,
    profitShare: 225000,
    resetFees: 16000,
    payoutsProcessed: 225000,
    refundsIssued: 4800,
    processingFees: 3500,
    netRevenue: 103700,
  },
  {
    recordId: 'rev_003',
    date: '2026-01-22',
    challengeFees: 144000,
    profitShare: 180000,
    resetFees: 24000,
    payoutsProcessed: 160000,
    refundsIssued: 0,
    processingFees: 2800,
    netRevenue: 185200,
  },
  {
    recordId: 'rev_004',
    date: '2026-01-21',
    challengeFees: 80000,
    profitShare: 300000,
    resetFees: 8000,
    payoutsProcessed: 600000,
    refundsIssued: 3200,
    processingFees: 5200,
    netRevenue: -220400,
  },
  {
    recordId: 'rev_005',
    date: '2026-01-20',
    challengeFees: 128000,
    profitShare: 150000,
    resetFees: 16000,
    payoutsProcessed: 0,
    refundsIssued: 0,
    processingFees: 1800,
    netRevenue: 292200,
  },
  {
    recordId: 'rev_006',
    date: '2026-01-19',
    challengeFees: 112000,
    profitShare: 200000,
    resetFees: 24000,
    payoutsProcessed: 180000,
    refundsIssued: 4800,
    processingFees: 2500,
    netRevenue: 148700,
  },
  {
    recordId: 'rev_007',
    date: '2026-01-18',
    challengeFees: 160000,
    profitShare: 275000,
    resetFees: 32000,
    payoutsProcessed: 225000,
    refundsIssued: 0,
    processingFees: 3200,
    netRevenue: 238800,
  },
];

// Summary calculations
export const getPayoutSummary = () => {
  const pending = mockPayouts.filter((p) => p.status === 'pending');
  const approved = mockPayouts.filter((p) => p.status === 'approved');
  const completed = mockPayouts.filter((p) => p.status === 'completed');

  return {
    pendingCount: pending.length,
    pendingAmount: pending.reduce((sum, p) => sum + p.amount, 0),
    approvedCount: approved.length,
    approvedAmount: approved.reduce((sum, p) => sum + p.amount, 0),
    completedThisMonth: completed.length,
    completedAmountThisMonth: completed.reduce((sum, p) => sum + p.amount, 0),
  };
};

export const getRevenueSummary = () => {
  const today = mockRevenueData[0];
  const thisMonth = mockRevenueData.reduce(
    (acc, record) => ({
      challengeFees: acc.challengeFees + record.challengeFees,
      profitShare: acc.profitShare + record.profitShare,
      resetFees: acc.resetFees + record.resetFees,
      payoutsProcessed: acc.payoutsProcessed + record.payoutsProcessed,
      refundsIssued: acc.refundsIssued + record.refundsIssued,
      netRevenue: acc.netRevenue + record.netRevenue,
    }),
    {
      challengeFees: 0,
      profitShare: 0,
      resetFees: 0,
      payoutsProcessed: 0,
      refundsIssued: 0,
      netRevenue: 0,
    }
  );

  return {
    today,
    thisMonth,
  };
};
