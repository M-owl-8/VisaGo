/**
 * Database Resilience Utilities
 * Provides retry logic, connection health checks, and graceful error handling
 * for Prisma database operations
 */

import { PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError, PrismaClientUnknownRequestError } from '@prisma/client/runtime/library';

/**
 * Database connection states
 */
export enum DatabaseConnectionState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ERROR = 'error',
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 100,
  maxDelay: 5000,
  backoffMultiplier: 2,
  retryableErrors: [
    'P1001', // Can't reach database server
    'P1002', // Connection timeout
    'P1008', // Operations timed out
    'P1017', // Server has closed the connection
    'P2002', // Unique constraint violation (can retry for transient issues)
    'P2034', // Transaction failed (can retry)
  ],
};

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  // Prisma errors
  if (error instanceof PrismaClientKnownRequestError) {
    return DEFAULT_RETRY_CONFIG.retryableErrors.includes(error.code);
  }

  if (error instanceof PrismaClientUnknownRequestError) {
    // Check error message for connection issues
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('econnreset')
    );
  }

  // Generic errors
  if (error instanceof Error) {
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('socket hang up')
    );
  }

  return false;
}

/**
 * Calculate delay for retry with exponential backoff
 */
function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a Prisma operation with retry logic
 * 
 * @param operation - Function that returns a Prisma promise
 * @param config - Retry configuration
 * @returns Result of the operation
 * @throws Last error if all retries fail
 * 
 * @example
 * ```typescript
 * const user = await withRetry(
 *   () => prisma.user.findUnique({ where: { id: userId } }),
 *   { maxAttempts: 3 }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === retryConfig.maxAttempts) {
        break;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, retryConfig);
      console.warn(
        `Database operation failed (attempt ${attempt}/${retryConfig.maxAttempts}), retrying in ${delay}ms...`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      await sleep(delay);
    }
  }

  // All retries exhausted
  console.error(
    `Database operation failed after ${retryConfig.maxAttempts} attempts`,
    lastError instanceof Error ? lastError.message : 'Unknown error'
  );
  throw lastError;
}

/**
 * Check database connection health
 * 
 * @param prisma - Prisma client instance
 * @returns Connection state and health status
 */
export async function checkDatabaseHealth(
  prisma: PrismaClient
): Promise<{
  state: DatabaseConnectionState;
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Simple query to check connection
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    return {
      state: DatabaseConnectionState.CONNECTED,
      healthy: true,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Determine connection state based on error
    let state = DatabaseConnectionState.ERROR;
    if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
      state = DatabaseConnectionState.DISCONNECTED;
    }

    return {
      state,
      healthy: false,
      latency,
      error: errorMessage,
    };
  }
}

/**
 * Execute operation with connection health check
 * If database is unhealthy, throws a user-friendly error
 * 
 * @param prisma - Prisma client instance
 * @param operation - Function that returns a Prisma promise
 * @returns Result of the operation
 * @throws Error if database is unhealthy
 */
export async function withHealthCheck<T>(
  prisma: PrismaClient,
  operation: () => Promise<T>
): Promise<T> {
  const health = await checkDatabaseHealth(prisma);

  if (!health.healthy) {
    throw new Error(
      `Database is currently unavailable. Please try again in a moment. (${health.error || 'Connection error'})`
    );
  }

  return await operation();
}

/**
 * Gracefully handle database errors and return user-friendly messages
 * 
 * @param error - Error from Prisma operation
 * @returns User-friendly error message
 */
export function getDatabaseErrorMessage(error: unknown): string {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P1001':
        return 'Cannot reach the database server. Please check your connection.';
      case 'P1002':
        return 'Connection to the database timed out. Please try again.';
      case 'P1008':
        return 'Database operation timed out. Please try again.';
      case 'P1017':
        return 'Database connection was closed. Please try again.';
      case 'P2002':
        return 'This record already exists.';
      case 'P2025':
        return 'The requested record was not found.';
      default:
        return 'A database error occurred. Please try again.';
    }
  }

  if (error instanceof PrismaClientUnknownRequestError) {
    const message = error.message?.toLowerCase() || '';
    if (message.includes('connection') || message.includes('timeout')) {
      return 'Database connection error. Please try again.';
    }
    return 'An unexpected database error occurred. Please try again.';
  }

  if (error instanceof Error) {
    const message = error.message?.toLowerCase() || '';
    if (message.includes('connection') || message.includes('timeout')) {
      return 'Database connection error. Please try again.';
    }
    return error.message || 'An error occurred. Please try again.';
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Create a resilient Prisma operation wrapper
 * Combines retry logic, health checks, and error handling
 * 
 * @param prisma - Prisma client instance
 * @param operation - Function that returns a Prisma promise
 * @param options - Options for retry and health check
 * @returns Result of the operation
 */
export async function resilientOperation<T>(
  prisma: PrismaClient,
  operation: () => Promise<T>,
  options: {
    retry?: RetryConfig;
    healthCheck?: boolean;
  } = {}
): Promise<T> {
  const { retry = {}, healthCheck = true } = options;

  // Check health first if enabled
  if (healthCheck) {
    const health = await checkDatabaseHealth(prisma);
    if (!health.healthy) {
      throw new Error(
        `Database is currently unavailable. Please try again in a moment. (${health.error || 'Connection error'})`
      );
    }
  }

  // Execute with retry
  try {
    return await withRetry(operation, retry);
  } catch (error) {
    // Transform error to user-friendly message
    const friendlyMessage = getDatabaseErrorMessage(error);
    const dbError = new Error(friendlyMessage);
    (dbError as any).originalError = error;
    throw dbError;
  }
}

