import * as Sentry from '@sentry/node';
import db from '../db';

export interface SecurityAuditLog {
  userId?: string;
  action: string;
  resource: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Log security-related events for auditing
 */
export async function logSecurityEvent(event: SecurityAuditLog): Promise<void> {
  try {
    // Log to console for immediate visibility
    console.log('[Security Audit]', {
      timestamp: new Date().toISOString(),
      ...event,
    });

    // Log to Sentry for monitoring
    Sentry.addBreadcrumb({
      category: 'security',
      message: `${event.action} on ${event.resource}`,
      level: event.success ? 'info' : 'warning',
      data: event,
    });

    // For failed security events, capture as Sentry message
    if (!event.success) {
      Sentry.captureMessage(`Security event failed: ${event.action}`, {
        level: 'warning',
        extra: { ...event } as Record<string, unknown>,
        tags: {
          security: 'audit',
          action: event.action,
          resource: event.resource,
        },
      });
    }

    // Store in database for long-term audit trail
    if (event.userId) {
      await db.activityLog.create({
        data: {
          userId: event.userId,
          action: event.action,
          details: JSON.stringify({
            resource: event.resource,
            metadata: event.metadata ?? {},
            success: event.success,
          }),
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
        },
      });
    }
  } catch (error) {
    console.error('[Security Audit] Failed to log event:', error);
    // Don't throw - audit logging failures shouldn't break the app
  }
}

/**
 * Check for suspicious activity patterns
 */
export async function detectSuspiciousActivity(
  userId: string,
  action: string,
  timeWindowMinutes: number = 15,
): Promise<{ suspicious: boolean; reason?: string }> {
  try {
    const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    // Check for repeated failed login attempts
    if (action === 'login_failed') {
      const failedAttempts = await db.activityLog.count({
        where: {
          userId,
          action: 'login_failed',
          createdAt: { gte: since },
        },
      });

      if (failedAttempts >= 5) {
        return {
          suspicious: true,
          reason: `${failedAttempts} failed login attempts in ${timeWindowMinutes} minutes`,
        };
      }
    }

    // Check for rapid API calls
    const recentActions = await db.activityLog.count({
      where: {
        userId,
        createdAt: { gte: since },
      },
    });

    if (recentActions > 100) {
      return {
        suspicious: true,
        reason: `${recentActions} actions in ${timeWindowMinutes} minutes (possible bot)`,
      };
    }

    return { suspicious: false };
  } catch (error) {
    console.error('[Security] Error detecting suspicious activity:', error);
    return { suspicious: false };
  }
}

/**
 * Validate JWT token strength
 */
export function validateJWTSecret(secret: string): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!secret) {
    issues.push('JWT secret is not set');
    return { valid: false, issues };
  }

  if (secret.length < 32) {
    issues.push('JWT secret is too short (minimum 32 characters)');
  }

  if (!/[A-Z]/.test(secret)) {
    issues.push('JWT secret should contain uppercase letters');
  }

  if (!/[a-z]/.test(secret)) {
    issues.push('JWT secret should contain lowercase letters');
  }

  if (!/[0-9]/.test(secret)) {
    issues.push('JWT secret should contain numbers');
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(secret)) {
    issues.push('JWT secret should contain special characters');
  }

  // Check for common weak secrets
  const weakSecrets = [
    'secret',
    'password',
    'changeme',
    'default',
    '12345678',
    'test',
  ];

  for (const weak of weakSecrets) {
    if (secret.toLowerCase().includes(weak)) {
      issues.push(`JWT secret contains weak pattern: "${weak}"`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  else feedback.push('Password should be at least 12 characters');

  // Complexity checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Add numbers');

  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 2;
  else feedback.push('Add special characters');

  // Check for common patterns
  const commonPatterns = [
    /(.)\1{2,}/, // Repeated characters
    /123|234|345|456|567|678|789|890/, // Sequential numbers
    /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i, // Sequential letters
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score -= 1;
      feedback.push('Avoid common patterns');
      break;
    }
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong';
  if (score >= 6) strength = 'strong';
  else if (score >= 4) strength = 'medium';
  else strength = 'weak';

  return { strength, score, feedback };
}

/**
 * Sanitize file path to prevent directory traversal
 */
export function sanitizeFilePath(filePath: string): string {
  // Remove any path traversal attempts
  let sanitized = filePath.replace(/\.\./g, '');
  sanitized = sanitized.replace(/\/\//g, '/');
  sanitized = sanitized.replace(/\\/g, '/');

  // Remove leading slashes
  sanitized = sanitized.replace(/^\/+/, '');

  return sanitized;
}

/**
 * Validate file upload security
 */
export function validateFileUpload(
  filename: string,
  mimetype: string,
  size: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check file size (max 10MB)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (size > MAX_SIZE) {
    errors.push(`File size exceeds maximum of ${MAX_SIZE / 1024 / 1024}MB`);
  }

  // Check filename for dangerous characters
  if (/[<>:"|?*\\]/.test(filename)) {
    errors.push('Filename contains invalid characters');
  }

  // Check for double extensions
  if (/\.[^.]+\.[^.]+$/.test(filename)) {
    errors.push('Double file extensions are not allowed');
  }

  // Allowed MIME types for documents
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (!allowedMimeTypes.includes(mimetype)) {
    errors.push(`File type ${mimetype} is not allowed`);
  }

  // Check filename extension matches MIME type
  const extension = filename.split('.').pop()?.toLowerCase();
  const mimeExtensionMap: Record<string, string[]> = {
    'application/pdf': ['pdf'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/jpg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
      'docx',
    ],
    'application/vnd.ms-excel': ['xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
      'xlsx',
    ],
  };

  const expectedExtensions = mimeExtensionMap[mimetype] || [];
  if (extension && !expectedExtensions.includes(extension)) {
    errors.push(
      `File extension .${extension} does not match MIME type ${mimetype}`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Rate limit key generator for user-specific limits
 */
export function generateRateLimitKey(
  userId: string,
  action: string,
): string {
  return `ratelimit:${userId}:${action}`;
}

/**
 * Check if IP is from a known proxy or VPN
 */
export function isProxyOrVPN(ip: string): boolean {
  // Basic check - in production, use a service like IPQualityScore
  const suspiciousRanges = [
    '10.', // Private
    '172.16.', // Private
    '192.168.', // Private
    '127.', // Localhost
  ];

  return suspiciousRanges.some((range) => ip.startsWith(range));
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

