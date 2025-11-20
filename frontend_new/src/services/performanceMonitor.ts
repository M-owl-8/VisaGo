import * as Sentry from '@sentry/react-native';
import {logMessage} from './errorLogger';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled: boolean = !__DEV__;

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

    // Add breadcrumb for tracking
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `Started measuring: ${name}`,
      level: 'info',
      data: metadata,
    });
  }

  /**
   * End tracking and record the metric
   */
  endMeasure(
    name: string,
    additionalMetadata?: Record<string, any>,
  ): number | null {
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

    // Log to Sentry
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `Completed: ${name}`,
      level: 'info',
      data: {
        duration,
        ...metric.metadata,
      },
    });

    // Log slow operations
    if (duration > 3000) {
      logMessage(`Slow operation detected: ${name}`, {
        duration,
        ...metric.metadata,
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
   * Track screen load time
   */
  trackScreenLoad(screenName: string, metadata?: Record<string, any>): void {
    const measureName = `screen_load_${screenName}`;
    this.startMeasure(measureName, {
      screen: screenName,
      ...metadata,
    });

    // Auto-end after a reasonable timeout
    setTimeout(() => {
      if (this.metrics.has(measureName)) {
        this.endMeasure(measureName);
      }
    }, 10000);
  }

  /**
   * Mark screen load complete
   */
  completeScreenLoad(screenName: string): void {
    const measureName = `screen_load_${screenName}`;
    this.endMeasure(measureName);
  }

  /**
   * Track API request performance
   */
  trackApiRequest(
    endpoint: string,
    method: string,
    metadata?: Record<string, any>,
  ): string {
    const measureName = `api_${method}_${endpoint}`;
    this.startMeasure(measureName, {
      endpoint,
      method,
      ...metadata,
    });
    return measureName;
  }

  /**
   * Complete API request tracking
   */
  completeApiRequest(
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
   * Track navigation performance
   */
  trackNavigation(from: string, to: string): void {
    const measureName = `navigation_${from}_to_${to}`;
    this.startMeasure(measureName, {from, to});

    // Auto-complete after timeout
    setTimeout(() => {
      if (this.metrics.has(measureName)) {
        this.endMeasure(measureName);
      }
    }, 5000);
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

export const performanceMonitor = new PerformanceMonitor();

// Export convenience functions
export const {
  startMeasure,
  endMeasure,
  measureAsync,
  measureSync,
  trackScreenLoad,
  completeScreenLoad,
  trackApiRequest,
  completeApiRequest,
  trackNavigation,
} = performanceMonitor;






