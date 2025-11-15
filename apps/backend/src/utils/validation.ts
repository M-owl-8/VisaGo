/**
 * Validation utilities
 * Centralized validation functions for common use cases
 */

import { SECURITY_CONFIG } from "../config/constants";
import { errors } from "./errors";

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates password strength
 * 
 * @param password - Password to validate
 * @returns Validation result with errors array
 * 
 * @example
 * ```typescript
 * const result = validatePassword("MyP@ssw0rd");
 * if (!result.isValid) {
 *   throw errors.validationError(result.errors.join(", "));
 * }
 * ```
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push("Password is required");
    return { isValid: false, errors };
  }

  if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates email format
 * 
 * @param email - Email to validate
 * @returns True if valid email format
 * 
 * @example
 * ```typescript
 * if (!isValidEmail(email)) {
 *   throw errors.validationError("Invalid email format");
 * }
 * ```
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
}

/**
 * Validates and normalizes email
 * 
 * @param email - Email to validate and normalize
 * @returns Normalized email (lowercase, trimmed)
 * @throws {ApiError} If email is invalid
 * 
 * @example
 * ```typescript
 * const normalized = validateAndNormalizeEmail("  User@Example.COM  ");
 * // Returns: "user@example.com"
 * ```
 */
export function validateAndNormalizeEmail(email: string): string {
  if (!email || typeof email !== "string") {
    throw errors.validationError("Email is required");
  }

  const trimmed = email.trim().toLowerCase();

  if (!isValidEmail(trimmed)) {
    throw errors.validationError("Invalid email format");
  }

  return trimmed;
}

/**
 * Validates UUID format
 * 
 * @param uuid - UUID string to validate
 * @returns True if valid UUID format
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates URL format
 * 
 * @param url - URL to validate
 * @returns True if valid URL format
 */
export function isValidURL(url: string): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes string input (removes dangerous characters)
 * 
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, ""); // Remove event handlers
}

/**
 * Validates pagination parameters
 * 
 * @param page - Page number
 * @param limit - Items per page
 * @param maxLimit - Maximum allowed limit (default: 100)
 * @returns Normalized pagination parameters
 */
export function validatePagination(
  page?: number | string,
  limit?: number | string,
  maxLimit = 100
): { page: number; limit: number } {
  const pageNum = typeof page === "string" ? parseInt(page, 10) : page || 1;
  const limitNum = typeof limit === "string" ? parseInt(limit, 10) : limit || 10;

  const validatedPage = Math.max(1, isNaN(pageNum) ? 1 : pageNum);
  const validatedLimit = Math.min(
    maxLimit,
    Math.max(1, isNaN(limitNum) ? 10 : limitNum)
  );

  return {
    page: validatedPage,
    limit: validatedLimit,
  };
}










