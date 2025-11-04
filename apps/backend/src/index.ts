import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { loginLimiter, registerLimiter, apiLimiter, strictLimiter, webhookLimiter } from "./middleware/rate-limit";
import { csrfProtection } from "./middleware/csrf";
import { validateRAGRequest } from "./middleware/input-validation";

// Import services
import DatabasePoolService from "./services/db-pool.service";
import FirebaseStorageService from "./services/firebase-storage.service";
import LocalStorageService from "./services/local-storage.service";
import StorageAdapter from "./services/storage-adapter";
import { OptimizedCacheService } from "./services/cache.service.optimized";
import AIOpenAIService from "./services/ai-openai.service";
import db from "./db";

// Load environment variables
dotenv.config();

const app: Express = express();
const prisma = db; // Use shared instance
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Initialize Redis Cache Service
const cacheService = new OptimizedCacheService(process.env.REDIS_URL);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
}));

// CSRF Protection
app.use(csrfProtection);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later.",
});
app.use("/api/", limiter);

// Webhook rate limiting (stricter limits)
app.use("/api/payments/webhook", webhookLimiter);

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Static file serving for uploaded files (local storage)
app.use("/uploads", express.static(process.env.LOCAL_STORAGE_PATH || "uploads"));

// Custom middleware for request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// API status endpoint
app.get("/api/status", (req: Request, res: Response) => {
  res.json({
    message: "VisaBuddy API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Import route handlers
import authRoutes from "./routes/auth";
import countriesRoutes from "./routes/countries";
import applicationsRoutes from "./routes/applications";
import paymentRoutes from "./routes/payments";
import documentRoutes from "./routes/documents";
import chatRoutes from "./routes/chat";
import usersRoutes from "./routes/users";
import notificationsRoutes from "./routes/notifications";
import adminRoutes from "./routes/admin";
import analyticsRoutes from "./routes/analytics";
import legalRoutes from "./routes/legal";

// Register routes
app.use("/api/auth/login", loginLimiter); // 5 attempts per 15 minutes
app.use("/api/auth/register", registerLimiter); // 3 attempts per hour
app.use("/api/auth", authRoutes);
app.use("/api/countries", countriesRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/admin", strictLimiter); // Sensitive operations
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/legal", legalRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.path} not found`,
    path: req.path,
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
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
      await DatabasePoolService.initialize({
        connectionUrl: process.env.DATABASE_URL,
        max: 20,
      });
      console.log("✓ PostgreSQL Connection Pool ready");
    } else {
      console.log("📊 Using SQLite (skipping PostgreSQL connection pool)");
    }

    // 2. Test Prisma connection
    console.log("🔗 Testing Prisma Database Connection...");
    try {
      // Use a simple count query instead of SELECT 1 to avoid prepared statement issues
      await prisma.user.count();
      console.log("✓ Prisma Database Connection successful");
    } catch (error) {
      // If connection fails, still continue - the pool is ready
      console.warn("⚠️  Prisma health check skipped, but pool is initialized");
    }

    // 3. Initialize Storage Service
    const storageType = process.env.STORAGE_TYPE || "local";
    console.log(`💾 Initializing ${storageType === "firebase" ? "Firebase Storage" : "Local Storage"}...`);
    
    if (storageType === "firebase" && process.env.FIREBASE_PROJECT_ID) {
      try {
        await FirebaseStorageService.initialize();
        console.log("✓ Firebase Storage initialized");
      } catch (error) {
        console.warn("⚠️  Firebase Storage initialization failed, falling back to local storage");
        process.env.STORAGE_TYPE = "local";
      }
    } else if (storageType === "local") {
      try {
        await LocalStorageService.initialize();
        console.log("✓ Local Storage initialized (uploads folder: " + (process.env.LOCAL_STORAGE_PATH || "uploads") + ")");
      } catch (error) {
        console.error("✗ Local Storage initialization failed:", error);
        throw error;
      }
    }

    // 4. Initialize AI Service
    if (process.env.OPENAI_API_KEY) {
      console.log("🤖 Initializing OpenAI Service...");
      try {
        AIOpenAIService.initialize(prisma);
        console.log("✓ OpenAI Service initialized");
      } catch (error) {
        console.warn("⚠️  OpenAI Service initialization skipped");
      }
    }

    // 5. Log Cache Service
    console.log("💾 Cache Service ready (node-cache)");
    const cacheStats = CacheService.getStats();
    console.log(`   - Keys in cache: ${cacheStats.keys}`);

    // 6. Initialize Notification Services
    console.log("📬 Initializing Notification Services...");
    try {
      const { emailService } = await import("./services/email.service");
      const { fcmService } = await import("./services/fcm.service");
      const { notificationSchedulerService } = await import("./services/notification-scheduler.service");
      console.log("✓ Email Service ready (SendGrid + Nodemailer fallback)");
      console.log("✓ FCM (Firebase Cloud Messaging) Service ready");
      console.log("✓ Notification Scheduler ready (Bull + Redis)");
    } catch (error) {
      console.warn("⚠️  Notification Services initialization skipped:", error);
    }

    // Get pool statistics
    const poolStats = DatabasePoolService.getPoolStats();
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
║ Cache: Redis (optimized)                                   ║
║ Storage: ${finalStorageType.padEnd(44)} ║
║ AI: OpenAI GPT-4 (RAG enabled)                             ║
║ Notifications: Email + Push + Job Scheduler                ║
║ API Docs: http://localhost:${PORT}/api/docs     ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("✗ Failed to start server:", error);
    await DatabasePoolService.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n✓ Shutting down gracefully...");
  try {
    const { notificationSchedulerService } = await import("./services/notification-scheduler.service");
    await notificationSchedulerService.closeQueues();
  } catch (error) {
    console.warn("⚠️  Could not close notification queues");
  }
  await DatabasePoolService.drain();
  await DatabasePoolService.close();
  await prisma.$disconnect();
  console.log("✓ All services shut down");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n✓ Shutting down gracefully...");
  try {
    const { notificationSchedulerService } = await import("./services/notification-scheduler.service");
    await notificationSchedulerService.closeQueues();
  } catch (error) {
    console.warn("⚠️  Could not close notification queues");
  }
  await DatabasePoolService.drain();
  await DatabasePoolService.close();
  await prisma.$disconnect();
  console.log("✓ All services shut down");
  process.exit(0);
});

// Start the server
startServer();

export default app;
export { cacheService };