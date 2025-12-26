/**
 * Environment variable validation and configuration
 * Ensures all required environment variables are present and valid
 */

import { z } from 'zod';

/**
 * Environment variable schema
 * Defines required and optional environment variables with validation
 */
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // CORS
  CORS_ORIGIN: z.string().optional(),

  // Redis (optional)
  REDIS_URL: z.string().url().optional().or(z.literal('')),

  // Storage
  STORAGE_TYPE: z.enum(['local', 'firebase']).default('local'),
  LOCAL_STORAGE_PATH: z.string().default('uploads'),

  // Firebase (optional if STORAGE_TYPE is local)
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),

  // OpenAI (optional)
  OPENAI_API_KEY: z.string().optional(),

  // Together / Ketdik (optional but required for Ketdik routing)
  TOGETHER_API_KEY: z.string().optional(),
  TOGETHER_BASE_URL: z.string().url().default('https://api.together.ai/v1').optional(),
  KETDIK_MODEL_ID: z
    .string()
    .default('murodbekshamsid_9585/DeepSeek-R1-ketdik-r1-v1-9cf6dce1')
    .optional(),
  KETDIK_TIMEOUT_MS: z.string().regex(/^\d+$/).transform(Number).default('20000').optional(),

  // OCR Configuration (optional)
  OCR_PROVIDER: z
    .enum(['tesseract', 'google_vision', 'aws_textract', 'azure'])
    .default('tesseract')
    .optional(),
  GOOGLE_VISION_API_KEY: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(), // Path to service account JSON file
  AWS_TEXTRACT_REGION: z.string().optional(),
  AZURE_COMPUTER_VISION_KEY: z.string().optional(),

  // Google OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Payment Gateways (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYME_MERCHANT_ID: z.string().optional(),
  PAYME_API_KEY: z.string().optional(),
  CLICK_MERCHANT_ID: z.string().optional(),
  CLICK_API_KEY: z.string().optional(),
  UZUM_MERCHANT_ID: z.string().optional(),
  UZUM_API_KEY: z.string().optional(),

  // Email (optional)
  SENDGRID_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Frontend URL (optional)
  FRONTEND_URL: z.string().url().optional(),

  // Feature Flags
  ENABLE_RECONCILIATION: z.string().optional(),
  ENABLE_MOCK_PAYMENTS: z.string().optional(),
  USE_GLOBAL_DOCUMENT_CATALOG: z
    .string()
    .transform((val) => val === 'true')
    .default('false')
    .optional(),
  ENABLE_ENSEMBLE_VALIDATION: z
    .string()
    .transform((val) => val === 'true')
    .default('false')
    .optional(), // Phase 7: Multi-model ensemble validation

  // Payment Freeze (for free trial periods)
  // Default to enabled for first 3 months free period
  PAYMENT_FREEZE_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('true')
    .optional(),
  PAYMENT_FREEZE_START_DATE: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // Format: YYYY-MM-DD (defaults to current date if not set)
  PAYMENT_FREEZE_DURATION_MONTHS: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default('3')
    .optional(), // Default 3 months

  // Logging Configuration (must be uppercase)
  LOG_LEVEL: z
    .enum(['DEBUG', 'INFO', 'WARN', 'ERROR'])
    .default('INFO')
    .transform((val) => val.toUpperCase()),
  LOG_FILE_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('false')
    .optional(),
  LOG_FILE_PATH: z.string().default('logs').optional(),
  LOG_FILE_MAX_SIZE: z.string().regex(/^\d+$/).transform(Number).default('10485760').optional(), // 10MB default
  LOG_FILE_MAX_FILES: z.string().regex(/^\d+$/).transform(Number).default('5').optional(),

  // External Logging Services (optional)
  SENTRY_DSN: z.string().url().optional(),
  DATADOG_API_KEY: z.string().optional(),
  DATADOG_SITE: z.string().optional(),
  LOGZIO_TOKEN: z.string().optional(),

  // Encryption for sensitive fields (AES-256-GCM). Must be 32 bytes (base64 allowed).
  ENCRYPTION_KEY: z.string().min(32).optional(),

  // Data retention (logs cleanup)
  DATA_RETENTION_DAYS: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default('90')
    .optional(),

  // Admin security
  ADMIN_IP_ALLOWLIST: z.string().optional(),
  ADMIN_REQUIRE_2FA: z
    .string()
    .transform((val) => val === 'true')
    .default('true')
    .optional(),
  ADMIN_RATE_LIMIT_WINDOW_MS: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default('60000')
    .optional(),
  ADMIN_RATE_LIMIT_MAX: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default('60')
    .optional(),

  // Per-user API rate limiting (general)
  PER_USER_RATE_LIMIT_WINDOW_MS: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default('60000')
    .optional(),
  PER_USER_RATE_LIMIT_MAX: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default('120')
    .optional(),

  // AI cost controls (daily budget per user, in cents)
  AI_COST_DAILY_LIMIT_CENTS: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default('2000') // $20.00 default daily cap
    .optional(),
});

/**
 * Validated environment variables
 */
export type EnvConfig = z.infer<typeof envSchema>;

let envConfig: EnvConfig | null = null;

/**
 * Validates and returns environment variables
 * @throws {Error} If required environment variables are missing or invalid
 */
export function getEnvConfig(): EnvConfig {
  if (envConfig) {
    return envConfig;
  }

  try {
    // In development, if DATABASE_URL is a postgres URL but Prisma schema is SQLite, use SQLite
    const nodeEnv = process.env.NODE_ENV || 'development';
    const dbUrl = process.env.DATABASE_URL;

    if (nodeEnv === 'development' && dbUrl && dbUrl.startsWith('postgresql://')) {
      // Prisma schema is set to SQLite, so we need to use SQLite for local dev
      process.env.DATABASE_URL = 'file:./dev.db';
    }

    envConfig = envSchema.parse(process.env);
    return envConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new Error(
        `Environment variable validation failed:\n${missingVars.join('\n')}\n\nPlease check your .env file.`
      );
    }
    throw error;
  }
}

/**
 * Validates CORS origin configuration
 * For mobile-only APIs, CORS doesn't apply (CORS is browser-only)
 * For web APIs, specific origins should be set
 */
export function validateCorsOrigin(): string[] {
  const config = getEnvConfig();
  const origin = config.CORS_ORIGIN;

  if (!origin || origin === '*') {
    // Allow wildcard for mobile-only APIs (CORS doesn't apply to mobile apps)
    return ['*'];
  }

  // Split comma-separated origins
  return origin.split(',').map((o) => o.trim());
}

/**
 * Checks if a feature is enabled
 */
export function isFeatureEnabled(feature: string): boolean {
  const config = getEnvConfig();
  const value = (config as any)[feature];
  return value === 'true' || value === true;
}
