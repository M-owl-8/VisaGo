/**
 * Optimized caching service with Redis support for Railway
 * Implements smart cache invalidation and TTL management
 * Features: Multi-layer caching, pattern invalidation, cache warming, statistics
 */

import Redis from 'ioredis';

interface CacheConfig {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
  tags?: string[]; // Tags for grouping related cache entries
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  redisConnected: boolean;
  localCacheSize: number;
}

interface CacheEntry<T> {
  value: T;
  tags?: string[];
  createdAt: number;
  ttl: number;
}

/**
 * Multi-layer cache with Redis and local fallback
 * Optimized for high-concurrency environments (200+ connections)
 */
export class OptimizedCacheService {
  private redis: Redis | null = null;
  private localCache: Map<string, CacheEntry<any>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map(); // Track which keys have which tags
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
    redisConnected: false,
    localCacheSize: 0,
  };

  // Cache TTL configuration (in seconds) - optimized for production
  private readonly TTL_CONFIG = {
    PAYMENT_METHOD: 3600, // 1 hour - payment methods change rarely
    EXCHANGE_RATE: 900, // 15 minutes - rates update frequently
    USER: 1800, // 30 minutes - user data can change
    USER_PROFILE: 3600, // 1 hour - profile changes less frequently
    COUNTRY: 86400, // 24 hours - country data is static
    VISA_TYPE: 86400, // 24 hours - visa types are static
    DOCUMENT_TYPE: 86400, // 24 hours - document types are static
    CHAT_SESSION: 28800, // 8 hours - session duration
    CHAT_MESSAGE: 28800, // 8 hours - message history
    APPLICATION: 3600, // 1 hour - application status can change
    WEBHOOK_IDEMPOTENCY: 86400, // 24 hours - prevent duplicate webhook processing
    AUTH_TOKEN: 3600, // 1 hour - auth tokens
    API_RESPONSE: 300, // 5 minutes - generic API responses
    DEFAULT: 1800, // 30 minutes - default fallback
  };

  // Maximum cache sizes to prevent memory issues
  private readonly MAX_LOCAL_CACHE_SIZE = 5000; // entries
  private readonly MAX_METRICS_HISTORY = 1000; // keep last 1000 operations

  constructor(redisUrl?: string) {
    if (redisUrl) {
      try {
        // Configure Redis for Railway connection
        this.redis = new Redis(redisUrl, {
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          enableOfflineQueue: true,
          // For Railway Redis (cloud-hosted)
          lazyConnect: false,
          autoResubscribe: true,
          tls: redisUrl.includes('rediss://') ? {} : undefined,
        });

        this.redis.on('error', (err) => {
          console.error('❌ Redis error:', err.message);
          this.stats.redisConnected = false;
        });

        this.redis.on('connect', () => {
          console.log('✓ Redis connected successfully');
          this.stats.redisConnected = true;
        });

        this.redis.on('close', () => {
          console.warn('⚠️  Redis connection closed');
          this.stats.redisConnected = false;
        });

        console.log('🔴 Redis cache initialized (Railway)');
      } catch (error) {
        console.warn('⚠️  Failed to initialize Redis, using in-memory cache:', error);
        this.redis = null;
      }
    } else {
      console.log('🟡 Using in-memory cache (no Redis URL provided)');
    }
  }

  /**
   * Get value from cache (Redis first, then local)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first if available
      if (this.redis?.status === 'ready') {
        try {
          const data = await this.redis.get(key);
          if (data) {
            this.stats.hits++;
            this.updateHitRate();
            console.debug(`✓ Cache HIT (Redis): ${key}`);
            return JSON.parse(data) as T;
          }
        } catch (error) {
          console.debug(`Cache Redis error for ${key}:`, error);
          // Fall through to local cache
        }
      }

      // Try local cache
      if (this.localCache.has(key)) {
        const entry = this.localCache.get(key)!;
        
        // Check if entry has expired (TTL-based)
        const age = Date.now() - entry.createdAt;
        if (age > entry.ttl * 1000) {
          this.localCache.delete(key);
          this.stats.misses++;
          this.updateHitRate();
          return null;
        }
        
        this.stats.hits++;
        this.updateHitRate();
        console.debug(`✓ Cache HIT (Local): ${key}`);
        return entry.value as T;
      }

      this.stats.misses++;
      this.updateHitRate();
      console.debug(`✗ Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error(`Cache get error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with automatic TTL and tag support
   */
  async set<T>(key: string, value: T, config?: CacheConfig): Promise<void> {
    try {
      const ttl = config?.ttl || this.TTL_CONFIG.DEFAULT;
      const tags = config?.tags || [];
      const serialized = JSON.stringify(value);

      // Create cache entry with metadata
      const entry: CacheEntry<T> = {
        value,
        tags: tags.length > 0 ? tags : undefined,
        createdAt: Date.now(),
        ttl,
      };

      // Set in local cache immediately
      this.setLocalCache(key, entry);

      // Track tags for later invalidation
      if (tags.length > 0) {
        for (const tag of tags) {
          if (!this.tagIndex.has(tag)) {
            this.tagIndex.set(tag, new Set());
          }
          this.tagIndex.get(tag)!.add(key);
        }
      }

      // Also set in Redis if available
      if (this.redis?.status === 'ready') {
        try {
          await this.redis.setex(key, ttl, serialized);
          console.debug(`✓ Cache SET (Redis): ${key} TTL: ${ttl}s`);
        } catch (error) {
          console.debug(`Cache Redis set error for ${key}:`, error);
          // Continue with local cache only
        }
      } else {
        console.debug(`✓ Cache SET (Local): ${key} TTL: ${ttl}s`);
      }

      this.stats.sets++;
      this.updateStats();
    } catch (error) {
      console.error(`Cache set error for ${key}:`, error);
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<void> {
    try {
      const entry = this.localCache.get(key);
      
      // Remove from tag index
      if (entry?.tags) {
        for (const tag of entry.tags) {
          this.tagIndex.get(tag)?.delete(key);
        }
      }

      this.localCache.delete(key);

      if (this.redis?.status === 'ready') {
        try {
          await this.redis.del(key);
          console.debug(`✓ Cache DELETED: ${key}`);
        } catch (error) {
          console.debug(`Cache Redis delete error for ${key}:`, error);
        }
      }

      this.stats.deletes++;
    } catch (error) {
      console.error(`Cache delete error for ${key}:`, error);
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    let deletedCount = 0;

    try {
      // Local cache pattern delete
      for (const key of this.localCache.keys()) {
        if (this.matchPattern(key, pattern)) {
          await this.delete(key);
          deletedCount++;
        }
      }

      // Redis pattern delete
      if (this.redis?.status === 'ready') {
        try {
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
            deletedCount += keys.length;
            console.debug(`✓ Cache PATTERN DELETE: ${pattern} (${keys.length} keys)`);
          }
        } catch (error) {
          console.debug(`Cache Redis pattern delete error:`, error);
        }
      }
    } catch (error) {
      console.error(`Cache pattern delete error for ${pattern}:`, error);
    }

    return deletedCount;
  }

  /**
   * Invalidate cache by tag - useful for cascading invalidation
   */
  async invalidateByTag(tag: string): Promise<number> {
    let deletedCount = 0;
    const keys = this.tagIndex.get(tag);

    if (keys && keys.size > 0) {
      for (const key of keys) {
        await this.delete(key);
        deletedCount++;
      }
      this.tagIndex.delete(tag);
      console.log(`✓ Tag invalidation: ${tag} (${deletedCount} keys deleted)`);
    }

    return deletedCount;
  }

  /**
   * Clear all cache
   */
  async flushAll(): Promise<void> {
    try {
      this.localCache.clear();
      this.tagIndex.clear();

      if (this.redis?.status === 'ready') {
        try {
          await this.redis.flushdb();
          console.log('✓ All Redis cache cleared');
        } catch (error) {
          console.debug(`Cache Redis flush error:`, error);
        }
      }

      console.log('✓ All cache cleared');
    } catch (error) {
      console.error(`Cache flush error:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      localCacheSize: this.localCache.size,
    };
  }

  /**
   * Get detailed cache info for monitoring
   */
  async getCacheInfo(): Promise<any> {
    const stats = this.getStats();
    let redisInfo = null;

    if (this.redis?.status === 'ready') {
      try {
        redisInfo = await this.redis.info('stats');
      } catch (error) {
        console.debug('Could not get Redis info:', error);
      }
    }

    return {
      timestamp: new Date().toISOString(),
      local: {
        size: this.localCache.size,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hitRate,
      },
      redis: {
        connected: this.stats.redisConnected,
        info: redisInfo ? redisInfo.split('\r\n').filter((line: string) => line && !line.startsWith('#')) : null,
      },
      overall: {
        totalOperations: stats.sets + stats.deletes,
        totalHits: stats.hits,
        totalMisses: stats.misses,
        hitRate: stats.hitRate,
      },
    };
  }

  /**
   * Cache warming - preload commonly used data
   */
  async warmCache(dataLoader: () => Promise<Array<{ key: string; value: any; ttl?: number }>>, batchSize: number = 100): Promise<number> {
    try {
      console.log('🔥 Starting cache warming...');
      const data = await dataLoader();
      let count = 0;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await Promise.all(
          batch.map(item =>
            this.set(item.key, item.value, { ttl: item.ttl })
          )
        );
        count += batch.length;
        console.debug(`Cache warming progress: ${count}/${data.length}`);
      }

      console.log(`✓ Cache warming complete: ${count} entries loaded`);
      return count;
    } catch (error) {
      console.error('Cache warming error:', error);
      return 0;
    }
  }

  /**
   * Health check for cache infrastructure
   */
  async healthCheck(): Promise<{ healthy: boolean; redis: boolean; local: boolean }> {
    const redisHealthy = this.redis?.status === 'ready';
    const localHealthy = this.localCache.size >= 0;

    return {
      healthy: redisHealthy || localHealthy,
      redis: redisHealthy,
      local: localHealthy,
    };
  }

  /**
   * Private: Set value in local cache with size management
   */
  private setLocalCache(key: string, entry: CacheEntry<any>): void {
    // If cache is getting too large, evict oldest entries
    if (this.localCache.size >= this.MAX_LOCAL_CACHE_SIZE) {
      // Remove entries with oldest creation time (simple LRU-like behavior)
      const entries = Array.from(this.localCache.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt);
      
      // Remove oldest 10% of entries
      const toRemove = Math.ceil(this.MAX_LOCAL_CACHE_SIZE * 0.1);
      for (let i = 0; i < toRemove; i++) {
        this.localCache.delete(entries[i][0]);
      }
      console.debug(`Local cache eviction: removed ${toRemove} old entries`);
    }

    this.localCache.set(key, entry);
  }

  /**
   * Private: Match cache key pattern (supports * wildcard)
   */
  private matchPattern(key: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(key);
  }

  /**
   * Private: Update hit rate statistic
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Private: Update overall statistics
   */
  private updateStats(): void {
    this.stats.localCacheSize = this.localCache.size;
    this.updateHitRate();
  }

  /**
   * Close Redis connection gracefully
   */
  async close(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
        console.log('✓ Redis connection closed');
      } catch (error) {
        console.error('Error closing Redis:', error);
      }
    }
  }
}

// Singleton instance
let cacheServiceInstance: OptimizedCacheService | null = null;

export function getCacheService(redisUrl?: string): OptimizedCacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new OptimizedCacheService(redisUrl || process.env.REDIS_URL);
  }
  return cacheServiceInstance;
}

export default OptimizedCacheService;