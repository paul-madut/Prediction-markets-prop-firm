import { ChallengePlan } from "@/types";

export const mockPlans: ChallengePlan[] = [
  {
    planId: "plan_10k",
    accountSize: 1000000,      // $10,000 in cents
    monthlyPrice: 4000,        // $40 in cents
    profitTarget: 80000,       // $800 in cents (8% of 10k)
    maxPositions: 3,
    dailyLossLimit: 50000,     // $500 in cents
    maxDrawdown: 100000,       // $1,000 in cents
    drawdownMode: "EOD",
    resetFee: 2500,            // $25 in cents
    activationFee: false,
  },
  {
    planId: "plan_25k",
    accountSize: 2500000,      // $25,000 in cents
    monthlyPrice: 5000,        // $50 in cents
    profitTarget: 200000,      // $2,000 in cents
    maxPositions: 4,
    dailyLossLimit: 125000,    // $1,250 in cents
    maxDrawdown: 250000,       // $2,500 in cents
    drawdownMode: "EOD",
    resetFee: 4000,            // $40 in cents
    activationFee: false,
  },
  {
    planId: "plan_50k",
    accountSize: 5000000,      // $50,000 in cents
    monthlyPrice: 6000,        // $60 in cents
    profitTarget: 400000,      // $4,000 in cents
    maxPositions: 5,
    dailyLossLimit: 150000,    // $1,500 in cents
    maxDrawdown: 250000,       // $2,500 in cents
    drawdownMode: "EOD",
    resetFee: 5000,            // $50 in cents
    activationFee: false,
  },
  {
    planId: "plan_100k",
    accountSize: 10000000,     // $100,000 in cents
    monthlyPrice: 10000,       // $100 in cents
    profitTarget: 800000,      // $8,000 in cents
    maxPositions: 8,
    dailyLossLimit: 300000,    // $3,000 in cents
    maxDrawdown: 500000,       // $5,000 in cents
    drawdownMode: "EOD",
    resetFee: 7500,            // $75 in cents
    activationFee: false,
  },
  {
    planId: "plan_200k",
    accountSize: 20000000,     // $200,000 in cents
    monthlyPrice: 15000,       // $150 in cents
    profitTarget: 1600000,     // $16,000 in cents
    maxPositions: 10,
    dailyLossLimit: 600000,    // $6,000 in cents
    maxDrawdown: 1000000,      // $10,000 in cents
    drawdownMode: "EOD",
    resetFee: 10000,           // $100 in cents
    activationFee: false,
  },
];
