/**
 * Cache Invalidation Strategy Service
 * Manages smart cache invalidation with tag-based and cascading invalidation
 * Prevents stale data while maintaining high performance
 */

import { OptimizedCacheService } from './cache.service.optimized';

interface InvalidationRule {
  trigger: string; // Event that triggers invalidation
  tags: string[]; // Tags to invalidate
  priority: 'high' | 'normal' | 'low';
  immediate: boolean; // Should invalidate immediately or queue for batch processing
}

interface InvalidationEvent {
  type: string;
  data: any;
  timestamp: number;
}

/**
 * Manages cache invalidation strategy for related data
 * Supports tag-based, cascading, and event-driven invalidation
 */
export class CacheInvalidationService {
  private cache: OptimizedCacheService;
  private rules: Map<string, InvalidationRule[]> = new Map();
  private eventQueue: InvalidationEvent[] = [];
  private isProcessing = false;
  private readonly BATCH_PROCESS_INTERVAL = 5000; // Process queued events every 5 seconds

  constructor(cache: OptimizedCacheService) {
    this.cache = cache;
    this.initializeInvalidationRules();
    this.startBatchProcessing();
  }

  /**
   * Initialize invalidation rules for different data types
   * Cascading invalidation ensures related data stays consistent
   */
  private initializeInvalidationRules(): void {
    // Payment-related invalidation
    this.registerInvalidationRule({
      trigger: 'payment:created',
      tags: ['payment:methods', 'payment:stats', 'user:payments', 'admin:payments'],
      priority: 'high',
      immediate: true,
    });

    this.registerInvalidationRule({
      trigger: 'payment:updated',
      tags: ['payment:status', 'user:payments', 'admin:payments', 'analytics:payments'],
      priority: 'high',
      immediate: true,
    });

    this.registerInvalidationRule({
      trigger: 'payment:refunded',
      tags: ['payment:status', 'user:payments', 'admin:payments', 'payment:refunds'],
      priority: 'high',
      immediate: true,
    });

    // User-related invalidation
    this.registerInvalidationRule({
      trigger: 'user:updated',
      tags: ['user:profile', 'user:applications', 'user:payments', 'user:documents'],
      priority: 'normal',
      immediate: false,
    });

    this.registerInvalidationRule({
      trigger: 'user:deleted',
      tags: ['user:profile', 'user:applications', 'user:payments', 'auth:session'],
      priority: 'high',
      immediate: true,
    });

    // Application-related invalidation
    this.registerInvalidationRule({
      trigger: 'application:created',
      tags: ['user:applications', 'application:list', 'admin:applications'],
      priority: 'normal',
      immediate: false,
    });

    this.registerInvalidationRule({
      trigger: 'application:updated',
      tags: ['application:list', 'admin:applications', 'application:status'],
      priority: 'normal',
      immediate: false,
    });

    // Exchange rate invalidation (frequent updates)
    this.registerInvalidationRule({
      trigger: 'exchange-rate:updated',
      tags: ['exchange:rates', 'payment:rates'],
      priority: 'high',
      immediate: true,
    });

    // Document-related invalidation
    this.registerInvalidationRule({
      trigger: 'document:uploaded',
      tags: ['user:documents', 'application:documents'],
      priority: 'normal',
      immediate: false,
    });

    // Chat-related invalidation
    this.registerInvalidationRule({
      trigger: 'chat:message:created',
      tags: ['chat:messages', 'chat:session'],
      priority: 'low',
      immediate: false,
    });

    // Country/Visa data invalidation (rare but important)
    this.registerInvalidationRule({
      trigger: 'country:updated',
      tags: ['country:data', 'visa:types', 'document:requirements'],
      priority: 'high',
      immediate: true,
    });

    // Webhook idempotency cleanup
    this.registerInvalidationRule({
      trigger: 'webhook:processed',
      tags: ['webhook:idempotency'],
      priority: 'normal',
      immediate: false,
    });
  }

  /**
   * Register a new invalidation rule
   */
  registerInvalidationRule(rule: InvalidationRule): void {
    if (!this.rules.has(rule.trigger)) {
      this.rules.set(rule.trigger, []);
    }
    this.rules.get(rule.trigger)!.push(rule);
    console.debug(`✓ Invalidation rule registered: ${rule.trigger}`);
  }

