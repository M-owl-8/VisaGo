"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabasePoolService = void 0;
const pg_1 = require("pg");
class DatabasePoolService {
    /**
     * Initialize connection pool
     */
    static async initialize(config) {
        if (DatabasePoolService.instance) {
            return;
        }
        const poolConfig = {
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
        DatabasePoolService.instance = new pg_1.Pool(poolConfig);
        // Handle pool errors
        DatabasePoolService.instance.on("error", (err) => {
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
        }
        catch (error) {
            console.error("✗ Failed to initialize database pool:", error);
            throw error;
        }
    }
    /**
     * Get a client from the pool
     */
    static async getClient() {
        if (!DatabasePoolService.instance) {
            throw new Error("Database pool not initialized. Call initialize() first.");
        }
        try {
            return await DatabasePoolService.instance.connect();
        }
        catch (error) {
            console.error("Failed to get client from pool:", error);
            throw error;
        }
    }
    /**
     * Execute query using pool
     */
    static async query(text, params) {
        if (!DatabasePoolService.instance) {
            throw new Error("Database pool not initialized");
        }
        try {
            return await DatabasePoolService.instance.query(text, params);
        }
        catch (error) {
            console.error("Query execution error:", error);
            throw error;
        }
    }
    /**
     * Execute transaction
     */
    static async transaction(callback) {
        const client = await this.getClient();
        try {
            await client.query("BEGIN");
            const result = await callback(client);
            await client.query("COMMIT");
            return result;
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
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
            waitingRequests: DatabasePoolService.instance.waitingCount || 0,
        };
    }
    /**
     * End all connections and close pool
     */
    static async close() {
        if (DatabasePoolService.instance) {
            await DatabasePoolService.instance.end();
            DatabasePoolService.isConnected = false;
            console.log("✓ Database pool closed");
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
            const result = await this.query("SELECT NOW()");
            return !!result.rows[0];
        }
        catch (error) {
            console.error("Health check failed:", error);
            return false;
        }
    }
}
exports.DatabasePoolService = DatabasePoolService;
DatabasePoolService.isConnected = false;
exports.default = DatabasePoolService;
//# sourceMappingURL=db-pool.service.js.map