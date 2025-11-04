/**
 * Payment Audit Logger
 * Enterprise-grade logging for all payment operations with tracing and recovery info
 */

import { PrismaClient } from "@prisma/client";
import { PaymentErrorCode, PaymentErrorSeverity } from "./payment-errors";

export enum PaymentAuditAction {
  // Payment initiation
  PAYMENT_INITIATED = "PAYMENT_INITIATED",
  PAYMENT_CREATION_FAILED = "PAYMENT_CREATION_FAILED",

  // Payment processing
  PAYMENT_SUBMITTED = "PAYMENT_SUBMITTED",
  PAYMENT_VERIFIED = "PAYMENT_VERIFIED",
  PAYMENT_COMPLETED = "PAYMENT_COMPLETED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  PAYMENT_CANCELLED = "PAYMENT_CANCELLED",

  // Webhook processing
  WEBHOOK_RECEIVED = "WEBHOOK_RECEIVED",
  WEBHOOK_VERIFIED = "WEBHOOK_VERIFIED",
  WEBHOOK_VERIFICATION_FAILED = "WEBHOOK_VERIFICATION_FAILED",
  WEBHOOK_PROCESSED = "WEBHOOK_PROCESSED",
  WEBHOOK_DUPLICATE_DETECTED = "WEBHOOK_DUPLICATE_DETECTED",

  // Retry operations
  RETRY_INITIATED = "RETRY_INITIATED",
  RETRY_SUCCEEDED = "RETRY_SUCCEEDED",
  RETRY_FAILED = "RETRY_FAILED",
  RETRY_EXHAUSTED = "RETRY_EXHAUSTED",

  // Fallback operations
  FALLBACK_INITIATED = "FALLBACK_INITIATED",
  FALLBACK_SUCCEEDED = "FALLBACK_SUCCEEDED",
  FALLBACK_FAILED = "FALLBACK_FAILED",

  // Refunds
  REFUND_INITIATED = "REFUND_INITIATED",
  REFUND_COMPLETED = "REFUND_COMPLETED",
  REFUND_FAILED = "REFUND_FAILED",

  // Configuration
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  CREDENTIAL_VALIDATION = "CREDENTIAL_VALIDATION",
}

export interface PaymentAuditLog {
  id?: string;
  action: PaymentAuditAction;
  paymentMethod: string;
  transactionId?: string;
  applicationId?: string;
  userId?: string;
  errorCode?: PaymentErrorCode;
  errorSeverity?: PaymentErrorSeverity;
  statusCode?: number;
  message: string;
  details: Record<string, any>;
  requestTrace?: string;
  response?: Record<string, any>;
  retryCount?: number;
  duration?: number; // milliseconds
  timestamp: Date;
}

export class PaymentAuditLogger {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate unique request trace ID for tracking across retries and fallbacks
   */
  generateTraceId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log payment audit trail
   */
  async log(logData: Omit<PaymentAuditLog, "id" | "timestamp">): Promise<void> {
    try {
      const auditEntry = {
        ...logData,
        timestamp: new Date(),
        details: logData.details || {},
      };

      // Log to console for real-time monitoring
      const logLevel =
        logData.errorSeverity === PaymentErrorSeverity.CRITICAL
          ? "error"
          : logData.errorSeverity === PaymentErrorSeverity.HIGH
            ? "warn"
            : "info";

      const logMessage = `[Payment Audit] ${logData.action} - ${logData.paymentMethod}`;
      const logDetails = {
        transactionId: logData.transactionId,
        trace: logData.requestTrace,
        error: logData.errorCode,
        message: logData.message,
      };

      if (logLevel === "error") {
        console.error(logMessage, logDetails);
      } else if (logLevel === "warn") {
        console.warn(logMessage, logDetails);
      } else {
        console.log(logMessage, logDetails);
      }

      // Store in database (consider archiving old logs)
      // For now, we'll log to a file or external service
      // This would be configured based on your infrastructure
      await this.storeAuditLog(auditEntry);
    } catch (error) {
      console.error("[Payment Audit Logger] Failed to log audit entry:", error);
      // Don't throw - payment operations should not fail due to logging
    }
  }

