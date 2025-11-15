/**
 * Monitoring & Performance Routes
 * Provides endpoints for cache, database, and performance monitoring
 * Protected endpoints for admin/development use
 */

import express, { Router, Request, Response } from 'express';
import { OptimizedCacheService } from '../services/cache.service.optimized';
import DatabasePoolService from '../services/db-pool.service';
import { SlowQueryLogger } from '../services/slow-query-logger';
import { PerformanceBenchmarkService } from '../services/performance-benchmark.service';
import { getRateLimitRedisStatus } from '../middleware/rate-limit';
import { getLogWriter } from '../utils/log-writer';
import { getIntegrationStatus } from '../utils/log-integrations';
import { getEnvConfig } from '../config/env';
import db from '../db';

const router: Router = express.Router();

/**
 * Middleware: Check if request is from admin/development
 */
const isDevelopmentOrAdmin = (req: Request, res: Response, next: Function) => {
  if (process.env.NODE_ENV === 'development' || req.headers['x-admin-key'] === process.env.ADMIN_KEY) {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden - Admin access required' });
  }
};

// Apply protection to all monitoring routes
router.use(isDevelopmentOrAdmin);

// ============================================================================
// CACHE MONITORING ENDPOINTS
// ============================================================================

/**
 * GET /monitoring/cache/stats
 * Get current cache statistics
 */
