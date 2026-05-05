import type { OrderAction, OrderRejectionReason, Side, Venue } from '@webflux/types';
export type { OrderRejectionReason };
export interface OrderValidationInput {
    action: OrderAction;
    side: Side;
    venue: Venue;
    sizeContracts: number;
    accountStatus: string;
    accountUserId: string;
    requestingUserId: string;
    enabledVenues: string[];
    maxContractsPerOrder: number | null;
    maxPositionsPerMarket: number;
    maxPositionsTotal: number;
    existingPositionContracts: number;
    openPositionsCount: number;
    newsCooldownActiveUntil: Date | null;
}
export type OrderValidationResult = {
    ok: true;
} | {
    ok: false;
    reason: OrderRejectionReason;
};
/**
 * Validate a market order against all business rules.
 *
 * Checks 1-3, 6-9 from the MVP plan validation chain.
 * Checks 4 (market open) and 5 (price freshness) are deferred to the fill
 * transaction where live price data is available.
 */
export declare function validateOrder(input: OrderValidationInput): OrderValidationResult;
//# sourceMappingURL=order-validation.d.ts.map