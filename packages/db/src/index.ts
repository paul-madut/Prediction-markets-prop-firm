import { PrismaClient } from '@prisma/client';

export type { Prisma } from '@prisma/client';
export { PrismaClient };

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Singleton — reuse existing client in dev (hot reload creates new module instances)
export const prisma: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// Models that have no firm_id column and must not receive the auto-scoped where clause.
// PriceHistory is global market data. NewsEvent.firmId is nullable (null = all firms).
const UNSCOPED_MODELS = new Set<string>(['PriceHistory', 'NewsEvent']);

// Operations that carry a `where` clause and should be firm-scoped.
// Create/createMany carry only `data`, so they are excluded; callers must supply firmId there.
const SCOPED_OPERATIONS = new Set<string>([
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
export function createScopedClient(firmId: string) {
  if (!firmId) throw new Error('createScopedClient: firmId must be a non-empty string');

  return prisma.$extends({
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $allOperations({ model, operation, args, query }: { model: string; operation: string; args: any; query: (a: any) => Promise<any> }) {
          if (
            !UNSCOPED_MODELS.has(model) &&
            SCOPED_OPERATIONS.has(operation) &&
            args !== null &&
            typeof args === 'object'
          ) {
            args.where = { ...args.where, firmId };
          }
          return query(args);
        },
      },
    },
  });
}

export type ScopedClient = ReturnType<typeof createScopedClient>;
