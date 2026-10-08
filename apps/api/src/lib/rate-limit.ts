import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const memory = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(identifier: string, limit: number, window: string) {
  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;
  if (url && token) {
    const limiter = new Ratelimit({ redis: new Redis({ url, token }), limiter: Ratelimit.slidingWindow(limit, window as `${number} s`) });
    const result = await limiter.limit(identifier);
    return { success: result.success, remaining: result.remaining };
  }

  const windowMs = window.endsWith('h') ? Number.parseInt(window) * 60 * 60 * 1000 : Number.parseInt(window) * 60 * 1000;
  const now = Date.now();
  const current = memory.get(identifier);
  if (!current || current.resetAt <= now) {
    memory.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }
  current.count += 1;
  return { success: current.count <= limit, remaining: Math.max(0, limit - current.count) };
}