/**
 * Input Sanitization Utilities
 * Comprehensive sanitization to prevent XSS, SQL injection, and other attacks
 */

/**
 * SQL injection patterns to detect
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
  /('|(\\')|(;)|(\\)|(\/\*)|(\*\/)|(--)|(\+)|(\|)|(&)|(\$)|(%))/gi,
  /(\bOR\b.*=.*)/gi,
  /(\bAND\b.*=.*)/gi,
  /(\bUNION\b.*SELECT)/gi,
];

/**
 * XSS patterns to detect
 */
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick=, onerror=, etc.
  /<img[^>]+src[^>]*=.*javascript:/gi,
  /<svg[^>]*onload/gi,
  /<body[^>]*onload/gi,
  /<input[^>]*onfocus/gi,
];

/**
 * Command injection patterns
 */
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$(){}[\]]/g,
  /\b(cat|ls|pwd|whoami|id|uname|curl|wget|nc|netcat)\b/gi,
];

/**
 * Detects SQL injection attempts
 */
export function detectSQLInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}

/**
 * Detects XSS attempts
 */
export function detectXSS(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}

/**
 * Detects command injection attempts
 */
export function detectCommandInjection(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}

/**
 * Sanitizes string input - removes dangerous characters and patterns
 */
export function sanitizeInput(input: string, options: {
  maxLength?: number;
  allowHTML?: boolean;
  allowSpecialChars?: boolean;
} = {}): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const {
    maxLength = 10000,
    allowHTML = false,
    allowSpecialChars = true,
  } = options;

  let sanitized = input.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters (except newlines and tabs if needed)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Remove HTML tags if not allowed
  if (!allowHTML) {
    sanitized = sanitized
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<[^>]+>/g, '');
  }

  // Remove command injection characters if not allowed
  if (!allowSpecialChars) {
    sanitized = sanitized.replace(/[;&|`$(){}[\]]/g, '');
  }

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitizes object recursively
 */
export function sanitizeObject(obj: any, options: {
  maxLength?: number;
  allowHTML?: boolean;
  allowSpecialChars?: boolean;
} = {}): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeInput(obj, options);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value, options);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Validates and sanitizes input with security checks
 */
export function validateAndSanitize(input: string, options: {
  maxLength?: number;
  required?: boolean;
  logSuspicious?: boolean;
} = {}): { valid: boolean; sanitized: string; errors: string[] } {
  const errors: string[] = [];
  const {
    maxLength = 10000,
    required = false,
    logSuspicious = true,
  } = options;

  if (required && (!input || input.trim().length === 0)) {
    errors.push('Input is required');
    return { valid: false, sanitized: '', errors };
  }

  if (!input) {
    return { valid: true, sanitized: '', errors };
  }

  // Check for SQL injection
  if (detectSQLInjection(input)) {
    if (logSuspicious) {
      console.warn('⚠️  Potential SQL injection detected:', input.substring(0, 100));
    }
    errors.push('Input contains potentially dangerous SQL patterns');
  }

  // Check for XSS
  if (detectXSS(input)) {
    if (logSuspicious) {
      console.warn('⚠️  Potential XSS detected:', input.substring(0, 100));
    }
    errors.push('Input contains potentially dangerous XSS patterns');
  }

  // Check for command injection
  if (detectCommandInjection(input)) {
    if (logSuspicious) {
      console.warn('⚠️  Potential command injection detected:', input.substring(0, 100));
    }
    errors.push('Input contains potentially dangerous command patterns');
  }

  // Sanitize
  const sanitized = sanitizeInput(input, { maxLength });

  return {
    valid: errors.length === 0,
    sanitized,
    errors,
  };
}








