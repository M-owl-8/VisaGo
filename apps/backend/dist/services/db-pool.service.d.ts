import { PoolClient } from 'pg';
/**
 * PostgreSQL Connection Pool Service
 * Manages database connections efficiently for high concurrent load
 * Optimized for 200+ concurrent connections with comprehensive monitoring
 *
 * Features:
 * - Connection pooling (prevents connection exhaustion)
 * - Connection timeout handling
 * - Automatic reconnection with exponential backoff
 * - Comprehensive monitoring and metrics
 * - Health checks and alerts
 * - Query timeout enforcement
 * - Connection leak detection
 */
export interface PoolConfig {
    user?: string;
    password?: string;
    host?: string;
    port?: number;
    database?: string;
    connectionUrl?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    queryTimeoutMillis?: number;
    maxWaitingClients?: number;
}
interface PoolMetrics {
    status: string;
    totalConnections: number;
    availableConnections: number;
    idleConnections: number;
    waitingCount: number;
    totalQueries: number;
    failedQueries: number;
    avgQueryTime: number;
    maxQueryTime: number;
    uptime: number;
}
/**
 * Enhanced database pool with high-concurrency support
 */
export declare class DatabasePoolService {
    private static instance;
    private static isConnected;
    private static startTime;
    private static totalQueries;
    private static failedQueries;
    private static queryTimes;
    private static readonly MAX_QUERY_HISTORY;
    private static healthCheckInterval;
    private static reconnectAttempts;
    private static readonly MAX_RECONNECT_ATTEMPTS;
    private static lastHealthCheck;
    /**
     * Initialize connection pool with high-concurrency optimization
     */
    static initialize(config?: PoolConfig): Promise<void>;
    /**
     * Handle pool errors with exponential backoff reconnection
     */
    private static handlePoolError;
    /**
     * Start periodic health checks
     */
    private static startHealthCheck;
    /**
     * Get a client from the pool
     */
    static getClient(): Promise<PoolClient>;
    /**
     * Execute query using pool with performance tracking
     */
    static query(text: string, params?: any[]): Promise<any>;
    /**
     * Execute transaction with monitoring
     */
    static transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    /**
     * Check connection pool status with detailed metrics
     */
    static getPoolStats(): PoolMetrics;
    /**
     * End all connections and close pool
     */
    static close(): Promise<void>;
    /**
     * Drain pool (wait for all connections to finish)
     */
    static drain(): Promise<void>;
    /**
     * Health check
     */
    static healthCheck(): Promise<boolean>;
}
export default DatabasePoolService;
//# sourceMappingURL=db-pool.service.d.ts.map