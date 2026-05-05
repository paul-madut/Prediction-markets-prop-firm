"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.PrismaClient = void 0;
exports.createScopedClient = createScopedClient;
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_1.PrismaClient; } });
// Singleton — reuse existing client in dev (hot reload creates new module instances)
exports.prisma = globalThis.__prisma ??
    new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = exports.prisma;
}
// Models that have no firm_id column and must not receive the auto-scoped where clause.
// PriceHistory is global market data. NewsEvent.firmId is nullable (null = all firms).
const UNSCOPED_MODELS = new Set(['PriceHistory', 'NewsEvent']);
// Operations that carry a `where` clause and should be firm-scoped.
// Create/createMany carry only `data`, so they are excluded; callers must supply firmId there.
const SCOPED_OPERATIONS = new Set([
    'findFirst',
    'findFirstOrThrow',
    'findMany',
    'findUnique',
    'findUniqueOrThrow',
    'count',
    'aggregate',
    'groupBy',
    'update',
    'updateMany',
    'upsert',
    'delete',
    'deleteMany',
]);
/**
 * Returns a Prisma client that automatically injects `firmId` into every
 * `where` clause for firm-scoped models. Use this everywhere in the worker
 * (which uses the Supabase service role key and bypasses DB-level RLS).
 *
 * Models without firm_id (PriceHistory, NewsEvent) pass through unchanged.
 * CREATE operations are excluded — callers must include firmId in `data`.
 */
function createScopedClient(firmId) {
    if (!firmId)
        throw new Error('createScopedClient: firmId must be a non-empty string');
    return exports.prisma.$extends({
        query: {
            $allModels: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                $allOperations({ model, operation, args, query }) {
                    if (!UNSCOPED_MODELS.has(model) &&
                        SCOPED_OPERATIONS.has(operation) &&
                        args !== null &&
                        typeof args === 'object') {
                        args.where = { ...args.where, firmId };
                    }
                    return query(args);
                },
            },
        },
    });
}
//# sourceMappingURL=index.js.map