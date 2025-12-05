"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
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
class CacheService {
    /**
     * Initialize cache service (singleton pattern)
     */
    static getInstance() {
        if (!CacheService.instance) {
            CacheService.instance = new node_cache_1.default({
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
    static get(key) {
        return CacheService.getInstance().get(key);
    }
    /**
     * Set value in cache with optional TTL
     */
    static set(key, value, ttl) {
        const cache = CacheService.getInstance();
        if (ttl) {
            cache.set(key, value, ttl);
        }
        else {
            cache.set(key, value);
        }
    }
    /**
     * Delete value from cache
     */
    static del(key) {
        return CacheService.getInstance().del(key);
    }
    /**
     * Clear all cache
     */
    static flushAll() {
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
    static cacheCountry(countryId, data) {
        this.set(`countries:${countryId}`, data, this.TTL.LONG);
    }
    /**
     * Get cached country
     */
    static getCountry(countryId) {
        return this.get(`countries:${countryId}`);
    }
    /**
     * Cache all countries
     */
    static cacheCountries(data) {
        this.set('countries:all', data, this.TTL.LONG);
    }
    /**
     * Get cached countries
     */
    static getCountries() {
        return this.get('countries:all');
    }
    /**
     * Invalidate country cache
     */
    static invalidateCountryCache(countryId) {
        if (countryId) {
            this.del(`countries:${countryId}`);
        }
        this.del('countries:all');
    }
    /**
     * Cache visa types
     */
    static cacheVisaTypes(countryId, data) {
        this.set(`visa-types:${countryId}`, data, this.TTL.LONG);
    }
    /**
     * Get cached visa types
     */
    static getVisaTypes(countryId) {
        return this.get(`visa-types:${countryId}`);
    }
    /**
     * Cache document types
     */
    static cacheDocuments(visaTypeId, data) {
        this.set(`documents:${visaTypeId}`, data, this.TTL.LONG);
    }
    /**
     * Get cached document types
     */
    static getDocuments(visaTypeId) {
        return this.get(`documents:${visaTypeId}`);
    }
    /**
     * Cache user profile
     */
    static cacheUserProfile(userId, data) {
        this.set(`user:${userId}:profile`, data, this.TTL.MEDIUM);
    }
    /**
     * Get cached user profile
     */
    static getUserProfile(userId) {
        return this.get(`user:${userId}:profile`);
    }
    /**
     * Invalidate user cache
     */
    static invalidateUserCache(userId) {
        this.del(`user:${userId}:profile`);
    }
}
exports.CacheService = CacheService;
CacheService.TTL = {
    SHORT: 300, // 5 minutes
    MEDIUM: 3600, // 1 hour
    LONG: 86400, // 24 hours
};
exports.default = CacheService;
//# sourceMappingURL=cache.service.js.map