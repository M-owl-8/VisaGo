import Redis from 'ioredis';
import { getEnvConfig } from '../config/env';
import { logWarn } from '../middleware/logger';

type DailyUsage = {
  usedCents: number;
  limitCents: number;
  remainingCents: number;
  resetAt: number;
  isLimited: boolean;
};

const env = getEnvConfig();
const DAILY_LIMIT = env.AI_COST_DAILY_LIMIT_CENTS ?? 2000;

// Lazy Redis init
let redis: Redis | null = null;
let redisReady = false;
const memoryUsage = new Map<string, { used: number; expiresAt: number }>();

const ensureRedis = () => {
  if (redisReady) return;
  if (!process.env.REDIS_URL) {
    logWarn('[UsageTracking] REDIS_URL not set, using in-memory tracking (dev only)');
    redisReady = true;
    return;
  }
  try {
    redis = new Redis(process.env.REDIS_URL, { connectTimeout: 2000, maxRetriesPerRequest: 3 });
    redisReady = true;
  } catch (err) {
    logWarn('[UsageTracking] Failed to init Redis, fallback to memory', {
      message: (err as Error)?.message,
    });
    redis = null;
    redisReady = true;
  }
};

const makeKey = (userId: string) => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `ai_cost:${userId}:${today}`;
};

const getResetAt = () => {
  const now = new Date();
  const reset = new Date(now);
  reset.setUTCHours(24, 0, 0, 0);
  return reset.getTime();
};

export class UsageTrackingService {
  /**
   * Estimate cost in cents from token count (rough, configurable). Uses $0.002 / 1K tokens (default).
   */
  static estimateCostCents(tokensUsed: number | undefined, fallbackCents = 10): number {
    if (!tokensUsed || tokensUsed <= 0) return fallbackCents;
    const costPerThousand = 0.002 * 100; // cents
    const cents = Math.ceil((tokensUsed / 1000) * costPerThousand);
    return Math.max(cents, fallbackCents);
  }

  static async getDailyAICost(userId: string): Promise<DailyUsage> {
    ensureRedis();
    const limit = DAILY_LIMIT;
    const resetAt = getResetAt();

    // Redis path
    if (redis) {
      try {
        const key = makeKey(userId);
        const val = await redis.get(key);
        const used = val ? parseInt(val, 10) || 0 : 0;
        const ttl = await redis.ttl(key);
        const reset = ttl && ttl > 0 ? Date.now() + ttl * 1000 : resetAt;
        return {
          usedCents: used,
          limitCents: limit,
          remainingCents: Math.max(0, limit - used),
          resetAt: reset,
          isLimited: used >= limit,
        };
      } catch (err) {
        logWarn('[UsageTracking] Redis read failed, falling back to memory', {
          message: (err as Error)?.message,
        });
      }
    }

    // Memory path
    const key = makeKey(userId);
    const now = Date.now();
    const entry = memoryUsage.get(key);
    const used = entry && entry.expiresAt > now ? entry.used : 0;
    const expiresAt = entry?.expiresAt ?? resetAt;
    return {
      usedCents: used,
      limitCents: limit,
      remainingCents: Math.max(0, limit - used),
      resetAt: expiresAt,
      isLimited: used >= limit,
    };
  }

  static async incrementAICost(userId: string, cents: number): Promise<DailyUsage> {
    ensureRedis();
    const limit = DAILY_LIMIT;
    const resetAt = getResetAt();
    const key = makeKey(userId);

    // Redis path
    if (redis) {
      try {
        const pipeline = redis.multi();
        pipeline.incrby(key, cents);
        pipeline.ttl(key);
        const results = (await pipeline.exec()) || [];
        const newVal = Number(results[0]?.[1] || 0);
        let ttl = Number(results[1]?.[1] || -1);
        if (ttl < 0) {
          ttl = Math.ceil((resetAt - Date.now()) / 1000);
          await redis.expire(key, ttl);
        }
        return {
          usedCents: newVal,
          limitCents: limit,
          remainingCents: Math.max(0, limit - newVal),
          resetAt: Date.now() + ttl * 1000,
          isLimited: newVal >= limit,
        };
      } catch (err) {
        logWarn('[UsageTracking] Redis increment failed, falling back to memory', {
          message: (err as Error)?.message,
        });
      }
    }

    // Memory path
    const now = Date.now();
    const entry = memoryUsage.get(key);
    const current = entry && entry.expiresAt > now ? entry.used : 0;
    const newVal = current + cents;
    memoryUsage.set(key, { used: newVal, expiresAt: resetAt });
    return {
      usedCents: newVal,
      limitCents: limit,
      remainingCents: Math.max(0, limit - newVal),
      resetAt,
      isLimited: newVal >= limit,
    };
  }

  static async ensureWithinLimit(userId: string, anticipatedCents: number): Promise<DailyUsage> {
    const info = await this.getDailyAICost(userId);
    if (info.usedCents + anticipatedCents > info.limitCents) {
      return {
        ...info,
        isLimited: true,
        remainingCents: Math.max(0, info.limitCents - info.usedCents),
      };
    }
    return info;
  }

  static async getDailyAIChatMessageCount(userId: string): Promise<number> {
    ensureRedis();
    const key = `ai_chat_messages:${userId}:${new Date().toISOString().slice(0, 10)}`;
    if (redis) {
      try {
        const val = await redis.get(key);
        return val ? parseInt(val, 10) || 0 : 0;
      } catch (err) {
        logWarn('[UsageTracking] Redis read failed for chat messages', {
          message: (err as Error)?.message,
        });
      }
    }
    return 0;
  }

  static async incrementDailyAIChatMessageCount(userId: string): Promise<number> {
    ensureRedis();
    const key = `ai_chat_messages:${userId}:${new Date().toISOString().slice(0, 10)}`;
    const ttl = Math.ceil((getResetAt() - Date.now()) / 1000);
    if (redis) {
      try {
        const newVal = await redis.incr(key);
        await redis.expire(key, ttl);
        return newVal;
      } catch (err) {
        logWarn('[UsageTracking] Redis increment failed for chat messages', {
          message: (err as Error)?.message,
        });
      }
    }
    return 0;
  }
}
