/**
 * Custom API Error class
 * Extends Error with HTTP status code and error code
 */
export declare class ApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly isOperational: boolean;
    readonly details?: unknown;
    constructor(status: number, message: string, code?: string, isOperational?: boolean, details?: unknown);
    /**
     * Convert error to JSON format for API responses
     */
    toJSON(): {
        status: number;
        message: string;
        code: string;
        details?: unknown;
    };
}
/**
 * Creates an ApiError instance
 * @param status - HTTP status code
 * @param message - Error message
 * @param code - Error code (optional)
 * @param details - Additional error details (optional)
 * @returns ApiError instance
 */
export declare const createError: (status: number, message: string, code?: string, details?: unknown) => ApiError;
/**
 * Common error factory functions
 */
export declare const errors: {
    /**
     * 401 Unauthorized - Authentication required
     */
    unauthorized: (message?: string) => ApiError;
    /**
     * 403 Forbidden - Access denied
     */
    forbidden: (message?: string) => ApiError;
    /**
     * 404 Not Found - Resource not found
     */
    notFound: (resource: string) => ApiError;
    /**
     * 409 Conflict - Resource already exists
     */
    conflict: (field: string) => ApiError;
    /**
     * 400 Bad Request - Invalid request
     */
    badRequest: (message: string, details?: unknown) => ApiError;
    /**
     * 500 Internal Server Error
     */
    internalServer: (message?: string, details?: unknown) => ApiError;
    /**
     * 422 Validation Error - Unprocessable entity
     */
    validationError: (message: string, details?: unknown) => ApiError;
    /**
     * 422 Unprocessable Entity - Same as validationError
     */
    unprocessable: (message: string, details?: unknown) => ApiError;
    /**
     * 429 Too Many Requests - Rate limit exceeded
     */
    rateLimitExceeded: (message?: string) => ApiError;
    /**
     * 503 Service Unavailable - External service error
     */
    serviceUnavailable: (message: string, details?: unknown) => ApiError;
};
/**
 * Checks if error is an operational error (expected errors)
 * vs programming errors (bugs)
 */
export declare function isOperationalError(error: Error): boolean;
//# sourceMappingURL=errors.d.ts.map