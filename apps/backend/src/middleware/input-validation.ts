import { Request, Response, NextFunction } from 'express';
import {
  detectSQLInjection,
  detectXSS,
  detectCommandInjection,
  validateAndSanitize,
  sanitizeObject,
} from '../utils/input-sanitization';

/**
 * Input Validation Middleware
 * Prevents prompt injection, XSS, SQL injection, and other attack vectors
 */

/**
 * Sanitize string to prevent prompt injection
 * Removes suspicious patterns that could be used to manipulate LLM behavior
 */
export const sanitizePromptInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove leading/trailing whitespace
  let sanitized = input.trim();

  // Length limit (prevent token bombing)
  const MAX_LENGTH = 2000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, ' ');

  // Warn about suspicious patterns (don't remove, just log)
  const suspiciousPatterns = [
    /ignore previous instructions/i,
    /forget .{0,20}instructions/i,
    /you are now/i,
    /pretend you are/i,
    /system prompt/i,
    /roleplay as/i,
    /act as if/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      console.warn('⚠️ Suspicious pattern detected in input:', pattern);
    }
  }

  return sanitized;
};

/**
 * Validate RAG query input
 */
export const validateRAGQuery = (
  query: string
): { valid: boolean; error?: string; sanitized?: string } => {
  if (!query || typeof query !== 'string') {
    return {
      valid: false,
      error: 'Query must be a non-empty string',
    };
  }

  if (query.trim().length === 0) {
    return {
      valid: false,
      error: 'Query cannot be empty',
    };
  }

  if (query.length > 2000) {
    return {
      valid: false,
      error: 'Query exceeds maximum length of 2000 characters',
    };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /javascript:/i,
    /onclick/i,
    /onerror/i,
    /<script/i,
    /sql\s*injection/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(query)) {
      return {
        valid: false,
        error: 'Query contains invalid characters or patterns',
      };
    }
  }

  const sanitized = sanitizePromptInput(query);
  return {
    valid: true,
    sanitized,
  };
};

/**
 * Validate email input
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL
 */
export const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Middleware to validate RAG query requests
 */
export const validateRAGRequest = (req: Request, res: Response, next: NextFunction) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Query is required',
        code: 'INVALID_INPUT',
      },
    });
  }

  const validation = validateRAGQuery(query);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: {
        message: validation.error || 'Invalid query',
        code: 'INVALID_QUERY',
      },
    });
  }

  // Replace query with sanitized version
  req.body.query = validation.sanitized;
  next();
};

/**
 * Middleware to validate common input fields with enhanced security
 */
export const validateCommonInputs = (req: Request, res: Response, next: NextFunction) => {
  const { email, url, title, description, ...otherFields } = req.body;

  // Validate email if provided
  if (email) {
    if (typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email must be a string',
          code: 'INVALID_EMAIL',
        },
      });
    }

    // Check for SQL injection and XSS in email
    if (detectSQLInjection(email) || detectXSS(email)) {
      console.warn('⚠️  Suspicious email input detected:', email.substring(0, 50));
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid email format',
          code: 'INVALID_EMAIL',
        },
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid email format',
          code: 'INVALID_EMAIL',
        },
      });
    }
  }

  // Validate URL if provided
  if (url) {
    if (typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'URL must be a string',
          code: 'INVALID_URL',
        },
      });
    }

    // Check for XSS and command injection in URL
    if (detectXSS(url) || detectCommandInjection(url)) {
      console.warn('⚠️  Suspicious URL input detected:', url.substring(0, 50));
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid URL format',
          code: 'INVALID_URL',
        },
      });
    }

    if (!validateURL(url)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid URL format',
          code: 'INVALID_URL',
        },
      });
    }
  }

  // Sanitize and validate text fields
  if (title && typeof title === 'string') {
    const validation = validateAndSanitize(title, { maxLength: 500, required: false });
    if (!validation.valid && validation.errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Title contains invalid characters',
          code: 'INVALID_INPUT',
          details: validation.errors,
        },
      });
    }
    req.body.title = validation.sanitized;
  }

  if (description && typeof description === 'string') {
    const validation = validateAndSanitize(description, { maxLength: 5000, required: false });
    if (!validation.valid && validation.errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Description contains invalid characters',
          code: 'INVALID_INPUT',
          details: validation.errors,
        },
      });
    }
    req.body.description = validation.sanitized;
  }

  // Sanitize other string fields in body
  req.body = sanitizeObject(req.body, { maxLength: 10000 });

  next();
};

/**
 * Middleware to detect and prevent SQL injection in all inputs
 */
export const preventSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const checkObject = (obj: any, path: string = ''): string[] => {
    const issues: string[] = [];

    if (typeof obj === 'string') {
      if (detectSQLInjection(obj)) {
        issues.push(`${path}: Potential SQL injection detected`);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        issues.push(...checkObject(item, `${path}[${index}]`));
      });
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = path ? `${path}.${key}` : key;
        issues.push(...checkObject(value, newPath));
      }
    }

    return issues;
  };

  const bodyIssues = checkObject(req.body, 'body');
  const queryIssues = checkObject(req.query, 'query');
  const paramsIssues = checkObject(req.params, 'params');

  const allIssues = [...bodyIssues, ...queryIssues, ...paramsIssues];

  if (allIssues.length > 0) {
    console.warn('🚨 SQL injection attempt detected:', {
      ip: req.ip,
      path: req.path,
      issues: allIssues,
    });

    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid input detected',
        code: 'INVALID_INPUT',
      },
    });
  }

  next();
};

/**
 * Middleware to detect and prevent XSS in all inputs
 */
export const preventXSS = (req: Request, res: Response, next: NextFunction) => {
  const checkObject = (obj: any, path: string = ''): string[] => {
    const issues: string[] = [];

    if (typeof obj === 'string') {
      if (detectXSS(obj)) {
        issues.push(`${path}: Potential XSS detected`);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        issues.push(...checkObject(item, `${path}[${index}]`));
      });
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = path ? `${path}.${key}` : key;
        issues.push(...checkObject(value, newPath));
      }
    }

    return issues;
  };

  const bodyIssues = checkObject(req.body, 'body');
  const queryIssues = checkObject(req.query, 'query');

  const allIssues = [...bodyIssues, ...queryIssues];

  if (allIssues.length > 0) {
    console.warn('🚨 XSS attempt detected:', {
      ip: req.ip,
      path: req.path,
      issues: allIssues,
    });

    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid input detected',
        code: 'INVALID_INPUT',
      },
    });
  }

  next();
};
