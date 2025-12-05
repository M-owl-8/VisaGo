/**
 * Comprehensive logging middleware
 * Logs all requests with context and performance metrics
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getEnvConfig } from '../config/env';
import { getLogWriter } from '../utils/log-writer';
import { sendToIntegrations } from '../utils/log-integrations';

/**
 * Extended request with request ID and user info
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
      userId?: string;
      user?: {
        id: string;
        email: string;
        role?: string;
      };
    }
  }
}

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  method: string;
  path: string;
  statusCode?: number;
  duration?: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  error?: {
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Request logging middleware
 * Logs incoming requests with full context
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID
  const requestId = uuidv4();
  req.requestId = requestId;
  req.startTime = Date.now();

  // Get client IP
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown';

  // Log request start
  logRequest({
    requestId,
    method: req.method,
    path: req.path,
    userId: req.userId,
    ip,
    userAgent: req.headers['user-agent'],
    metadata: {
      query: req.query,
      body: sanitizeBodyForLogging(req.body),
    },
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = req.startTime ? Date.now() - req.startTime : 0;

    logResponse({
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.userId,
      ip,
    });
  });

  next();
}

/**
 * Error logging middleware
 * Logs errors with full context (but sanitizes sensitive data)
 */
export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction): void {
  const requestId = req.requestId || 'unknown';
  const duration = req.startTime ? Date.now() - req.startTime : 0;

  // Sanitize error message for logging (remove sensitive data)
  let errorMessage = err.message;
  let errorStack = err.stack;

  // Remove potential sensitive data from error messages
  // (passwords, tokens, API keys, etc.)
  const sensitivePatterns = [
    /password["\s:=]+[^\s"']+/gi,
    /token["\s:=]+[^\s"']+/gi,
    /api[_-]?key["\s:=]+[^\s"']+/gi,
    /secret["\s:=]+[^\s"']+/gi,
    /authorization["\s:=]+[^\s"']+/gi,
  ];

  sensitivePatterns.forEach((pattern) => {
    errorMessage = errorMessage.replace(pattern, '[REDACTED]');
    if (errorStack) {
      errorStack = errorStack.replace(pattern, '[REDACTED]');
    }
  });

  const errorLogEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: LogLevel.ERROR,
    requestId,
    method: req.method,
    path: req.path,
    duration,
    userId: req.userId,
    error: {
      message: errorMessage,
      stack: errorStack, // Full stack in logs (for debugging), but not in response
    },
    metadata: {
      query: sanitizeBodyForLogging(req.query),
      body: sanitizeBodyForLogging(req.body),
      ip: req.ip,
      errorName: err.name,
    },
  };

  logErrorEntry(errorLogEntry);

  next(err);
}

/**
 * Check if log level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  const envConfig = getEnvConfig();
  // Normalize LOG_LEVEL to uppercase to handle case-insensitive matching
  const configuredLevel = (envConfig.LOG_LEVEL?.toUpperCase() || 'INFO') as LogLevel;

  const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  const configuredIndex = levels.indexOf(configuredLevel);
  const entryIndex = levels.indexOf(level);

  // If configured level is not found, default to INFO
  if (configuredIndex === -1) {
    return entryIndex >= levels.indexOf(LogLevel.INFO);
  }

  return entryIndex >= configuredIndex;
}

/**
 * Logs a request entry
 */
function logRequest(entry: Partial<LogEntry>): void {
  if (!shouldLog(LogLevel.INFO)) {
    return;
  }

  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: LogLevel.INFO,
    requestId: entry.requestId || 'unknown',
    method: entry.method || 'UNKNOWN',
    path: entry.path || 'unknown',
    userId: entry.userId,
    ip: entry.ip,
    userAgent: entry.userAgent,
    metadata: entry.metadata,
  };

  const logString = JSON.stringify(logEntry);
  // Use process.stdout.write to ensure immediate flush on Railway
  process.stdout.write(logString + '\n');

  // Write to file if enabled
  const logWriter = getLogWriter();
  logWriter.write(logString);

  // Send to external integrations (async, don't wait)
  sendToIntegrations(logEntry).catch(() => {
    // Silently fail - external logging should not break the app
  });
}

/**
 * Logs a response entry
 */
function logResponse(entry: Partial<LogEntry>): void {
  const level = entry.statusCode && entry.statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;

  if (!shouldLog(level)) {
    return;
  }

  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    requestId: entry.requestId || 'unknown',
    method: entry.method || 'UNKNOWN',
    path: entry.path || 'unknown',
    statusCode: entry.statusCode,
    duration: entry.duration,
    userId: entry.userId,
    ip: entry.ip,
    metadata: {
      responseTime: entry.duration,
      statusCode: entry.statusCode,
    },
  };

  const logString = JSON.stringify(logEntry);
  // Use process.stdout.write to ensure immediate flush on Railway
  if (level === LogLevel.WARN) {
    process.stderr.write(logString + '\n');
  } else {
    process.stdout.write(logString + '\n');
  }

  // Write to file if enabled
  const logWriter = getLogWriter();
  logWriter.write(logString);

  // Send to external integrations (async, don't wait)
  sendToIntegrations(logEntry).catch(() => {
    // Silently fail - external logging should not break the app
  });
}

/**
 * Logs an error entry (internal function)
 */
function logErrorEntry(entry: Partial<LogEntry>): void {
  if (!shouldLog(LogLevel.ERROR)) {
    return;
  }

  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: LogLevel.ERROR,
    requestId: entry.requestId || 'unknown',
    method: entry.method || 'UNKNOWN',
    path: entry.path || 'unknown',
    duration: entry.duration,
    userId: entry.userId,
    error: entry.error,
    metadata: entry.metadata,
  };

  const logString = JSON.stringify(logEntry);
  // Use process.stderr.write to ensure immediate flush on Railway
  process.stderr.write(logString + '\n');

  // Write to file if enabled
  const logWriter = getLogWriter();
  logWriter.write(logString);

  // Send to external integrations (async, don't wait)
  sendToIntegrations(logEntry).catch(() => {
    // Silently fail - external logging should not break the app
  });
}

/**
 * Sanitizes request body for logging
 * Removes sensitive information like passwords, tokens, etc.
 */
function sanitizeBodyForLogging(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'accessToken',
    'refreshToken',
    'creditCard',
    'cvv',
    'ssn',
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Creates a structured log entry
 */
export function createLogEntry(
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    requestId: 'system',
    method: 'SYSTEM',
    path: 'system',
    metadata: {
      message,
      ...metadata,
    },
  };
}

/**
 * Logs a debug message
 */
export function logDebug(message: string, metadata?: Record<string, unknown>): void {
  if (!shouldLog(LogLevel.DEBUG)) {
    return;
  }

  const entry = createLogEntry(LogLevel.DEBUG, message, metadata);
  const logString = JSON.stringify(entry);
  // Use process.stdout.write to ensure immediate flush on Railway
  process.stdout.write(logString + '\n');

  // Write to file if enabled
  const logWriter = getLogWriter();
  logWriter.write(logString);

  // Send to external integrations (async, don't wait)
  sendToIntegrations(entry).catch(() => {
    // Silently fail - external logging should not break the app
  });
}

/**
 * Logs an info message
 */
export function logInfo(message: string, metadata?: Record<string, unknown>): void {
  if (!shouldLog(LogLevel.INFO)) {
    return;
  }

  const entry = createLogEntry(LogLevel.INFO, message, metadata);
  const logString = JSON.stringify(entry);
  // Use process.stdout.write to ensure immediate flush on Railway
  process.stdout.write(logString + '\n');

  // Write to file if enabled
  const logWriter = getLogWriter();
  logWriter.write(logString);

  // Send to external integrations (async, don't wait)
  sendToIntegrations(entry).catch(() => {
    // Silently fail - external logging should not break the app
  });
}

/**
 * Logs a warning message
 */
export function logWarn(message: string, metadata?: Record<string, unknown>): void {
  if (!shouldLog(LogLevel.WARN)) {
    return;
  }

  const entry = createLogEntry(LogLevel.WARN, message, metadata);
  const logString = JSON.stringify(entry);
  // Use process.stderr.write to ensure immediate flush on Railway
  process.stderr.write(logString + '\n');

  // Write to file if enabled
  const logWriter = getLogWriter();
  logWriter.write(logString);

  // Send to external integrations (async, don't wait)
  sendToIntegrations(entry).catch(() => {
    // Silently fail - external logging should not break the app
  });
}

/**
 * Logs an error message
 */
export function logError(message: string, error?: Error, metadata?: Record<string, unknown>): void {
  if (!shouldLog(LogLevel.ERROR)) {
    return;
  }

  const entry: LogEntry = {
    ...createLogEntry(LogLevel.ERROR, message, metadata),
    error: error
      ? {
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  };

  const logString = JSON.stringify(entry);
  // Use process.stderr.write to ensure immediate flush on Railway
  process.stderr.write(logString + '\n');

  // Write to file if enabled
  const logWriter = getLogWriter();
  logWriter.write(logString);

  // Send to external integrations (async, don't wait)
  sendToIntegrations(entry).catch(() => {
    // Silently fail - external logging should not break the app
  });
}

  // Send to external integrations (async, don't wait)
  sendToIntegrations(entry).catch(() => {
    // Silently fail - external logging should not break the app
  });
}

  // Send to external integrations (async, don't wait)
  sendToIntegrations(entry).catch(() => {
    // Silently fail - external logging should not break the app
  });
}

  // Send to external integrations (async, don't wait)
  sendToIntegrations(entry).catch(() => {
    // Silently fail - external logging should not break the app
  });
}
