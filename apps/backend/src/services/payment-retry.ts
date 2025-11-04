/**
 * Payment Retry Mechanism with Exponential Backoff
 * Intelligent retry logic for handling transient payment gateway failures
 */

import { PaymentError, PaymentErrorCode, PaymentErrorSeverity } from "./payment-errors";
import { PaymentAuditLogger, PaymentAuditAction } from "./payment-audit-logger";

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFraction: number; // 0.1 = 10% jitter
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 500, // 500ms
  maxDelayMs: 30000, // 30s
  backoffMultiplier: 2, // exponential backoff
  jitterFraction: 0.1, // 10% random jitter to prevent thundering herd
};

/**
 * Retry strategy evaluator
 */
export class RetryStrategy {
  /**
   * Determine if an operation should be retried
   */
  static shouldRetry(error: PaymentError, attempt: number, maxRetries: number): boolean {
    // Don't retry if we've exhausted retries
    if (attempt >= maxRetries) {
      return false;
    }

    // Don't retry non-retryable errors
    if (!error.retryable) {
      return false;
    }

    // Retry on specific error codes
    const retryableErrors = [
      PaymentErrorCode.NETWORK_TIMEOUT,
      PaymentErrorCode.CONNECTION_FAILED,
      PaymentErrorCode.GATEWAY_UNAVAILABLE,
      PaymentErrorCode.GATEWAY_TIMEOUT,
      PaymentErrorCode.GATEWAY_RATE_LIMIT,
      PaymentErrorCode.GATEWAY_MAINTENANCE,
    ];

    return retryableErrors.includes(error.code);
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  static calculateDelay(
    attempt: number,
    config: RetryConfig
  ): number {
    // Exponential backoff: delay = initialDelay * (multiplier ^ attempt)
    let delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);

    // Cap at max delay
    delay = Math.min(delay, config.maxDelayMs);

    // Add jitter to prevent thundering herd
    const jitter = delay * config.jitterFraction * Math.random();
    delay = delay + (jitter * (Math.random() > 0.5 ? 1 : -1));

    return Math.max(config.initialDelayMs, Math.floor(delay));
  }

  /**
   * Get retry-after delay from response headers (if available)
   */
  static getRetryAfterDelay(error: PaymentError): number | null {
    if (error.details?.retryAfter) {
      const retryAfter = parseInt(error.details.retryAfter, 10);
      if (!isNaN(retryAfter)) {
        // retryAfter is typically in seconds
        return retryAfter * 1000;
      }
    }
    return null;
  }
}

/**
 * Generic retry executor
 */
export class PaymentRetry {
  constructor(
    private auditLogger: PaymentAuditLogger,
    private config: RetryConfig = DEFAULT_RETRY_CONFIG
  ) {}

  /**
   * Execute async operation with retry logic
   */
  async executeWithRetry<T>(
    traceId: string,
    paymentMethod: string,
    operation: () => Promise<T>,
    operationName: string = "Payment Operation"
  ): Promise<T> {
    let lastError: PaymentError | null = null;
    let attempt = 0;

    while (attempt < this.config.maxRetries) {
      try {
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;

        // Log successful operation on first try (don't log every try)
        if (attempt === 0) {
          await this.auditLogger.logOperationCompleted(
            traceId,
            paymentMethod,
            PaymentAuditAction.PAYMENT_SUBMITTED,
            duration
          );
        }

        return result;
      } catch (error: any) {
        // Convert to PaymentError if needed
        lastError = error instanceof PaymentError
          ? error
          : this.convertToPaymentError(error);

        // Check if we should retry
        if (!RetryStrategy.shouldRetry(lastError, attempt, this.config.maxRetries)) {
          throw lastError;
        }

        attempt++;

        // Calculate delay (consider Retry-After header first)
        let delay = RetryStrategy.getRetryAfterDelay(lastError)
          || RetryStrategy.calculateDelay(attempt - 1, this.config);

        await this.auditLogger.logRetryAttempt(
          traceId,
          paymentMethod,
          attempt,
          this.config.maxRetries,
          delay
        );

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // Exhausted all retries
    if (lastError) {
      await this.auditLogger.log({
        action: PaymentAuditAction.RETRY_EXHAUSTED,
        paymentMethod,
        errorCode: lastError.code,
        errorSeverity: PaymentErrorSeverity.HIGH,
        message: `${operationName} failed after ${attempt} attempts`,
        details: {
          attempts: attempt,
          finalError: lastError.message,
          errorCode: lastError.code,
        },
        requestTrace: traceId,
        retryCount: attempt,
      });

      throw lastError;
    }

    throw new PaymentError(
      PaymentErrorCode.UNKNOWN_ERROR,
      `${operationName} failed`,
      PaymentErrorSeverity.HIGH,
      500,
      false
    );
  }

  /**
   * Convert generic error to PaymentError
   */
  private convertToPaymentError(error: any): PaymentError {
    if (error instanceof PaymentError) {
      return error;
    }

    return new PaymentError(
      PaymentErrorCode.UNKNOWN_ERROR,
      error.message || "Unknown error occurred",
      PaymentErrorSeverity.MEDIUM,
      500,
      true,
      {},
      error
    );
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}