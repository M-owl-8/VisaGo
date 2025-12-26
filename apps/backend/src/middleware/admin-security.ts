import { Request, Response, NextFunction } from 'express';
import { getEnvConfig } from '../config/env';
import { db as prisma } from '../db';
import AdminLogService from '../services/admin-log.service';
import { logError, logWarn } from './logger';

const parseAllowlist = (value?: string): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((ip) => ip.trim())
    .filter((ip) => ip.length > 0);
};

const getClientIp = (req: Request): string => {
  const forwarded = (req.headers['x-forwarded-for'] as string) || '';
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.ip;
};

/**
 * Enforces admin IP allowlist and 2FA requirement (if enabled).
 */
export const adminSecurityGuard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const config = getEnvConfig();
    const allowlist = parseAllowlist(config.ADMIN_IP_ALLOWLIST);
    const clientIp = getClientIp(req);

    if (allowlist.length > 0 && !allowlist.includes(clientIp)) {
      logWarn('[AdminSecurity] IP not in allowlist', { clientIp, path: req.path });
      return res.status(403).json({
        success: false,
        error: 'Access denied from this IP. Contact an administrator.',
      });
    }

    // Enforce 2FA for admin roles when enabled
    if (config.ADMIN_REQUIRE_2FA && req.userId) {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          role: true,
          preferences: {
            select: { twoFactorEnabled: true },
          },
        },
      });

      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      const twoFactorEnabled = user?.preferences?.twoFactorEnabled;

      if (isAdmin && !twoFactorEnabled) {
        logWarn('[AdminSecurity] Admin 2FA required', { userId: req.userId });
        return res.status(403).json({
          success: false,
          error: 'Two-factor authentication required for admin access. Please enable 2FA.',
        });
      }
    }

    return next();
  } catch (error) {
    logError('[AdminSecurity] Guard failure', error as Error, { path: req.path });
    return res.status(500).json({
      success: false,
      error: 'Admin security check failed',
    });
  }
};

/**
 * Audit logger for admin routes. Captures mutations and successful reads.
 * Does not block the request path; errors are logged but not surfaced to clients.
 */
export const adminAuditLogger = (req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  const clientIp = getClientIp(req);

  res.on('finish', () => {
    try {
      if (!req.userId) return;
      // Log all admin requests; mark mutations as critical
      const isMutation = req.method !== 'GET';
      const payload = {
        path: req.originalUrl,
        method: req.method,
        status: res.statusCode,
        ip: clientIp,
        userAgent: (req.headers['user-agent'] || '').toString().slice(0, 200),
        durationMs: Date.now() - startedAt,
      };

      AdminLogService.recordAdminAction({
        action: isMutation ? `${req.method}_mutation` : req.method,
        entityType: 'admin_route',
        entityId: req.path,
        performedBy: req.userId,
        changes: payload,
      }).catch((err) => {
        logWarn('[AdminSecurity] Failed to record admin audit log', {
          message: (err as Error)?.message,
          path: req.path,
        });
      });
    } catch (err) {
      logWarn('[AdminSecurity] Audit logger error', {
        message: (err as Error)?.message,
        path: req.path,
      });
    }
  });

  next();
};

