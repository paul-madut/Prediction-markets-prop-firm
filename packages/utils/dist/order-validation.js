"use strict";
// ─── Order Validation Chain ────────────────────────────────────────────────────
//
// Pure functions implementing the 9-step validation chain from MVP plan §5.
// No DB calls, no Redis, no side effects — callers supply all required context.
// Used by the API layer (POST /api/orders) and the worker fill transaction.
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOrder = validateOrder;
/**
 * Validate a market order against all business rules.
 *
 * Checks 1-3, 6-9 from the MVP plan validation chain.
 * Checks 4 (market open) and 5 (price freshness) are deferred to the fill
 * transaction where live price data is available.
 */
function validateOrder(input) {
    // 1. Account must be in tradeable state
    if (input.accountStatus !== 'active' && input.accountStatus !== 'funded') {
        return { ok: false, reason: 'not_tradeable_state' };
    }
    // 2. Account must belong to the requesting user
    if (input.accountUserId !== input.requestingUserId) {
        return { ok: false, reason: 'account_not_owned' };
    }
    // 3. Venue must be enabled for this firm
    if (!input.enabledVenues.includes(input.venue)) {
        return { ok: false, reason: 'venue_not_enabled' };
    }
    // 6. Order size within firm's per-order contract limit
    if (input.maxContractsPerOrder !== null &&
        input.sizeContracts > input.maxContractsPerOrder) {
        return { ok: false, reason: 'size_exceeds_limit' };
    }
    if (input.action === 'buy') {
        // 8. Opening a new position: check total position count limit
        if (input.existingPositionContracts === 0) {
            if (input.openPositionsCount >= input.maxPositionsTotal) {
                return { ok: false, reason: 'position_limit_exceeded' };
            }
        }
    }
    else {
        // action === 'sell': position must exist and order must not exceed it
        // MVP prohibits position flips (selling more than you hold)
        if (input.existingPositionContracts === 0) {
            return { ok: false, reason: 'position_not_found' };
        }
        if (input.sizeContracts > input.existingPositionContracts) {
            return { ok: false, reason: 'order_too_large' };
        }
    }
    // 9. No active news cooldown
    if (input.newsCooldownActiveUntil !== null &&
        new Date() < input.newsCooldownActiveUntil) {
        return { ok: false, reason: 'news_cooldown' };
    }
    return { ok: true };
}
//# sourceMappingURL=order-validation.js.map