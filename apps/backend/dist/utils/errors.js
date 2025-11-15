"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errors = exports.createError = exports.ApiError = void 0;
exports.isOperationalError = isOperationalError;
const constants_1 = require("../config/constants");
/**
 * Custom API Error class
 * Extends Error with HTTP status code and error code
 */
class ApiError extends Error {
    constructor(status, message, code, isOperational = true, details) {
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
        const result = {
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
exports.ApiError = ApiError;
/**
 * Creates an ApiError instance
 * @param status - HTTP status code
 * @param message - Error message
 * @param code - Error code (optional)
 * @param details - Additional error details (optional)
 * @returns ApiError instance
 */
const createError = (status, message, code, details) => {
    return new ApiError(status, message, code, true, details);
};
exports.createError = createError;
/**
 * Common error factory functions
 */
exports.errors = {
    /**
     * 401 Unauthorized - Authentication required
     */
    unauthorized: (message) => (0, exports.createError)(constants_1.HTTP_STATUS.UNAUTHORIZED, message || constants_1.API_MESSAGES.UNAUTHORIZED, constants_1.ERROR_CODES.UNAUTHORIZED),
    /**
     * 403 Forbidden - Access denied
     */
    forbidden: (message) => (0, exports.createError)(constants_1.HTTP_STATUS.FORBIDDEN, message || constants_1.API_MESSAGES.FORBIDDEN, constants_1.ERROR_CODES.FORBIDDEN),
    /**
     * 404 Not Found - Resource not found
     */
    notFound: (resource) => (0, exports.createError)(constants_1.HTTP_STATUS.NOT_FOUND, `${resource} not found`, constants_1.ERROR_CODES.NOT_FOUND),
    /**
     * 409 Conflict - Resource already exists
     */
    conflict: (field) => (0, exports.createError)(constants_1.HTTP_STATUS.CONFLICT, `${field} already exists`, constants_1.ERROR_CODES.VALIDATION_ERROR),
    /**
     * 400 Bad Request - Invalid request
     */
    badRequest: (message, details) => (0, exports.createError)(constants_1.HTTP_STATUS.BAD_REQUEST, message, constants_1.ERROR_CODES.VALIDATION_ERROR, details),
    /**
     * 500 Internal Server Error
     */
    internalServer: (message, details) => (0, exports.createError)(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, message || constants_1.API_MESSAGES.INTERNAL_ERROR, constants_1.ERROR_CODES.INTERNAL_ERROR, details),
    /**
     * 422 Validation Error - Unprocessable entity
     */
    validationError: (message, details) => (0, exports.createError)(constants_1.HTTP_STATUS.UNPROCESSABLE_ENTITY, message, constants_1.ERROR_CODES.VALIDATION_ERROR, details),
    /**
     * 422 Unprocessable Entity - Same as validationError
     */
    unprocessable: (message, details) => (0, exports.createError)(constants_1.HTTP_STATUS.UNPROCESSABLE_ENTITY, message, constants_1.ERROR_CODES.VALIDATION_ERROR, details),
    /**
     * 429 Too Many Requests - Rate limit exceeded
     */
    rateLimitExceeded: (message) => (0, exports.createError)(constants_1.HTTP_STATUS.TOO_MANY_REQUESTS, message || constants_1.API_MESSAGES.RATE_LIMIT_EXCEEDED, constants_1.ERROR_CODES.RATE_LIMIT_EXCEEDED),
    /**
     * 503 Service Unavailable - External service error
     */
    serviceUnavailable: (message, details) => (0, exports.createError)(constants_1.HTTP_STATUS.SERVICE_UNAVAILABLE, message, constants_1.ERROR_CODES.EXTERNAL_SERVICE_ERROR, details),
};
/**
 * Checks if error is an operational error (expected errors)
 * vs programming errors (bugs)
 */
function isOperationalError(error) {
    if (error instanceof ApiError) {
        return error.isOperational;
    }
    return false;
}
//# sourceMappingURL=errors.js.map