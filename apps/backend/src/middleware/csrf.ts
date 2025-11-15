import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';

/**
 * CSRF Token Storage (in production, use Redis or session storage)
 * For now, using in-memory storage with a simple TTL mechanism
 */
const csrfTokenStore = new Map<string, { token: string; expiresAt: number }>();

const CSRF_HEADER_NAME = 'x-csrf-token';
const SESSION_HEADER_NAME = 'x-session-id';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EXPOSED_HEADERS = ['X-CSRF-Token', 'X-Session-Id'];

const publicAuthRoutes = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/google',
  '/api/auth/refresh',
];

const exemptRoutes = ['/api/monitoring'];

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

const getPathWithoutQuery = (req: Request): string => {
  const originalUrl = req.originalUrl || req.url || req.path;
  return originalUrl.split('?')[0] || '/';
};

const pathMatches = (path: string, routes: string[]): boolean => {
  return routes.some((route) => path.startsWith(route));
};

const setSessionHeader = (res: Response, sessionId: string) => {
  res.setHeader('X-Session-Id', sessionId);

  const existing = res.getHeader('Access-Control-Expose-Headers');
  const exposeSet = new Set<string>(
    typeof existing === 'string'
      ? existing.split(',').map((value) => value.trim()).filter(Boolean)
      : Array.isArray(existing)
        ? existing.flatMap((value) =>
            (value ?? '')
              .toString()
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
          )
        : []
  );

  EXPOSED_HEADERS.forEach((header) => exposeSet.add(header));
  res.setHeader('Access-Control-Expose-Headers', Array.from(exposeSet).join(', '));
};

const rotateAndAttachToken = (sessionId: string, res: Response) => {
  const token = generateCSRFToken();
  storeCSRFToken(sessionId, token);
  res.setHeader('X-CSRF-Token', token);
  setSessionHeader(res, sessionId);
};

/**
 * CSRF Middleware
 * Adds CSRF token to request and validates on state-changing operations
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const method = (req.method || 'GET').toUpperCase();
  const path = getPathWithoutQuery(req);

  // Determine session identifier
  const headerSessionId = (req.headers[SESSION_HEADER_NAME] as string | undefined)?.trim();
  const cookieSessionId = (req as any).cookies?.sessionId as string | undefined;
  const bodySessionId =
    typeof (req.body as any)?.sessionId === 'string' ? ((req.body as any).sessionId as string) : undefined;

  let sessionId = headerSessionId || cookieSessionId || bodySessionId;
  const isNewSession = !sessionId;

  if (!sessionId) {
    sessionId = crypto.randomBytes(16).toString('hex');
  }

  // Always inform clients of the active session identifier
  setSessionHeader(res, sessionId);

  const isPublicAuthRoute = pathMatches(path, publicAuthRoutes);
  const isExemptRoute = pathMatches(path, exemptRoutes);

  const shouldVerify =
    STATE_CHANGING_METHODS.has(method) && !isPublicAuthRoute && !isExemptRoute;

  // Always rotate and attach a token when we either have a new session or a client needs one
  const ensureTokenPrepared = () => {
    rotateAndAttachToken(sessionId!, res);
  };

  // For safe methods we only need to make sure a token exists for subsequent state-changing requests
  if (SAFE_METHODS.has(method)) {
    // Always generate tokens for GET requests (including /health for initial token fetch)
    if (method === 'GET') {
      ensureTokenPrepared();
    } else if (isNewSession) {
      ensureTokenPrepared();
    }
    return next();
  }

  // Public/exempt routes do not require verification but should still issue a fresh token
  if (!shouldVerify) {
    ensureTokenPrepared();
    return next();
  }

  const headerToken = (req.headers[CSRF_HEADER_NAME] as string | undefined)?.trim();
  const bodyToken =
    typeof (req.body as any)?.csrfToken === 'string' ? ((req.body as any).csrfToken as string) : undefined;
  const queryToken =
    typeof (req.query as any)?.csrfToken === 'string' ? ((req.query as any).csrfToken as string) : undefined;

  const incomingToken = headerToken || bodyToken || queryToken;

  if (!incomingToken) {
    return res.status(403).json({
      success: false,
      error: {
        status: 403,
        message: 'Missing CSRF token',
        code: 'CSRF_TOKEN_MISSING',
      },
    });
  }

  if (!verifyCSRFToken(sessionId!, incomingToken)) {
    return res.status(403).json({
      success: false,
      error: {
        status: 403,
        message: 'Invalid or expired CSRF token',
        code: 'CSRF_TOKEN_INVALID',
      },
    });
  }

  // Rotate token for next request
  ensureTokenPrepared();

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

  entriesToDelete.forEach((key) => csrfTokenStore.delete(key));

  if (entriesToDelete.length > 0) {
    console.log(`🧹 Cleaned up ${entriesToDelete.length} expired CSRF tokens`);
  }
};

// Start cleanup interval
setInterval(cleanupExpiredTokens, 60 * 60 * 1000); // Run every hour