/**
 * Payment Gateway Error Types and Custom Exceptions
 * Provides structured error handling for all payment operations
 */

export enum PaymentErrorCode {
  // Network errors
  NETWORK_TIMEOUT = "NETWORK_TIMEOUT",
  CONNECTION_FAILED = "CONNECTION_FAILED",
  DNS_RESOLUTION_FAILED = "DNS_RESOLUTION_FAILED",

  // Gateway errors
  GATEWAY_UNAVAILABLE = "GATEWAY_UNAVAILABLE",
  GATEWAY_TIMEOUT = "GATEWAY_TIMEOUT",
  GATEWAY_RATE_LIMIT = "GATEWAY_RATE_LIMIT",
  GATEWAY_MAINTENANCE = "GATEWAY_MAINTENANCE",

  // Configuration errors
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  MISSING_CONFIGURATION = "MISSING_CONFIGURATION",
  WEBHOOK_SECRET_MISMATCH = "WEBHOOK_SECRET_MISMATCH",

  // Payment validation errors
  INVALID_AMOUNT = "INVALID_AMOUNT",
  UNSUPPORTED_CURRENCY = "UNSUPPORTED_CURRENCY",
  DUPLICATE_TRANSACTION = "DUPLICATE_TRANSACTION",
  PAYMENT_DECLINED = "PAYMENT_DECLINED",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",

  // Webhook errors
  INVALID_WEBHOOK_SIGNATURE = "INVALID_WEBHOOK_SIGNATURE",
  DUPLICATE_WEBHOOK = "DUPLICATE_WEBHOOK",
  WEBHOOK_VERIFICATION_FAILED = "WEBHOOK_VERIFICATION_FAILED",

  // Business logic errors
  APPLICATION_NOT_FOUND = "APPLICATION_NOT_FOUND",
  USER_UNAUTHORIZED = "USER_UNAUTHORIZED",
  PAYMENT_ALREADY_COMPLETED = "PAYMENT_ALREADY_COMPLETED",
  REFUND_NOT_SUPPORTED = "REFUND_NOT_SUPPORTED",

  // Generic errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export enum PaymentErrorSeverity {
  LOW = "LOW", // Recoverable, can retry
  MEDIUM = "MEDIUM", // Possibly recoverable
  HIGH = "HIGH", // Likely not recoverable
  CRITICAL = "CRITICAL", // System-level failure
}

/**
 * Custom Payment Error with structured information
 */
export class PaymentError extends Error {
  constructor(
    public code: PaymentErrorCode,
    public message: string,
    public severity: PaymentErrorSeverity,
    public statusCode: number = 500,
    public retryable: boolean = false,
    public details?: Record<string, any>,
    public originalError?: Error
  ) {
    super(message);
    this.name = "PaymentError";
    Object.setPrototypeOf(this, PaymentError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      statusCode: this.statusCode,
      retryable: this.retryable,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Error classification for payment operations
 */
export class PaymentErrorClassifier {
  /**
   * Classify axios/network error into PaymentError
   */
  static classifyNetworkError(error: any): PaymentError {
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      return new PaymentError(
        PaymentErrorCode.NETWORK_TIMEOUT,
        "Payment gateway request timed out",
        PaymentErrorSeverity.MEDIUM,
        504,
        true,
        { originalCode: error.code },
        error
      );
    }

    if (error.code === "ECONNREFUSED") {
      return new PaymentError(
        PaymentErrorCode.CONNECTION_FAILED,
        "Failed to connect to payment gateway",
        PaymentErrorSeverity.MEDIUM,
        502,
        true,
        { originalCode: error.code },
        error
      );
    }

    if (error.code === "ENOTFOUND") {
      return new PaymentError(
        PaymentErrorCode.DNS_RESOLUTION_FAILED,
        "Could not resolve payment gateway hostname",
        PaymentErrorSeverity.HIGH,
        502,
        false,
        { hostname: error.hostname },
        error
      );
    }

    if (error.response?.status === 429) {
      return new PaymentError(
        PaymentErrorCode.GATEWAY_RATE_LIMIT,
        "Payment gateway rate limit exceeded",
        PaymentErrorSeverity.MEDIUM,
        429,
        true,
        {
          retryAfter: error.response.headers["retry-after"],
          requestsRemaining: error.response.headers["x-ratelimit-remaining"],
        },
        error
      );
    }

    if (error.response?.status === 503) {
      return new PaymentError(
        PaymentErrorCode.GATEWAY_MAINTENANCE,
        "Payment gateway is under maintenance",
        PaymentErrorSeverity.MEDIUM,
        503,
        true,
        { statusCode: error.response.status },
        error
      );
    }

    if (error.response?.status === 502 || error.response?.status === 503) {
      return new PaymentError(
        PaymentErrorCode.GATEWAY_UNAVAILABLE,
        "Payment gateway is temporarily unavailable",
        PaymentErrorSeverity.MEDIUM,
        502,
        true,
        { statusCode: error.response.status },
        error
      );
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      return new PaymentError(
        PaymentErrorCode.INVALID_CREDENTIALS,
        "Invalid payment gateway credentials",
        PaymentErrorSeverity.HIGH,
        401,
        false,
        { statusCode: error.response.status },
        error
      );
    }

    if (error.response?.status === 400) {
      const responseData = error.response.data;
      if (
        responseData?.error?.includes("amount") ||
        responseData?.message?.includes("amount")
      ) {
        return new PaymentError(
          PaymentErrorCode.INVALID_AMOUNT,
          "Invalid payment amount",
          PaymentErrorSeverity.LOW,
          400,
          false,
          responseData,
          error
        );
      }

      if (
        responseData?.error?.includes("duplicate") ||
        responseData?.message?.includes("duplicate")
      ) {
        return new PaymentError(
          PaymentErrorCode.DUPLICATE_TRANSACTION,
          "Duplicate transaction detected",
          PaymentErrorSeverity.LOW,
          400,
          false,
          responseData,
          error
        );
      }

      return new PaymentError(
        PaymentErrorCode.UNKNOWN_ERROR,
        `Payment gateway returned error: ${responseData?.message || "Unknown"}`,
        PaymentErrorSeverity.LOW,
        400,
        false,
        responseData,
        error
      );
    }

    // Default network error
    return new PaymentError(
      PaymentErrorCode.GATEWAY_TIMEOUT,
      "Payment gateway request failed",
      PaymentErrorSeverity.MEDIUM,
      500,
      true,
      { originalMessage: error.message },
      error
    );
  }

  /**
   * Classify webhook signature verification errors
   */
  static classifyWebhookError(error: any, type: string): PaymentError {
    if (error.message.includes("signature")) {
      return new PaymentError(
        PaymentErrorCode.INVALID_WEBHOOK_SIGNATURE,
        `Invalid ${type} webhook signature`,
        PaymentErrorSeverity.HIGH,
        401,
        false,
        { webhookType: type },
        error
      );
    }

    if (error.message.includes("duplicate") || error.code === "DUPLICATE_WEBHOOK") {
      return new PaymentError(
        PaymentErrorCode.DUPLICATE_WEBHOOK,
        `Duplicate ${type} webhook detected`,
        PaymentErrorSeverity.LOW,
        200, // Return 200 to stop retries
        false,
        { webhookType: type },
        error
      );
    }

    return new PaymentError(
      PaymentErrorCode.WEBHOOK_VERIFICATION_FAILED,
      `Failed to verify ${type} webhook`,
      PaymentErrorSeverity.MEDIUM,
      400,
      true,
      { webhookType: type, originalMessage: error.message },
      error
    );
  }
}