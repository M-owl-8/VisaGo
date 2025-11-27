/**
 * Performance monitoring utilities
 * Tracks database connections, query times, API response times, and system metrics
 */

// import { Logger } from './logger';
// const logger = new Logger('PerformanceMonitor');

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  tags?: Record<string, string>;
  success: boolean;
}

interface PerformanceStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Performance monitor singleton
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private readonly MAX_METRICS_PER_TYPE = 1000;

  /**
   * Record a performance metric
   */
  record(metric: PerformanceMetric): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    const metricList = this.metrics.get(metric.name)!;
    metricList.push(metric);

    // Keep only recent metrics to avoid memory leak
    if (metricList.length > this.MAX_METRICS_PER_TYPE) {
      metricList.splice(0, metricList.length - this.MAX_METRICS_PER_TYPE);
    }

    // Log slow operations
    if (metric.duration > 1000) {
      console.warn(`Slow operation: ${metric.name} took ${metric.duration}ms`, metric.tags);
    }
  }

  /**
   * Measure function execution time
   */
  async measure<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
    const startTime = Date.now();
    let success = false;

    try {
      const result = await fn();
      success = true;
      return result;
    } finally {
      const duration = Date.now() - startTime;
      this.record({
        name,
        duration,
        timestamp: startTime,
        tags,
        success,
      });
    }
  }

  /**
   * Measure synchronous function execution time
   */
  measureSync<T>(name: string, fn: () => T, tags?: Record<string, string>): T {
    const startTime = Date.now();
    let success = false;

    try {
      const result = fn();
      success = true;
      return result;
    } finally {
      const duration = Date.now() - startTime;
      this.record({
        name,
        duration,
        timestamp: startTime,
        tags,
        success,
      });
    }
  }

  /**
   * Get statistics for a metric type
   */
  getStats(name: string): PerformanceStats | null {
    const metricList = this.metrics.get(name);
    if (!metricList || metricList.length === 0) {
      return null;
    }

    const durations = metricList.map((m) => m.duration).sort((a, b) => a - b);
    const count = durations.length;
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count,
      min: durations[0],
      max: durations[count - 1],
      avg: sum / count,
      p50: durations[Math.floor(count * 0.5)],
      p95: durations[Math.floor(count * 0.95)],
      p99: durations[Math.floor(count * 0.99)],
    };
  }

  /**
   * Get all stats
   */
  getAllStats(): Record<string, PerformanceStats> {
    const result: Record<string, PerformanceStats> = {};

    for (const [name] of this.metrics) {
      const stats = this.getStats(name);
      if (stats) {
        result[name] = stats;
      }
    }

    return result;
  }

  /**
   * Get metrics for a specific time window (milliseconds)
   */
  getRecentMetrics(name: string, windowMs: number = 60000): PerformanceMetric[] {
    const metricList = this.metrics.get(name) || [];
    const now = Date.now();

    return metricList.filter((m) => now - m.timestamp < windowMs);
  }

  /**
   * Clear metrics
   */
  clear(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const stats = this.getAllStats();
    let report = '═══════════════════════════════════════════\n';
    report += 'PERFORMANCE REPORT\n';
    report += '═══════════════════════════════════════════\n\n';

    for (const [metric, data] of Object.entries(stats)) {
      report += `${metric}:\n`;
      report += `  Count: ${data.count}\n`;
      report += `  Min: ${data.min.toFixed(2)}ms\n`;
      report += `  Max: ${data.max.toFixed(2)}ms\n`;
      report += `  Avg: ${data.avg.toFixed(2)}ms\n`;
      report += `  P50: ${data.p50.toFixed(2)}ms\n`;
      report += `  P95: ${data.p95.toFixed(2)}ms\n`;
      report += `  P99: ${data.p99.toFixed(2)}ms\n\n`;
    }

    report += '═══════════════════════════════════════════\n';
    return report;
  }
}

// Export singleton
export const performanceMonitor = new PerformanceMonitor();

/**
 * Database connection pool monitor
 */
export class ConnectionPoolMonitor {
  private activeConnections = 0;
  private totalConnections = 0;
  private totalWaitTime = 0;
  private waitCount = 0;

  recordConnectionAcquired(): void {
    this.activeConnections++;
    this.totalConnections++;
  }

  recordConnectionReleased(): void {
    this.activeConnections--;
  }

  recordWait(waitTime: number): void {
    this.totalWaitTime += waitTime;
    this.waitCount++;
  }

  getStats() {
    return {
      activeConnections: this.activeConnections,
      totalConnections: this.totalConnections,
      avgWaitTime: this.waitCount > 0 ? this.totalWaitTime / this.waitCount : 0,
      waitCount: this.waitCount,
    };
  }

  reset(): void {
    this.activeConnections = 0;
    this.totalConnections = 0;
    this.totalWaitTime = 0;
    this.waitCount = 0;
  }
}

/**
 * Query performance tracker
 */
export class QueryPerformanceTracker {
  private queryMetrics: Map<string, PerformanceMetric[]> = new Map();

  trackQuery(query: string, duration: number, success: boolean, rowsAffected?: number): void {
    // Normalize query for grouping (remove values)
    const normalizedQuery = query.replace(/\b\d+\b/g, '?').replace(/'.+?'/g, "'?'");

    if (!this.queryMetrics.has(normalizedQuery)) {
      this.queryMetrics.set(normalizedQuery, []);
    }

    this.queryMetrics.get(normalizedQuery)!.push({
      name: normalizedQuery,
      duration,
      timestamp: Date.now(),
      success,
      tags: { rowsAffected: rowsAffected?.toString() || '0' },
    });
  }

  getSlowQueries(thresholdMs: number = 500): string[] {
    const slowQueries: string[] = [];

    for (const [query, metrics] of this.queryMetrics) {
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      if (avgDuration > thresholdMs) {
        slowQueries.push(`${query} (avg: ${avgDuration.toFixed(2)}ms)`);
      }
    }

    return slowQueries.sort(
      (a, b) =>
        parseFloat(b.match(/\d+\.\d+/)?.[0] || '0') - parseFloat(a.match(/\d+\.\d+/)?.[0] || '0')
    );
  }

  getStats(query: string): PerformanceStats | null {
    const metrics = this.queryMetrics.get(query);
    if (!metrics || metrics.length === 0) return null;

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const count = durations.length;
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count,
      min: durations[0],
      max: durations[count - 1],
      avg: sum / count,
      p50: durations[Math.floor(count * 0.5)],
      p95: durations[Math.floor(count * 0.95)],
      p99: durations[Math.floor(count * 0.99)],
    };
  }

  clear(): void {
    this.queryMetrics.clear();
  }
}

export const queryPerformanceTracker = new QueryPerformanceTracker();

/**
 * Memory usage tracker
 */
export function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
  };
}

/**
 * CPU usage tracker (basic)
 */
let lastCpuUsage = process.cpuUsage();

export function getCpuUsage() {
  const cpuUsage = process.cpuUsage(lastCpuUsage);
  lastCpuUsage = process.cpuUsage();

  return {
    user: cpuUsage.user / 1000,
    system: cpuUsage.system / 1000,
  };
}
