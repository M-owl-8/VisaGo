"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
// Import services
const db_pool_service_1 = __importDefault(require("./services/db-pool.service"));
const firebase_storage_service_1 = __importDefault(require("./services/firebase-storage.service"));
const local_storage_service_1 = __importDefault(require("./services/local-storage.service"));
const cache_service_1 = __importDefault(require("./services/cache.service"));
const ai_openai_service_1 = __importDefault(require("./services/ai-openai.service"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
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
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests, please try again later.",
});
app.use("/api/", limiter);
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
// Register routes
app.use("/api/auth", auth_1.default);
app.use("/api/countries", countries_1.default);
app.use("/api/applications", applications_1.default);
app.use("/api/payments", payments_1.default);
app.use("/api/documents", documents_1.default);
app.use("/api/chat", chat_1.default);
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
        // 1. Initialize Database Pool
        console.log("📊 Initializing PostgreSQL Connection Pool...");
        await db_pool_service_1.default.initialize({
            connectionUrl: process.env.DATABASE_URL,
            max: 20,
        });
        console.log("✓ PostgreSQL Connection Pool ready");
        // 2. Test Prisma connection
        console.log("🔗 Testing Prisma Database Connection...");
        await prisma.$queryRaw `SELECT 1`;
        console.log("✓ Prisma Database Connection successful");
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
    await db_pool_service_1.default.drain();
    await db_pool_service_1.default.close();
    await prisma.$disconnect();
    console.log("✓ All services shut down");
    process.exit(0);
});
process.on("SIGTERM", async () => {
    console.log("\n✓ Shutting down gracefully...");
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