import { Request, Response, NextFunction } from 'express';
import { validateFileUpload, sanitizeFilePath } from '../utils/securityAudit';
import * as Sentry from '@sentry/node';

/**
 * Middleware to validate file uploads for security
 */
export const validateFileUploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if file exists in request
  if (!req.file && !req.files) {
    return next();
  }

  const files = req.file ? [req.file] : Array.isArray(req.files) ? req.files : [];

  for (const file of files) {
    const validation = validateFileUpload(file.originalname, file.mimetype, file.size);

    if (!validation.valid) {
      console.warn('🚨 File upload validation failed:', {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        errors: validation.errors,
        ip: req.ip,
        userId: req.userId,
      });

      Sentry.captureMessage('File upload validation failed', {
        level: 'warning',
        extra: {
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          errors: validation.errors,
          userId: req.userId,
        },
        tags: {
          security: 'file_upload',
          userId: req.userId,
        },
      });

      return res.status(400).json({
        success: false,
        error: {
          status: 400,
          message: 'File validation failed',
          code: 'INVALID_FILE',
          details: validation.errors,
        },
      });
    }

    // Sanitize filename to prevent directory traversal
    file.originalname = sanitizeFilePath(file.originalname);
  }

  next();
};

/**
 * Middleware to check file upload limits
 */
export const fileUploadLimits = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
};

/**
 * Middleware to prevent file bomb attacks
 */
export const preventFileBomb = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = req.headers['content-length'];

  if (contentLength) {
    const size = parseInt(contentLength, 10);

    // Check for suspiciously large requests
    if (size > 50 * 1024 * 1024) {
      // 50MB
      console.warn('🚨 Suspiciously large file upload attempt:', {
        size,
        ip: req.ip,
        userId: req.userId,
      });

      return res.status(413).json({
        success: false,
        error: {
          status: 413,
          message: 'Request entity too large',
          code: 'FILE_TOO_LARGE',
        },
      });
    }
  }

  next();
};
