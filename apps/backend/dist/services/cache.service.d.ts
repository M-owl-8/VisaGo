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
export declare class CacheService {
    private static instance;
    private static readonly TTL;
    /**
     * Initialize cache service (singleton pattern)
     */
    static getInstance(): NodeCache;
    /**
     * Get value from cache
     */
    static get<T>(key: string): T | undefined;
    /**
     * Set value in cache with optional TTL
     */
    static set<T>(key: string, value: T, ttl?: number): void;
    /**
     * Delete value from cache
     */
    static del(key: string): number;
    /**
     * Clear all cache
     */
    static flushAll(): void;
    /**
     * Get cache statistics
     */
    static getStats(): NodeCache.Stats;
    /**
     * Cache country data
     */
    static cacheCountry(countryId: string, data: any): void;
    /**
     * Get cached country
     */
    static getCountry(countryId: string): any;
    /**
     * Cache all countries
     */
    static cacheCountries(data: any[]): void;
    /**
     * Get cached countries
     */
    static getCountries(): any[] | undefined;
    /**
     * Invalidate country cache
     */
    static invalidateCountryCache(countryId?: string): void;
    /**
     * Cache visa types
     */
    static cacheVisaTypes(countryId: string, data: any[]): void;
    /**
     * Get cached visa types
     */
    static getVisaTypes(countryId: string): any[] | undefined;
    /**
     * Cache document types
     */
    static cacheDocuments(visaTypeId: string, data: any[]): void;
    /**
     * Get cached document types
     */
    static getDocuments(visaTypeId: string): any[] | undefined;
    /**
     * Cache user profile
     */
    static cacheUserProfile(userId: string, data: any): void;
    /**
     * Get cached user profile
     */
    static getUserProfile(userId: string): any;
    /**
     * Invalidate user cache
     */
    static invalidateUserCache(userId: string): void;
}
export default CacheService;
//# sourceMappingURL=cache.service.d.ts.map