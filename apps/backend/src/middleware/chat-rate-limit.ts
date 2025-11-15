import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

/**
 * Chat message rate limiter - User-based (50 messages per day)
 * Tracks per-user message count, not per IP
 */

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
    redisClient.ping().then(() => {
      redisHealthy = true;
      console.log('[Chat Rate Limit] Redis connected successfully');
    }).catch((err) => {
      console.warn('[Chat Rate Limit] Redis connection failed:', err.message);
      redisClient = null;
    });
    
    redisInitialized = true;
  } catch (error) {
    console.warn('[Chat Rate Limit] Failed to initialize Redis:', error);
    redisClient = null;
  }
}

const CHAT_MESSAGE_LIMIT = 50; // messages per day
const LIMIT_WINDOW = 24 * 60 * 60; // 24 hours in seconds

interface ChatRateLimitInfo {
  userId: string;
  messagesUsed: number;
  messagesRemaining: number;
  resetTime: Date;
  isLimited: boolean;
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
export async function getChatRateLimitInfo(userId: string): Promise<ChatRateLimitInfo> {
  const key = `chat:limit:${userId}`;
  
  try {
    if (redisHealthy && redisClient) {
      const data = await executeRedisWithTimeout(() => redisClient!.get(key), 1000);
      
      if (data !== null) {
        const messagesUsed = data ? parseInt(data as string, 10) : 0;
        
        // Get TTL to calculate reset time
        const ttl = await executeRedisWithTimeout(() => redisClient!.ttl(key), 1000);
        const resetTime = new Date();
        
        if (ttl && ttl > 0) {
          resetTime.setSeconds(resetTime.getSeconds() + (ttl as number));
        } else {
          resetTime.setHours(resetTime.getHours() + 24);
        }
        
        return {
          userId,
          messagesUsed,
          messagesRemaining: Math.max(0, CHAT_MESSAGE_LIMIT - messagesUsed),
          resetTime,
          isLimited: messagesUsed >= CHAT_MESSAGE_LIMIT,
        };
      }
    }
    
    // Fallback: in-memory or Redis unavailable
    return {
      userId,
      messagesUsed: 0,
      messagesRemaining: CHAT_MESSAGE_LIMIT,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isLimited: false,
    };
  } catch (error) {
    console.error('Error getting chat rate limit info:', error);
    // Fallback: allow on error
    return {
      userId,
      messagesUsed: 0,
      messagesRemaining: CHAT_MESSAGE_LIMIT,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isLimited: false,
    };
  }
}

/**
 * Increment usage counter for a user
 */
export async function incrementChatMessageCount(userId: string): Promise<number> {
  const key = `chat:limit:${userId}`;
  
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
    console.error('Error incrementing chat message count:', error);
    return 1;
  }
}

/**
 * Middleware: Check if user has remaining chat message quota
 */
export async function chatRateLimitMiddleware(
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
    
    // Only apply to chat message endpoints
    if (!req.path.includes('/api/chat') || req.method === 'GET') {
      return next();
    }
    
    const limitInfo = await getChatRateLimitInfo(userId);
    
    // Attach limit info to request for later use
    (req as any).chatLimitInfo = limitInfo;
    
    if (limitInfo.isLimited) {
      return res.status(429).json({
        success: false,
        error: {
          message: `Chat message limit exceeded. You have used ${limitInfo.messagesUsed}/${CHAT_MESSAGE_LIMIT} messages today.`,
          code: 'CHAT_LIMIT_EXCEEDED',
        },
        data: {
          messagesUsed: limitInfo.messagesUsed,
          messagesRemaining: limitInfo.messagesRemaining,
          limit: CHAT_MESSAGE_LIMIT,
          resetTime: limitInfo.resetTime,
        },
      });
    }
    
    next();
  } catch (error) {
    console.error('Chat rate limit middleware error:', error);
    // Allow on error to prevent blocking users
    next();
  }
}

/**
 * Expose limit info to responses
 */
export function attachChatLimitHeaders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const limitInfo = (req as any).chatLimitInfo;
  
  if (limitInfo) {
    res.set('X-Chat-Messages-Used', String(limitInfo.messagesUsed));
    res.set('X-Chat-Messages-Remaining', String(limitInfo.messagesRemaining));
    res.set('X-Chat-Messages-Limit', String(CHAT_MESSAGE_LIMIT));
    res.set('X-Chat-Reset-Time', limitInfo.resetTime.toISOString());
  }
  
  next();
}