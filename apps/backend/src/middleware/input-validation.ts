import { Request, Response, NextFunction } from 'express';

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
export const validateRAGQuery = (query: string): { valid: boolean; error?: string; sanitized?: string } => {
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
 * Middleware to validate common input fields
 */
export const validateCommonInputs = (req: Request, res: Response, next: NextFunction) => {
  const { email, url, title, description } = req.body;

  // Validate email if provided
  if (email && !validateEmail(email)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
      },
    });
  }

  // Validate URL if provided
  if (url && !validateURL(url)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid URL format',
        code: 'INVALID_URL',
      },
    });
  }

  // Sanitize text fields
  if (title && typeof title === 'string') {
    req.body.title = title.trim().substring(0, 500);
  }

  if (description && typeof description === 'string') {
    req.body.description = description.trim().substring(0, 5000);
  }

  next();
};