/**
 * Health check and system status routes
 * Provides endpoints for monitoring application health
 */

import express, { Request, Response } from 'express';
import { getEnvConfig } from '../config/env';
import { successResponse } from '../utils/response';
import { HTTP_STATUS } from '../config/constants';
import db from '../db';
import { OptimizedCacheService } from '../services/cache.service.optimized';

const router = express.Router();

/**
 * System health status interface
 */
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceStatus;
    cache: ServiceStatus;
    storage: ServiceStatus;
    ai: ServiceStatus;
  };
}

/**
 * Service status interface
 */
interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  message?: string;
  responseTime?: number;
}

/**
 * GET /api/health
 * Basic health check endpoint
 *
 * @route GET /api/health
 * @access Public
 * @returns {object} Health status
 */
router.get('/', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Quick database check
    await db.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - startTime;

    successResponse(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: getEnvConfig().NODE_ENV,
      database: {
        status: 'up' as const,
        responseTime: dbResponseTime,
      },
    });
  } catch (error) {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: false,
      error: {
        status: HTTP_STATUS.SERVICE_UNAVAILABLE,
        message: 'Service unhealthy',
        code: 'SERVICE_UNAVAILABLE',
      },
    });
  }
});

/**
 * GET /api/health/detailed
 * Detailed health check with all services
 *
 * @route GET /api/health/detailed
 * @access Public
 * @returns {object} Detailed health status
 */
router.get('/detailed', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const envConfig = getEnvConfig();
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: envConfig.NODE_ENV,
    services: {
      database: await checkDatabase(),
      cache: await checkCache(),
      storage: await checkStorage(envConfig),
      ai: await checkAIService(envConfig),
    },
  };

  // Determine overall status
  const serviceStatuses = Object.values(healthStatus.services);
  const downServices = serviceStatuses.filter((s) => s.status === 'down');
  const degradedServices = serviceStatuses.filter((s) => s.status === 'degraded');

  if (downServices.length > 0) {
    healthStatus.status = 'unhealthy';
  } else if (degradedServices.length > 0) {
    healthStatus.status = 'degraded';
  }

  const statusCode =
    healthStatus.status === 'healthy'
      ? HTTP_STATUS.OK
      : healthStatus.status === 'degraded'
        ? HTTP_STATUS.OK // Still return 200 but indicate degraded
        : HTTP_STATUS.SERVICE_UNAVAILABLE;

  res.status(statusCode).json({
    success: healthStatus.status !== 'unhealthy',
    data: healthStatus,
  });
});

/**
 * GET /api/health/ready
 * Readiness probe for Kubernetes/Docker
 *
 * @route GET /api/health/ready
 * @access Public
 * @returns {object} Readiness status
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Check critical services
    await db.$queryRaw`SELECT 1`;

    successResponse(res, {
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: false,
      ready: false,
      error: {
        status: HTTP_STATUS.SERVICE_UNAVAILABLE,
        message: 'Service not ready',
        code: 'NOT_READY',
      },
    });
  }
});

/**
 * GET /api/health/live
 * Liveness probe for Kubernetes/Docker
 *
 * @route GET /api/health/live
 * @access Public
 * @returns {object} Liveness status
 */
router.get('/live', (_req: Request, res: Response) => {
  successResponse(res, {
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Check database status
 */
async function checkDatabase(): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return {
      status: 'up',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

/**
 * Check cache status
 */
async function checkCache(): Promise<ServiceStatus> {
  try {
    const cacheService = new OptimizedCacheService(process.env.REDIS_URL);
    const stats = cacheService.getStats?.();

    if (stats?.redisConnected) {
      return {
        status: 'up',
        message: 'Redis connected',
      };
    }

    return {
      status: 'degraded',
      message: 'Using local cache (Redis not available)',
    };
  } catch (error) {
    return {
      status: 'degraded',
      message: 'Cache service unavailable, using fallback',
    };
  }
}

/**
 * Check storage status
 */
async function checkStorage(envConfig: ReturnType<typeof getEnvConfig>): Promise<ServiceStatus> {
  try {
    if (envConfig.STORAGE_TYPE === 'firebase' && envConfig.FIREBASE_PROJECT_ID) {
      return {
        status: 'up',
        message: 'Firebase Storage configured',
      };
    }

    return {
      status: 'up',
      message: 'Local storage configured',
    };
  } catch (error) {
    return {
      status: 'degraded',
      message: 'Storage service check failed',
    };
  }
}

/**
 * Check AI service status
 */
async function checkAIService(envConfig: ReturnType<typeof getEnvConfig>): Promise<ServiceStatus> {
  if (!envConfig.OPENAI_API_KEY) {
    return {
      status: 'degraded',
      message: 'OpenAI API key not configured',
    };
  }

  try {
    // Could add actual API check here
    return {
      status: 'up',
      message: 'OpenAI service configured',
    };
  } catch (error) {
    return {
      status: 'degraded',
      message: 'AI service check failed',
    };
  }
}

export default router;
