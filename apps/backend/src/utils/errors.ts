import { HTTP_STATUS, API_MESSAGES, ERROR_CODES } from "../config/constants";

/**
 * Custom API Error class
 * Extends Error with HTTP status code and error code
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    status: number,
    message: string,
    code?: string,
    isOperational = true,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code || "UNKNOWN_ERROR";
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON() {
    const result: {
      status: number;
      message: string;
      code: string;
      details?: unknown;
    } = {
      status: this.status,
      message: this.message,
      code: this.code,
    };
    if (this.details) {
      result.details = this.details;
    }
    return result;
  }
}

/**
 * Creates an ApiError instance
 * @param status - HTTP status code
 * @param message - Error message
 * @param code - Error code (optional)
 * @param details - Additional error details (optional)
 * @returns ApiError instance
 */
export const createError = (
  status: number,
  message: string,
  code?: string,
  details?: unknown
): ApiError => {
  return new ApiError(status, message, code, true, details);
};

/**
 * Common error factory functions
 */
export const errors = {
  /**
   * 401 Unauthorized - Authentication required
   */
  unauthorized: (message?: string) =>
    createError(
      HTTP_STATUS.UNAUTHORIZED,
      message || API_MESSAGES.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED
    ),

  /**
   * 403 Forbidden - Access denied
   */
  forbidden: (message?: string) =>
    createError(
      HTTP_STATUS.FORBIDDEN,
      message || API_MESSAGES.FORBIDDEN,
      ERROR_CODES.FORBIDDEN
    ),

  /**
   * 404 Not Found - Resource not found
   */
  notFound: (resource: string) =>
    createError(
      HTTP_STATUS.NOT_FOUND,
      `${resource} not found`,
      ERROR_CODES.NOT_FOUND
    ),

  /**
   * 409 Conflict - Resource already exists
   */
  conflict: (field: string) =>
    createError(
      HTTP_STATUS.CONFLICT,
      `${field} already exists`,
      ERROR_CODES.VALIDATION_ERROR
    ),

  /**
   * 400 Bad Request - Invalid request
   */
  badRequest: (message: string, details?: unknown) =>
    createError(
      HTTP_STATUS.BAD_REQUEST,
      message,
      ERROR_CODES.VALIDATION_ERROR,
      details
    ),

  /**
   * 500 Internal Server Error
   */
  internalServer: (message?: string, details?: unknown) =>
    createError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message || API_MESSAGES.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR,
      details
    ),

  /**
   * 422 Validation Error - Unprocessable entity
   */
  validationError: (message: string, details?: unknown) =>
    createError(
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      message,
      ERROR_CODES.VALIDATION_ERROR,
      details
    ),

  /**
   * 422 Unprocessable Entity - Same as validationError
   */
  unprocessable: (message: string, details?: unknown) =>
    createError(
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      message,
      ERROR_CODES.VALIDATION_ERROR,
      details
    ),

  /**
   * 429 Too Many Requests - Rate limit exceeded
   */
  rateLimitExceeded: (message?: string) =>
    createError(
      HTTP_STATUS.TOO_MANY_REQUESTS,
      message || API_MESSAGES.RATE_LIMIT_EXCEEDED,
      ERROR_CODES.RATE_LIMIT_EXCEEDED
    ),

  /**
   * 503 Service Unavailable - External service error
   */
  serviceUnavailable: (message: string, details?: unknown) =>
    createError(
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      message,
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      details
    ),
};

/**
 * Checks if error is an operational error (expected errors)
 * vs programming errors (bugs)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof ApiError) {
    return error.isOperational;
  }
  return false;
}