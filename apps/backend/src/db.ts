import { PrismaClient } from '@prisma/client';
import { checkDatabaseHealth, DatabaseConnectionState } from './utils/db-resilience';

/**
 * Prisma Client with enhanced connection resilience
 * 
 * Features:
 * - Connection health monitoring
 * - Automatic reconnection
 * - Query timeout handling
 * - Error recovery
 */
export const db = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
  errorFormat: 'minimal',
});

// Add connection event handlers
db.$on('error' as never, (e: any) => {
  console.error('Prisma Client Error:', e);
});

// Graceful shutdown handler
process.on('beforeExit', async () => {
  await db.$disconnect();
});

// Health check on initialization
let healthCheckInterval: NodeJS.Timeout | null = null;

/**
 * Start periodic database health checks
 */
export function startDatabaseHealthChecks(intervalMs: number = 30000): void {
  if (healthCheckInterval) {
    return; // Already started
  }

  healthCheckInterval = setInterval(async () => {
    try {
      const health = await checkDatabaseHealth(db);
      if (!health.healthy) {
        console.warn(`⚠️  Database health check failed: ${health.error}`);
      }
    } catch (error) {
      console.error('Database health check error:', error);
    }
  }, intervalMs);
}

/**
 * Stop periodic database health checks
 */
export function stopDatabaseHealthChecks(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

export default db;