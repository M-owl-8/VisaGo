/**
 * Service Fallback Utilities
 * Provides graceful degradation and fallback mechanisms for external services
 */

export enum ServiceStatus {
  AVAILABLE = 'available',
  DEGRADED = 'degraded',
  UNAVAILABLE = 'unavailable',
  UNKNOWN = 'unknown',
}

export interface ServiceHealth {
  status: ServiceStatus;
  latency?: number;
  error?: string;
  lastChecked?: Date;
}

export interface FallbackConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  fallbackEnabled?: boolean;
}

const DEFAULT_FALLBACK_CONFIG: Required<FallbackConfig> = {
  maxRetries: 2,
  retryDelay: 1000,
  timeout: 10000,
  fallbackEnabled: true,
};

/**
 * Execute operation with retry and fallback
 */
export async function withServiceFallback<T>(
  operation: () => Promise<T>,
  fallback: () => Promise<T>,
  config: FallbackConfig = {}
): Promise<T> {
  const cfg = { ...DEFAULT_FALLBACK_CONFIG, ...config };

  // Try primary operation with retries
  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await withTimeout(operation(), cfg.timeout);
    } catch (error) {
      const isLastAttempt = attempt === cfg.maxRetries;

      if (isLastAttempt) {
        // All retries exhausted, try fallback
        if (cfg.fallbackEnabled) {
          console.warn(
            `Primary service failed after ${cfg.maxRetries + 1} attempts, using fallback`,
            error instanceof Error ? error.message : 'Unknown error'
          );
          try {
            return await withTimeout(fallback(), cfg.timeout);
          } catch (fallbackError) {
            throw new Error(
              `Both primary and fallback services failed. Primary: ${error instanceof Error ? error.message : 'Unknown'}, Fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}`
            );
          }
        }
        throw error;
      }

      // Wait before retry
      await sleep(cfg.retryDelay * (attempt + 1));
    }
  }

  throw new Error('Operation failed');
}

/**
 * Execute operation with timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check service health
 */
export async function checkServiceHealth(
  healthCheck: () => Promise<boolean>,
  timeout: number = 5000
): Promise<ServiceHealth> {
  const startTime = Date.now();

  try {
    const isHealthy = await withTimeout(healthCheck(), timeout);
    const latency = Date.now() - startTime;

    return {
      status: isHealthy ? ServiceStatus.AVAILABLE : ServiceStatus.DEGRADED,
      latency,
      lastChecked: new Date(),
    };
  } catch (error) {
    const latency = Date.now() - startTime;

    return {
      status: ServiceStatus.UNAVAILABLE,
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date(),
    };
  }
}

/**
 * Service availability checker
 */
export class ServiceAvailabilityChecker {
  private healthCache: Map<string, ServiceHealth> = new Map();
  private cacheTTL: number = 30000; // 30 seconds

  /**
   * Check if service is available (with caching)
   */
  async isAvailable(
    serviceName: string,
    healthCheck: () => Promise<boolean>,
    timeout: number = 5000
  ): Promise<boolean> {
    const cached = this.healthCache.get(serviceName);
    const now = Date.now();

    // Use cached result if still valid
    if (cached && cached.lastChecked) {
      const age = now - cached.lastChecked.getTime();
      if (age < this.cacheTTL) {
        return cached.status === ServiceStatus.AVAILABLE;
      }
    }

    // Perform fresh health check
    const health = await checkServiceHealth(healthCheck, timeout);
    this.healthCache.set(serviceName, health);

    return health.status === ServiceStatus.AVAILABLE;
  }

  /**
   * Get service health status
   */
  getHealth(serviceName: string): ServiceHealth | null {
    return this.healthCache.get(serviceName) || null;
  }

  /**
   * Clear health cache
   */
  clearCache(): void {
    this.healthCache.clear();
  }
}

// Global instance
export const serviceAvailabilityChecker = new ServiceAvailabilityChecker();
