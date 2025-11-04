import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * CSRF Token Storage (in production, use Redis or session storage)
 * For now, using in-memory storage with a simple TTL mechanism
 */
const csrfTokenStore = new Map<string, { token: string; expiresAt: number }>();

/**
 * Generate a new CSRF token
 */
export const generateCSRFToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Store CSRF token for verification
 */
export const storeCSRFToken = (sessionId: string, token: string): void => {
  // Token expires in 24 hours
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  csrfTokenStore.set(sessionId, { token, expiresAt });
};

/**
 * Verify CSRF token
 */
export const verifyCSRFToken = (sessionId: string, token: string): boolean => {
  const storedToken = csrfTokenStore.get(sessionId);
  
  if (!storedToken) {
    return false;
  }

  // Check if token has expired
  if (Date.now() > storedToken.expiresAt) {
    csrfTokenStore.delete(sessionId);
    return false;
  }

  // Verify token matches
  return storedToken.token === token;
};

/**
 * CSRF Middleware
 * Adds CSRF token to request and validates on state-changing operations
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Get or create session ID (you might use actual session ID from session storage)
  const sessionId = req.headers['x-session-id'] as string || 
                    req.cookies?.sessionId || 
                    crypto.randomBytes(16).toString('hex');

  // For GET requests, generate and store a new token
  if (req.method === 'GET') {
    const token = generateCSRFToken();
    storeCSRFToken(sessionId, token);
    res.set('X-CSRF-Token', token);
    return next();
  }

  // For state-changing operations (POST, PUT, DELETE, PATCH), verify token
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const token = req.headers['x-csrf-token'] as string || 
                  req.body?.csrfToken as string ||
                  req.query?.csrfToken as string;

    if (!token || !verifyCSRFToken(sessionId, token)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Invalid or missing CSRF token',
          code: 'CSRF_TOKEN_INVALID',
        },
      });
    }

    // Token is valid, generate new one for next request
    const newToken = generateCSRFToken();
    storeCSRFToken(sessionId, newToken);
    res.set('X-CSRF-Token', newToken);
  }

  next();
};

/**
 * Cleanup expired tokens periodically (run every hour)
 */
export const cleanupExpiredTokens = (): void => {
  const now = Date.now();
  const entriesToDelete: string[] = [];

  csrfTokenStore.forEach((value, key) => {
    if (now > value.expiresAt) {
      entriesToDelete.push(key);
    }
  });

  entriesToDelete.forEach(key => csrfTokenStore.delete(key));
  
  if (entriesToDelete.length > 0) {
    console.log(`🧹 Cleaned up ${entriesToDelete.length} expired CSRF tokens`);
  }
};

// Start cleanup interval
setInterval(cleanupExpiredTokens, 60 * 60 * 1000); // Run every hour