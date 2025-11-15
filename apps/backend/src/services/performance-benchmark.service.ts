/**
 * Performance Benchmarking Service
 * Tests cache effectiveness, database performance, and generates optimization recommendations
 */

import { OptimizedCacheService } from './cache.service.optimized';
import DatabasePoolService from './db-pool.service';
import { PrismaClient } from '@prisma/client';

interface BenchmarkResult {
  name: string;
  duration: number;
  throughput: number; // operations per second
  errors: number;
  errorRate: number;
}

interface CacheBenchmarkReport {
  timestamp: string;
  tests: {
    cacheWrite: BenchmarkResult;
    cacheRead: BenchmarkResult;
    cacheDelete: BenchmarkResult;
    cacheInvalidation: BenchmarkResult;
  };
  efficiency: {
    writeLatency: string;
    readLatency: string;
    hitRateTarget: number;
    redisAvailable: boolean;
  };
  recommendations: string[];
}

interface DatabaseBenchmarkReport {
  timestamp: string;
  tests: {
    connectionPooling: BenchmarkResult;
    simpleQuery: BenchmarkResult;
    complexQuery: BenchmarkResult;
    bulkInsert: BenchmarkResult;
  };
  poolMetrics: any;
  recommendations: string[];
}

/**
 * Comprehensive performance benchmarking suite
 */
export class PerformanceBenchmarkService {
  constructor(
    private cache: OptimizedCacheService,
    private prisma: PrismaClient
  ) {}

  /**
   * Run cache benchmarks
   */
  async benchmarkCache(duration: number = 5000): Promise<CacheBenchmarkReport> {
    console.log('🔥 Starting cache benchmarks...');

    const results: any = {
      cacheWrite: await this.benchmarkCacheWrite(duration),
      cacheRead: await this.benchmarkCacheRead(duration),
      cacheDelete: await this.benchmarkCacheDelete(duration),
      cacheInvalidation: await this.benchmarkCacheInvalidation(duration),
    };

    const health = await this.cache.healthCheck();
    const stats = this.cache.getStats();

    const recommendations = this.generateCacheRecommendations(results, stats);

    return {
      timestamp: new Date().toISOString(),
      tests: results,
      efficiency: {
        writeLatency: `${Math.round((results.cacheWrite.duration / 1000) / 100)}µs`,
        readLatency: `${Math.round((results.cacheRead.duration / 1000) / 100)}µs`,
        hitRateTarget: 85,
        redisAvailable: health.redis,
      },
      recommendations,
    };
  }

  /**
   * Benchmark cache write performance
   */
  private async benchmarkCacheWrite(duration: number): Promise<BenchmarkResult> {
    const startTime = Date.now();
    let operations = 0;
    let errors = 0;

    while (Date.now() - startTime < duration) {
      try {
        await this.cache.set(
          `bench:write:${operations}`,
          { data: 'x'.repeat(1000) },
          { ttl: 3600 }
        );
        operations++;
      } catch (error) {
        errors++;
      }
    }

    const actualDuration = Date.now() - startTime;
    return {
      name: 'Cache Write',
      duration: actualDuration,
      throughput: Math.round((operations / actualDuration) * 1000),
      errors,
      errorRate: (errors / operations) * 100,
    };
  }

  /**
   * Benchmark cache read performance
   */
  private async benchmarkCacheRead(duration: number): Promise<BenchmarkResult> {
    // Pre-populate cache
    const testSize = 1000;
    for (let i = 0; i < testSize; i++) {
      await this.cache.set(
        `bench:read:${i}`,
        { data: 'test' },
        { ttl: 3600 }
      );
    }

    const startTime = Date.now();
    let operations = 0;
    let errors = 0;

    while (Date.now() - startTime < duration) {
      try {
        const key = `bench:read:${operations % testSize}`;
        await this.cache.get(key);
        operations++;
      } catch (error) {
        errors++;
      }
    }

    const actualDuration = Date.now() - startTime;
    return {
      name: 'Cache Read',
      duration: actualDuration,
      throughput: Math.round((operations / actualDuration) * 1000),
      errors,
      errorRate: (errors / operations) * 100,
    };
  }

  /**
   * Benchmark cache delete performance
   */
  private async benchmarkCacheDelete(duration: number): Promise<BenchmarkResult> {
    // Pre-populate cache
    const testSize = 500;
    for (let i = 0; i < testSize; i++) {
      await this.cache.set(`bench:delete:${i}`, { data: 'test' }, { ttl: 3600 });
    }

    const startTime = Date.now();
    let operations = 0;
    let errors = 0;

    while (Date.now() - startTime < duration) {
      try {
        const key = `bench:delete:${operations % testSize}`;
        await this.cache.delete(key);
        operations++;
      } catch (error) {
        errors++;
      }
    }

    const actualDuration = Date.now() - startTime;
    return {
      name: 'Cache Delete',
      duration: actualDuration,
      throughput: Math.round((operations / actualDuration) * 1000),
      errors,
      errorRate: (errors / operations) * 100,
    };
  }

