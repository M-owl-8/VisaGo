import { Pool, PoolClient } from "pg";
import type { QueryResult } from "pg";

/**
 * PostgreSQL Connection Pool Service
 * Manages database connections efficiently for high concurrent load
 * 
 * Features:
 * - Connection pooling (prevents connection exhaustion)
 * - Connection timeout handling
 * - Automatic reconnection
 * - Monitoring and metrics
 */

export interface PoolConfig {
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  database?: string;
  connectionUrl?: string;
  max?: number; // Maximum number of connections
  idleTimeoutMillis?: number; // 30 seconds
  connectionTimeoutMillis?: number; // 2 seconds
}

export class DatabasePoolService {
  private static instance: Pool;
  private static isConnected: boolean = false;

  /**
   * Initialize connection pool
   */
  static async initialize(config?: PoolConfig): Promise<void> {
    if (DatabasePoolService.instance) {
      return;
    }

    const poolConfig: any = {
      connectionString: config?.connectionUrl || process.env.DATABASE_URL,
      max: config?.max || 20, // Maximum connections
      idleTimeoutMillis: config?.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config?.connectionTimeoutMillis || 2000,
    };

    // For development with Supabase, we need to disable SSL certificate verification
    if (process.env.NODE_ENV !== "production") {
      poolConfig.ssl = {
        rejectUnauthorized: false,
      };
    }

    // Also set the environment variable for node-postgres to handle SSL properly
    if (process.env.NODE_ENV !== "production" && !process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    DatabasePoolService.instance = new Pool(poolConfig);

    // Handle pool errors
    DatabasePoolService.instance.on("error", (err: Error) => {
      console.error("Unexpected pool error:", err);
    });

    // Test connection
    try {
      const client = await DatabasePoolService.instance.connect();
      console.log("✓ PostgreSQL connection pool initialized successfully");
      console.log(`  - Max connections: ${poolConfig.max}`);
      console.log(`  - Idle timeout: ${poolConfig.idleTimeoutMillis}ms`);
      client.release();
      DatabasePoolService.isConnected = true;
    } catch (error) {
      console.error("✗ Failed to initialize database pool:", error);
      throw error;
    }
  }

  /**
   * Get a client from the pool
   */
  static async getClient(): Promise<PoolClient> {
    if (!DatabasePoolService.instance) {
      throw new Error("Database pool not initialized. Call initialize() first.");
    }

    try {
      return await DatabasePoolService.instance.connect();
    } catch (error) {
      console.error("Failed to get client from pool:", error);
      throw error;
    }
  }

  /**
   * Execute query using pool
   */
  static async query(text: string, params?: any[]): Promise<any> {
    if (!DatabasePoolService.instance) {
      throw new Error("Database pool not initialized");
    }

    try {
      return await DatabasePoolService.instance.query(text, params);
    } catch (error) {
      console.error("Query execution error:", error);
      throw error;
    }
  }

  /**
   * Execute transaction
   */
  static async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();

    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check connection pool status
   */
  static getPoolStats() {
    if (!DatabasePoolService.instance) {
      return {
        status: "not_initialized",
      };
    }

    return {
      status: DatabasePoolService.isConnected ? "connected" : "disconnected",
      totalConnections: DatabasePoolService.instance.totalCount,
      idleConnections: DatabasePoolService.instance.idleCount,
      waitingRequests: (DatabasePoolService.instance as any).waitingCount || 0,
    };
  }

  /**
   * End all connections and close pool
   */
  static async close(): Promise<void> {
    if (DatabasePoolService.instance) {
      await DatabasePoolService.instance.end();
      DatabasePoolService.isConnected = false;
      console.log("✓ Database pool closed");
    }
  }

  /**
   * Drain pool (wait for all connections to finish)
   */
  static async drain(): Promise<void> {
    if (!DatabasePoolService.instance) {
      return;
    }

    return new Promise((resolve) => {
      const checkConnections = setInterval(() => {
        if (DatabasePoolService.instance.idleCount === DatabasePoolService.instance.totalCount) {
          clearInterval(checkConnections);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query("SELECT NOW()");
      return !!result.rows[0];
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }
}

export default DatabasePoolService;