  /**
   * Trigger cache invalidation event
   */
  async invalidate(trigger: string, data?: any): Promise<void> {
    const event: InvalidationEvent = {
      type: trigger,
      data,
      timestamp: Date.now(),
    };

    const rules = this.rules.get(trigger) || [];

    if (rules.length === 0) {
      console.debug(`⚠️  No invalidation rules for: ${trigger}`);
      return;
    }

    for (const rule of rules) {
      if (rule.immediate) {
        // Process immediately
        await this.processInvalidation(rule);
      } else {
        // Queue for batch processing
        this.eventQueue.push(event);
      }
    }
  }

  /**
   * Process invalidation for a rule
   */
  private async processInvalidation(rule: InvalidationRule): Promise<void> {
    try {
      let invalidatedCount = 0;

      for (const tag of rule.tags) {
        const count = await this.cache.invalidateByTag(tag);
        invalidatedCount += count;
      }

      console.log(
        `✓ Cache invalidation: ${rule.tags.join(', ')} ` +
        `(${invalidatedCount} keys) - Priority: ${rule.priority}`
      );
    } catch (error) {
      console.error('Invalidation error:', error);
    }
  }

  /**
   * Start background batch processing of queued invalidation events
   */
  private startBatchProcessing(): void {
    setInterval(async () => {
      if (this.eventQueue.length === 0 || this.isProcessing) {
        return;
      }

      this.isProcessing = true;
      try {
        const events = [...this.eventQueue];
        this.eventQueue = [];

        // Group by priority
        const highPriority = events.filter(e => {
          const rule = this.rules.get(e.type)?.[0];
          return rule?.priority === 'high';
        });

        const normalPriority = events.filter(e => {
          const rule = this.rules.get(e.type)?.[0];
          return rule?.priority === 'normal';
        });

        const lowPriority = events.filter(e => {
          const rule = this.rules.get(e.type)?.[0];
          return rule?.priority === 'low';
        });

        // Process in priority order
        for (const event of [...highPriority, ...normalPriority, ...lowPriority]) {
          const rules = this.rules.get(event.type) || [];
          for (const rule of rules) {
            await this.processInvalidation(rule);
          }
        }

        if (events.length > 0) {
          console.debug(`Batch processing complete: ${events.length} invalidation events`);
        }
      } catch (error) {
        console.error('Batch processing error:', error);
      } finally {
        this.isProcessing = false;
      }
    }, this.BATCH_PROCESS_INTERVAL);
  }

  /**
   * Get all registered invalidation rules
   */
  getRules(): Record<string, InvalidationRule[]> {
    const result: Record<string, InvalidationRule[]> = {};
    for (const [trigger, rules] of this.rules) {
      result[trigger] = rules;
    }
    return result;
  }

  /**
   * Manual tag invalidation
   */
  async invalidateTag(tag: string): Promise<number> {
    console.log(`Manual tag invalidation: ${tag}`);
    return await this.cache.invalidateByTag(tag);
  }

  /**
   * Manual pattern invalidation
   */
  async invalidatePattern(pattern: string): Promise<number> {
    console.log(`Manual pattern invalidation: ${pattern}`);
    return await this.cache.deletePattern(pattern);
  }

  /**
   * Clear all cached data (use with caution)
   */
  async clearAllCache(): Promise<void> {
    console.warn('⚠️  Clearing all cache data');
    await this.cache.flushAll();
    this.eventQueue = [];
  }

  /**
   * Get invalidation service statistics
   */
  getStats() {
    return {
      registeredRules: this.rules.size,
      totalRules: Array.from(this.rules.values()).reduce((sum, rules) => sum + rules.length, 0),
      queuedEvents: this.eventQueue.length,
      isProcessing: this.isProcessing,
    };
  }
}

// Singleton instance
let invalidationServiceInstance: CacheInvalidationService | null = null;

export function getCacheInvalidationService(cache: OptimizedCacheService): CacheInvalidationService {
  if (!invalidationServiceInstance) {
    invalidationServiceInstance = new CacheInvalidationService(cache);
  }
  return invalidationServiceInstance;
}

export default CacheInvalidationService;