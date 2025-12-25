import { ChallengePlan, ChallengeType } from "@/types";
import { challengeTypes } from "./challengeTypes";

// Account sizes available
const accountSizes = [
  1000000,    // $10,000
  2500000,    // $25,000
  5000000,    // $50,000
  10000000,   // $100,000
  20000000,   // $200,000
];

// Base pricing for $10k account (before multipliers)
const basePrices = {
  blitz: 48,    // $48 for blitz $10k
  "2step": 40,  // $40 for 2-step $10k (standard)
  "3step": 32,  // $32 for 3-step $10k (discounted)
};

// Helper function to generate a plan
const generatePlan = (
  accountSize: number,
  challengeType: ChallengeType
): ChallengePlan => {
  // Calculate size multiplier (square root scaling for better pricing curve)
  const sizeMultiplier = Math.sqrt(accountSize / 1000000);

  // Get base price for this challenge type
  const basePrice = basePrices[challengeType.id];

  // Final price with size scaling
  const finalPrice = Math.floor(basePrice * sizeMultiplier * challengeType.pricingMultiplier);

  // Account size abbreviation for plan ID
  const sizeLabel = accountSize === 1000000 ? "10k"
    : accountSize === 2500000 ? "25k"
    : accountSize === 5000000 ? "50k"
    : accountSize === 10000000 ? "100k"
    : "200k";

  return {
    planId: `plan_${sizeLabel}_${challengeType.id}`,
    challengeTypeId: challengeType.id,
    accountSize,
    monthlyPrice: finalPrice * 100, // Convert to cents
    profitTarget: Math.floor(accountSize * (challengeType.profitTargetPercent / 100)),
    maxPositions: Math.floor(3 + Math.log2(accountSize / 1000000) * 2),
    dailyLossLimit: Math.floor(accountSize * (challengeType.dailyLossLimitPercent / 100)),
    maxDrawdown: Math.floor(accountSize * (challengeType.maxDrawdownPercent / 100)),
    drawdownMode: "EOD",
    resetFee: Math.floor(finalPrice * 0.625) * 100, // 62.5% of monthly price, in cents
    activationFee: false,
  };
};

// Generate all 15 plans (5 sizes × 3 types)
export const mockPlans: ChallengePlan[] = accountSizes.flatMap((size) =>
  challengeTypes.map((type) => generatePlan(size, type))
);

// Export for easy filtering
export const getPlansByType = (typeId: 'blitz' | '2step' | '3step') =>
  mockPlans.filter((plan) => plan.challengeTypeId === typeId);

export const getPlansBySize = (accountSize: number) =>
  mockPlans.filter((plan) => plan.accountSize === accountSize);

export const getPlan = (typeId: 'blitz' | '2step' | '3step', accountSize: number) =>
  mockPlans.find((plan) => plan.challengeTypeId === typeId && plan.accountSize === accountSize);
