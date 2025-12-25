import { UserAccount } from "@/types";

export const mockUser: UserAccount = {
  userId: "user_123",
  username: "John Smith",
  email: "alex@example.com",
  avatar: "/avatars/default.jpg",

  // Challenge status
  accountPhase: "evaluation_1",
  accountSize: 5000000,          // $50,000 in cents
  accountBalance: 5126900,       // $51,269 in cents
  startingBalance: 5000000,      // $50,000 in cents

  // Targets & limits
  profitTarget: 0.08,            // 8% target
  currentProfit: 0.0254,         // 2.54% current profit
  dailyDrawdownLimit: 0.05,      // 5% daily DD limit
  currentDailyDrawdown: -0.0089, // -0.89% current DD
  maxDrawdownLimit: 0.10,        // 10% max DD limit
  currentMaxDrawdown: -0.0156,   // -1.56% current max DD
  peakBalance: 5210000,          // $52,100 in cents

  // Trading days
  tradingDaysCompleted: 7,
  tradingDaysRequired: 10,
  challengeStartDate: "2025-01-15T00:00:00Z",
  challengeEndDate: "2025-02-15T23:59:59Z",

  // Stats
  status: "active",
  winRate: 0.50,                 // 50% win rate
};
