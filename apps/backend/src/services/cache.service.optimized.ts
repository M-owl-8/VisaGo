/**
 * Optimized caching service with Redis support
 * Implements smart cache invalidation and TTL management
 */

import Redis from 'ioredis';
// import { Logger } from '../utils/logger';
// const logger = new Logger('CacheService');

interface CacheConfig {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

export class OptimizedCacheService {
  private redis: Redis | null = null;
  private localCache: Map<string, any> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
  };

  // Cache TTL configuration (in seconds)
  private readonly TTL_CONFIG = {
    USER: 3600, // 1 hour
    COUNTRY: 86400, // 24 hours
    VISA_TYPE: 86400, // 24 hours
    CHAT_SESSION: 28800, // 8 hours
    CHAT_MESSAGE: 28800, // 8 hours
    APPLICATION: 3600, // 1 hour
    DEFAULT: 1800, // 30 minutes
  };

  constructor(redisUrl?: string) {
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl);
        this.redis.on('error', (err) => console.error('Redis error:', err));
        this.redis.on('connect', () => console.log('Redis connected'));
        console.log('Redis cache initialized');
      } catch (error) {
        console.warn('Failed to initialize Redis, using in-memory cache:', error);
        this.redis = null;
      }
    }
  }

  /**
   * Get value from cache (Redis first, then local)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first
      if (this.redis) {
        const data = await this.redis.get(key);
        if (data) {
          this.stats.hits++;
          console.debug(`Cache hit: ${key}`);
          return JSON.parse(data) as T;
        }
      }

      // Try local cache
      if (this.localCache.has(key)) {
        this.stats.hits++;
        console.debug(`Local cache hit: ${key}`);
        return this.localCache.get(key) as T;
      }

      this.stats.misses++;
      console.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      console.error(`Cache get error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with automatic TTL
   */
  async set<T>(key: string, value: T, config?: CacheConfig): Promise<void> {
    try {
      const ttl = config?.ttl || this.TTL_CONFIG.DEFAULT;
      const serialized = JSON.stringify(value);

      // Set in local cache immediately
      this.localCache.set(key, value);

      // Also set in Redis if available
      if (this.redis) {
        await this.redis.setex(key, ttl, serialized);
        console.debug(`Cache set (Redis): ${key} TTL: ${ttl}s`);
      } else {
        // Simple expiration for local cache
        setTimeout(() => this.localCache.delete(key), ttl * 1000);
        console.debug(`Cache set (Local): ${key} TTL: ${ttl}s`);
      }

      this.stats.sets++;
    } catch (error) {
      console.error(`Cache set error for ${key}:`, error);
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      this.localCache.delete(key);

      if (this.redis) {
        await this.redis.del(key);
        console.debug(`Cache deleted: ${key}`);
      }

      this.stats.deletes++;
    } catch (error) {
      console.error(`Cache delete error for ${key}:`, error);
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      // Local cache pattern delete
      for (const key of this.localCache.keys()) {
        if (this.matchPattern(key, pattern)) {
          this.localCache.delete(key);
        }
      }

      // Redis pattern delete
      if (this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          console.debug(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
        }
      }
    } catch (error) {
      console.error(`Cache pattern delete error for ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      this.localCache.clear();

      if (this.redis) {
        await this.redis.flushall();
        console.log('All cache cleared');
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Cache invalidation hooks - call after updates
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.delete(`user:${userId}`);
    console.debug(`User cache invalidated: ${userId}`);
  }

  async invalidateCountries(): Promise<void> {
    await this.deletePattern('country:*');
    await this.delete('countries:list');
    console.debug('Countries cache invalidated');
  }

  async invalidateVisaTypes(countryId?: string): Promise<void> {
    if (countryId) {
      await this.deletePattern(`visa:${countryId}:*`);
    } else {
      await this.deletePattern('visa:*');
    }
    console.debug('Visa types cache invalidated');
  }

  async invalidateApplication(appId: string): Promise<void> {
    await this.delete(`app:${appId}`);
    console.debug(`Application cache invalidated: ${appId}`);
  }

  async invalidateChatSession(sessionId: string): Promise<void> {
    await this.deletePattern(`chat:${sessionId}:*`);
    console.debug(`Chat session cache invalidated: ${sessionId}`);
  }

  /**
   * Get or compute value if not in cache
   */
  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    config?: CacheConfig
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) {
      return cached;
    }

    const value = await compute();
    await this.set(key, value, config);
    return value;
  }

  /**
   * Set multiple values at once
   */
  async setMultiple<T>(
    values: Record<string, T>,
    config?: CacheConfig
  ): Promise<void> {
    for (const [key, value] of Object.entries(values)) {
      await this.set(key, value, config);
    }
  }

  /**
   * Get multiple values at once
   */
  async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};

    for (const key of keys) {
      result[key] = await this.get<T>(key);
    }

    return result;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };
  }

  /**
   * Simple pattern matching (supports * wildcard)
   */
  private matchPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    return regex.test(key);
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      console.log('Cache service disconnected');
    }
  }
}

// Export singleton instance
export const cacheService = new OptimizedCacheService(
  process.env.REDIS_URL
);