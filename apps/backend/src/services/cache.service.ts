import NodeCache from "node-cache";

/**
 * Cache Service using node-cache
 * Stores frequently accessed data in memory for faster retrieval
 * 
 * Cache Keys:
 * - countries:{id} - Individual country data (TTL: 1 day)
 * - countries:all - All countries list (TTL: 1 day)
 * - visa-types:{countryId} - Visa types for country (TTL: 1 day)
 * - documents:{visaTypeId} - Documents for visa type (TTL: 1 day)
 * - user:{userId}:profile - User profile (TTL: 1 hour)
 * - session:{sessionId} - Session data (TTL: 24 hours)
 */

export class CacheService {
  private static instance: NodeCache;
  private static readonly TTL = {
    SHORT: 300, // 5 minutes
    MEDIUM: 3600, // 1 hour
    LONG: 86400, // 24 hours
  };

  /**
   * Initialize cache service (singleton pattern)
   */
  static getInstance(): NodeCache {
    if (!CacheService.instance) {
      CacheService.instance = new NodeCache({
        stdTTL: CacheService.TTL.MEDIUM,
        checkperiod: 600, // Check for expired keys every 10 minutes
        useClones: false, // Don't clone values (better performance)
      });
    }
    return CacheService.instance;
  }

  /**
   * Get value from cache
   */
  static get<T>(key: string): T | undefined {
    return CacheService.getInstance().get<T>(key);
  }

  /**
   * Set value in cache with optional TTL
   */
  static set<T>(key: string, value: T, ttl?: number): void {
    const cache = CacheService.getInstance();
    if (ttl) {
      cache.set(key, value, ttl);
    } else {
      cache.set(key, value);
    }
  }

  /**
   * Delete value from cache
   */
  static del(key: string): number {
    return CacheService.getInstance().del(key);
  }

  /**
   * Clear all cache
   */
  static flushAll(): void {
    CacheService.getInstance().flushAll();
  }

  /**
   * Get cache statistics
   */
  static getStats() {
    return CacheService.getInstance().getStats();
  }

  /**
   * Cache country data
   */
  static cacheCountry(countryId: string, data: any): void {
    this.set(`countries:${countryId}`, data, this.TTL.LONG);
  }

  /**
   * Get cached country
   */
  static getCountry(countryId: string): any {
    return this.get(`countries:${countryId}`);
  }

  /**
   * Cache all countries
   */
  static cacheCountries(data: any[]): void {
    this.set("countries:all", data, this.TTL.LONG);
  }

  /**
   * Get cached countries
   */
  static getCountries(): any[] | undefined {
    return this.get("countries:all");
  }

  /**
   * Invalidate country cache
   */
  static invalidateCountryCache(countryId?: string): void {
    if (countryId) {
      this.del(`countries:${countryId}`);
    }
    this.del("countries:all");
  }

  /**
   * Cache visa types
   */
  static cacheVisaTypes(countryId: string, data: any[]): void {
    this.set(`visa-types:${countryId}`, data, this.TTL.LONG);
  }

  /**
   * Get cached visa types
   */
  static getVisaTypes(countryId: string): any[] | undefined {
    return this.get(`visa-types:${countryId}`);
  }

  /**
   * Cache document types
   */
  static cacheDocuments(visaTypeId: string, data: any[]): void {
    this.set(`documents:${visaTypeId}`, data, this.TTL.LONG);
  }

  /**
   * Get cached document types
   */
  static getDocuments(visaTypeId: string): any[] | undefined {
    return this.get(`documents:${visaTypeId}`);
  }

  /**
   * Cache user profile
   */
  static cacheUserProfile(userId: string, data: any): void {
    this.set(`user:${userId}:profile`, data, this.TTL.MEDIUM);
  }

  /**
   * Get cached user profile
   */
  static getUserProfile(userId: string): any {
    return this.get(`user:${userId}:profile`);
  }

  /**
   * Invalidate user cache
   */
  static invalidateUserCache(userId: string): void {
    this.del(`user:${userId}:profile`);
  }
}

export default CacheService;