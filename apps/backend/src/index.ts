import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import {
  loginLimiter,
  registerLimiter,
  strictLimiter,
  webhookLimiter,
} from './middleware/rate-limit';
import { csrfProtection } from './middleware/csrf';
import { preventSQLInjection, preventXSS } from './middleware/input-validation';
import { chatRateLimitMiddleware, attachChatLimitHeaders } from './middleware/chat-rate-limit';
import DatabasePoolService from './services/db-pool.service';
import FirebaseStorageService from './services/firebase-storage.service';
import LocalStorageService from './services/local-storage.service';
import { OptimizedCacheService } from './services/cache.service.optimized';
import { getCacheInvalidationService } from './services/cache-invalidation.service';
import { getSlowQueryLogger } from './services/slow-query-logger';
import AIOpenAIService from './services/ai-openai.service';
import db from './db';
import { getEnvConfig, validateCorsOrigin } from './config/env';
import { SERVER_CONFIG, RATE_LIMIT_CONFIG, API_MESSAGES, HTTP_STATUS } from './config/constants';
import { requestLogger, errorLogger } from './middleware/logger';
import {
  performanceMiddleware,
  performanceHeadersMiddleware,
} from './middleware/performanceMiddleware';
import {
  securityHeaders,
  removeSensitiveHeaders,
  cacheControl,
} from './middleware/securityHeaders';
import authRoutes from './routes/auth';
import countriesRoutes from './routes/countries';
import visaTypesRoutes from './routes/visa-types';
import applicationsRoutes from './routes/applications';
import paymentRoutes from './routes/payments-complete';
import documentRoutes from './routes/documents';
import chatRoutes from './routes/chat';
import usersRoutes from './routes/users';
import notificationsRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import analyticsRoutes from './routes/analytics';
import legalRoutes from './routes/legal';
import monitoringRoutes from './routes/monitoring';
import securityRoutes from './routes/security';
import healthRoutes from './routes/health';
import formRoutes from './routes/forms';
import documentChecklistRoutes from './routes/document-checklist';
import internalRoutes from './routes/internal';
import devRoutes from './routes/dev';

// Load environment variables
dotenv.config();

// Validate environment variables
let envConfig: ReturnType<typeof getEnvConfig>;
try {
  envConfig = getEnvConfig();

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
  const warnings: string[] = [];
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
    // These are optional features - log as info, not warnings
    console.log('\nℹ️  Optional Features (not configured):');
    warnings.forEach((w) => console.log(`   - ${w}`));
    console.log('');
  }
} catch (error) {
  console.error(
    '❌ Environment validation failed:',
    error instanceof Error ? error.message : error
  );
  console.error("\n💡 Tip: Run './scripts/validate-env.sh backend' to check your configuration");
  process.exit(1);
}

const sentryEnabled = Boolean(envConfig.SENTRY_DSN);

if (sentryEnabled) {
  const integrations = [Sentry.expressIntegration(), nodeProfilingIntegration()];
  Sentry.init({
    dsn: envConfig.SENTRY_DSN,
    environment: envConfig.NODE_ENV,
    tracesSampleRate: envConfig.NODE_ENV === 'production' ? 0.2 : 1.0,
    integrations,
  });
}

const app: Express = express();
const prisma = db; // Use shared instance
const PORT = envConfig.PORT || SERVER_CONFIG.DEFAULT_PORT;
const NODE_ENV = envConfig.NODE_ENV || SERVER_CONFIG.DEFAULT_NODE_ENV;

// Initialize Redis Cache Service
const cacheService = new OptimizedCacheService(envConfig.REDIS_URL);

// Sentry request context is automatically captured via expressIntegration

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Trust proxy - CRITICAL for Railway/Heroku/Cloud hosting
// Only trust the first proxy (Railway's load balancer)
// This prevents IP-based rate limiting bypass while still reading X-Forwarded-For headers
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(removeSensitiveHeaders);
app.use(securityHeaders);
app.use(cacheControl);

