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
}
import { PrismaClient } from '@prisma/client';
import { startOfDay } from 'date-fns';

const prisma = new PrismaClient();

/**
 * Service for tracking AI usage metrics and costs
 */
export class UsageTrackingService {
  /**
   * Track a single message usage
   */
  async trackMessageUsage(
    userId: string,
    tokensUsed: number,
    model: string = 'gpt-4',
    responseTimeMs: number = 0
  ): Promise<void> {
    try {
      const today = startOfDay(new Date());

      // Get or create today's metrics
      let metrics = await prisma.aIUsageMetrics.findUnique({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
      });

      if (!metrics) {
        metrics = await prisma.aIUsageMetrics.create({
          data: {
            userId,
            date: today,
            totalRequests: 1,
            totalTokens: tokensUsed,
            totalCost: this.calculateCost(tokensUsed, model),
            avgResponseTime: responseTimeMs,
            errorCount: 0,
          },
        });
      } else {
        // Update existing metrics
        const newTotalTokens = metrics.totalTokens + tokensUsed;
        const newTotalRequests = metrics.totalRequests + 1;
        const newTotalCost = metrics.totalCost + this.calculateCost(tokensUsed, model);
        const newAvgResponseTime = Math.round(
          (metrics.avgResponseTime * (newTotalRequests - 1) + responseTimeMs) / newTotalRequests
        );

        await prisma.aIUsageMetrics.update({
          where: {
            userId_date: {
              userId,
              date: today,
            },
          },
          data: {
            totalRequests: newTotalRequests,
            totalTokens: newTotalTokens,
            totalCost: newTotalCost,
            avgResponseTime: newAvgResponseTime,
          },
        });
      }
    } catch (error) {
      console.error('Error tracking message usage:', error);
      // Don't throw - this should not block message sending
    }
  }

  /**
   * Track an error in usage
   */
  async trackError(userId: string): Promise<void> {
    try {
      const today = startOfDay(new Date());

      await prisma.aIUsageMetrics.upsert({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
        create: {
          userId,
          date: today,
          errorCount: 1,
          totalRequests: 0,
          totalTokens: 0,
          totalCost: 0,
        },
        update: {
          errorCount: {
            increment: 1,
          },
        },
      });
    } catch (error) {
      console.error('Error tracking error count:', error);
    }
  }

  /**
   * Get daily usage for a user
   */
  async getDailyUsage(userId: string, date?: Date) {
    try {
      const queryDate = date ? startOfDay(date) : startOfDay(new Date());

      const metrics = await prisma.aIUsageMetrics.findUnique({
        where: {
          userId_date: {
            userId,
            date: queryDate,
          },
        },
      });

      return (
        metrics || {
          userId,
          date: queryDate,
          totalRequests: 0,
          totalTokens: 0,
          totalCost: 0,
          avgResponseTime: 0,
          errorCount: 0,
        }
      );
    } catch (error) {
      console.error('Error getting daily usage:', error);
      return null;
    }
  }

  /**
   * Get weekly usage summary
   */
  async getWeeklyUsage(userId: string, weeksBack: number = 1) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - (7 * weeksBack - 1));

      const metrics = await prisma.aIUsageMetrics.findMany({
        where: {
          userId,
          date: {
            gte: startOfDay(startDate),
            lte: startOfDay(endDate),
          },
        },
        orderBy: { date: 'asc' },
      });

      // Aggregate totals
      const totals = metrics.reduce(
        (acc, m) => ({
          totalRequests: acc.totalRequests + m.totalRequests,
          totalTokens: acc.totalTokens + m.totalTokens,
          totalCost: acc.totalCost + m.totalCost,
          avgResponseTime: acc.avgResponseTime + m.avgResponseTime,
          errorCount: acc.errorCount + m.errorCount,
        }),
        { totalRequests: 0, totalTokens: 0, totalCost: 0, avgResponseTime: 0, errorCount: 0 }
      );

      const avgResponseTime =
        metrics.length > 0 ? Math.round(totals.avgResponseTime / metrics.length) : 0;

      return {
        period: {
          startDate: startDate,
          endDate: endDate,
          days: metrics.length,
        },
        dailyBreakdown: metrics,
        totals: {
          ...totals,
          avgResponseTime,
        },
      };
    } catch (error) {
      console.error('Error getting weekly usage:', error);
      return null;
    }
  }

  /**
   * Get monthly usage summary
   */
  async getMonthlyUsage(userId: string, monthsBack: number = 1) {
    try {
      const now = new Date();
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startDate = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);

      const metrics = await prisma.aIUsageMetrics.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
      });

      // Aggregate totals
      const totals = metrics.reduce(
        (acc, m) => ({
          totalRequests: acc.totalRequests + m.totalRequests,
          totalTokens: acc.totalTokens + m.totalTokens,
          totalCost: acc.totalCost + m.totalCost,
          avgResponseTime: acc.avgResponseTime + m.avgResponseTime,
          errorCount: acc.errorCount + m.errorCount,
        }),
        { totalRequests: 0, totalTokens: 0, totalCost: 0, avgResponseTime: 0, errorCount: 0 }
      );

      const avgResponseTime =
        metrics.length > 0 ? Math.round(totals.avgResponseTime / metrics.length) : 0;

      return {
        period: {
          startDate,
          endDate,
          days: metrics.length,
        },
        dailyBreakdown: metrics,
        totals: {
          ...totals,
          avgResponseTime,
        },
      };
    } catch (error) {
      console.error('Error getting monthly usage:', error);
      return null;
    }
  }

  /**
   * Calculate cost based on tokens and model
   * Based on OpenAI pricing (can be updated based on actual pricing)
   */
  private calculateCost(tokensUsed: number, model: string): number {
    // Pricing per 1K tokens (as of 2024)
    const pricing: Record<string, number> = {
      'gpt-4': 0.03, // $0.03 per 1K tokens
      'gpt-3.5-turbo': 0.0005, // $0.0005 per 1K tokens
      fallback: 0, // Free fallback
    };

    const pricePerToken = (pricing[model] || pricing['gpt-3.5-turbo']) / 1000;
    return Math.round(tokensUsed * pricePerToken * 10000) / 10000; // Round to 4 decimals
  }

  /**
   * Get cost estimates for user across different periods
   */
  async getCostAnalysis(userId: string) {
    try {
      const today = await this.getDailyUsage(userId);
      const weekly = await this.getWeeklyUsage(userId, 1);
      const monthly = await this.getMonthlyUsage(userId, 1);

      return {
        today: {
          cost: today?.totalCost || 0,
          requests: today?.totalRequests || 0,
          tokens: today?.totalTokens || 0,
        },
        weekly: {
          cost: weekly?.totals.totalCost || 0,
          requests: weekly?.totals.totalRequests || 0,
          tokens: weekly?.totals.totalTokens || 0,
        },
        monthly: {
          cost: monthly?.totals.totalCost || 0,
          requests: monthly?.totals.totalRequests || 0,
          tokens: monthly?.totals.totalTokens || 0,
        },
      };
    } catch (error) {
      console.error('Error getting cost analysis:', error);
      return null;
    }
  }
}

// Export singleton instance
export const usageTrackingService = new UsageTrackingService();
