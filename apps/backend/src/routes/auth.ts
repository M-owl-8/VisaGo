/**
 * Authentication routes
 * Handles user registration, login, and authentication
 */

import express, { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { authenticateToken } from '../middleware/auth';
import { ApiError } from '../utils/errors';
import { validateRegister, validateLogin, handleValidationErrors } from '../middleware/validation';
import { validateRequest } from '../middleware/request-validation';
import { isValidEmail } from '../utils/validation';
import { successResponse, createdResponse, errorResponse } from '../utils/response';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants';
import { loginLimiter, registerLimiter } from '../middleware/rate-limit';
import { logInfo } from '../middleware/logger';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user with email and password
 *
 * @route POST /api/auth/register
 * @access Public
 * @body {string} email - User email address
 * @body {string} password - User password (min 12 chars, must include uppercase, lowercase, number, special char)
 * @body {string} [firstName] - User first name (optional)
 * @body {string} [lastName] - User last name (optional)
 * @returns {object} Authentication response with token and user data
 */
router.post(
  '/register',
  (req: Request, res: Response, next: NextFunction) => {
    // LOW PRIORITY FIX: Use proper logger instead of console.log
    // Note: Email logging removed for security - only log route access
    logInfo('[AUTH] Register route accessed', { method: req.method, path: req.path });
    next();
  },
  registerLimiter, // Apply rate limiter directly to the route
  validateRequest({
    body: {
      required: ['email', 'password'],
      optional: ['firstName', 'lastName'],
      sanitize: ['email', 'firstName', 'lastName'],
      validate: {
        email: (val) => isValidEmail(val),
      },
    },
  }),
  validateRegister,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      const result = await AuthService.register({
        email,
        password,
        firstName,
        lastName,
      });

      createdResponse(res, result);
    } catch (error: any) {
      // Log error details for debugging
      if (error instanceof ApiError) {
        console.warn('[AUTH][REGISTER] Route error', {
          email: req.body?.email,
          code: error.code,
          message: error.message,
          status: error.status,
        });
      } else {
        console.error('[AUTH][REGISTER] Unexpected error', {
          email: req.body?.email,
          error: error?.message || String(error),
        });
      }
      next(error);
    }
  }
);

/**
 * POST /api/auth/login
 * Login with email and password
 *
 * @route POST /api/auth/login
 * @access Public
 * @body {string} email - User email address
 * @body {string} password - User password
 * @returns {object} Authentication response with token and user data
 */
router.post(
  '/login',
  (req: Request, res: Response, next: NextFunction) => {
    // LOW PRIORITY FIX: Use proper logger instead of console.log
    logInfo('[AUTH] Login route accessed', { method: req.method, path: req.path });
    next();
  },
  loginLimiter, // Apply rate limiter directly to the route
  validateRequest({
    body: {
      required: ['email', 'password'],
      sanitize: ['email'],
      validate: {
        email: (val) => isValidEmail(val),
      },
    },
  }),
  validateLogin,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const result = await AuthService.login({
        email,
        password,
      });

      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/google
 * Login/Register with Google OAuth
 * SECURE: Verifies Google ID token server-side
 *
 * @route POST /api/auth/google
 * @access Public
 * @body {string} idToken - Google ID token from Google Sign-In SDK
 * @returns {object} Authentication response with token and user data
 */
router.post(
  '/google',
  validateRequest({
    body: {
      required: ['idToken'],
      optional: [],
      sanitize: [],
      validate: {
        idToken: (val) => {
          if (!val || typeof val !== 'string' || val.trim().length === 0) {
            return false;
          }
          return true;
        },
      },
    },
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { idToken } = req.body;

      if (!idToken || typeof idToken !== 'string' || idToken.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ID_TOKEN_REQUIRED',
            message: 'Google ID token is required',
          },
        });
      }

      // Verify Google ID token server-side and authenticate user
      const result = await AuthService.verifyGoogleAuth(idToken);

      successResponse(res, result);
    } catch (error) {
      // Provide user-friendly error messages
      if (error instanceof ApiError) {
        if (error.status === HTTP_STATUS.UNAUTHORIZED) {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            error: {
              code: 'GOOGLE_OAUTH_FAILED',
              reason: error.message || 'Google token verification failed',
            },
          });
        }
        return next(error);
      } else {
        // Generic error for OAuth failures
        next(
          new ApiError(
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            'Google Sign-In failed. Please try again or use email/password.',
            'OAUTH_ERROR'
          )
        );
      }
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user profile (requires authentication)
 *
 * @route GET /api/auth/me
 * @access Private
 * @returns {object} User profile data
 */
router.get('/me', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return errorResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        'User ID not found in request',
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const profile = await AuthService.getProfile(req.userId);

    successResponse(res, profile);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/me
 * Update user profile (requires authentication)
 */
router.put('/me', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await AuthService.updateProfile(req.userId!, req.body);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token (requires valid token)
 * Enhanced with better error handling
 */
router.post(
  '/refresh',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return errorResponse(
          res,
          HTTP_STATUS.UNAUTHORIZED,
          'User ID not found. Please log in again.',
          ERROR_CODES.UNAUTHORIZED
        );
      }

      const newToken = await AuthService.refreshToken(req.userId);

      successResponse(res, {
        token: newToken,
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user (optional - just clears client-side)
 * Enhanced with better response
 */
router.post(
  '/logout',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // In a real app, you might invalidate the token on server side (e.g., add to blacklist)
      // For now, logout is handled client-side by removing the token from AsyncStorage
      successResponse(res, {
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/status
 * Get authentication service status
 * Checks if OAuth and other auth services are configured
 *
 * @route GET /api/auth/status
 * @access Public
 * @returns {object} Authentication service status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { getEnvConfig } = require('../config/env');
    const config = getEnvConfig();

    const status = {
      emailPassword: {
        enabled: true, // Always enabled
        configured: !!config.JWT_SECRET,
      },
      googleOAuth: {
        enabled: !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET),
        configured: !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET),
        clientId: config.GOOGLE_CLIENT_ID ? `${config.GOOGLE_CLIENT_ID.substring(0, 20)}...` : null,
      },
      jwt: {
        configured: !!config.JWT_SECRET && config.JWT_SECRET.length >= 32,
        secretLength: config.JWT_SECRET?.length || 0,
      },
    };

    successResponse(res, status);
  } catch (error) {
    errorResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Failed to check authentication status',
      'STATUS_CHECK_ERROR'
    );
  }
});
/**
 * POST /api/auth/forgot-password
 * Request password reset
 *
 * @route POST /api/auth/forgot-password
 * @access Public
 * @body {string} email - User email address
 * @returns {object} Success message
 */
router.post(
  '/forgot-password',
  validateRequest({
    body: {
      required: ['email'],
      sanitize: ['email'],
      validate: {
        email: (val) => isValidEmail(val),
      },
    },
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      await AuthService.requestPasswordReset(email);
      // Always return success to prevent user enumeration
      successResponse(res, {
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 *
 * @route POST /api/auth/reset-password
 * @access Public
 * @body {string} token - Password reset token
 * @body {string} password - New password
 * @returns {object} Success message
 */
router.post(
  '/reset-password',
  validateRequest({
    body: {
      required: ['token', 'password'],
      sanitize: [],
      validate: {},
    },
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;
      await AuthService.resetPassword(token, password);
      successResponse(res, {
        message: 'Password has been reset successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