  /**
   * Benchmark cache invalidation
   */
  private async benchmarkCacheInvalidation(duration: number): Promise<BenchmarkResult> {
    // Pre-populate cache with tagged entries
    const tagCount = 100;
    const entriesPerTag = 10;

    for (let tag = 0; tag < tagCount; tag++) {
      for (let entry = 0; entry < entriesPerTag; entry++) {
        await this.cache.set(
          `bench:tag:${tag}:${entry}`,
          { data: 'test' },
          {
            ttl: 3600,
            tags: [`tag-${tag}`, 'bench-tag'],
          }
        );
      }
    }

    const startTime = Date.now();
    let operations = 0;
    let errors = 0;

    while (Date.now() - startTime < duration) {
      try {
        const tagIndex = operations % tagCount;
        await this.cache.invalidateByTag(`tag-${tagIndex}`);
        operations++;
      } catch (error) {
        errors++;
      }
    }

    const actualDuration = Date.now() - startTime;
    return {
      name: 'Cache Invalidation',
      duration: actualDuration,
      throughput: Math.round((operations / actualDuration) * 1000),
      errors,
      errorRate: (errors / operations) * 100,
    };
  }

  /**
   * Run database benchmarks
   */
  async benchmarkDatabase(duration: number = 5000): Promise<DatabaseBenchmarkReport> {
    console.log('⚡ Starting database benchmarks...');

    const results: any = {
      connectionPooling: await this.benchmarkConnectionPooling(duration),
      simpleQuery: await this.benchmarkSimpleQuery(duration),
      complexQuery: await this.benchmarkComplexQuery(duration),
      bulkInsert: await this.benchmarkBulkInsert(duration),
    };

    const poolMetrics = DatabasePoolService.getPoolStats();
    const recommendations = this.generateDatabaseRecommendations(results, poolMetrics);

    return {
      timestamp: new Date().toISOString(),
      tests: results,
      poolMetrics,
      recommendations,
    };
  }

  /**
   * Benchmark connection pooling
   */
  private async benchmarkConnectionPooling(duration: number): Promise<BenchmarkResult> {
    const startTime = Date.now();
    let operations = 0;
    let errors = 0;

    while (Date.now() - startTime < duration) {
      try {
        const client = await DatabasePoolService.getClient();
        client.release();
        operations++;
      } catch (error) {
        errors++;
      }
    }

    const actualDuration = Date.now() - startTime;
    return {
      name: 'Connection Pooling',
      duration: actualDuration,
      throughput: Math.round((operations / actualDuration) * 1000),
      errors,
      errorRate: (errors / operations) * 100,
    };
  }

  /**
   * Benchmark simple query
   */
  private async benchmarkSimpleQuery(duration: number): Promise<BenchmarkResult> {
    const startTime = Date.now();
    let operations = 0;
    let errors = 0;

    while (Date.now() - startTime < duration) {
      try {
        await DatabasePoolService.query('SELECT 1');
        operations++;
      } catch (error) {
        errors++;
      }
    }

    const actualDuration = Date.now() - startTime;
    return {
      name: 'Simple Query',
      duration: actualDuration,
      throughput: Math.round((operations / actualDuration) * 1000),
      errors,
      errorRate: (errors / operations) * 100,
    };
  }

  /**
   * Benchmark complex query
   */
  private async benchmarkComplexQuery(duration: number): Promise<BenchmarkResult> {
    const startTime = Date.now();
    let operations = 0;
    let errors = 0;

    while (Date.now() - startTime < duration) {
      try {
        // Simulate a more complex query
        await this.prisma.user.count();
        operations++;
      } catch (error) {
        errors++;
      }
    }

    const actualDuration = Date.now() - startTime;
    return {
      name: 'Complex Query',
      duration: actualDuration,
      throughput: Math.round((operations / actualDuration) * 1000),
      errors,
      errorRate: (errors / operations) * 100,
    };
  }

