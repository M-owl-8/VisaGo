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
  adminLimiter,
} from './middleware/rate-limit';
import { csrfProtection } from './middleware/csrf';
import { preventSQLInjection, preventXSS } from './middleware/input-validation';
import { chatRateLimitMiddleware, attachChatLimitHeaders } from './middleware/chat-rate-limit';
import DatabasePoolService from './services/db-pool.service';
import FirebaseStorageService from './services/firebase-storage.service';
import LocalStorageService from './services/local-storage.service';
import StorageAdapter from './services/storage-adapter';
import { OptimizedCacheService } from './services/cache.service.optimized';
import { getCacheInvalidationService } from './services/cache-invalidation.service';
import { getSlowQueryLogger } from './services/slow-query-logger';
import { AIOpenAIService } from './services/ai-openai.service';
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
import docCheckRoutes from './routes/doc-check';
import internalRoutes from './routes/internal';
import devRoutes from './routes/dev';
import { websocketService } from './services/websocket.service';

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
      process.stderr.write("⚠️  CORS_ORIGIN is '*' or empty in production.\n");
      process.stderr.write(
        '   For mobile-only APIs, this is acceptable (CORS only applies to browsers).\n'
      );
      process.stderr.write('   For web APIs, set CORS_ORIGIN to specific allowed origins.\n');
    }

    if (envConfig.JWT_SECRET.length < 32) {
      process.stderr.write(
        '❌ CRITICAL: JWT_SECRET must be at least 32 characters in production!\n'
      );
      process.stderr.write('   Generate a secure secret with: ./scripts/generate-secrets.sh\n');
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
    process.stdout.write('\nℹ️  Optional Features (not configured):\n');
    warnings.forEach((w) => process.stdout.write(`   - ${w}\n`));
    process.stdout.write('\n');
  }
} catch (error) {
  process.stderr.write(
    `❌ Environment validation failed: ${error instanceof Error ? error.message : error}\n`
  );
  process.stderr.write(
    "\n💡 Tip: Run './scripts/validate-env.sh backend' to check your configuration\n"
  );
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
  process.stderr.write(
    `❌ CORS configuration error: ${error instanceof Error ? error.message : error}\n`
  );
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
// Auth routes (rate limiters are applied within the auth router)
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
// Document check routes (Phase 3: Document checking & readiness)
app.use('/api/doc-check', docCheckRoutes);
// Chat routes with user-level rate limiting and cost tracking
// NOTE: chatRateLimitMiddleware must run AFTER authentication (which is in chatRoutes)
// So we apply it inside the chatRoutes router, not here
app.use('/api/chat', chatRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
// Admin routes with more lenient rate limiting (admin panel needs multiple requests)
app.use('/api/admin', adminLimiter);
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
  process.stdout.write(
    `[404 HANDLER] Request not found: ${JSON.stringify({
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      url: req.url,
      baseUrl: req.baseUrl,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
    })}\n`
  );
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: {
      status: HTTP_STATUS.NOT_FOUND,
      message: API_MESSAGES.NOT_FOUND,
      code: 'NOT_FOUND',
      path: req.path,
      originalUrl: req.originalUrl,
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
    process.stdout.write('🚀 Initializing VisaBuddy Backend Services...\n\n');

    // 1. Initialize Database Pool (skip for SQLite in development)
    const isDatabaseSQLite = envConfig.DATABASE_URL.includes('file:');
    if (!isDatabaseSQLite) {
      process.stdout.write('📊 Initializing PostgreSQL Connection Pool...\n');
      await DatabasePoolService.initialize({
        connectionUrl: envConfig.DATABASE_URL,
        max: 20,
      });
      process.stdout.write('✓ PostgreSQL Connection Pool ready\n');
    } else {
      process.stdout.write('📊 Using SQLite (skipping PostgreSQL connection pool)\n');
    }

    // 2. Test Prisma connection with retry logic
    process.stdout.write('🔗 Testing Prisma Database Connection...\n');
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
          process.stdout.write(
            `✓ Prisma Database Connection successful (latency: ${health.latency}ms)\n`
          );
          break;
        } else {
          process.stderr.write(
            `⚠️  Connection attempt ${attempt}/${maxConnectionAttempts} failed: ${health.error}\n`
          );
          if (attempt < maxConnectionAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          }
        }
      } catch (error) {
        process.stderr.write(
          `⚠️  Connection attempt ${attempt}/${maxConnectionAttempts} error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }\n`
        );
        if (attempt < maxConnectionAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    if (!connectionHealthy) {
      process.stderr.write('❌ Failed to establish database connection after multiple attempts\n');
      process.stderr.write('   The server will start but database operations may fail\n');
      process.stderr.write(
        '   Please check your DATABASE_URL and ensure the database is accessible\n'
      );
    }

    // Start periodic health checks
    const { startDatabaseHealthChecks } = await import('./db');
    startDatabaseHealthChecks(30000); // Check every 30 seconds

    // 3. Initialize Storage Service with fallback support
    const storageType = envConfig.STORAGE_TYPE;
    process.stdout.write(
      `💾 Initializing ${storageType === 'firebase' ? 'Firebase Storage' : 'Local Storage'}...\n`
    );

    if (storageType === 'firebase') {
      try {
        await FirebaseStorageService.initialize();
        if (FirebaseStorageService.isEnabled()) {
          const bucketName = FirebaseStorageService.getBucketName();
          process.stdout.write(`✓ Firebase Storage initialized (bucket: ${bucketName})\n`);
        } else {
          process.stdout.write('ℹ️  Firebase Storage not configured, using local storage\n');
          process.stdout.write(
            '   Missing required environment variables. Check: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET\n'
          );
          // Initialize local storage as fallback
          await LocalStorageService.initialize();
          process.stdout.write(
            `✓ Local Storage initialized (uploads folder: ${envConfig.LOCAL_STORAGE_PATH})\n`
          );
        }
      } catch (error: any) {
        // Firebase Storage initialization failed - fallback to local storage
        process.stderr.write(
          `⚠️  Firebase Storage initialization failed, using local storage: ${
            error instanceof Error ? error.message : 'Unknown error'
          }\n`
        );
        await LocalStorageService.initialize();
        process.stdout.write(
          `✓ Local Storage initialized (uploads folder: ${envConfig.LOCAL_STORAGE_PATH})\n`
        );
      }
    } else if (storageType === 'local') {
      try {
        await LocalStorageService.initialize();
        process.stdout.write(
          `✓ Local Storage initialized (uploads folder: ${envConfig.LOCAL_STORAGE_PATH})\n`
        );
      } catch (error) {
        process.stderr.write(`✗ Local Storage initialization failed: ${error}\n`);
        throw error;
      }
    }

    // 4. Validate OAuth Configuration
    process.stdout.write('🔐 Validating Authentication Configuration...\n');
    if (envConfig.GOOGLE_CLIENT_ID && envConfig.GOOGLE_CLIENT_SECRET) {
      process.stdout.write('✓ Google OAuth configured\n');
    } else {
      // Google OAuth is optional - log as info, not warning
      process.stdout.write('ℹ️  Google OAuth not configured (optional feature)\n');
      if (envConfig.NODE_ENV === 'development') {
        process.stdout.write('   Google Sign-In will not work\n');
        process.stdout.write('   See docs/SETUP_GOOGLE_OAUTH.md for setup instructions\n');
      }
    }

    if (envConfig.JWT_SECRET && envConfig.JWT_SECRET.length >= 32) {
      process.stdout.write('✓ JWT authentication configured\n');
    } else {
      process.stderr.write('❌ JWT_SECRET is not properly configured!\n');
      process.stderr.write('   Run: ./scripts/generate-secrets.sh\n');
    }

    // 5. Initialize AI Service
    if (envConfig.OPENAI_API_KEY) {
      process.stdout.write('🤖 Initializing OpenAI Service...\n');
      try {
        AIOpenAIService.initialize(prisma);
        process.stdout.write('✓ OpenAI Service initialized\n');
      } catch (error) {
        process.stderr.write('⚠️  OpenAI Service initialization skipped\n');
      }
    }

    // 6. Initialize Cache Service with Invalidation Strategy
    process.stdout.write('💾 Initializing Cache Service (Redis + Invalidation)...\n');
    try {
      const cacheStats = cacheService.getStats?.();
      if (cacheStats) {
        process.stdout.write(
          `✓ Cache Service active (Redis: ${cacheStats.redisConnected ? '✓' : '✗'})\n`
        );
        process.stdout.write(`   - Hit Rate: ${cacheStats.hitRate.toFixed(1)}%\n`);
        process.stdout.write(`   - Local Cache Size: ${cacheStats.localCacheSize} entries\n`);
      }

      // Initialize cache invalidation strategy
      const invalidationService = getCacheInvalidationService(cacheService);
      process.stdout.write('✓ Cache Invalidation Strategy initialized\n');
      process.stdout.write(
        `   - ${invalidationService.getRules().length} invalidation rules registered\n`
      );
    } catch (error) {
      process.stderr.write(`⚠️  Cache initialization warning: ${error}\n`);
    }

    // 7. Initialize Slow Query Logger
    process.stdout.write('📊 Initializing Slow Query Logger...\n');
    try {
      const slowQueryLogger = getSlowQueryLogger(prisma);
      process.stdout.write('✓ Slow Query Logger initialized\n');
      process.stdout.write(`   - Warning Threshold: 500ms\n`);
      process.stdout.write(`   - Critical Threshold: 2000ms\n`);
    } catch (error) {
      process.stderr.write('⚠️  Slow Query Logger initialization skipped\n');
    }

    // 8. Initialize Notification Services
    process.stdout.write('📬 Initializing Notification Services...\n');
    try {
      const { emailService } = await import('./services/email.service');
      const { fcmService } = await import('./services/fcm.service');
      const { notificationSchedulerService } = await import(
        './services/notification-scheduler.service'
      );
      process.stdout.write('✓ Email Service ready (SendGrid + Nodemailer fallback)\n');
      process.stdout.write('✓ FCM (Firebase Cloud Messaging) Service ready\n');
      process.stdout.write('✓ Notification Scheduler ready (Bull + Redis)\n');
    } catch (error) {
      process.stderr.write(`⚠️  Notification Services initialization skipped: ${error}\n`);
    }

    // 9. Initialize Payment Reconciliation Job
    process.stdout.write('💳 Initializing Payment System...\n');
    try {
      const { PaymentReconciliationService } = await import(
        './services/payment-reconciliation.service'
      );
      const reconciliationService = PaymentReconciliationService.getInstance();
      const enableReconciliation = envConfig.ENABLE_RECONCILIATION !== 'false';
      if (enableReconciliation) {
        reconciliationService.startReconciliationJob();
        process.stdout.write('✓ Payment Reconciliation Job started (runs daily at 2 AM UTC)\n');
      } else {
        process.stdout.write(
          '✓ Payment Reconciliation Job available (disabled by ENABLE_RECONCILIATION env var)\n'
        );
      }
      process.stdout.write('✓ Mock Payment Provider enabled for development/testing\n');
    } catch (error) {
      process.stderr.write(`⚠️  Payment services initialization partial: ${error}\n`);
    }

    // 10. Initialize Embassy Rules Sync Pipeline
    process.stdout.write('🌐 Initializing Embassy Rules Sync Pipeline...\n');
    try {
      const { EmbassySyncJobService } = await import('./services/embassy-sync-job.service');
      const { EmbassySyncSchedulerService } = await import(
        './services/embassy-sync-scheduler.service'
      );

      // Initialize the queue
      EmbassySyncJobService.initialize();
      process.stdout.write('✓ Embassy Sync Job Queue initialized\n');

      // Start scheduler if enabled
      const enableSync = process.env.ENABLE_EMBASSY_SYNC !== 'false';
      if (enableSync) {
        EmbassySyncSchedulerService.start();
        const cronExpression = process.env.EMBASSY_SYNC_CRON || '0 2 * * *';
        process.stdout.write(`✓ Embassy Sync Scheduler started (runs ${cronExpression})\n`);
      } else {
        process.stdout.write(
          '✓ Embassy Sync Scheduler available (disabled by ENABLE_EMBASSY_SYNC env var)\n'
        );
      }
    } catch (error) {
      process.stderr.write(`⚠️  Embassy Sync Pipeline initialization partial: ${error}\n`);
    }

    // 11. Initialize Document Processing Queue (for background document processing)
    process.stdout.write('📄 Initializing Document Processing Queue...\n');
    try {
      const { DocumentProcessingQueueService } = await import(
        './services/document-processing-queue.service'
      );
      DocumentProcessingQueueService.initialize();
      process.stdout.write('✓ Document Processing Queue initialized\n');
    } catch (error) {
      process.stderr.write(
        `⚠️  Document Processing Queue initialization failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }\n`
      );
      process.stderr.write('   Document processing will use fallback mode\n');
    }

    // Get pool statistics
    const poolStats = DatabasePoolService.getPoolStats();
    process.stdout.write('\n📈 Database Pool Stats:\n');
    process.stdout.write(`   - Status: ${poolStats.status}\n`);
    process.stdout.write(`   - Total connections: ${poolStats.totalConnections}\n`);
    process.stdout.write(`   - Idle connections: ${poolStats.idleConnections}\n`);

    process.stdout.write('\n✅ All services initialized successfully!\n\n');

    // Start Express server
    const server = app.listen(PORT, () => {
      // Initialize WebSocket server
      websocketService.initialize(server);
      process.stdout.write('✅ WebSocket server initialized on path /ws\n');
      // Get actual storage status (not just STORAGE_TYPE env var)
      const storageInfo = StorageAdapter.getStorageInfo();
      const storageDisplay =
        storageInfo.type === 'firebase' ? `Firebase (${storageInfo.bucket || 'unknown'})` : 'Local';

      const envPadding = NODE_ENV.padEnd(42);
      const portPadding = String(PORT).padEnd(52);
      const storagePadding = storageDisplay.padEnd(44);

      process.stdout.write(`
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
      \n`);
    });
  } catch (error) {
    process.stderr.write(`✗ Failed to start server: ${error}\n`);
    await DatabasePoolService.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  process.stdout.write('\n✓ Shutting down gracefully...\n');
  try {
    const { notificationSchedulerService } = await import(
      './services/notification-scheduler.service'
    );
    await notificationSchedulerService.closeQueues();
  } catch (error) {
    process.stderr.write('⚠️  Could not close notification queues\n');
  }
  try {
    const { EmbassySyncJobService } = await import('./services/embassy-sync-job.service');
    await EmbassySyncJobService.close();
  } catch (error) {
    process.stderr.write('⚠️  Could not close embassy sync queue\n');
  }
  await DatabasePoolService.drain();
  await DatabasePoolService.close();
  await prisma.$disconnect();
  process.stdout.write('✓ All services shut down\n');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  process.stdout.write('\n✓ Shutting down gracefully...\n');
  try {
    const { notificationSchedulerService } = await import(
      './services/notification-scheduler.service'
    );
    await notificationSchedulerService.closeQueues();
  } catch (error) {
    process.stderr.write('⚠️  Could not close notification queues\n');
  }
  try {
    const { EmbassySyncJobService } = await import('./services/embassy-sync-job.service');
    await EmbassySyncJobService.close();
  } catch (error) {
    process.stderr.write('⚠️  Could not close embassy sync queue\n');
  }
  await DatabasePoolService.drain();
  await DatabasePoolService.close();
  await prisma.$disconnect();
  process.stdout.write('✓ All services shut down\n');
  process.exit(0);
});

// Start the server
startServer();

export default app;
export { cacheService, websocketService };