router.get('/cache/stats', (req: Request, res: Response) => {
  try {
    const cacheService = new OptimizedCacheService(process.env.REDIS_URL);
    const stats = cacheService.getStats();

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        cache: stats,
        hitRatePercentage: stats.hitRate.toFixed(2) + '%',
        status: stats.redisConnected ? 'Redis Connected' : 'Local Cache Only',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /monitoring/cache/info
 * Get detailed cache information including Redis info
 */
router.get('/cache/info', async (req: Request, res: Response) => {
  try {
    const cacheService = new OptimizedCacheService(process.env.REDIS_URL);
    const info = await cacheService.getCacheInfo();

    res.json({
      success: true,
      data: info,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /monitoring/cache/clear
 * Clear all cache (development only)
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        error: 'Cache clearing only allowed in development',
      });
    }

    const cacheService = new OptimizedCacheService(process.env.REDIS_URL);
    await cacheService.flushAll();

    res.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /monitoring/cache/health
 * Health check for cache infrastructure
 */
router.get('/cache/health', async (req: Request, res: Response) => {
  try {
    const cacheService = new OptimizedCacheService(process.env.REDIS_URL);
    const health = await cacheService.healthCheck();

    const healthStatus = health.healthy ? 'healthy' : 'degraded';
    const statusCode = health.healthy ? 200 : 503;

    res.status(statusCode).json({
      success: true,
      status: healthStatus,
      redis: health.redis ? 'connected' : 'disconnected',
      local: health.local ? 'working' : 'failed',
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// ============================================================================
// DATABASE MONITORING ENDPOINTS
// ============================================================================

/**
 * GET /monitoring/database/pool
 * Get database connection pool statistics
 */
router.get('/database/pool', (req: Request, res: Response) => {
  try {
    const poolStats = DatabasePoolService.getPoolStats();

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        pool: poolStats,
        connectionUsagePercentage: (
          ((poolStats.totalConnections - poolStats.idleConnections) / poolStats.totalConnections) * 100
        ).toFixed(1) + '%',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /monitoring/database/health
 * Database health check
 */
router.get('/database/health', async (req: Request, res: Response) => {
  try {
    const isHealthy = await DatabasePoolService.healthCheck();

    res.status(isHealthy ? 200 : 503).json({
      success: true,
      status: isHealthy ? 'healthy' : 'unhealthy',
      connected: isHealthy,
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
    });
  }
});

/**
 * GET /monitoring/database/queries
 * Get slow queries information
 */
router.get('/database/queries', (req: Request, res: Response) => {
  try {
    const slowQueryLogger = new SlowQueryLogger(db);
    const report = slowQueryLogger.getPerformanceReport();

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /monitoring/database/queries/:model
 * Get slow queries for a specific model
 */
router.get('/database/queries/:model', (req: Request, res: Response) => {
  try {
    const { model } = req.params;
    const slowQueryLogger = new SlowQueryLogger(db);
    const queries = slowQueryLogger.getSlowQueriesByModel(model);

    res.json({
      success: true,
      model,
      count: queries.length,
      queries: queries.slice(-10), // Last 10 queries
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /monitoring/database/queries/reset
 * Reset slow query logger (development only)
 */
router.post('/database/queries/reset', (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        error: 'Query logger reset only allowed in development',
      });
    }

    const slowQueryLogger = new SlowQueryLogger(db);
    slowQueryLogger.reset();

    res.json({
      success: true,
      message: 'Slow query logger reset',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// PERFORMANCE BENCHMARK ENDPOINTS
// ============================================================================

/**
 * POST /monitoring/benchmark/cache
 * Run cache performance benchmarks
 */
router.post('/benchmark/cache', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        error: 'Benchmarks only allowed in development',
      });
    }

    const cacheService = new OptimizedCacheService(process.env.REDIS_URL);
    const benchmark = new PerformanceBenchmarkService(cacheService, db);
    const report = await benchmark.benchmarkCache(3000);

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /monitoring/benchmark/database
 * Run database performance benchmarks
 */
router.post('/benchmark/database', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        error: 'Benchmarks only allowed in development',
      });
    }

    const cacheService = new OptimizedCacheService(process.env.REDIS_URL);
    const benchmark = new PerformanceBenchmarkService(cacheService, db);
    const report = await benchmark.benchmarkDatabase(3000);

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /monitoring/benchmark/full
 * Run full performance benchmark suite
 */
router.post('/benchmark/full', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        error: 'Benchmarks only allowed in development',
      });
    }

    const cacheService = new OptimizedCacheService(process.env.REDIS_URL);
    const benchmark = new PerformanceBenchmarkService(cacheService, db);
    const result = await benchmark.runFullBenchmark();

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// SYSTEM STATUS ENDPOINTS
// ============================================================================

/**
 * GET /monitoring/status
 * Get overall system status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const cacheService = new OptimizedCacheService(process.env.REDIS_URL);
    const cacheHealth = await cacheService.healthCheck();
    const dbHealth = await DatabasePoolService.healthCheck();
    const poolStats = DatabasePoolService.getPoolStats();
    const cacheStats = cacheService.getStats();

    // Also check Prisma connection health
    let prismaHealth: any = null;
    try {
      const { checkDatabaseHealth } = await import('../utils/db-resilience');
      const db = (await import('../db')).default;
      prismaHealth = await checkDatabaseHealth(db);
    } catch (error) {
      prismaHealth = {
        state: 'error',
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    const systemHealthy = cacheHealth.healthy && dbHealth && prismaHealth?.healthy;

    res.status(systemHealthy ? 200 : 503).json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      status: systemHealthy ? 'healthy' : 'degraded',
      services: {
        cache: {
          status: cacheHealth.healthy ? 'healthy' : 'degraded',
          redis: cacheHealth.redis ? 'connected' : 'disconnected',
          hitRate: cacheStats.hitRate.toFixed(2) + '%',
        },
        database: {
          status: dbHealth && prismaHealth?.healthy ? 'healthy' : 'unhealthy',
          pool: {
            connections: poolStats.totalConnections,
            idle: poolStats.idleConnections,
            queries: poolStats.totalQueries,
          },
          prisma: prismaHealth ? {
            state: prismaHealth.state,
            healthy: prismaHealth.healthy,
            latency: prismaHealth.latency ? `${prismaHealth.latency}ms` : null,
          } : null,
        },
      },
      performance: {
        avgQueryTime: poolStats.avgQueryTime + 'ms',
        cacheHits: cacheStats.hits,
        cacheMisses: cacheStats.misses,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      status: 'error',
      error: error.message,
    });
  }
});

/**
 * GET /monitoring/rate-limit/status
 * Get rate limiting status and Redis connection info
 */
router.get('/rate-limit/status', (req: Request, res: Response) => {
  try {
    const status = getRateLimitRedisStatus();
    
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        rateLimiting: {
          redisEnabled: status.enabled,
          redisConnected: status.connected,
          store: status.store,
          status: status.connected ? 'Redis (Distributed)' : 'Memory (Local)',
          recommendation: status.connected 
            ? 'Using Redis - optimal for production' 
            : 'Using memory - not recommended for production. Set REDIS_URL to enable distributed rate limiting.',
        },
        limits: {
          login: '5 attempts per 15 minutes',
          register: '3 attempts per hour',
          api: '100 requests per minute',
          webhook: '5 requests per minute',
          strict: '10 requests per hour',
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /monitoring/logging/status
 * Get logging configuration and status
 */
router.get('/logging/status', (req: Request, res: Response) => {
  try {
    const envConfig = getEnvConfig();
    const logWriter = getLogWriter();
    const logStats = logWriter.getStats();
    const integrationStatus = getIntegrationStatus();
    
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        configuration: {
          logLevel: envConfig.LOG_LEVEL || 'INFO',
          fileLogging: {
            enabled: logStats.enabled,
            logDirectory: logStats.logDir,
            currentFile: logStats.currentFile,
            currentFileSize: `${(logStats.currentFileSize / 1024).toFixed(2)} KB`,
            maxFileSize: `${(logStats.maxFileSize / 1024 / 1024).toFixed(2)} MB`,
            maxFiles: logStats.maxFiles,
          },
        },
        integrations: {
          ...integrationStatus,
          recommendations: integrationStatus.totalEnabled === 0
            ? 'Consider configuring external logging services (Sentry, DataDog, Logz.io) for production monitoring'
            : `${integrationStatus.totalEnabled} integration(s) configured`,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /monitoring/metrics
 * Get detailed metrics for monitoring systems
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const cacheService = new OptimizedCacheService(process.env.REDIS_URL);
    const poolStats = DatabasePoolService.getPoolStats();
    const cacheStats = cacheService.getStats();
    const cacheInfo = await cacheService.getCacheInfo();

    // Format as Prometheus-compatible metrics
    const metrics = `
# HELP cache_hits_total Total cache hits
# TYPE cache_hits_total counter
cache_hits_total ${cacheStats.hits}

# HELP cache_misses_total Total cache misses
# TYPE cache_misses_total counter
cache_misses_total ${cacheStats.misses}

# HELP cache_hit_rate_percent Current cache hit rate percentage
# TYPE cache_hit_rate_percent gauge
cache_hit_rate_percent ${cacheStats.hitRate.toFixed(2)}

# HELP db_connections_total Total database connections
# TYPE db_connections_total gauge
db_connections_total ${poolStats.totalConnections}

# HELP db_connections_idle Idle database connections
# TYPE db_connections_idle gauge
db_connections_idle ${poolStats.idleConnections}

# HELP db_queries_total Total database queries executed
# TYPE db_queries_total counter
db_queries_total ${poolStats.totalQueries}

# HELP db_queries_failed_total Total failed database queries
# TYPE db_queries_failed_total counter
db_queries_failed_total ${poolStats.failedQueries}

# HELP db_query_duration_avg_ms Average query duration in milliseconds
# TYPE db_query_duration_avg_ms gauge
db_query_duration_avg_ms ${poolStats.avgQueryTime}

# HELP db_query_duration_max_ms Maximum query duration in milliseconds
# TYPE db_query_duration_max_ms gauge
db_query_duration_max_ms ${poolStats.maxQueryTime}
    `.trim();

    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;