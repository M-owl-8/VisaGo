/**
 * Standardized API response utilities
 * Ensures consistent response format across all endpoints
 */

import { Response } from 'express';
import { HTTP_STATUS } from '../config/constants';

/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    status: number;
    message: string;
    code: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Sends a successful response
 *
 * @param res - Express response object
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @param meta - Optional metadata (pagination, etc.)
 *
 * @example
 * ```typescript
 * successResponse(res, { userId: "123" }, 201);
 * ```
 */
export function successResponse<T>(
  res: Response,
  data: T,
  status: number = HTTP_STATUS.OK,
  meta?: ApiResponse<T>['meta']
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  };

  res.status(status).json(response);
}

/**
 * Sends an error response
 *
 * @param res - Express response object
 * @param status - HTTP status code
 * @param message - Error message
 * @param code - Error code
 * @param details - Additional error details
 *
 * @example
 * ```typescript
 * errorResponse(res, 404, "User not found", "USER_NOT_FOUND");
 * ```
 */
export function errorResponse(
  res: Response,
  status: number,
  message: string,
  code: string,
  details?: unknown
): void {
  const errorObj: {
    status: number;
    message: string;
    code: string;
    details?: unknown;
  } = {
    status,
    message,
    code,
  };
  if (details) {
    errorObj.details = details;
  }

  const response: ApiResponse = {
    success: false,
    error: errorObj,
  };

  res.status(status).json(response);
}

/**
 * Sends a paginated response
 *
 * @param res - Express response object
 * @param data - Array of items
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 *
 * @example
 * ```typescript
 * paginatedResponse(res, users, 1, 10, 100);
 * ```
 */
export function paginatedResponse<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number
): void {
  const totalPages = Math.ceil(total / limit);

  successResponse(res, data, HTTP_STATUS.OK, {
    page,
    limit,
    total,
    totalPages,
  });
}

/**
 * Sends a created response (201)
 *
 * @param res - Express response object
 * @param data - Created resource data
 *
 * @example
 * ```typescript
 * createdResponse(res, newUser);
 * ```
 */
export function createdResponse<T>(res: Response, data: T): void {
  successResponse(res, data, HTTP_STATUS.CREATED);
}

/**
 * Sends a no content response (204)
 *
 * @param res - Express response object
 *
 * @example
 * ```typescript
 * noContentResponse(res);
 * ```
 */
export function noContentResponse(res: Response): void {
  res.status(HTTP_STATUS.NO_CONTENT).send();
}
