/**
 * Database Resilience Utilities Tests
 */

import {
  withRetry,
  checkDatabaseHealth,
  getDatabaseErrorMessage,
  resilientOperation,
  DatabaseConnectionState,
} from '../../utils/db-resilience';
import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

// Mock Prisma client
jest.mock('../../db', () => ({
  default: {
    $queryRaw: jest.fn(),
  },
}));

describe('Database Resilience Utilities', () => {
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      $queryRaw: jest.fn(),
    } as any;
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await withRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(operation, { maxAttempts: 2 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Connection timeout'));

      await expect(withRetry(operation, { maxAttempts: 2 })).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Invalid input'));

      await expect(withRetry(operation)).rejects.toThrow('Invalid input');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkDatabaseHealth', () => {
    it('should return healthy status when connection works', async () => {
      mockPrisma.$queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);

      const health = await checkDatabaseHealth(mockPrisma as any);

      expect(health.healthy).toBe(true);
      expect(health.state).toBe(DatabaseConnectionState.CONNECTED);
      expect(health.latency).toBeDefined();
    });

    it('should return unhealthy status when connection fails', async () => {
      mockPrisma.$queryRaw = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const health = await checkDatabaseHealth(mockPrisma as any);

      expect(health.healthy).toBe(false);
      expect(health.state).toBe(DatabaseConnectionState.DISCONNECTED);
      expect(health.error).toBeDefined();
    });
  });

  describe('getDatabaseErrorMessage', () => {
    it('should return user-friendly message for connection errors', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Connection timeout', {
        code: 'P1001',
        clientVersion: '5.0.0',
      });

      const message = getDatabaseErrorMessage(error);
      expect(message).toContain('reach');
    });

    it('should return user-friendly message for timeout errors', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Operation timed out', {
        code: 'P1008',
        clientVersion: '5.0.0',
      });

      const message = getDatabaseErrorMessage(error);
      expect(message).toContain('try again');
    });

    it('should return generic message for unknown errors', () => {
      const error = new Error('Unknown error');
      const message = getDatabaseErrorMessage(error);
      expect(message).toContain('try again');
    });
  });

  describe('resilientOperation', () => {
    it('should execute operation successfully', async () => {
      mockPrisma.$queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
      const operation = jest.fn().mockResolvedValue('success');

      const result = await resilientOperation(mockPrisma as any, operation);

      expect(result).toBe('success');
    });

    it('should check health before operation', async () => {
      mockPrisma.$queryRaw = jest.fn().mockRejectedValue(new Error('Connection failed'));
      const operation = jest.fn();

      await expect(
        resilientOperation(mockPrisma as any, operation, { healthCheck: true })
      ).rejects.toThrow();

      expect(operation).not.toHaveBeenCalled();
    });
  });
});
