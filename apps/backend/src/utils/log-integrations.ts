/**
 * Log Integration Utilities
 * Integration points for external logging services (Sentry, DataDog, Logz.io, etc.)
 */

import { LogEntry, LogLevel } from '../middleware/logger';
import { getEnvConfig } from '../config/env';

export interface LogIntegration {
  name: string;
  enabled: boolean;
  log(entry: LogEntry): void | Promise<void>;
}

/**
 * Sentry Integration
 */
class SentryIntegration implements LogIntegration {
  name = 'Sentry';
  enabled = false;
  private sentry: any = null;

  constructor() {
    const envConfig = getEnvConfig();
    if (envConfig.SENTRY_DSN) {
      try {
        // Dynamic import to avoid requiring Sentry in package.json if not used
        // In production, you would install @sentry/node
        // this.sentry = require("@sentry/node");
        // this.sentry.init({ dsn: envConfig.SENTRY_DSN });
        this.enabled = true;
        console.log('✓ Sentry integration configured (install @sentry/node to enable)');
      } catch (error) {
        console.warn(
          '⚠️  Sentry package not installed. Install @sentry/node to enable Sentry logging.'
        );
      }
    }
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.enabled || !this.sentry) {
      return;
    }

    try {
      if (entry.level === LogLevel.ERROR && entry.error) {
        // Capture exceptions in Sentry
        // this.sentry.captureException(new Error(entry.error.message), {
        //   tags: {
        //     requestId: entry.requestId,
        //     method: entry.method,
        //     path: entry.path,
        //   },
        //   extra: entry.metadata,
        // });
      } else if (entry.level === LogLevel.WARN) {
        // Capture warnings
        // this.sentry.captureMessage(entry.error?.message || "Warning", {
        //   level: "warning",
        //   tags: {
        //     requestId: entry.requestId,
        //   },
        // });
      }
    } catch (error) {
      // Don't throw - external logging should not break the application
      console.error('Sentry logging failed:', error);
    }
  }
}

/**
 * DataDog Integration
 */
class DataDogIntegration implements LogIntegration {
  name = 'DataDog';
  enabled = false;

  constructor() {
    const envConfig = getEnvConfig();
    if (envConfig.DATADOG_API_KEY) {
      // In production, you would use @datadog/browser-logs or datadog-logs-js
      // For now, we just mark it as configured
      this.enabled = true;
      console.log('✓ DataDog integration configured (install @datadog/browser-logs to enable)');
    }
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      // In production, you would send logs to DataDog
      // Example:
      // datadogLogs.logger.info(entry.error?.message || "Info", {
      //   requestId: entry.requestId,
      //   method: entry.method,
      //   path: entry.path,
      //   ...entry.metadata,
      // });
    } catch (error) {
      console.error('DataDog logging failed:', error);
    }
  }
}

/**
 * Logz.io Integration
 */
class LogzioIntegration implements LogIntegration {
  name = 'Logz.io';
  enabled = false;

  constructor() {
    const envConfig = getEnvConfig();
    if (envConfig.LOGZIO_TOKEN) {
      // In production, you would use winston-logzio or similar
      this.enabled = true;
      console.log('✓ Logz.io integration configured (install winston-logzio to enable)');
    }
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      // In production, you would send logs to Logz.io
      // Example:
      // logzioLogger.log({
      //   level: entry.level.toLowerCase(),
      //   message: entry.error?.message || "Log entry",
      //   requestId: entry.requestId,
      //   method: entry.method,
      //   path: entry.path,
      //   ...entry.metadata,
      // });
    } catch (error) {
      console.error('Logz.io logging failed:', error);
    }
  }
}

/**
 * Get all enabled log integrations
 */
export function getLogIntegrations(): LogIntegration[] {
  const integrations: LogIntegration[] = [
    new SentryIntegration(),
    new DataDogIntegration(),
    new LogzioIntegration(),
  ];

  return integrations.filter((integration) => integration.enabled);
}

/**
 * Send log entry to all enabled integrations
 */
export async function sendToIntegrations(entry: LogEntry): Promise<void> {
  const integrations = getLogIntegrations();

  // Send to all integrations in parallel (don't wait for failures)
  await Promise.allSettled(integrations.map((integration) => integration.log(entry)));
}

/**
 * Get integration status
 */
export function getIntegrationStatus(): {
  integrations: Array<{ name: string; enabled: boolean }>;
  totalEnabled: number;
} {
  const integrations = [new SentryIntegration(), new DataDogIntegration(), new LogzioIntegration()];

  return {
    integrations: integrations.map((i) => ({
      name: i.name,
      enabled: i.enabled,
    })),
    totalEnabled: integrations.filter((i) => i.enabled).length,
  };
}