  /**
   * Store audit log (can be extended for external logging services)
   */
  private async storeAuditLog(logData: PaymentAuditLog): Promise<void> {
    try {
      // Example: Write to database or external service
      // For production, consider:
      // - ELK Stack (Elasticsearch, Logstash, Kibana)
      // - Datadog
      // - CloudWatch
      // - Splunk

      // For now, structured logging in console is sufficient
      // Extended implementation would send to external service:
      // await externalLoggingService.log(logData);

      // If you need to store in database later, uncomment:
      /*
      await this.prisma.paymentAuditLog.create({
        data: {
          action: logData.action,
          paymentMethod: logData.paymentMethod,
          transactionId: logData.transactionId,
          applicationId: logData.applicationId,
          userId: logData.userId,
          errorCode: logData.errorCode,
          errorSeverity: logData.errorSeverity,
          statusCode: logData.statusCode,
          message: logData.message,
          details: logData.details,
          requestTrace: logData.requestTrace,
          response: logData.response,
          retryCount: logData.retryCount,
          duration: logData.duration,
        },
      });
      */
    } catch (error) {
      console.error("[Payment Audit Logger] Failed to store audit log:", error);
    }
  }

  /**
   * Log payment initiation
   */
  async logPaymentInitiated(
    traceId: string,
    paymentMethod: string,
    params: Record<string, any>
  ): Promise<void> {
    await this.log({
      action: PaymentAuditAction.PAYMENT_INITIATED,
      paymentMethod,
      applicationId: params.applicationId,
      userId: params.userId,
      message: `Payment initiated via ${paymentMethod}`,
      details: {
        amount: params.amount,
        currency: params.currency || "UZS",
      },
      requestTrace: traceId,
    });
  }

  /**
   * Log payment error
   */
  async logPaymentError(
    traceId: string,
    paymentMethod: string,
    errorCode: PaymentErrorCode,
    severity: PaymentErrorSeverity,
    message: string,
    statusCode: number,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action: PaymentAuditAction.PAYMENT_FAILED,
      paymentMethod,
      errorCode,
      errorSeverity: severity,
      statusCode,
      message,
      details: details || {},
      requestTrace: traceId,
    });
  }

  /**
   * Log webhook processing
   */
  async logWebhookReceived(
    traceId: string,
    paymentMethod: string,
    transactionId: string
  ): Promise<void> {
    await this.log({
      action: PaymentAuditAction.WEBHOOK_RECEIVED,
      paymentMethod,
      transactionId,
      message: `${paymentMethod} webhook received`,
      details: {},
      requestTrace: traceId,
    });
  }

  /**
   * Log webhook verification
   */
  async logWebhookVerificationFailed(
    traceId: string,
    paymentMethod: string,
    reason: string
  ): Promise<void> {
    await this.log({
      action: PaymentAuditAction.WEBHOOK_VERIFICATION_FAILED,
      paymentMethod,
      errorCode: PaymentErrorCode.WEBHOOK_VERIFICATION_FAILED,
      errorSeverity: PaymentErrorSeverity.HIGH,
      message: `${paymentMethod} webhook verification failed: ${reason}`,
      details: { reason },
      requestTrace: traceId,
    });
  }

  /**
   * Log retry attempt
   */
  async logRetryAttempt(
    traceId: string,
    paymentMethod: string,
    attempt: number,
    maxAttempts: number,
    delayMs: number
  ): Promise<void> {
    await this.log({
      action: PaymentAuditAction.RETRY_INITIATED,
      paymentMethod,
      message: `Retry attempt ${attempt}/${maxAttempts} for ${paymentMethod}`,
      details: {
        attempt,
        maxAttempts,
        delayMs,
        nextRetryIn: `${delayMs}ms`,
      },
      requestTrace: traceId,
      retryCount: attempt,
    });
  }

  /**
   * Log fallback gateway activation
   */
  async logFallbackInitiated(
    traceId: string,
    primaryMethod: string,
    fallbackMethod: string,
    reason: string
  ): Promise<void> {
    await this.log({
      action: PaymentAuditAction.FALLBACK_INITIATED,
      paymentMethod: primaryMethod,
      message: `Fallback from ${primaryMethod} to ${fallbackMethod}: ${reason}`,
      details: {
        primaryMethod,
        fallbackMethod,
        reason,
      },
      requestTrace: traceId,
    });
  }

  /**
   * Log operation with duration
   */
  async logOperationCompleted(
    traceId: string,
    paymentMethod: string,
    action: PaymentAuditAction,
    duration: number,
    transactionId?: string
  ): Promise<void> {
    await this.log({
      action,
      paymentMethod,
      transactionId,
      message: `${action} completed for ${paymentMethod}`,
      details: { duration },
      requestTrace: traceId,
      duration,
    });
  }
}