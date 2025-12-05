/**
 * Checklist & Document Validation Rate Limiter - User-based
 * Tracks per-user checklist generations and document validations per day
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

let redisClient: Redis | null = null;
let redisInitialized = false;

interface ChecklistRateLimitInfo {
  generationsUsed: number;
  generationsRemaining: number;
  validationsUsed: number;
  validationsRemaining: number;
  isChecklistLimited: boolean;
  isValidationLimited: boolean;
  resetTime: string;
}

/**
 * Initialize Redis client for rate limiting
 */
export function initializeChecklistRateLimiter(redisUrl?: string): void {
  if (redisInitialized) {
    return;
  }

  try {
    if (redisUrl) {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      redisClient.on('error', (err) => {
        console.error('Redis rate limiter connection error:', err);
      });

      redisClient.on('connect', () => {
        console.log('Redis rate limiter connected');
      });

      redisInitialized = true;
    } else {
      console.warn('Redis URL not provided for checklist rate limiter, using in-memory fallback');
    }
  } catch (error) {
    console.error('Failed to initialize Redis for rate limiter:', error);
  }
}

const CHECKLIST_GENERATION_LIMIT = 20; // checklist generations per day
const DOCUMENT_VALIDATION_LIMIT = 50; // document validations per day

/**
 * Helper function to execute Redis command with timeout
 */
async function executeRedisCommand<T>(
  command: (client: Redis) => Promise<T>,
  fallback: T
): Promise<T> {
  if (!redisClient || !redisInitialized) {
    return fallback;
  }

  try {
    return await Promise.race([
      command(redisClient),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Redis command timeout')), 1000)
      ),
    ]);
  } catch (error) {
    console.error('Redis command error:', error);
    return fallback;
  }
}

/**
 * Get current usage for a user
 */
export async function getChecklistRateLimitInfo(userId: string): Promise<ChecklistRateLimitInfo> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = `checklist_rate_limit:${userId}:${today.toISOString().split('T')[0]}`;

  const result = await executeRedisCommand(
    async (client) => {
      const generations = await client.get(`${todayKey}:generations`);
      const validations = await client.get(`${todayKey}:validations`);

      return {
        generationsUsed: parseInt(generations || '0', 10),
        validationsUsed: parseInt(validations || '0', 10),
      };
    },
    { generationsUsed: 0, validationsUsed: 0 }
  );

  const generationsRemaining = Math.max(0, CHECKLIST_GENERATION_LIMIT - result.generationsUsed);
  const validationsRemaining = Math.max(0, DOCUMENT_VALIDATION_LIMIT - result.validationsUsed);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    generationsUsed: result.generationsUsed,
    generationsRemaining,
    validationsUsed: result.validationsUsed,
    validationsRemaining,
    isChecklistLimited: result.generationsUsed >= CHECKLIST_GENERATION_LIMIT,
    isValidationLimited: result.validationsUsed >= DOCUMENT_VALIDATION_LIMIT,
    resetTime: tomorrow.toISOString(),
  };
}

/**
 * Increment checklist generation counter for a user
 */
export async function incrementChecklistGenerationCount(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = `checklist_rate_limit:${userId}:${today.toISOString().split('T')[0]}`;

  const count = await executeRedisCommand(async (client) => {
    const newCount = await client.incr(`${todayKey}:generations`);
    await client.expire(`${todayKey}:generations`, 86400); // 24 hours
    return newCount;
  }, 1);

  return count;
}

/**
 * Increment document validation counter for a user
 */
export async function incrementDocumentValidationCount(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = `checklist_rate_limit:${userId}:${today.toISOString().split('T')[0]}`;

  const count = await executeRedisCommand(async (client) => {
    const newCount = await client.incr(`${todayKey}:validations`);
    await client.expire(`${todayKey}:validations`, 86400); // 24 hours
    return newCount;
  }, 1);

  return count;
}

/**
 * Middleware: Check if user has remaining checklist generation quota
 */
export async function checklistRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized',
        },
      });
    }

    // Only apply to checklist generation endpoints
    if (!req.path.includes('/api/document-checklist') || req.method === 'GET') {
      return next();
    }

    const limitInfo = await getChecklistRateLimitInfo(userId);

    // Attach limit info to request for later use
    (req as any).checklistLimitInfo = limitInfo;

    if (limitInfo.isChecklistLimited) {
      return res.status(429).json({
        success: false,
        error: {
          message: `Daily checklist generation limit exceeded. You have used ${limitInfo.generationsUsed}/${CHECKLIST_GENERATION_LIMIT} today.`,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        data: {
          generationsUsed: limitInfo.generationsUsed,
          generationsRemaining: limitInfo.generationsRemaining,
          limit: CHECKLIST_GENERATION_LIMIT,
          resetTime: limitInfo.resetTime,
        },
      });
    }

    next();
  } catch (error) {
    console.error('Checklist rate limit middleware error:', error);
    // Allow on error to prevent blocking users
    next();
  }
}

/**
 * Middleware: Check if user has remaining document validation quota
 */
export async function documentValidationRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized',
        },
      });
    }

    // Only apply to document validation endpoints
    if (!req.path.includes('/api/documents') || req.method === 'GET') {
      return next();
    }

    const limitInfo = await getChecklistRateLimitInfo(userId);

    // Attach limit info to request for later use
    (req as any).checklistLimitInfo = limitInfo;

    if (limitInfo.isValidationLimited) {
      return res.status(429).json({
        success: false,
        error: {
          message: `Daily document validation limit exceeded. You have used ${limitInfo.validationsUsed}/${DOCUMENT_VALIDATION_LIMIT} today.`,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        data: {
          validationsUsed: limitInfo.validationsUsed,
          validationsRemaining: limitInfo.validationsRemaining,
          limit: DOCUMENT_VALIDATION_LIMIT,
          resetTime: limitInfo.resetTime,
        },
      });
    }

    next();
  } catch (error) {
    console.error('Document validation rate limit middleware error:', error);
    // Allow on error to prevent blocking users
    next();
  }
}
