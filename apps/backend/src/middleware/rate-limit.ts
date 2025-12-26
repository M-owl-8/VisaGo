import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request, Response } from 'express';
import { getEnvConfig } from '../config/env';
import Redis from 'ioredis';

// Initialize Redis client for rate limiting with health checks
let redisClient: Redis | null = null;
let redisHealthy = false;
let redisInitialized = false;

if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      connectTimeout: 2000,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    // Test connection
    redisClient
      .ping()
      .then(() => {
        redisHealthy = true;
        redisInitialized = true;
        console.log('✅ Redis rate limiting connected successfully');
      })
      .catch((err) => {
        console.warn(
          '⚠️  Redis rate limiting connection failed, using in-memory store:',
          err.message
        );
        redisClient = null;
        redisInitialized = true;
      });

    // Handle connection errors
    redisClient.on('error', (err) => {
      console.warn('⚠️  Redis rate limiting error:', err.message);
      redisHealthy = false;
    });

    redisClient.on('connect', () => {
      redisHealthy = true;
      console.log('✅ Redis rate limiting reconnected');
    });
  } catch (error) {
    console.warn('⚠️  Failed to initialize Redis for rate limiting:', error);
    redisClient = null;
    redisInitialized = true;
  }
} else {
  console.log(
    'ℹ️  REDIS_URL not set - using in-memory rate limiting (not recommended for production)'
  );
  redisInitialized = true;
}

// Helper function to get store based on Redis availability
const getStore = () => {
  if (redisClient && redisHealthy) {
    try {
      return new RedisStore({
        sendCommand: (async (command: string, ...args: any[]) => {
          if (!redisClient || !redisHealthy) {
            throw new Error('Redis not available');
          }
          return await redisClient.call(command, ...args);
        }) as any,
        prefix: 'rl:',
      });
    } catch (error) {
      console.warn('⚠️  Failed to create Redis store, falling back to memory:', error);
      return undefined;
    }
  }
  return undefined; // Falls back to memory store
};

// Export Redis health status for monitoring
export function getRateLimitRedisStatus() {
  return {
    enabled: !!process.env.REDIS_URL,
    connected: redisHealthy,
    initialized: redisInitialized,
    store: redisHealthy ? 'redis' : 'memory',
  };
}

/**
 * Rate limiter for login attempts: 5 attempts per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
  store: getStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts. Please try again after 15 minutes.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        status: 429,
        message: 'Too many login attempts. Please try again after 15 minutes.',
      },
    });
  },
});

/**
 * Rate limiter for registration: 10 attempts per hour per IP
 * Increased from 3 to allow legitimate users to retry with corrections
 */
export const registerLimiter = rateLimit({
  store: getStore(),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per windowMs (increased from 3)
  message: 'Too many registration attempts. Please try again after 1 hour.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        status: 429,
        message: 'Too many registration attempts. Please try again after 1 hour.',
      },
    });
  },
});

/**
 * General API rate limiter: 100 requests per minute per IP
 */
export const apiLimiter = rateLimit({
  store: getStore(),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health check
    return req.path === '/health' || req.path === '/api/status';
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        status: 429,
        message: 'Too many requests. Please try again later.',
      },
    });
  },
});

/**
 * Strict rate limiter for sensitive operations: 10 requests per hour
 */
export const strictLimiter = rateLimit({
  store: getStore(),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many sensitive operations. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        status: 429,
        message: 'Too many sensitive operations. Please try again later.',
      },
    });
  },
});

/**
 * Webhook rate limiter: 5 requests per minute per IP
 * Prevents abuse of payment webhook endpoints
 */
export const webhookLimiter = rateLimit({
  store: getStore(),
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per minute
  message: 'Too many webhook requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Only apply to webhook endpoints
    return !req.path.includes('/webhook/');
  },
  handler: (req: Request, res: Response) => {
    console.warn(`🚨 Webhook rate limit exceeded for IP: ${req.ip}, path: ${req.path}`);
    res.status(429).json({
      success: false,
      error: {
        status: 429,
        message: 'Too many webhook requests. Please try again later.',
      },
    });
  },
});

/**
 * Per-user API limiter: defaults 120 req / 60s. Falls back to IP if userId missing.
 */
const { PER_USER_RATE_LIMIT_WINDOW_MS, PER_USER_RATE_LIMIT_MAX } = getEnvConfig();

export const perUserLimiter = rateLimit({
  store: getStore(),
  windowMs: PER_USER_RATE_LIMIT_WINDOW_MS,
  max: PER_USER_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as any).userId || (req as any).user?.id || req.ip;
  },
  skip: (req: Request) => {
    const p = req.path || '';
    if (p === '/health' || p === '/api/status' || p.includes('/webhook/')) return true;
    return false;
  },
  message: 'Too many requests. Please slow down.',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        status: 429,
        message: 'Too many requests. Please slow down.',
      },
    });
  },
});

// Admin-specific rate limiter (stricter, keyed by userId when available)
const { ADMIN_RATE_LIMIT_WINDOW_MS, ADMIN_RATE_LIMIT_MAX } = getEnvConfig();

export const adminLimiter = rateLimit({
  store: getStore(),
  windowMs: ADMIN_RATE_LIMIT_WINDOW_MS,
  max: ADMIN_RATE_LIMIT_MAX,
  message: 'Admin rate limit exceeded. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req as any).userId || req.ip;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        status: 429,
        message: 'Admin rate limit exceeded. Please slow down.',
      },
    });
  },
});
