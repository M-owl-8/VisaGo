/**
 * Production-safe logging utility
 * Never logs sensitive data (tokens, passwords, etc.)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private sanitize(context: LogContext): LogContext {
    const sanitized = { ...context };
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'authorization',
      'auth',
      'jwt',
      'apiKey',
      'api_key',
      'accessToken',
      'refreshToken',
    ];

    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.isDevelopment && level === 'debug') {
      return; // Skip debug logs in production
    }

    const sanitizedContext = context ? this.sanitize(context) : undefined;
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...sanitizedContext,
    };

    if (this.isDevelopment) {
      // Pretty print in development
      const prefix = `[${level.toUpperCase()}]`;
      if (sanitizedContext) {
        console[level === 'error' ? 'error' : 'log'](prefix, message, sanitizedContext);
      } else {
        console[level === 'error' ? 'error' : 'log'](prefix, message);
      }
    } else {
      // Structured JSON in production (for log aggregation)
      const jsonLog = JSON.stringify(logEntry);
      if (level === 'error') {
        console.error(jsonLog);
      } else {
        console.log(jsonLog);
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: this.isDevelopment ? error.stack : undefined,
      } : String(error),
    };
    this.log('error', message, errorContext);
  }
}

export const logger = new Logger();

