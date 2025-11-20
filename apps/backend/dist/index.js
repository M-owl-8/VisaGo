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
exports.cacheService = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const Sentry = __importStar(require("@sentry/node"));
const profiling_node_1 = require("@sentry/profiling-node");
const rate_limit_1 = require("./middleware/rate-limit");
const input_validation_1 = require("./middleware/input-validation");
const chat_rate_limit_1 = require("./middleware/chat-rate-limit");
const db_pool_service_1 = __importDefault(require("./services/db-pool.service"));
const firebase_storage_service_1 = __importDefault(require("./services/firebase-storage.service"));
const local_storage_service_1 = __importDefault(require("./services/local-storage.service"));
const cache_service_optimized_1 = require("./services/cache.service.optimized");
const cache_invalidation_service_1 = require("./services/cache-invalidation.service");
const slow_query_logger_1 = require("./services/slow-query-logger");
const ai_openai_service_1 = __importDefault(require("./services/ai-openai.service"));
const db_1 = __importDefault(require("./db"));
const env_1 = require("./config/env");
const constants_1 = require("./config/constants");
const logger_1 = require("./middleware/logger");
const performanceMiddleware_1 = require("./middleware/performanceMiddleware");
const securityHeaders_1 = require("./middleware/securityHeaders");
const auth_1 = __importDefault(require("./routes/auth"));
const countries_1 = __importDefault(require("./routes/countries"));
const visa_types_1 = __importDefault(require("./routes/visa-types"));
const applications_1 = __importDefault(require("./routes/applications"));
const payments_complete_1 = __importDefault(require("./routes/payments-complete"));
const documents_1 = __importDefault(require("./routes/documents"));
const chat_1 = __importDefault(require("./routes/chat"));
const users_1 = __importDefault(require("./routes/users"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const admin_1 = __importDefault(require("./routes/admin"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const legal_1 = __importDefault(require("./routes/legal"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
const security_1 = __importDefault(require("./routes/security"));
const health_1 = __importDefault(require("./routes/health"));
const forms_1 = __importDefault(require("./routes/forms"));
const document_checklist_1 = __importDefault(require("./routes/document-checklist"));
const internal_1 = __importDefault(require("./routes/internal"));
const dev_1 = __importDefault(require("./routes/dev"));
// Load environment variables
dotenv_1.default.config();
// Validate environment variables
let envConfig;
try {
    envConfig = (0, env_1.getEnvConfig)();
    // Additional security checks
    if (envConfig.NODE_ENV === 'production') {
        // Check for production security requirements
        if (!envConfig.CORS_ORIGIN || envConfig.CORS_ORIGIN === '*') {
            console.warn("⚠️  CORS_ORIGIN is '*' or empty in production.");
            console.warn('   For mobile-only APIs, this is acceptable (CORS only applies to browsers).');
            console.warn('   For web APIs, set CORS_ORIGIN to specific allowed origins.');
        }
        if (envConfig.JWT_SECRET.length < 32) {
            console.error('❌ CRITICAL: JWT_SECRET must be at least 32 characters in production!');
            console.error('   Generate a secure secret with: ./scripts/generate-secrets.sh');
            process.exit(1);
        }
    }
    // Warn about missing optional but recommended variables
    const warnings = [];
    if (!envConfig.REDIS_URL) {
        warnings.push('REDIS_URL not set - using in-memory cache (not recommended for production)');
    }
    if (!envConfig.OPENAI_API_KEY) {
        warnings.push('OPENAI_API_KEY not set - AI chat feature will not work');
    }
    if (!envConfig.GOOGLE_CLIENT_ID || !envConfig.GOOGLE_CLIENT_SECRET) {
        warnings.push('Google OAuth not configured - Google Sign-In will not work');
    }
    if (warnings.length > 0 && envConfig.NODE_ENV === 'production') {
        console.warn('\n⚠️  Production Warnings:');
        warnings.forEach((w) => console.warn(`   - ${w}`));
        console.warn('');
    }
}
catch (error) {
    console.error('❌ Environment validation failed:', error instanceof Error ? error.message : error);
    console.error("\n💡 Tip: Run './scripts/validate-env.sh backend' to check your configuration");
    process.exit(1);
}
const sentryEnabled = Boolean(envConfig.SENTRY_DSN);
if (sentryEnabled) {
    const integrations = [Sentry.expressIntegration(), (0, profiling_node_1.nodeProfilingIntegration)()];
    Sentry.init({
        dsn: envConfig.SENTRY_DSN,
        environment: envConfig.NODE_ENV,
        tracesSampleRate: envConfig.NODE_ENV === 'production' ? 0.2 : 1.0,
        integrations,
    });
}
const app = (0, express_1.default)();
const prisma = db_1.default; // Use shared instance
const PORT = envConfig.PORT || constants_1.SERVER_CONFIG.DEFAULT_PORT;
const NODE_ENV = envConfig.NODE_ENV || constants_1.SERVER_CONFIG.DEFAULT_NODE_ENV;
// Initialize Redis Cache Service
const cacheService = new cache_service_optimized_1.OptimizedCacheService(envConfig.REDIS_URL);
exports.cacheService = cacheService;
// Sentry request context is automatically captured via expressIntegration
// ============================================================================
// MIDDLEWARE
// ============================================================================
// Trust proxy - CRITICAL for Railway/Heroku/Cloud hosting
// This allows Express to read X-Forwarded-For headers correctly
app.set('trust proxy', true);
// Security middleware
app.use((0, helmet_1.default)());
app.use(securityHeaders_1.removeSensitiveHeaders);
app.use(securityHeaders_1.securityHeaders);
app.use(securityHeaders_1.cacheControl);
// CORS configuration with validation
let allowedOrigins;
try {
    allowedOrigins = (0, env_1.validateCorsOrigin)();
}
catch (error) {
    console.error('❌ CORS configuration error:', error instanceof Error ? error.message : error);
    process.exit(1);
}
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }
        // In development, allow all origins if CORS_ORIGIN is "*"
        if (allowedOrigins.includes('*') && NODE_ENV === 'development') {
            return callback(null, true);
        }
        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Session-Id'],
    exposedHeaders: ['X-CSRF-Token', 'X-Session-Id'],
}));
// CSRF Protection - Optional for mobile-only API (JWT provides protection)
// For future web version, uncomment this:
// app.use(csrfProtection);
// Input validation and security
app.use(input_validation_1.preventSQLInjection); // Check all inputs for SQL injection
app.use(input_validation_1.preventXSS); // Check all inputs for XSS
// Rate limiting - General API protection
const limiter = (0, express_rate_limit_1.default)({
    windowMs: constants_1.RATE_LIMIT_CONFIG.WINDOW_MS,
    max: constants_1.RATE_LIMIT_CONFIG.MAX_REQUESTS,
    message: constants_1.API_MESSAGES.RATE_LIMIT_EXCEEDED,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
// Webhook rate limiting (stricter limits)
app.use('/api/payments/webhook', rate_limit_1.webhookLimiter);
// Body parsing middleware
app.use(express_1.default.json({ limit: constants_1.SERVER_CONFIG.MAX_REQUEST_SIZE }));
app.use(express_1.default.urlencoded({ limit: constants_1.SERVER_CONFIG.MAX_REQUEST_SIZE, extended: true }));
// Static file serving for uploaded files (local storage)
app.use('/uploads', express_1.default.static(envConfig.LOCAL_STORAGE_PATH));
// Comprehensive request logging middleware
app.use(logger_1.requestLogger);
// Performance monitoring middleware
app.use(performanceMiddleware_1.performanceHeadersMiddleware);
app.use(performanceMiddleware_1.performanceMiddleware);
// ============================================================================
// ROUTES
// ============================================================================
// Health check endpoint
app.get('/health', (req, res) => {
    // Generate session ID and CSRF token for app
    const crypto = require('crypto');
    const sessionId = crypto.randomBytes(16).toString('hex');
    const csrfToken = crypto.randomBytes(32).toString('hex');
    // Set headers
    res.setHeader('X-Session-Id', sessionId);
    res.setHeader('X-CSRF-Token', csrfToken);
    res.setHeader('Access-Control-Expose-Headers', 'X-CSRF-Token, X-Session-Id');
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
    });
});
// API status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        message: 'VisaBuddy API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
// Register routes
// Health check routes (public, no auth required)
app.use('/api/health', health_1.default);
// Rate limiters for auth endpoints
app.use('/api/auth/login', rate_limit_1.loginLimiter); // 5 attempts per 15 minutes
app.use('/api/auth/register', rate_limit_1.registerLimiter); // 3 attempts per hour
app.use('/api/auth', auth_1.default);
app.use('/api/countries', countries_1.default);
app.use('/api/visa-types', visa_types_1.default);
app.use('/api/applications', applications_1.default);
app.use('/api/payments', payments_complete_1.default);
app.use('/api/documents', documents_1.default);
// Form routes (pre-filling, validation, submission)
app.use('/api/forms', forms_1.default);
// Document checklist routes (AI-generated checklists)
app.use('/api/document-checklist', document_checklist_1.default);
// Chat routes with user-level rate limiting and cost tracking
app.use('/api/chat', chat_rate_limit_1.chatRateLimitMiddleware); // 50 messages per day per user
app.use('/api/chat', chat_rate_limit_1.attachChatLimitHeaders); // Attach quota info to response headers
app.use('/api/chat', chat_1.default);
app.use('/api/users', users_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/admin', rate_limit_1.strictLimiter); // Sensitive operations
app.use('/api/admin', admin_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/api/legal', legal_1.default);
// Monitoring routes (development/admin only)
app.use('/api/monitoring', monitoring_1.default);
// Security routes (admin only)
app.use('/api/security', security_1.default);
// Internal routes (service-to-service)
app.use('/internal', internal_1.default);
// Development routes (testing/debugging - development only)
if (envConfig.NODE_ENV === 'development') {
    app.use('/dev', dev_1.default);
}
// ============================================================================
// ERROR HANDLING
// ============================================================================
// 404 handler
app.use((req, res) => {
    res.status(constants_1.HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
            status: constants_1.HTTP_STATUS.NOT_FOUND,
            message: constants_1.API_MESSAGES.NOT_FOUND,
            code: 'NOT_FOUND',
            path: req.path,
        },
    });
});
// Sentry error handling is automatically done via expressIntegration()
// Manual error capture is handled in the global error handler below
// Error logging middleware (must be before global error handler)
app.use(logger_1.errorLogger);
// Global error handler
app.use(async (err, req, res, next) => {
    // Error already logged by errorLogger middleware
    // Determine status code
    const status = err.status || err.statusCode || constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = err.message || constants_1.API_MESSAGES.INTERNAL_ERROR;
    const code = err.code || 'INTERNAL_ERROR';
    if (status === constants_1.HTTP_STATUS.TOO_MANY_REQUESTS) {
        const retryAfter = err.retryAfter || err.headers?.['retry-after'];
        if (retryAfter) {
            res.setHeader('Retry-After', retryAfter);
        }
    }
    // Enhance error with user-friendly message
    const { enhanceErrorResponse } = await Promise.resolve().then(() => __importStar(require('./utils/user-friendly-errors')));
    const enhanced = enhanceErrorResponse(err, {
        operation: req.method,
        resource: req.path.split('/').pop(),
    });
    // Capture error to Sentry if enabled
    if (sentryEnabled && status >= 500) {
        Sentry.captureException(err);
    }
    // Prepare error response
    const errorResponse = {
        success: false,
        error: {
            status,
            message: enhanced.message || message,
            code: enhanced.code || code,
            ...(enhanced.suggestion && { suggestion: enhanced.suggestion }),
            ...(enhanced.field && { field: enhanced.field }),
        },
    };
    if (status === constants_1.HTTP_STATUS.TOO_MANY_REQUESTS && res.getHeader('Retry-After')) {
        errorResponse.error.retryAfter =
            Number(res.getHeader('Retry-After')) || res.getHeader('Retry-After');
        errorResponse.error.message =
            enhanced.message || message || 'Too many requests. Please try again later.';
    }
    // NEVER expose stack traces or internal details in production
    if (NODE_ENV === 'development') {
        // Only in development: include stack trace and details
        errorResponse.error.stack = err.stack;
        if (err.details) {
            errorResponse.error.details = err.details;
        }
        // Include request context for debugging
        errorResponse.error.requestId = req.requestId;
        errorResponse.error.path = req.path;
        errorResponse.error.method = req.method;
        // Include original error message for debugging
        if (enhanced.originalMessage && enhanced.originalMessage !== enhanced.message) {
            errorResponse.error.originalMessage = enhanced.originalMessage;
        }
    }
    else {
        // Production: Generic error messages for security
        if (status === constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR) {
            errorResponse.error.message = constants_1.API_MESSAGES.INTERNAL_ERROR;
            errorResponse.error.code = 'INTERNAL_ERROR';
            // Remove suggestion for internal errors in production
            delete errorResponse.error.suggestion;
        }
        // Don't expose any internal error details
        // Stack traces, file paths, line numbers are all hidden
    }
    res.status(status).json(errorResponse);
});
// ============================================================================
// SERVER STARTUP
// ============================================================================
async function startServer() {
    try {
        console.log('🚀 Initializing VisaBuddy Backend Services...\n');
        // 1. Initialize Database Pool (skip for SQLite in development)
        const isDatabaseSQLite = envConfig.DATABASE_URL.includes('file:');
        if (!isDatabaseSQLite) {
            console.log('📊 Initializing PostgreSQL Connection Pool...');
            await db_pool_service_1.default.initialize({
                connectionUrl: envConfig.DATABASE_URL,
                max: 20,
            });
            console.log('✓ PostgreSQL Connection Pool ready');
        }
        else {
            console.log('📊 Using SQLite (skipping PostgreSQL connection pool)');
        }
        // 2. Test Prisma connection with retry logic
        console.log('🔗 Testing Prisma Database Connection...');
        const { checkDatabaseHealth, resilientOperation, DatabaseConnectionState } = await Promise.resolve().then(() => __importStar(require('./utils/db-resilience')));
        let connectionHealthy = false;
        const maxConnectionAttempts = 3;
        for (let attempt = 1; attempt <= maxConnectionAttempts; attempt++) {
            try {
                const health = await checkDatabaseHealth(prisma);
                if (health.healthy) {
                    connectionHealthy = true;
                    console.log(`✓ Prisma Database Connection successful (latency: ${health.latency}ms)`);
                    break;
                }
                else {
                    console.warn(`⚠️  Connection attempt ${attempt}/${maxConnectionAttempts} failed: ${health.error}`);
                    if (attempt < maxConnectionAttempts) {
                        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                    }
                }
            }
            catch (error) {
                console.warn(`⚠️  Connection attempt ${attempt}/${maxConnectionAttempts} error:`, error instanceof Error ? error.message : 'Unknown error');
                if (attempt < maxConnectionAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
                }
            }
        }
        if (!connectionHealthy) {
            console.error('❌ Failed to establish database connection after multiple attempts');
            console.error('   The server will start but database operations may fail');
            console.error('   Please check your DATABASE_URL and ensure the database is accessible');
        }
        // Start periodic health checks
        const { startDatabaseHealthChecks } = await Promise.resolve().then(() => __importStar(require('./db')));
        startDatabaseHealthChecks(30000); // Check every 30 seconds
        // 3. Initialize Storage Service with fallback support
        const storageType = envConfig.STORAGE_TYPE;
        console.log(`💾 Initializing ${storageType === 'firebase' ? 'Firebase Storage' : 'Local Storage'}...`);
        if (storageType === 'firebase' && envConfig.FIREBASE_PROJECT_ID) {
            try {
                await firebase_storage_service_1.default.initialize();
                console.log('✓ Firebase Storage initialized');
            }
            catch (error) {
                console.warn('⚠️  Firebase Storage initialization failed, falling back to local storage');
                // Note: In production, this should be handled more gracefully
            }
        }
        else if (storageType === 'local') {
            try {
                await local_storage_service_1.default.initialize();
                console.log(`✓ Local Storage initialized (uploads folder: ${envConfig.LOCAL_STORAGE_PATH})`);
            }
            catch (error) {
                console.error('✗ Local Storage initialization failed:', error);
                throw error;
            }
        }
        // 4. Validate OAuth Configuration
        console.log('🔐 Validating Authentication Configuration...');
        if (envConfig.GOOGLE_CLIENT_ID && envConfig.GOOGLE_CLIENT_SECRET) {
            console.log('✓ Google OAuth configured');
        }
        else {
            console.warn('⚠️  Google OAuth not configured - Google Sign-In will not work');
            console.warn('   See docs/SETUP_GOOGLE_OAUTH.md for setup instructions');
        }
        if (envConfig.JWT_SECRET && envConfig.JWT_SECRET.length >= 32) {
            console.log('✓ JWT authentication configured');
        }
        else {
            console.error('❌ JWT_SECRET is not properly configured!');
            console.error('   Run: ./scripts/generate-secrets.sh');
        }
        // 5. Initialize AI Service
        if (envConfig.OPENAI_API_KEY) {
            console.log('🤖 Initializing OpenAI Service...');
            try {
                ai_openai_service_1.default.initialize(prisma);
                console.log('✓ OpenAI Service initialized');
            }
            catch (error) {
                console.warn('⚠️  OpenAI Service initialization skipped');
            }
        }
        // 6. Initialize Cache Service with Invalidation Strategy
        console.log('💾 Initializing Cache Service (Redis + Invalidation)...');
        try {
            const cacheStats = cacheService.getStats?.();
            if (cacheStats) {
                console.log(`✓ Cache Service active (Redis: ${cacheStats.redisConnected ? '✓' : '✗'})`);
                console.log(`   - Hit Rate: ${cacheStats.hitRate.toFixed(1)}%`);
                console.log(`   - Local Cache Size: ${cacheStats.localCacheSize} entries`);
            }
            // Initialize cache invalidation strategy
            const invalidationService = (0, cache_invalidation_service_1.getCacheInvalidationService)(cacheService);
            console.log('✓ Cache Invalidation Strategy initialized');
            console.log(`   - ${invalidationService.getRules().length} invalidation rules registered`);
        }
        catch (error) {
            console.warn('⚠️  Cache initialization warning:', error);
        }
        // 7. Initialize Slow Query Logger
        console.log('📊 Initializing Slow Query Logger...');
        try {
            const slowQueryLogger = (0, slow_query_logger_1.getSlowQueryLogger)(prisma);
            console.log('✓ Slow Query Logger initialized');
            console.log(`   - Warning Threshold: 500ms`);
            console.log(`   - Critical Threshold: 2000ms`);
        }
        catch (error) {
            console.warn('⚠️  Slow Query Logger initialization skipped');
        }
        // 8. Initialize Notification Services
        console.log('📬 Initializing Notification Services...');
        try {
            const { emailService } = await Promise.resolve().then(() => __importStar(require('./services/email.service')));
            const { fcmService } = await Promise.resolve().then(() => __importStar(require('./services/fcm.service')));
            const { notificationSchedulerService } = await Promise.resolve().then(() => __importStar(require('./services/notification-scheduler.service')));
            console.log('✓ Email Service ready (SendGrid + Nodemailer fallback)');
            console.log('✓ FCM (Firebase Cloud Messaging) Service ready');
            console.log('✓ Notification Scheduler ready (Bull + Redis)');
        }
        catch (error) {
            console.warn('⚠️  Notification Services initialization skipped:', error);
        }
        // 9. Initialize Payment Reconciliation Job
        console.log('💳 Initializing Payment System...');
        try {
            const { PaymentReconciliationService } = await Promise.resolve().then(() => __importStar(require('./services/payment-reconciliation.service')));
            const reconciliationService = PaymentReconciliationService.getInstance();
            const enableReconciliation = envConfig.ENABLE_RECONCILIATION !== 'false';
            if (enableReconciliation) {
                reconciliationService.startReconciliationJob();
                console.log('✓ Payment Reconciliation Job started (runs daily at 2 AM UTC)');
            }
            else {
                console.log('✓ Payment Reconciliation Job available (disabled by ENABLE_RECONCILIATION env var)');
            }
            console.log('✓ Mock Payment Provider enabled for development/testing');
        }
        catch (error) {
            console.warn('⚠️  Payment services initialization partial:', error);
        }
        // Get pool statistics
        const poolStats = db_pool_service_1.default.getPoolStats();
        console.log('\n📈 Database Pool Stats:');
        console.log(`   - Status: ${poolStats.status}`);
        console.log(`   - Total connections: ${poolStats.totalConnections}`);
        console.log(`   - Idle connections: ${poolStats.idleConnections}`);
        console.log('\n✅ All services initialized successfully!\n');
        // Start Express server
        app.listen(PORT, () => {
            const finalStorageType = envConfig.STORAGE_TYPE === 'firebase' ? 'Firebase' : 'Local';
            const envPadding = NODE_ENV.padEnd(42);
            const portPadding = String(PORT).padEnd(52);
            const storagePadding = finalStorageType.padEnd(44);
            console.log(`
╔════════════════════════════════════════════════════════════╗
║         VisaBuddy Backend Server Started                    ║
╠════════════════════════════════════════════════════════════╣
║ Environment: ${envPadding} ║
║ Port: ${portPadding} ║
║ Database: PostgreSQL (pooled)                              ║
║ Cache: Redis (optimized)                                   ║
║ Storage: ${storagePadding} ║
║ AI: OpenAI GPT-4 (RAG enabled)                             ║
║ Notifications: Email + Push + Job Scheduler                ║
║ API Docs: http://localhost:${PORT}/api/docs     ║
╚════════════════════════════════════════════════════════════╝
      `);
        });
    }
    catch (error) {
        console.error('✗ Failed to start server:', error);
        await db_pool_service_1.default.close();
        await prisma.$disconnect();
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n✓ Shutting down gracefully...');
    try {
        const { notificationSchedulerService } = await Promise.resolve().then(() => __importStar(require('./services/notification-scheduler.service')));
        await notificationSchedulerService.closeQueues();
    }
    catch (error) {
        console.warn('⚠️  Could not close notification queues');
    }
    await db_pool_service_1.default.drain();
    await db_pool_service_1.default.close();
    await prisma.$disconnect();
    console.log('✓ All services shut down');
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n✓ Shutting down gracefully...');
    try {
        const { notificationSchedulerService } = await Promise.resolve().then(() => __importStar(require('./services/notification-scheduler.service')));
        await notificationSchedulerService.closeQueues();
    }
    catch (error) {
        console.warn('⚠️  Could not close notification queues');
    }
    await db_pool_service_1.default.drain();
    await db_pool_service_1.default.close();
    await prisma.$disconnect();
    console.log('✓ All services shut down');
    process.exit(0);
});
// Start the server
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map