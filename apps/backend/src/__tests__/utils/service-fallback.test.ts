/**
 * Service Fallback Utilities Tests
 */

import {
  withServiceFallback,
  checkServiceHealth,
  ServiceStatus,
  ServiceAvailabilityChecker,
} from '../../utils/service-fallback';

describe('Service Fallback Utilities', () => {
  describe('withServiceFallback', () => {
    it('should use primary operation when it succeeds', async () => {
      const primary = jest.fn().mockResolvedValue('primary success');
      const fallback = jest.fn();
      
      const result = await withServiceFallback(primary, fallback);
      
      expect(result).toBe('primary success');
      expect(primary).toHaveBeenCalledTimes(1);
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should use fallback when primary fails', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('Primary failed'));
      const fallback = jest.fn().mockResolvedValue('fallback success');
      
      const result = await withServiceFallback(primary, fallback, { maxRetries: 1 });
      
      expect(result).toBe('fallback success');
      expect(primary).toHaveBeenCalledTimes(2); // Initial + 1 retry
      expect(fallback).toHaveBeenCalledTimes(1);
    });

    it('should throw when both primary and fallback fail', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('Primary failed'));
      const fallback = jest.fn().mockRejectedValue(new Error('Fallback failed'));
      
      await expect(
        withServiceFallback(primary, fallback, { maxRetries: 1 })
      ).rejects.toThrow();
      
      expect(primary).toHaveBeenCalled();
      expect(fallback).toHaveBeenCalled();
    });

    it('should respect timeout', async () => {
      const primary = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 2000))
      );
      const fallback = jest.fn().mockResolvedValue('fallback');
      
      const result = await withServiceFallback(primary, fallback, { timeout: 100 });
      
      expect(result).toBe('fallback');
    });
  });

  describe('checkServiceHealth', () => {
    it('should return healthy status when service is available', async () => {
      const healthCheck = jest.fn().mockResolvedValue(true);
      
      const health = await checkServiceHealth(healthCheck);
      
      expect(health.status).toBe(ServiceStatus.AVAILABLE);
      expect(health.latency).toBeDefined();
      expect(health.lastChecked).toBeDefined();
    });

    it('should return unavailable status when service fails', async () => {
      const healthCheck = jest.fn().mockRejectedValue(new Error('Service down'));
      
      const health = await checkServiceHealth(healthCheck);
      
      expect(health.status).toBe(ServiceStatus.UNAVAILABLE);
      expect(health.error).toBeDefined();
    });

    it('should respect timeout', async () => {
      const healthCheck = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 2000))
      );
      
      const health = await checkServiceHealth(healthCheck, 100);
      
      expect(health.status).toBe(ServiceStatus.UNAVAILABLE);
      expect(health.error).toContain('timed out');
    });
  });

  describe('ServiceAvailabilityChecker', () => {
    let checker: ServiceAvailabilityChecker;

    beforeEach(() => {
      checker = new ServiceAvailabilityChecker();
    });

    it('should cache health check results', async () => {
      const healthCheck = jest.fn().mockResolvedValue(true);
      
      const result1 = await checker.isAvailable('test-service', healthCheck);
      const result2 = await checker.isAvailable('test-service', healthCheck);
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(healthCheck).toHaveBeenCalledTimes(1); // Cached on second call
    });

    it('should refresh cache after TTL', async () => {
      const checker = new ServiceAvailabilityChecker();
      // Override cache TTL for testing
      (checker as any).cacheTTL = 100;
      
      const healthCheck = jest.fn().mockResolvedValue(true);
      
      await checker.isAvailable('test-service', healthCheck);
      await new Promise(resolve => setTimeout(resolve, 150));
      await checker.isAvailable('test-service', healthCheck);
      
      expect(healthCheck).toHaveBeenCalledTimes(2);
    });

    it('should return health status', async () => {
      const healthCheck = jest.fn().mockResolvedValue(true);
      
      await checker.isAvailable('test-service', healthCheck);
      const health = checker.getHealth('test-service');
      
      expect(health).toBeDefined();
      expect(health?.status).toBe(ServiceStatus.AVAILABLE);
    });

    it('should clear cache', () => {
      checker.clearCache();
      const health = checker.getHealth('test-service');
      expect(health).toBeNull();
    });
  });
});








