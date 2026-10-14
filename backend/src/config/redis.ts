import Redis from 'ioredis';
import { env } from './env';

let client: Redis | null = null;
let connected = false;

function redisDisabled(): boolean {
  return !env.redisUrl;
}

export function getRedis(): Redis | null {
  if (redisDisabled()) return null;
  if (!client) {
    client = new Redis(env.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 2000),
      lazyConnect: true,
    });

    client.on('connect', () => {
      connected = true;
      console.log('[redis] connected');
    });
    client.on('error', (err) => {
      console.error('[redis] error:', err.message);
    });
    client.on('close', () => {
      connected = false;
    });
  }
  return client;
}

export async function connectRedis(): Promise<void> {
  if (redisDisabled()) {
    console.log('[redis] disabled (no REDIS_URL set) — running without cache');
    return;
  }
  const r = getRedis();
  if (!r) return;
  try {
    await r.connect();
  } catch (err) {
    console.warn('[redis] connection failed, continuing without cache:', (err as Error).message);
  }
}

export function isRedisConnected(): boolean {
  return connected;
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
    connected = false;
  }
}
