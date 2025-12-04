/**
 * Checklist & Document Validation Rate Limiter - User-based
 * Tracks per-user checklist generations and document validations per day
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

let redisClient: Redis | null = null;
let redisInitialized = false;
let redisHealthy = false;

// Initialize Redis client with timeout
if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      connectTimeout: 2000,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // Test connection immediately
    redisClient
      .ping()
      .then(() => {
        redisHealthy = true;
        console.log('[Checklist Rate Limit] Redis connected successfully');
      })
      .catch((err) => {
        console.warn('[Checklist Rate Limit] Redis connection failed:', err.message);
        redisClient = null;
      });

    redisInitialized = true;
  } catch (error) {
    console.warn('[Checklist Rate Limit] Failed to initialize Redis:', error);
    redisClient = null;
  }
}

const CHECKLIST_GENERATION_LIMIT = 20; // checklist generations per day
const DOCUMENT_VALIDATION_LIMIT = 50; // document validations per day
const LIMIT_WINDOW = 24 * 60 * 60; // 24 hours in seconds

interface ChecklistRateLimitInfo {
  userId: string;
  checklistsUsed: number;
  checklistsRemaining: number;
  validationsUsed: number;
  validationsRemaining: number;
  resetTime: Date;
  isChecklistLimited: boolean;
  isValidationLimited: boolean;
}

/**
 * Helper function to execute Redis command with timeout
 */
async function executeRedisWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 1000
): Promise<T | null> {
  return Promise.race([
    operation(),
    new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Redis operation timeout')), timeoutMs)
    ),
  ]).catch(() => null);
}

/**
 * Get current usage for a user
 */
export async function getChecklistRateLimitInfo(userId: string): Promise<ChecklistRateLimitInfo> {
  const checklistKey = `checklist:limit:${userId}`;
  const validationKey = `validation:limit:${userId}`;

  try {
    if (redisHealthy && redisClient) {
      const [checklistData, validationData, checklistTtl, validationTtl] = await Promise.all([
        executeRedisWithTimeout(() => redisClient!.get(checklistKey), 1000),
        executeRedisWithTimeout(() => redisClient!.get(validationKey), 1000),
        executeRedisWithTimeout(() => redisClient!.ttl(checklistKey), 1000),
        executeRedisWithTimeout(() => redisClient!.ttl(validationKey), 1000),
      ]);

      const checklistsUsed = checklistData ? parseInt(checklistData as string, 10) : 0;
      const validationsUsed = validationData ? parseInt(validationData as string, 10) : 0;

      // Calculate reset time from TTL
      const resetTime = new Date();
      const maxTtl = Math.max((checklistTtl as number) || 0, (validationTtl as number) || 0);
      if (maxTtl > 0) {
        resetTime.setSeconds(resetTime.getSeconds() + maxTtl);
      } else {
        resetTime.setHours(resetTime.getHours() + 24);
      }

      return {
        userId,
        checklistsUsed,
        checklistsRemaining: Math.max(0, CHECKLIST_GENERATION_LIMIT - checklistsUsed),
        validationsUsed,
        validationsRemaining: Math.max(0, DOCUMENT_VALIDATION_LIMIT - validationsUsed),
        resetTime,
        isChecklistLimited: checklistsUsed >= CHECKLIST_GENERATION_LIMIT,
        isValidationLimited: validationsUsed >= DOCUMENT_VALIDATION_LIMIT,
      };
    }

    // Fallback: in-memory or Redis unavailable
    return {
      userId,
      checklistsUsed: 0,
      checklistsRemaining: CHECKLIST_GENERATION_LIMIT,
      validationsUsed: 0,
      validationsRemaining: DOCUMENT_VALIDATION_LIMIT,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isChecklistLimited: false,
      isValidationLimited: false,
    };
  } catch (error) {
    console.error('Error getting checklist rate limit info:', error);
    // Fallback: allow on error
    return {
      userId,
      checklistsUsed: 0,
      checklistsRemaining: CHECKLIST_GENERATION_LIMIT,
      validationsUsed: 0,
      validationsRemaining: DOCUMENT_VALIDATION_LIMIT,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isChecklistLimited: false,
      isValidationLimited: false,
    };
  }
}

/**
 * Increment checklist generation counter for a user
 */
export async function incrementChecklistGenerationCount(userId: string): Promise<number> {
  const key = `checklist:limit:${userId}`;

  try {
    if (redisHealthy && redisClient) {
      const count = await executeRedisWithTimeout(() => redisClient!.incr(key), 1000);

      if (count !== null && typeof count === 'number') {
        // Set expiration only on first increment
        if (count === 1) {
          await executeRedisWithTimeout(() => redisClient!.expire(key, LIMIT_WINDOW), 1000);
        }
        return count;
      }
    }
    return 1; // Fallback
  } catch (error) {
    console.error('Error incrementing checklist generation count:', error);
    return 1;
  }
}

/**
 * Increment document validation counter for a user
 */
export async function incrementDocumentValidationCount(userId: string): Promise<number> {
  const key = `validation:limit:${userId}`;

  try {
    if (redisHealthy && redisClient) {
      const count = await executeRedisWithTimeout(() => redisClient!.incr(key), 1000);

      if (count !== null && typeof count === 'number') {
        // Set expiration only on first increment
        if (count === 1) {
          await executeRedisWithTimeout(() => redisClient!.expire(key, LIMIT_WINDOW), 1000);
        }
        return count;
      }
    }
    return 1; // Fallback
  } catch (error) {
    console.error('Error incrementing document validation count:', error);
    return 1;
  }
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
          message: `Daily checklist generation limit exceeded. You have used ${limitInfo.checklistsUsed}/${CHECKLIST_GENERATION_LIMIT} today.`,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        data: {
          checklistsUsed: limitInfo.checklistsUsed,
          checklistsRemaining: limitInfo.checklistsRemaining,
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
