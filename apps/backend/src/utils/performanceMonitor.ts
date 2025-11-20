import * as Sentry from '@sentry/node';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class BackendPerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled: boolean = process.env.NODE_ENV === 'production';

  /**
   * Start tracking a performance metric
   */
  startMeasure(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    this.metrics.set(name, {
      name,
      startTime: Date.now(),
      metadata,
    });
  }

  /**
   * End tracking and record the metric
   */
  endMeasure(name: string, additionalMetadata?: Record<string, any>): number | null {
    if (!this.enabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`[PerformanceMonitor] No metric found for: ${name}`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    // Merge additional metadata
    if (additionalMetadata) {
      metric.metadata = {...metric.metadata, ...additionalMetadata};
    }

    // Log slow operations
    if (duration > 5000) {
      console.warn(`[Performance] Slow operation: ${name} took ${duration}ms`, metric.metadata);
      
      // Report to Sentry
      Sentry.captureMessage(`Slow operation: ${name}`, {
        level: 'warning',
        extra: {
          duration,
          ...metric.metadata,
        },
        tags: {
          performance: 'slow',
          operation: name,
        },
      });
    }

    // Clean up
    this.metrics.delete(name);

    return duration;
  }

  /**
   * Measure an async operation
   */
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    this.startMeasure(name, metadata);
    try {
      const result = await operation();
      this.endMeasure(name, {success: true});
      return result;
    } catch (error) {
      this.endMeasure(name, {success: false, error: String(error)});
      throw error;
    }
  }

  /**
   * Measure a synchronous operation
   */
  measureSync<T>(
    name: string,
    operation: () => T,
    metadata?: Record<string, any>,
  ): T {
    this.startMeasure(name, metadata);
    try {
      const result = operation();
      this.endMeasure(name, {success: true});
      return result;
    } catch (error) {
      this.endMeasure(name, {success: false, error: String(error)});
      throw error;
    }
  }

  /**
   * Track database query performance
   */
  trackDbQuery(
    operation: string,
    model: string,
    metadata?: Record<string, any>,
  ): string {
    const measureName = `db_${model}_${operation}`;
    this.startMeasure(measureName, {
      operation,
      model,
      ...metadata,
    });
    return measureName;
  }

  /**
   * Complete database query tracking
   */
  completeDbQuery(measureName: string, rowCount?: number, error?: any): void {
    this.endMeasure(measureName, {
      rowCount,
      error: error ? String(error) : undefined,
      success: !error,
    });
  }

  /**
   * Track external API call performance
   */
  trackExternalApi(
    service: string,
    endpoint: string,
    metadata?: Record<string, any>,
  ): string {
    const measureName = `external_${service}_${endpoint}`;
    this.startMeasure(measureName, {
      service,
      endpoint,
      ...metadata,
    });
    return measureName;
  }

  /**
   * Complete external API tracking
   */
  completeExternalApi(
    measureName: string,
    statusCode?: number,
    error?: any,
  ): void {
    this.endMeasure(measureName, {
      statusCode,
      error: error ? String(error) : undefined,
      success: !error && statusCode && statusCode < 400,
    });
  }

  /**
   * Enable/disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

export const performanceMonitor = new BackendPerformanceMonitor();

// Export convenience functions
export const {
  startMeasure,
  endMeasure,
  measureAsync,
  measureSync,
  trackDbQuery,
  completeDbQuery,
  trackExternalApi,
  completeExternalApi,
} = performanceMonitor;


