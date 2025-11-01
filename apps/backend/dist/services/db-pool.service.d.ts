import { PoolClient } from "pg";
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
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}
export declare class DatabasePoolService {
    private static instance;
    private static isConnected;
    /**
     * Initialize connection pool
     */
    static initialize(config?: PoolConfig): Promise<void>;
    /**
     * Get a client from the pool
     */
    static getClient(): Promise<PoolClient>;
    /**
     * Execute query using pool
     */
    static query(text: string, params?: any[]): Promise<any>;
    /**
     * Execute transaction
     */
    static transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    /**
     * Check connection pool status
     */
    static getPoolStats(): {
        status: string;
        totalConnections?: undefined;
        idleConnections?: undefined;
        waitingRequests?: undefined;
    } | {
        status: string;
        totalConnections: number;
        idleConnections: number;
        waitingRequests: any;
    };
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