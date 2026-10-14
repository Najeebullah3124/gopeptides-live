import { PrismaClient } from '@prisma/client';
import { env } from './env';

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function makeClient() {
  const base = new PrismaClient({
    log: env.isDevelopment ? ['warn', 'error'] : ['error'],
  });

  // SQLite stores benefits / shippingAddress / billingAddress as TEXT.
  // This extension parses them on read so controllers see typed objects.
  return base.$extends({
    result: {
      product: {
        benefits: {
          needs: { benefits: true },
          compute(p) {
            return parseJson<string[]>(p.benefits, []);
          },
        },
      },
      order: {
        shippingAddress: {
          needs: { shippingAddress: true },
          compute(o) {
            return parseJson<Record<string, unknown>>(o.shippingAddress, {});
          },
        },
        billingAddress: {
          needs: { billingAddress: true },
          compute(o) {
            return o.billingAddress ? parseJson<Record<string, unknown>>(o.billingAddress, {}) : null;
          },
        },
      },
    },
  });
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma: ReturnType<typeof makeClient> | undefined;
}

export const prisma = global.__prisma ?? makeClient();

if (env.isDevelopment) {
  global.__prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  console.log('[db] connected (sqlite)');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