// CORS configuration with validation
let allowedOrigins: string[];
try {
  allowedOrigins = validateCorsOrigin();
} catch (error) {
  console.error('❌ CORS configuration error:', error instanceof Error ? error.message : error);
  process.exit(1);
}

app.use(
  cors({
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
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Session-Id'],
    exposedHeaders: ['X-CSRF-Token', 'X-Session-Id'],
  })
);

// CSRF Protection - Optional for mobile-only API (JWT provides protection)
// For future web version, uncomment this:
// app.use(csrfProtection);

// Input validation and security
app.use(preventSQLInjection); // Check all inputs for SQL injection
app.use(preventXSS); // Check all inputs for XSS

// Rate limiting - General API protection
const limiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.WINDOW_MS,
  max: RATE_LIMIT_CONFIG.MAX_REQUESTS,
  message: API_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Webhook rate limiting (stricter limits)
app.use('/api/payments/webhook', webhookLimiter);

// Body parsing middleware
app.use(express.json({ limit: SERVER_CONFIG.MAX_REQUEST_SIZE }));
app.use(express.urlencoded({ limit: SERVER_CONFIG.MAX_REQUEST_SIZE, extended: true }));

// Static file serving for uploaded files (local storage)
app.use('/uploads', express.static(envConfig.LOCAL_STORAGE_PATH));

// Comprehensive request logging middleware
app.use(requestLogger);

// Performance monitoring middleware
app.use(performanceHeadersMiddleware);
app.use(performanceMiddleware);

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
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
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    message: 'VisaBuddy API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Register routes
// Health check routes (public, no auth required)
app.use('/api/health', healthRoutes);
// Rate limiters for auth endpoints
app.use('/api/auth/login', loginLimiter); // 5 attempts per 15 minutes
app.use('/api/auth/register', registerLimiter); // 3 attempts per hour
app.use('/api/auth', authRoutes);
app.use('/api/countries', countriesRoutes);
app.use('/api/visa-types', visaTypesRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/documents', documentRoutes);
// Form routes (pre-filling, validation, submission)
app.use('/api/forms', formRoutes);
// Document checklist routes (AI-generated checklists)
app.use('/api/document-checklist', documentChecklistRoutes);
// Chat routes with user-level rate limiting and cost tracking
app.use('/api/chat', chatRateLimitMiddleware); // 50 messages per day per user
app.use('/api/chat', attachChatLimitHeaders); // Attach quota info to response headers
app.use('/api/chat', chatRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', strictLimiter); // Sensitive operations
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/legal', legalRoutes);
// Monitoring routes (development/admin only)
app.use('/api/monitoring', monitoringRoutes);
// Security routes (admin only)
app.use('/api/security', securityRoutes);
// Internal routes (service-to-service)
app.use('/internal', internalRoutes);
// Development routes (testing/debugging - development only)
if (envConfig.NODE_ENV === 'development') {
  app.use('/dev', devRoutes);
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: {
      status: HTTP_STATUS.NOT_FOUND,
      message: API_MESSAGES.NOT_FOUND,
      code: 'NOT_FOUND',
      path: req.path,
    },
  });
});

// Sentry error handling is automatically done via expressIntegration()
// Manual error capture is handled in the global error handler below

// Error logging middleware (must be before global error handler)
app.use(errorLogger);

