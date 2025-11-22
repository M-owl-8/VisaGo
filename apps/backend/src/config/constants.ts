/**
 * Application-wide constants
 * Centralized location for all magic numbers, strings, and configuration values
 */

// Server Configuration
export const SERVER_CONFIG = {
  DEFAULT_PORT: 3000,
  DEFAULT_NODE_ENV: 'development',
  MAX_REQUEST_SIZE: '50mb',
  REQUEST_TIMEOUT_MS: 30000,
} as const;

// Rate Limiting Configuration
export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  REGISTER_MAX_ATTEMPTS: 3,
  REGISTER_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  WEBHOOK_MAX_REQUESTS: 10,
  WEBHOOK_WINDOW_MS: 60 * 1000, // 1 minute
  CHAT_MAX_MESSAGES_PER_DAY: 50,
} as const;

// Security Configuration
export const SECURITY_CONFIG = {
  JWT_EXPIRES_IN: '7d',
  PASSWORD_MIN_LENGTH: 12,
  PASSWORD_HASH_ROUNDS: 12,
  CORS_ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  CORS_ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
} as const;

// Database Configuration
export const DATABASE_CONFIG = {
  MAX_POOL_CONNECTIONS: 20,
  CONNECTION_TIMEOUT_MS: 10000,
  QUERY_TIMEOUT_MS: 30000,
  SLOW_QUERY_WARNING_MS: 500,
  SLOW_QUERY_CRITICAL_MS: 2000,
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL_SECONDS: 3600, // 1 hour
  AUTH_TOKEN_TTL_SECONDS: 3600, // 1 hour
  USER_DATA_TTL_SECONDS: 1800, // 30 minutes
  APPLICATION_DATA_TTL_SECONDS: 3600, // 1 hour
  CHAT_HISTORY_TTL_SECONDS: 86400, // 24 hours
} as const;

// File Upload Configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  DEFAULT_STORAGE_PATH: 'uploads',
} as const;

// Payment Configuration
export const PAYMENT_CONFIG = {
  RECONCILIATION_HOUR: 2, // 2 AM UTC
  RECONCILIATION_MINUTE: 0,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 5000,
  WEBHOOK_TIMEOUT_MS: 30000,
} as const;

// API Response Messages
export const API_MESSAGES = {
  SUCCESS: 'Operation completed successfully',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error',
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
  INVALID_TOKEN: 'Invalid or expired token',
  TOKEN_REQUIRED: 'Authentication token required',
} as const;

// Error Codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  // User-friendly error codes
  ACCOUNT_ALREADY_EXISTS: 'ACCOUNT_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
