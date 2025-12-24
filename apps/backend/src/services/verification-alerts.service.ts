import * as Sentry from '@sentry/node';
import { logWarn, logError } from '../middleware/logger';
import { getVerificationMetrics } from './verification-metrics.service';

export interface AlertConfig {
  failureRateThreshold?: number; // e.g., 0.2 for 20%
  slowProcessingThreshold?: number; // milliseconds, e.g., 60000 for 60s
  costAlertThreshold?: number; // tokens per document, e.g., 5000
}

/**
 * Alert evaluator with Sentry integration for monitoring/notification.
 */
export async function evaluateVerificationAlerts(config: AlertConfig = {}): Promise<void> {
  const {
    failureRateThreshold = 0.2,
    slowProcessingThreshold = 60000,
    costAlertThreshold = 5000,
  } = config;

  try {
    const metrics = await getVerificationMetrics();

    const failureRate =
      metrics.total > 0 ? (metrics.rejected + metrics.needsReview) / metrics.total : 0;

    // High failure rate alert
    if (failureRate > failureRateThreshold) {
      const message = `High document verification failure rate: ${(failureRate * 100).toFixed(1)}%`;
      logWarn('[VerificationAlerts] ' + message, {
        failureRate,
        threshold: failureRateThreshold,
        metrics,
      });

      // Send to Sentry as warning with context
      if (Sentry.getCurrentHub().getClient()) {
        Sentry.captureMessage(message, {
          level: 'warning',
          tags: {
            alertType: 'verification_failure_rate',
            component: 'document_verification',
          },
          extra: {
            failureRate,
            threshold: failureRateThreshold,
            metrics,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // Send metrics to Sentry as custom metrics/events
    if (Sentry.getCurrentHub().getClient()) {
      Sentry.metrics.distribution('document_verification.total', metrics.total);
      Sentry.metrics.distribution('document_verification.verified', metrics.verified);
      Sentry.metrics.distribution('document_verification.rejected', metrics.rejected);
      Sentry.metrics.distribution('document_verification.pending', metrics.pending);
      Sentry.metrics.distribution('document_verification.needs_review', metrics.needsReview);
      Sentry.metrics.gauge('document_verification.failure_rate', failureRate);
    }
  } catch (error) {
    logError('[VerificationAlerts] Failed to evaluate alerts', error as Error);
    if (Sentry.getCurrentHub().getClient()) {
      Sentry.captureException(error as Error, {
        tags: {
          component: 'verification_alerts',
        },
      });
    }
  }
}

/**
 * Alert for slow processing time
 */
export function alertSlowProcessing(
  documentId: string,
  processingTimeMs: number,
  threshold: number = 60000
): void {
  if (processingTimeMs > threshold) {
    const message = `Slow document processing detected: ${processingTimeMs}ms for document ${documentId}`;
    logWarn('[VerificationAlerts] ' + message, {
      documentId,
      processingTimeMs,
      threshold,
    });

    if (Sentry.getCurrentHub().getClient()) {
      Sentry.captureMessage(message, {
        level: 'warning',
        tags: {
          alertType: 'slow_processing',
          component: 'document_verification',
        },
        extra: {
          documentId,
          processingTimeMs,
          threshold,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}

/**
 * Alert for high token usage/cost
 */
export function alertHighCost(
  documentId: string,
  tokensUsed: number,
  threshold: number = 5000
): void {
  if (tokensUsed > threshold) {
    const message = `High token usage detected: ${tokensUsed} tokens for document ${documentId}`;
    logWarn('[VerificationAlerts] ' + message, {
      documentId,
      tokensUsed,
      threshold,
    });

    if (Sentry.getCurrentHub().getClient()) {
      Sentry.captureMessage(message, {
        level: 'info',
        tags: {
          alertType: 'high_cost',
          component: 'document_verification',
        },
        extra: {
          documentId,
          tokensUsed,
          threshold,
          estimatedCost: (tokensUsed / 1000) * 0.01, // Rough estimate: $0.01 per 1k tokens
          timestamp: new Date().toISOString(),
        },
      });

      Sentry.metrics.distribution('document_verification.tokens_used', tokensUsed);
    }
  }
}

/**
 * Alert for GPT API errors
 */
export function alertGPTAPIError(documentId: string, error: Error, retryCount: number = 0): void {
  const message = `GPT API error during document verification: ${error.message}`;
  logError('[VerificationAlerts] ' + message, error, {
    documentId,
    retryCount,
  });

  if (Sentry.getCurrentHub().getClient()) {
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        alertType: 'gpt_api_error',
        component: 'document_verification',
      },
      extra: {
        documentId,
        retryCount,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
