/**
 * Request validation middleware
 * Validates and sanitizes request data before processing
 */

import { Request, Response, NextFunction } from "express";
import { sanitizeString, validatePagination } from "../utils/validation";
import { errors } from "../utils/errors";
import { HTTP_STATUS } from "../config/constants";

/**
 * Request validation options
 */
export interface ValidationOptions {
  body?: {
    required?: string[];
    optional?: string[];
    sanitize?: string[];
    validate?: Record<string, (value: any) => boolean>;
  };
  query?: {
    required?: string[];
    optional?: string[];
    sanitize?: string[];
    validate?: Record<string, (value: any) => boolean>;
  };
  params?: {
    required?: string[];
    optional?: string[];
    sanitize?: string[];
    validate?: Record<string, (value: any) => boolean>;
  };
}

/**
 * Creates a request validation middleware
 * 
 * @param options - Validation options
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * router.post('/users',
 *   validateRequest({
 *     body: {
 *       required: ['email', 'password'],
 *       sanitize: ['email', 'firstName', 'lastName'],
 *       validate: {
 *         email: (val) => isValidEmail(val),
 *         password: (val) => validatePassword(val).isValid
 *       }
 *     }
 *   }),
 *   handler
 * );
 * ```
 */
export function validateRequest(options: ValidationOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate body
      if (options.body) {
        validateObject(req.body, options.body, "body");
        sanitizeObject(req.body, options.body.sanitize || []);
      }

      // Validate query
      if (options.query) {
        validateObject(req.query, options.query, "query");
        sanitizeObject(req.query, options.query.sanitize || []);
      }

      // Validate params
      if (options.params) {
        validateObject(req.params, options.params, "params");
        sanitizeObject(req.params, options.params.sanitize || []);
      }

      next();
    } catch (error) {
      if (error instanceof Error) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: {
            status: HTTP_STATUS.BAD_REQUEST,
            message: error.message,
            code: "VALIDATION_ERROR",
          },
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validates an object against validation options
 */
function validateObject(
  obj: Record<string, any>,
  options: ValidationOptions["body"],
  source: string
): void {
  if (!options) return;

  // Check required fields
  if (options.required) {
    for (const field of options.required) {
      const value = obj[field];
      // Allow empty strings for password (will be validated by express-validator)
      // But require the field to be present
      if (value === undefined || value === null) {
        throw errors.badRequest(`Missing required ${source} field: ${field}`);
      }
      // For non-password fields, also check for empty strings
      if (field !== 'password' && value === "") {
        throw errors.badRequest(`Missing required ${source} field: ${field}`);
      }
    }
  }

  // Validate fields
  if (options.validate) {
    for (const [field, validator] of Object.entries(options.validate)) {
      if (obj[field] !== undefined && obj[field] !== null) {
        if (!validator(obj[field])) {
          throw errors.badRequest(`Invalid ${source} field: ${field}`);
        }
      }
    }
  }
}

/**
 * Sanitizes object fields
 */
function sanitizeObject(
  obj: Record<string, any>,
  fieldsToSanitize: string[]
): void {
  for (const field of fieldsToSanitize) {
    if (obj[field] && typeof obj[field] === "string") {
      obj[field] = sanitizeString(obj[field]);
    }
  }
}

/**
 * Validates pagination parameters
 * Normalizes page and limit values
 */
export function validatePaginationParams(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const { page, limit } = validatePagination(
      req.query.page as string | number | undefined,
      req.query.limit as string | number | undefined
    );

    // Attach normalized values to request
    (req as any).pagination = { page, limit };

    next();
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: {
        status: HTTP_STATUS.BAD_REQUEST,
        message: "Invalid pagination parameters",
        code: "VALIDATION_ERROR",
      },
    });
  }
}









