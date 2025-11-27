/**
 * Slow Query Logger Service
 * Monitors and logs database queries that exceed performance thresholds
 * Helps identify bottlenecks and optimize queries
 */

import { PrismaClient } from '@prisma/client';

interface SlowQuery {
  query: string;
  duration: number; // milliseconds
  timestamp: number;
  model?: string;
  action?: string;
  params?: any;
  durationCategory: 'warning' | 'critical';
}

interface SlowQueryStats {
  total: number;
  byModel: Record<string, number>;
  byAction: Record<string, number>;
  slowest: SlowQuery[];
  average: number;
  p95: number;
  p99: number;
}

/**
 * Monitors Prisma queries for performance issues
 * Logs slow queries and provides statistics for analysis
 */
export class SlowQueryLogger {
  private slowQueries: SlowQuery[] = [];
  private allQueries: { duration: number; timestamp: number }[] = [];
  private readonly WARNING_THRESHOLD = 500; // 500ms - warn on slow queries
  private readonly CRITICAL_THRESHOLD = 2000; // 2 seconds - critical performance issue
  private readonly MAX_QUERY_HISTORY = 10000; // Keep last 10,000 queries for analysis
  private isEnabled = true;

  constructor(private prisma: PrismaClient) {
    this.initializeQueryMonitoring();
  }

  /**
   * Initialize Prisma query monitoring
   */
  private initializeQueryMonitoring(): void {
    // Configure Prisma logging with query event handler
    // Note: Prisma query events are only available in certain versions
    // This initializes the service structure for query monitoring

    try {
      // Use any available Prisma event listeners if enabled
      if ((this.prisma as any).$on) {
        // Try to hook into 'query' event if available (Prisma Client with logging enabled)
        try {
          (this.prisma as any).$on('query', (e: any) => {
            this.handleQueryEvent(e);
          });
        } catch (err) {
          // Query events not available in this Prisma version
          console.debug('Prisma query events not available, using fallback monitoring');
        }

        try {
          (this.prisma as any).$on('error', (e: any) => {
            console.error('🔴 Prisma Error:', e.message);
          });
        } catch (err) {
          // Error events not available
        }
      }
    } catch (error) {
      console.debug('Prisma event listeners not fully supported, slow query logging degraded');
    }
  }

  /**
   * Handle query event from Prisma
   */
  private handleQueryEvent(e: any): void {
    const duration = e.durationMs || 0;

    // Track all queries for statistics
    this.allQueries.push({
      duration,
      timestamp: Date.now(),
    });

    // Keep only recent queries to prevent memory issues
    if (this.allQueries.length > this.MAX_QUERY_HISTORY) {
      this.allQueries = this.allQueries.slice(-this.MAX_QUERY_HISTORY);
    }

    // Log slow queries
    if (duration >= this.WARNING_THRESHOLD && this.isEnabled) {
      this.recordSlowQuery({
        query: e.query || 'unknown',
        duration,
        timestamp: Date.now(),
        model: this.extractModel(e.query || ''),
        action: this.extractAction(e.query || ''),
        params: e.params,
        durationCategory: duration >= this.CRITICAL_THRESHOLD ? 'critical' : 'warning',
      });
    }
  }

  /**
   * Record a slow query
   */
  private recordSlowQuery(query: SlowQuery): void {
    this.slowQueries.push(query);

    // Keep only recent slow queries
    if (this.slowQueries.length > 1000) {
      this.slowQueries = this.slowQueries.slice(-1000);
    }

    // Log with appropriate severity
    const logLevel = query.durationCategory === 'critical' ? '🔴' : '⚠️ ';
    const threshold =
      query.durationCategory === 'critical' ? this.CRITICAL_THRESHOLD : this.WARNING_THRESHOLD;

    console.warn(
      `${logLevel} SLOW QUERY [${query.durationCategory.toUpperCase()}] ` +
        `${query.model}/${query.action} - ${query.duration}ms (threshold: ${threshold}ms)`
    );

    // Log query details in development
    if (process.env.NODE_ENV === 'development') {
      console.debug(`Query: ${query.query.substring(0, 100)}...`);
      if (query.params) {
        console.debug(`Params:`, query.params);
      }
    }

    // Send alert for critical queries
    if (query.durationCategory === 'critical') {
      this.sendCriticalAlert(query);
    }
  }

  /**
   * Send alert for critical performance issues
   */
  private sendCriticalAlert(query: SlowQuery): void {
    // In production, this would send alerts to monitoring systems like:
    // - DataDog
    // - New Relic
    // - Sentry
    // - PagerDuty
    // - Slack webhooks

    const alert = {
      severity: 'critical',
      service: 'database',
      message: `Critical slow query detected: ${query.model}/${query.action}`,
      duration: query.duration,
      threshold: this.CRITICAL_THRESHOLD,
      timestamp: new Date(query.timestamp).toISOString(),
    };

    // Log for now (implement your alerting service here)
    console.error('🚨 CRITICAL ALERT:', alert);

    // TODO: Send to monitoring service
    // await monitoringService.sendAlert(alert);
  }