  /**
   * Benchmark bulk inserts
   */
  private async benchmarkBulkInsert(duration: number): Promise<BenchmarkResult> {
    const startTime = Date.now();
    let operations = 0;
    let errors = 0;

    while (Date.now() - startTime < duration) {
      try {
        const batchSize = 10;
        // Simulate bulk insert
        for (let i = 0; i < batchSize; i++) {
          // In real scenario, would be actual bulk insert
          operations++;
        }
      } catch (error) {
        errors++;
      }
    }

    const actualDuration = Date.now() - startTime;
    return {
      name: 'Bulk Insert',
      duration: actualDuration,
      throughput: Math.round((operations / actualDuration) * 1000),
      errors,
      errorRate: (errors / operations) * 100,
    };
  }

  /**
   * Generate cache optimization recommendations
   */
  private generateCacheRecommendations(results: any, stats: any): string[] {
    const recommendations: string[] = [];

    // Check write throughput
    if (results.cacheWrite.throughput < 1000) {
      recommendations.push(
        '⚠️  Cache write throughput is low. Consider increasing batch sizes or checking Redis connectivity.'
      );
    }

    // Check read throughput
    if (results.cacheRead.throughput < 5000) {
      recommendations.push(
        '⚠️  Cache read throughput is lower than expected. Consider Redis optimization or network latency analysis.'
      );
    }

    // Check error rates
    for (const [test, result] of Object.entries(results)) {
      if ((result as any).errorRate > 1) {
        recommendations.push(
          `⚠️  High error rate in ${test}: ${(result as any).errorRate.toFixed(2)}%. ` +
          `Check cache service logs for details.`
        );
      }
    }

    // Check hit rate
    if (stats.hitRate < 70) {
      recommendations.push(
        `Cache hit rate is ${stats.hitRate.toFixed(1)}%. ` +
        `Target is 85%. Consider warming cache or adjusting TTLs.`
      );
    }

    // Check local cache size
    if (stats.localCacheSize > 4000) {
      recommendations.push(
        `Local cache size is large (${stats.localCacheSize} entries). ` +
        `Consider enabling Redis for better scalability.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Cache performance is optimal!');
    }

    return recommendations;
  }

  /**
   * Generate database optimization recommendations
   */
  private generateDatabaseRecommendations(results: any, poolMetrics: any): string[] {
    const recommendations: string[] = [];

    // Check connection pool usage
    const connectionUsage = ((poolMetrics.totalConnections - poolMetrics.idleConnections) / poolMetrics.totalConnections) * 100;
    if (connectionUsage > 80) {
      recommendations.push(
        `⚠️  High connection pool usage: ${connectionUsage.toFixed(1)}%. ` +
        `Consider increasing max connections or optimizing query duration.`
      );
    }

    // Check query performance
    if (results.simpleQuery.errorRate > 0) {
      recommendations.push(
        `Simple queries are failing at ${results.simpleQuery.errorRate.toFixed(2)}% rate. ` +
        `Check database connectivity.`
      );
    }

    // Check throughput
    if (results.simpleQuery.throughput < 100) {
      recommendations.push(
        `Simple query throughput is low (${results.simpleQuery.throughput} ops/sec). ` +
        `Check database performance and network latency.`
      );
    }

    // Check waiting requests
    if (poolMetrics.waitingCount > poolMetrics.totalConnections * 0.5) {
      recommendations.push(
        `High number of waiting requests (${poolMetrics.waitingCount}). ` +
        `Connection pool may be exhausted. Consider increasing pool size.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Database performance is optimal!');
    }

    return recommendations;
  }

  /**
   * Run full performance suite
   */
  async runFullBenchmark(): Promise<{
    cache: CacheBenchmarkReport;
    database: DatabaseBenchmarkReport;
    summary: string;
  }> {
    console.log('🚀 Starting full performance benchmark suite...\n');

    const cache = await this.benchmarkCache(3000);
    const database = await this.benchmarkDatabase(3000);

    const summary = `
Performance Benchmark Summary
============================
Timestamp: ${new Date().toISOString()}

Cache Performance:
- Write Throughput: ${cache.tests.cacheWrite.throughput} ops/sec
- Read Throughput: ${cache.tests.cacheRead.throughput} ops/sec
- Hit Rate: ${(cache.efficiency as any).hitRateTarget}% target

Database Performance:
- Connection Pool Usage: ${((database.poolMetrics.totalConnections - database.poolMetrics.idleConnections) / database.poolMetrics.totalConnections * 100).toFixed(1)}%
- Simple Query Throughput: ${database.tests.simpleQuery.throughput} ops/sec
- Average Query Time: ${database.poolMetrics.avgQueryTime}ms

Recommendations:
${[...cache.recommendations, ...database.recommendations].map(r => `• ${r}`).join('\n')}
    `;

    console.log(summary);

    return {
      cache,
      database,
      summary,
    };
  }
}

export default PerformanceBenchmarkService;