import { getRedis, isRedisConnected } from '../config/redis';

const PREFIX = 'gp:';

export const cache = {
  async get<T = unknown>(key: string): Promise<T | null> {
    const r = getRedis();
    if (!r || !isRedisConnected()) return null;
    try {
      const raw = await r.get(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    const r = getRedis();
    if (!r || !isRedisConnected()) return;
    try {
      await r.set(PREFIX + key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // ignore
    }
  },

  async del(key: string): Promise<void> {
    const r = getRedis();
    if (!r || !isRedisConnected()) return;
    try {
      await r.del(PREFIX + key);
    } catch {
      // ignore
    }
  },

  async delPattern(pattern: string): Promise<void> {
    const r = getRedis();
    if (!r || !isRedisConnected()) return;
    try {
      const stream = r.scanStream({ match: PREFIX + pattern, count: 100 });
      const keys: string[] = [];
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (batch: string[]) => keys.push(...batch));
        stream.on('end', () => resolve());
        stream.on('error', reject);
      });
      if (keys.length) await r.del(...keys);
    } catch {
      // ignore
    }
  },

  keys: {
    productList: (qs: string) => `products:list:${qs}`,
    product: (slug: string) => `products:slug:${slug}`,
    productFeatured: () => `products:featured`,
    productRelated: (id: string) => `products:related:${id}`,
    categories: () => `categories:all`,
  },

  invalidateProducts: async (): Promise<void> => {
    await Promise.all([
      cache.delPattern('products:*'),
      cache.delPattern('categories:*'),
      cache.del(cache.keys.categories()),
    ]);
  },
};