  /**
   * Extract database model from query
   */
  private extractModel(query: string): string {
    const match = query.match(/FROM\s+"(\w+)"|INTO\s+"(\w+)|UPDATE\s+"(\w+)/i);
    return match ? match[1] || match[2] || match[3] : 'unknown';
  }

  /**
   * Extract action (SELECT, INSERT, UPDATE, DELETE) from query
   */
  private extractAction(query: string): string {
    const match = query.match(/^(SELECT|INSERT|UPDATE|DELETE)/i);
    return match ? match[1].toUpperCase() : 'UNKNOWN';
  }

  /**
   * Get slow query statistics
   */
  getStats(): SlowQueryStats {
    const byModel: Record<string, number> = {};
    const byAction: Record<string, number> = {};

    for (const query of this.slowQueries) {
      byModel[query.model || 'unknown'] = (byModel[query.model || 'unknown'] || 0) + 1;
      byAction[query.action || 'unknown'] = (byAction[query.action || 'unknown'] || 0) + 1;
    }

    const durations = this.allQueries.map((q) => q.duration).sort((a, b) => a - b);
    const average =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const p95 = this.getPercentile(durations, 95);
    const p99 = this.getPercentile(durations, 99);

    return {
      total: this.slowQueries.length,
      byModel,
      byAction,
      slowest: this.slowQueries.slice(-10),
      average: Math.round(average),
      p95: Math.round(p95),
      p99: Math.round(p99),
    };
  }

  /**
   * Get all slow queries
   */
  getSlowQueries(): SlowQuery[] {
    return [...this.slowQueries];
  }

  /**
   * Get slow queries for a specific model
   */
  getSlowQueriesByModel(model: string): SlowQuery[] {
    return this.slowQueries.filter((q) => q.model === model);
  }

  /**
   * Get slow queries for a specific action
   */
  getSlowQueriesByAction(action: string): SlowQuery[] {
    return this.slowQueries.filter((q) => q.action === action);
  }

  /**
   * Get query performance report
   */
  getPerformanceReport() {
    const stats = this.getStats();
    const criticalCount = this.slowQueries.filter((q) => q.durationCategory === 'critical').length;
    const warningCount = this.slowQueries.filter((q) => q.durationCategory === 'warning').length;

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalSlowQueries: stats.total,
        critical: criticalCount,
        warnings: warningCount,
        averageQueryTime: `${stats.average}ms`,
        p95: `${stats.p95}ms`,
        p99: `${stats.p99}ms`,
      },
      byModel: stats.byModel,
      byAction: stats.byAction,
      recommendations: this.generateRecommendations(stats),
      slowest: stats.slowest.slice(0, 5),
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(stats: SlowQueryStats): string[] {
    const recommendations: string[] = [];

    // Check for models with many slow queries
    for (const [model, count] of Object.entries(stats.byModel)) {
      if (count > 5) {
        recommendations.push(
          `Model "${model}" has ${count} slow queries. Consider adding indexes or optimizing queries.`
        );
      }
    }

    // Check for specific patterns
    if (stats.byAction['SELECT'] && stats.byAction['SELECT'] > 10) {
      recommendations.push(
        'Many SELECT queries are slow. Consider adding database indexes or using query caching.'
      );
    }

    if (stats.byAction['UPDATE'] && stats.byAction['UPDATE'] > 5) {
      recommendations.push(
        'UPDATE queries are slow. Consider batch updating or reviewing transaction isolation levels.'
      );
    }

    if (stats.p99 > 5000) {
      recommendations.push(
        'P99 query time exceeds 5 seconds. Investigate and optimize the slowest queries immediately.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✓ Query performance is within acceptable parameters.');
    }

    return recommendations;
  }

  /**
   * Reset slow query history
   */
  reset(): void {
    this.slowQueries = [];
    this.allQueries = [];
    console.log('✓ Slow query logger reset');
  }

  /**
   * Enable/disable slow query logging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`Slow query logger ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set performance thresholds
   */
  setThresholds(warning: number, critical: number): void {
    if (warning < critical) {
      // @ts-ignore - Override private for configuration
      this.WARNING_THRESHOLD = warning;
      // @ts-ignore - Override private for configuration
      this.CRITICAL_THRESHOLD = critical;
      console.log(`⚙️  Thresholds set - Warning: ${warning}ms, Critical: ${critical}ms`);
    } else {
      console.warn('⚠️  Invalid thresholds: warning must be less than critical');
    }
  }

  /**
   * Calculate percentile value
   */
  private getPercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, index)];
  }

  /**
   * Export slow queries as JSON
   */
  exportAsJSON() {
    return {
      exportedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      stats: this.getStats(),
      report: this.getPerformanceReport(),
    };
  }
}

// Singleton instance
let slowQueryLoggerInstance: SlowQueryLogger | null = null;

export function getSlowQueryLogger(prisma: PrismaClient): SlowQueryLogger {
  if (!slowQueryLoggerInstance) {
    slowQueryLoggerInstance = new SlowQueryLogger(prisma);
  }
  return slowQueryLoggerInstance;
}

export default SlowQueryLogger;
