// Kalshi-Compatible TypeScript Interfaces
// All monetary values are in cents to match Kalshi API

// Market (matches Kalshi schema)
export interface Market {
  ticker: string;                    // Kalshi: ticker
  event_ticker?: string;             // Kalshi: event_ticker
  title: string;                     // Kalshi: title
  subtitle?: string;                 // Kalshi: subtitle
  category: string;                  // Kalshi: category
  yes_bid: number;                   // Kalshi: yes_bid (cents)
  yes_ask: number;                   // Kalshi: yes_ask (cents)
  no_bid: number;                    // Kalshi: no_bid (cents)
  no_ask: number;                    // Kalshi: no_ask (cents)
  last_price: number;                // Kalshi: last_price (cents)
  volume: number;                    // Kalshi: volume
  volume_24h: number;                // Kalshi: volume_24h
  open_interest: number;             // Kalshi: open_interest
  status: 'open' | 'closed' | 'settled'; // Kalshi: status
  open_time: string;                 // Kalshi: open_time
  close_time: string;                // Kalshi: close_time
  expiration_time: string;           // Kalshi: expiration_time
  result?: 'yes' | 'no';             // Kalshi: result
  settlement_value?: number;         // Kalshi: settlement_value
  featured?: boolean;                // Custom field for UI
  image?: string;                    // Market image URL (Polymarket)
}

// Position (matches Kalshi schema)
export interface Position {
  ticker: string;                    // Kalshi: ticker
  market_title: string;              // Derived from market
  side: 'yes' | 'no';                // Custom (Kalshi uses position +/-)
  position: number;                  // Kalshi: position (shares held)
  total_traded: number;              // Kalshi: total_traded
  market_exposure: number;           // Kalshi: market_exposure (cents)
  realized_pnl: number;              // Kalshi: realized_pnl (cents)
  unrealized_pnl?: number;           // Calculated
  fees_paid: number;                 // Kalshi: fees_paid (cents)
  avg_entry_price?: number;          // Calculated
  current_price?: number;            // From market data
  opened_at: string;                 // Custom timestamp
}

// User Account
export interface UserAccount {
  userId: string;
  username: string;
  email: string;
  avatar: string;

  // Challenge status
  accountPhase: 'evaluation_1' | 'evaluation_2' | 'funded';
  accountSize: number;               // in cents
  accountBalance: number;            // in cents (Kalshi uses cents)
  startingBalance: number;           // in cents

  // Targets & limits
  profitTarget: number;              // percentage (0.08 = 8%)
  currentProfit: number;             // percentage
  dailyDrawdownLimit: number;        // percentage
  currentDailyDrawdown: number;      // percentage
  maxDrawdownLimit: number;          // percentage
  currentMaxDrawdown: number;        // percentage
  peakBalance: number;               // in cents

  // Trading days
  tradingDaysCompleted: number;
  tradingDaysRequired: number;
  challengeStartDate: string;
  challengeEndDate: string;

  // Stats
  status: 'active' | 'passed' | 'failed';
  winRate: number;                   // percentage
}

// Trade (historical)
export interface Trade {
  tradeId: string;
  ticket: string;
  ticker: string;
  market_title: string;
  side: 'yes' | 'no';
  shares: number;
  entryPrice: number;                // in cents
  exitPrice?: number;                // in cents
  entryDate: string;
  exitDate?: string;
  pnl: number;                       // in cents
  pnlPercent: number;
  fees: number;                      // in cents
  result: 'won' | 'lost' | 'sold';
  exitType: 'resolution' | 'manual_sell';
}

// Challenge Type
export interface ChallengeType {
  id: 'blitz' | '2step' | '3step';
  name: string;
  description: string;
  phases: number;
  profitTargetPercent: number;
  dailyLossLimitPercent: number;
  maxDrawdownPercent: number;
  minTradingDays: number;
  pricingMultiplier: number;
  features: string[];
  accentColor: 'orange' | 'blue' | 'purple';
}

// Challenge Plan
export interface ChallengePlan {
  planId: string;
  challengeTypeId: 'blitz' | '2step' | '3step';
  accountSize: number;               // in cents
  monthlyPrice: number;              // in cents
  profitTarget: number;              // in cents
  maxPositions: number;
  dailyLossLimit: number;            // in cents
  maxDrawdown: number;               // in cents
  drawdownMode: 'EOD' | 'realtime';
  resetFee: number;                  // in cents
  activationFee: boolean;
}

// Equity point for chart
export interface EquityPoint {
  date: string;
  equity: number;                    // in cents
  balance: number;                   // in cents
}

// Loading State
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

// App Context Type
export interface AppContextType {
  // User & Account
  user: UserAccount;
  updateAccountBalance: (newBalance: number) => void;
  setUser: (user: UserAccount) => void;

  // Markets
  markets: Market[];
  getMarketByTicker: (ticker: string) => Market | undefined;

  // Positions
  positions: Position[];
  addPosition: (position: Position) => void;
  updatePosition: (ticker: string, side: 'yes' | 'no', updates: Partial<Position>) => void;
  closePosition: (ticker: string, side: 'yes' | 'no', exitPrice: number) => void;

  // Trades
  trades: Trade[];
  addTrade: (trade: Trade) => void;

  // Equity
  equityHistory: EquityPoint[];
  updateEquity: (date: string, equity: number, balance: number) => void;

  // Challenge
  plans: ChallengePlan[];
  selectedPlan: ChallengePlan | null;
  selectPlan: (planId: string) => void;
  challengeTypes: ChallengeType[];
  selectedChallengeType: ChallengeType | null;
  selectChallengeType: (typeId: 'blitz' | '2step' | '3step') => void;

  // Loading
  loadingState: LoadingState;
  setLoadingState: (state: LoadingState) => void;

  // Trading logic
  executeTrade: (ticker: string, side: 'yes' | 'no', shares: number) => boolean;
}