// Global error handler
app.use(async (err: any, req: Request, res: Response, next: NextFunction) => {
  // Error already logged by errorLogger middleware

  // Determine status code
  const status = err.status || err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || API_MESSAGES.INTERNAL_ERROR;
  const code = err.code || 'INTERNAL_ERROR';

  if (status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    const retryAfter = err.retryAfter || err.headers?.['retry-after'];
    if (retryAfter) {
      res.setHeader('Retry-After', retryAfter);
    }
  }

  // Enhance error with user-friendly message
  const { enhanceErrorResponse } = await import('./utils/user-friendly-errors');
  const enhanced = enhanceErrorResponse(err, {
    operation: req.method,
    resource: req.path.split('/').pop(),
  });

  // Capture error to Sentry if enabled
  if (sentryEnabled && status >= 500) {
    Sentry.captureException(err);
  }

  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: {
      status,
      message: enhanced.message || message,
      code: enhanced.code || code,
      ...(enhanced.suggestion && { suggestion: enhanced.suggestion }),
      ...(enhanced.field && { field: enhanced.field }),
    },
  };

  if (status === HTTP_STATUS.TOO_MANY_REQUESTS && res.getHeader('Retry-After')) {
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
  } else {
    // Production: Generic error messages for security
    if (status === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
      errorResponse.error.message = API_MESSAGES.INTERNAL_ERROR;
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
      await DatabasePoolService.initialize({
        connectionUrl: envConfig.DATABASE_URL,
        max: 20,
      });
      console.log('✓ PostgreSQL Connection Pool ready');
    } else {
      console.log('📊 Using SQLite (skipping PostgreSQL connection pool)');
    }

    // 2. Test Prisma connection with retry logic
    console.log('🔗 Testing Prisma Database Connection...');
    const { checkDatabaseHealth, resilientOperation, DatabaseConnectionState } = await import(
      './utils/db-resilience'
    );

    let connectionHealthy = false;
    const maxConnectionAttempts = 3;

    for (let attempt = 1; attempt <= maxConnectionAttempts; attempt++) {
      try {
        const health = await checkDatabaseHealth(prisma);
        if (health.healthy) {
          connectionHealthy = true;
          console.log(`✓ Prisma Database Connection successful (latency: ${health.latency}ms)`);
          break;
        } else {
          console.warn(
            `⚠️  Connection attempt ${attempt}/${maxConnectionAttempts} failed: ${health.error}`
          );
          if (attempt < maxConnectionAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          }
        }
      } catch (error) {
        console.warn(
          `⚠️  Connection attempt ${attempt}/${maxConnectionAttempts} error:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
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
    const { startDatabaseHealthChecks } = await import('./db');
    startDatabaseHealthChecks(30000); // Check every 30 seconds

    // 3. Initialize Storage Service with fallback support
    const storageType = envConfig.STORAGE_TYPE;
    console.log(
      `💾 Initializing ${storageType === 'firebase' ? 'Firebase Storage' : 'Local Storage'}...`
    );

    if (storageType === 'firebase' && envConfig.FIREBASE_PROJECT_ID) {
      try {
        await FirebaseStorageService.initialize();
        console.log('✓ Firebase Storage initialized');
      } catch (error: any) {
        // Firebase Storage is optional - fallback to local storage is expected
        console.log('ℹ️  Firebase Storage not configured, using local storage (this is normal)');
        if (envConfig.NODE_ENV === 'development') {
          console.log('   To enable Firebase Storage, configure FIREBASE_* environment variables');
        }
      }
    } else if (storageType === 'local') {
      try {
        await LocalStorageService.initialize();
        console.log(
          `✓ Local Storage initialized (uploads folder: ${envConfig.LOCAL_STORAGE_PATH})`
        );
      } catch (error) {
        console.error('✗ Local Storage initialization failed:', error);
        throw error;
      }
    }

    // 4. Validate OAuth Configuration
    console.log('🔐 Validating Authentication Configuration...');
    if (envConfig.GOOGLE_CLIENT_ID && envConfig.GOOGLE_CLIENT_SECRET) {
      console.log('✓ Google OAuth configured');
    } else {
      // Google OAuth is optional - log as info, not warning
      console.log('ℹ️  Google OAuth not configured (optional feature)');
      if (envConfig.NODE_ENV === 'development') {
        console.log('   Google Sign-In will not work');
        console.log('   See docs/SETUP_GOOGLE_OAUTH.md for setup instructions');
      }
    }

    if (envConfig.JWT_SECRET && envConfig.JWT_SECRET.length >= 32) {
      console.log('✓ JWT authentication configured');
    } else {
      console.error('❌ JWT_SECRET is not properly configured!');
      console.error('   Run: ./scripts/generate-secrets.sh');
    }

    // 5. Initialize AI Service
    if (envConfig.OPENAI_API_KEY) {
      console.log('🤖 Initializing OpenAI Service...');
      try {
        AIOpenAIService.initialize(prisma);
        console.log('✓ OpenAI Service initialized');
      } catch (error) {
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
      const invalidationService = getCacheInvalidationService(cacheService);
      console.log('✓ Cache Invalidation Strategy initialized');
      console.log(`   - ${invalidationService.getRules().length} invalidation rules registered`);
    } catch (error) {
      console.warn('⚠️  Cache initialization warning:', error);
    }

    // 7. Initialize Slow Query Logger
    console.log('📊 Initializing Slow Query Logger...');
    try {
      const slowQueryLogger = getSlowQueryLogger(prisma);
      console.log('✓ Slow Query Logger initialized');
      console.log(`   - Warning Threshold: 500ms`);
      console.log(`   - Critical Threshold: 2000ms`);
    } catch (error) {
      console.warn('⚠️  Slow Query Logger initialization skipped');
    }

    // 8. Initialize Notification Services
    console.log('📬 Initializing Notification Services...');
    try {
      const { emailService } = await import('./services/email.service');
      const { fcmService } = await import('./services/fcm.service');
      const { notificationSchedulerService } = await import(
        './services/notification-scheduler.service'
      );
      console.log('✓ Email Service ready (SendGrid + Nodemailer fallback)');
      console.log('✓ FCM (Firebase Cloud Messaging) Service ready');
      console.log('✓ Notification Scheduler ready (Bull + Redis)');
    } catch (error) {
      console.warn('⚠️  Notification Services initialization skipped:', error);
    }

    // 9. Initialize Payment Reconciliation Job
    console.log('💳 Initializing Payment System...');
    try {
      const { PaymentReconciliationService } = await import(
        './services/payment-reconciliation.service'
      );
      const reconciliationService = PaymentReconciliationService.getInstance();
      const enableReconciliation = envConfig.ENABLE_RECONCILIATION !== 'false';
      if (enableReconciliation) {
        reconciliationService.startReconciliationJob();
        console.log('✓ Payment Reconciliation Job started (runs daily at 2 AM UTC)');
      } else {
        console.log(
          '✓ Payment Reconciliation Job available (disabled by ENABLE_RECONCILIATION env var)'
        );
      }
      console.log('✓ Mock Payment Provider enabled for development/testing');
    } catch (error) {
      console.warn('⚠️  Payment services initialization partial:', error);
    }

    // Get pool statistics
    const poolStats = DatabasePoolService.getPoolStats();
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
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    await DatabasePoolService.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n✓ Shutting down gracefully...');
  try {
    const { notificationSchedulerService } = await import(
      './services/notification-scheduler.service'
    );
    await notificationSchedulerService.closeQueues();
  } catch (error) {
    console.warn('⚠️  Could not close notification queues');
  }
  await DatabasePoolService.drain();
  await DatabasePoolService.close();
  await prisma.$disconnect();
  console.log('✓ All services shut down');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n✓ Shutting down gracefully...');
  try {
    const { notificationSchedulerService } = await import(
      './services/notification-scheduler.service'
    );
    await notificationSchedulerService.closeQueues();
  } catch (error) {
    console.warn('⚠️  Could not close notification queues');
  }
  await DatabasePoolService.drain();
  await DatabasePoolService.close();
  await prisma.$disconnect();
  console.log('✓ All services shut down');
  process.exit(0);
});

// Start the server
startServer();

export default app;
export { cacheService };
