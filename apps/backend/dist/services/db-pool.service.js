"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabasePoolService = void 0;
const pg_1 = require("pg");
/**
 * Enhanced database pool with high-concurrency support
 */
class DatabasePoolService {
    /**
     * Initialize connection pool with high-concurrency optimization
     */
    static async initialize(config) {
        if (DatabasePoolService.instance) {
            return;
        }
        // Get connection string
        const connectionString = config?.connectionUrl || process.env.DATABASE_URL;
        // Optimize for high concurrency (200+ connections)
        const poolConfig = {
            connectionString,
            max: config?.max || 30, // Increased for high concurrency
            idleTimeoutMillis: config?.idleTimeoutMillis || 30000,
            connectionTimeoutMillis: config?.connectionTimeoutMillis || 5000, // Increased timeout
            maxWaitingClients: config?.maxWaitingClients || 50, // Queue for waiting clients
            statement_timeout: config?.queryTimeoutMillis || 30000, // 30 second query timeout
            application_name: 'visabuddy-backend',
        };
        // SSL configuration - CRITICAL for Railway/Heroku hosted databases
        // Railway uses self-signed certificates, we MUST accept them
        // This is safe because Railway's internal network is secure
        if (connectionString && connectionString.includes('railway.app')) {
            // Railway-specific SSL handling
            poolConfig.ssl = {
                rejectUnauthorized: false,
                sslmode: 'require',
            };
        }
        else if (process.env.NODE_ENV === 'production') {
            // Generic production SSL (accept self-signed certs from hosting providers)
            poolConfig.ssl = {
                rejectUnauthorized: false,
            };
        }
        else {
            // Development - no SSL
            poolConfig.ssl = false;
        }
        DatabasePoolService.instance = new pg_1.Pool(poolConfig);
        DatabasePoolService.startTime = Date.now();
        // Handle pool errors with reconnection logic
        DatabasePoolService.instance.on('error', (err) => {
            console.error('❌ Unexpected pool error:', err.message);
            DatabasePoolService.failedQueries++;
            // Attempt to reconnect
            DatabasePoolService.handlePoolError(err);
        });
        // Handle client errors
        DatabasePoolService.instance.on('connect', () => {
            console.debug('✓ New database connection established');
            DatabasePoolService.reconnectAttempts = 0;
        });
        // Test connection
        try {
            const client = await DatabasePoolService.instance.connect();
            // Run a test query to ensure connectivity
            await client.query('SELECT 1');
            console.log('✅ PostgreSQL connection pool initialized successfully');
            console.log(`   Max connections: ${poolConfig.max}`);
            console.log(`   Idle timeout: ${poolConfig.idleTimeoutMillis}ms`);
            console.log(`   Query timeout: ${poolConfig.statement_timeout}ms`);
            console.log(`   Waiting client queue: ${poolConfig.maxWaitingClients}`);
            client.release();
            DatabasePoolService.isConnected = true;
            // Start health check interval
            DatabasePoolService.startHealthCheck();
        }
        catch (error) {
            console.error('✗ Failed to initialize database pool:', error);
            throw error;
        }
    }
    /**
     * Handle pool errors with exponential backoff reconnection
     */
    static handlePoolError(err) {
        if (DatabasePoolService.reconnectAttempts < DatabasePoolService.MAX_RECONNECT_ATTEMPTS) {
            DatabasePoolService.reconnectAttempts++;
            const backoffDelay = Math.min(1000 * Math.pow(2, DatabasePoolService.reconnectAttempts), 30000);
            console.warn(`⚠️  Connection pool error. Reconnection attempt ${DatabasePoolService.reconnectAttempts}/${DatabasePoolService.MAX_RECONNECT_ATTEMPTS} ` +
                `in ${backoffDelay}ms`);
            setTimeout(() => {
                if (DatabasePoolService.instance) {
                    // The pool will handle reconnection automatically
                    console.log('Attempting to recover pool connection...');
                }
            }, backoffDelay);
        }
        else {
            console.error(`🔴 CRITICAL: Maximum reconnection attempts exceeded. Manual intervention required.`);
        }
    }
    /**
     * Start periodic health checks
     */
    static startHealthCheck() {
        if (DatabasePoolService.healthCheckInterval) {
            return; // Already running
        }
        DatabasePoolService.healthCheckInterval = setInterval(async () => {
            try {
                // Only check if pool is initialized
                if (!DatabasePoolService.instance) {
                    return;
                }
                const stats = DatabasePoolService.getPoolStats();
                // Only alert if pool is actually initialized and has connections
                // Don't warn if totalConnections is 0 (pool not fully initialized yet)
                if (stats.totalConnections > 0 && stats.idleConnections === 0) {
                    // Only warn if we're using a significant portion of connections
                    const activeConnections = stats.totalConnections - stats.idleConnections;
                    const usagePercent = (activeConnections / stats.totalConnections) * 100;
                    // Only warn if using more than 80% of connections
                    if (usagePercent > 80) {
                        console.warn(`⚠️  ALERT: High connection pool usage. ` +
                            `Active: ${activeConnections}/${stats.totalConnections} (${usagePercent.toFixed(1)}%)`);
                    }
                }
                // Alert on high query failure rate
                const failureRate = stats.totalQueries > 0 ? (stats.failedQueries / stats.totalQueries) * 100 : 0;
                if (failureRate > 5) {
                    console.warn(`⚠️  ALERT: High query failure rate: ${failureRate.toFixed(2)}%`);
                }
                DatabasePoolService.lastHealthCheck = Date.now();
            }
            catch (error) {
                console.error('Health check error:', error);
            }
        }, 30000); // Check every 30 seconds
    }
    /**
     * Get a client from the pool
     */
    static async getClient() {
        if (!DatabasePoolService.instance) {
            throw new Error('Database pool not initialized. Call initialize() first.');
        }
        try {
            return await DatabasePoolService.instance.connect();
        }
        catch (error) {
            console.error('Failed to get client from pool:', error);
            throw error;
        }
    }
    /**
     * Execute query using pool with performance tracking
     */
    static async query(text, params) {
        if (!DatabasePoolService.instance) {
            throw new Error('Database pool not initialized');
        }
        const startTime = Date.now();
        try {
            const result = await DatabasePoolService.instance.query(text, params);
            const duration = Date.now() - startTime;
            DatabasePoolService.totalQueries++;
            DatabasePoolService.queryTimes.push(duration);
            if (DatabasePoolService.queryTimes.length > DatabasePoolService.MAX_QUERY_HISTORY) {
                DatabasePoolService.queryTimes.shift();
            }
            return result;
        }
        catch (error) {
            DatabasePoolService.failedQueries++;
            const duration = Date.now() - startTime;
            console.error(`Query execution error (${duration}ms):`, error);
            throw error;
        }
    }
    /**
     * Execute transaction with monitoring
     */
    static async transaction(callback) {
        const client = await this.getClient();
        const startTime = Date.now();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            DatabasePoolService.totalQueries++;
            DatabasePoolService.queryTimes.push(Date.now() - startTime);
            if (DatabasePoolService.queryTimes.length > DatabasePoolService.MAX_QUERY_HISTORY) {
                DatabasePoolService.queryTimes.shift();
            }
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            DatabasePoolService.failedQueries++;
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Check connection pool status with detailed metrics
     */
    static getPoolStats() {
        if (!DatabasePoolService.instance) {
            return {
                status: 'not_initialized',
                totalConnections: 0,
                availableConnections: 0,
                idleConnections: 0,
                waitingCount: 0,
                totalQueries: 0,
                failedQueries: 0,
                avgQueryTime: 0,
                maxQueryTime: 0,
                uptime: 0,
            };
        }
        const avgQueryTime = DatabasePoolService.queryTimes.length > 0
            ? Math.round(DatabasePoolService.queryTimes.reduce((a, b) => a + b, 0) /
                DatabasePoolService.queryTimes.length)
            : 0;
        const maxQueryTime = DatabasePoolService.queryTimes.length > 0 ? Math.max(...DatabasePoolService.queryTimes) : 0;
        const uptime = Date.now() - DatabasePoolService.startTime;
        return {
            status: DatabasePoolService.isConnected ? 'connected' : 'disconnected',
            totalConnections: DatabasePoolService.instance.totalCount,
            availableConnections: DatabasePoolService.instance.totalCount - DatabasePoolService.instance.idleCount,
            idleConnections: DatabasePoolService.instance.idleCount,
            waitingCount: DatabasePoolService.instance.waitingCount || 0,
            totalQueries: DatabasePoolService.totalQueries,
            failedQueries: DatabasePoolService.failedQueries,
            avgQueryTime,
            maxQueryTime,
            uptime: Math.round(uptime / 1000), // Convert to seconds
        };
    }
    /**
     * End all connections and close pool
     */
    static async close() {
        if (DatabasePoolService.instance) {
            await DatabasePoolService.instance.end();
            DatabasePoolService.isConnected = false;
            console.log('✓ Database pool closed');
        }
    }
    /**
     * Drain pool (wait for all connections to finish)
     */
    static async drain() {
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
    static async healthCheck() {
        try {
            const result = await this.query('SELECT NOW()');
            return !!result.rows[0];
        }
        catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }
}
exports.DatabasePoolService = DatabasePoolService;
DatabasePoolService.isConnected = false;
DatabasePoolService.startTime = 0;
DatabasePoolService.totalQueries = 0;
DatabasePoolService.failedQueries = 0;
DatabasePoolService.queryTimes = [];
DatabasePoolService.MAX_QUERY_HISTORY = 1000;
DatabasePoolService.healthCheckInterval = null;
DatabasePoolService.reconnectAttempts = 0;
DatabasePoolService.MAX_RECONNECT_ATTEMPTS = 10;
DatabasePoolService.lastHealthCheck = 0;
exports.default = DatabasePoolService;
//# sourceMappingURL=db-pool.service.js.map