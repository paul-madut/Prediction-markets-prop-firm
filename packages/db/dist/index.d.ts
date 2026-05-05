import { PrismaClient } from '@prisma/client';
export type { Prisma } from '@prisma/client';
export { PrismaClient };
declare global {
    var __prisma: PrismaClient | undefined;
}
export declare const prisma: PrismaClient;
/**
 * Returns a Prisma client that automatically injects `firmId` into every
 * `where` clause for firm-scoped models. Use this everywhere in the worker
 * (which uses the Supabase service role key and bypasses DB-level RLS).
 *
 * Models without firm_id (PriceHistory, NewsEvent) pass through unchanged.
 * CREATE operations are excluded — callers must include firmId in `data`.
 */
export declare function createScopedClient(firmId: string): import("@prisma/client/runtime/library").DynamicClientExtensionThis<import("@prisma/client").Prisma.TypeMap<import("@prisma/client/runtime/library").InternalArgs & {
    result: {};
    model: {};
    query: {};
    client: {};
}, import("@prisma/client").Prisma.PrismaClientOptions>, import("@prisma/client").Prisma.TypeMapCb, {
    result: {};
    model: {};
    query: {};
    client: {};
}, {}>;
export type ScopedClient = ReturnType<typeof createScopedClient>;
//# sourceMappingURL=index.d.ts.map