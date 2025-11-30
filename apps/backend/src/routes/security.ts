import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { validateJWTSecret, checkPasswordStrength } from '../utils/securityAudit';
import { getEnvConfig } from '../config/env';

const router = express.Router();

/**
 * GET /api/security/health
 * Check security configuration health (admin only)
 */
router.get('/health', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const envConfig = getEnvConfig();

    // Check JWT secret strength
    const jwtValidation = validateJWTSecret(envConfig.JWT_SECRET);

    // Check environment configuration
    const checks = {
      jwtSecret: {
        configured: !!envConfig.JWT_SECRET,
        strong: jwtValidation.valid,
        issues: jwtValidation.issues,
      },
      https: {
        enabled: envConfig.NODE_ENV === 'production',
        recommended: true,
      },
      cors: {
        configured: !!envConfig.CORS_ORIGIN,
        wildcard: envConfig.CORS_ORIGIN === '*',
        secure: envConfig.CORS_ORIGIN !== '*' || envConfig.NODE_ENV === 'development',
      },
      rateLimit: {
        redis: !!envConfig.REDIS_URL,
        fallback: !envConfig.REDIS_URL ? 'memory' : null,
      },
      sentry: {
        configured: !!envConfig.SENTRY_DSN,
        enabled: !!envConfig.SENTRY_DSN,
      },
      firebase: {
        configured: !!(
          envConfig.FIREBASE_PROJECT_ID &&
          envConfig.FIREBASE_PRIVATE_KEY &&
          envConfig.FIREBASE_CLIENT_EMAIL
        ),
      },
    };

    // Calculate overall health score
    let score = 0;
    let maxScore = 0;

    if (checks.jwtSecret.configured && checks.jwtSecret.strong) score += 2;
    maxScore += 2;

    if (checks.https.enabled) score += 1;
    maxScore += 1;

    if (checks.cors.configured && checks.cors.secure) score += 2;
    maxScore += 2;

    if (checks.rateLimit.redis) score += 1;
    maxScore += 1;

    if (checks.sentry.enabled) score += 1;
    maxScore += 1;

    const healthScore = Math.round((score / maxScore) * 100);

    res.json({
      success: true,
      data: {
        score: healthScore,
        status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
        checks,
        recommendations: [
          ...(!checks.jwtSecret.strong ? ['Use a stronger JWT secret'] : []),
          ...(!checks.https.enabled && envConfig.NODE_ENV === 'production'
            ? ['Enable HTTPS in production']
            : []),
          ...(checks.cors.wildcard && envConfig.NODE_ENV === 'production'
            ? ['Configure specific CORS origins']
            : []),
          ...(!checks.rateLimit.redis ? ['Use Redis for distributed rate limiting'] : []),
          ...(!checks.sentry.enabled ? ['Enable Sentry for error monitoring'] : []),
        ],
      },
    });
  } catch (error) {
    console.error('Error checking security health:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to check security health',
      },
    });
  }
});

/**
 * POST /api/security/check-password
 * Check password strength (public endpoint for client-side validation)
 */
router.post('/check-password', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password is required',
        },
      });
    }

    const result = checkPasswordStrength(password);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error checking password strength:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to check password strength',
      },
    });
  }
});

export default router;




