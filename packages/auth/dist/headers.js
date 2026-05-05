"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readTenantHeaders = readTenantHeaders;
function readTenantHeaders(headers) {
    return {
        userId: headers.get('x-webflux-user-id'),
        sessionId: headers.get('x-webflux-session-id'),
        firmSlug: headers.get('x-webflux-firm-slug'),
    };
}
//# sourceMappingURL=headers.js.map