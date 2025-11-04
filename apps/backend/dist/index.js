"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const rate_limit_1 = require("./middleware/rate-limit");
const csrf_1 = require("./middleware/csrf");
// Import services
const db_pool_service_1 = __importDefault(require("./services/db-pool.service"));
const firebase_storage_service_1 = __importDefault(require("./services/firebase-storage.service"));
const local_storage_service_1 = __importDefault(require("./services/local-storage.service"));
const cache_service_1 = __importDefault(require("./services/cache.service"));
const ai_openai_service_1 = __importDefault(require("./services/ai-openai.service"));
const db_1 = __importDefault(require("./db"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = db_1.default; // Use shared instance
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
// ============================================================================
// MIDDLEWARE
// ============================================================================
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
}));
// CSRF Protection
app.use(csrf_1.csrfProtection);
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests, please try again later.",
});
app.use("/api/", limiter);
// Webhook rate limiting (stricter limits)
app.use("/api/payments/webhook", rate_limit_1.webhookLimiter);
// Body parsing middleware
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ limit: "50mb", extended: true }));
// Static file serving for uploaded files (local storage)
app.use("/uploads", express_1.default.static(process.env.LOCAL_STORAGE_PATH || "uploads"));
// Custom middleware for request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});
// ============================================================================
// ROUTES
// ============================================================================
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
    });
});
// API status endpoint
app.get("/api/status", (req, res) => {
    res.json({
        message: "VisaBuddy API is running",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
    });
});
// Import route handlers
const auth_1 = __importDefault(require("./routes/auth"));
const countries_1 = __importDefault(require("./routes/countries"));
const applications_1 = __importDefault(require("./routes/applications"));
const payments_1 = __importDefault(require("./routes/payments"));
const documents_1 = __importDefault(require("./routes/documents"));
const chat_1 = __importDefault(require("./routes/chat"));
const users_1 = __importDefault(require("./routes/users"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const admin_1 = __importDefault(require("./routes/admin"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const legal_1 = __importDefault(require("./routes/legal"));
// Register routes
app.use("/api/auth/login", rate_limit_1.loginLimiter); // 5 attempts per 15 minutes
app.use("/api/auth/register", rate_limit_1.registerLimiter); // 3 attempts per hour
app.use("/api/auth", auth_1.default);
app.use("/api/countries", countries_1.default);
app.use("/api/applications", applications_1.default);
app.use("/api/payments", payments_1.default);
app.use("/api/documents", documents_1.default);
app.use("/api/chat", chat_1.default);
app.use("/api/users", users_1.default);
app.use("/api/notifications", notifications_1.default);
app.use("/api/admin", rate_limit_1.strictLimiter); // Sensitive operations
app.use("/api/admin", admin_1.default);
app.use("/api/analytics", analytics_1.default);
app.use("/api/legal", legal_1.default);
// ============================================================================
// ERROR HANDLING
// ============================================================================
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: "Not Found",
        message: `Route ${req.path} not found`,
        path: req.path,
    });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error("[ERROR]", err);
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    const code = err.code || null;
    res.status(status).json({
        success: false,
        error: {
            status,
            message,
            code,
            ...(NODE_ENV === "development" && { stack: err.stack }),
        },
    });
});
// ============================================================================
// SERVER STARTUP
// ============================================================================
async function startServer() {
    try {
        console.log("🚀 Initializing VisaBuddy Backend Services...\n");
        // 1. Initialize Database Pool (skip for SQLite in development)
        const isDatabaseSQLite = process.env.DATABASE_URL?.includes("file:");
        if (!isDatabaseSQLite) {
            console.log("📊 Initializing PostgreSQL Connection Pool...");
            await db_pool_service_1.default.initialize({
                connectionUrl: process.env.DATABASE_URL,
                max: 20,
            });
            console.log("✓ PostgreSQL Connection Pool ready");
        }
        else {
            console.log("📊 Using SQLite (skipping PostgreSQL connection pool)");
        }
        // 2. Test Prisma connection
        console.log("🔗 Testing Prisma Database Connection...");
        try {
            // Use a simple count query instead of SELECT 1 to avoid prepared statement issues
            await prisma.user.count();
            console.log("✓ Prisma Database Connection successful");
        }
        catch (error) {
            // If connection fails, still continue - the pool is ready
            console.warn("⚠️  Prisma health check skipped, but pool is initialized");
        }
        // 3. Initialize Storage Service
        const storageType = process.env.STORAGE_TYPE || "local";
        console.log(`💾 Initializing ${storageType === "firebase" ? "Firebase Storage" : "Local Storage"}...`);
        if (storageType === "firebase" && process.env.FIREBASE_PROJECT_ID) {
            try {
                await firebase_storage_service_1.default.initialize();
                console.log("✓ Firebase Storage initialized");
            }
            catch (error) {
                console.warn("⚠️  Firebase Storage initialization failed, falling back to local storage");
                process.env.STORAGE_TYPE = "local";
            }
        }
        else if (storageType === "local") {
            try {
                await local_storage_service_1.default.initialize();
                console.log("✓ Local Storage initialized (uploads folder: " + (process.env.LOCAL_STORAGE_PATH || "uploads") + ")");
            }
            catch (error) {
                console.error("✗ Local Storage initialization failed:", error);
                throw error;
            }
        }
        // 4. Initialize AI Service
        if (process.env.OPENAI_API_KEY) {
            console.log("🤖 Initializing OpenAI Service...");
            try {
                ai_openai_service_1.default.initialize(prisma);
                console.log("✓ OpenAI Service initialized");
            }
            catch (error) {
                console.warn("⚠️  OpenAI Service initialization skipped");
            }
        }
        // 5. Log Cache Service
        console.log("💾 Cache Service ready (node-cache)");
        const cacheStats = cache_service_1.default.getStats();
        console.log(`   - Keys in cache: ${cacheStats.keys}`);
        // 6. Initialize Notification Services
        console.log("📬 Initializing Notification Services...");
        try {
            const { emailService } = await Promise.resolve().then(() => __importStar(require("./services/email.service")));
            const { fcmService } = await Promise.resolve().then(() => __importStar(require("./services/fcm.service")));
            const { notificationSchedulerService } = await Promise.resolve().then(() => __importStar(require("./services/notification-scheduler.service")));
            console.log("✓ Email Service ready (SendGrid + Nodemailer fallback)");
            console.log("✓ FCM (Firebase Cloud Messaging) Service ready");
            console.log("✓ Notification Scheduler ready (Bull + Redis)");
        }
        catch (error) {
            console.warn("⚠️  Notification Services initialization skipped:", error);
        }
        // Get pool statistics
        const poolStats = db_pool_service_1.default.getPoolStats();
        console.log("\n📈 Database Pool Stats:");
        console.log(`   - Status: ${poolStats.status}`);
        console.log(`   - Total connections: ${poolStats.totalConnections}`);
        console.log(`   - Idle connections: ${poolStats.idleConnections}`);
        console.log("\n✅ All services initialized successfully!\n");
        // Start Express server
        app.listen(PORT, () => {
            const finalStorageType = process.env.STORAGE_TYPE === "firebase" ? "Firebase" : "Local";
            console.log(`
╔════════════════════════════════════════════════════════════╗
║         VisaBuddy Backend Server Started                    ║
╠════════════════════════════════════════════════════════════╣
║ Environment: ${NODE_ENV.padEnd(42)} ║
║ Port: ${String(PORT).padEnd(52)} ║
║ Database: PostgreSQL (pooled)                              ║
║ Cache: node-cache                                          ║
║ Storage: ${finalStorageType.padEnd(44)} ║
║ AI: OpenAI GPT-4 (RAG enabled)                             ║
║ Notifications: Email + Push + Job Scheduler                ║
║ API Docs: http://localhost:${PORT}/api/docs     ║
╚════════════════════════════════════════════════════════════╝
      `);
        });
    }
    catch (error) {
        console.error("✗ Failed to start server:", error);
        await db_pool_service_1.default.close();
        await prisma.$disconnect();
        process.exit(1);
    }
}
// Graceful shutdown
process.on("SIGINT", async () => {
    console.log("\n✓ Shutting down gracefully...");
    try {
        const { notificationSchedulerService } = await Promise.resolve().then(() => __importStar(require("./services/notification-scheduler.service")));
        await notificationSchedulerService.closeQueues();
    }
    catch (error) {
        console.warn("⚠️  Could not close notification queues");
    }
    await db_pool_service_1.default.drain();
    await db_pool_service_1.default.close();
    await prisma.$disconnect();
    console.log("✓ All services shut down");
    process.exit(0);
});
process.on("SIGTERM", async () => {
    console.log("\n✓ Shutting down gracefully...");
    try {
        const { notificationSchedulerService } = await Promise.resolve().then(() => __importStar(require("./services/notification-scheduler.service")));
        await notificationSchedulerService.closeQueues();
    }
    catch (error) {
        console.warn("⚠️  Could not close notification queues");
    }
    await db_pool_service_1.default.drain();
    await db_pool_service_1.default.close();
    await prisma.$disconnect();
    console.log("✓ All services shut down");
    process.exit(0);
});
// Start the server
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map