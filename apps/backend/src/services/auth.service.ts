/**
 * Authentication service
 * Handles user registration, login, and authentication-related operations
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { generateToken } from '../middleware/auth';
import { errors, ApiError } from '../utils/errors';
import { validatePassword, validateAndNormalizeEmail } from '../utils/validation';
import { SECURITY_CONFIG, HTTP_STATUS } from '../config/constants';
import { resilientOperation, getDatabaseErrorMessage } from '../utils/db-resilience';
import { logError, logInfo, logWarn } from '../middleware/logger';
import { getEnvConfig } from '../config/env';
import db from '../db';

const prisma = db; // Use shared resilient instance

/**
 * User registration payload
 */
export interface RegisterPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

/**
 * User login payload
 */
export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    emailVerified: boolean;
    role: string; // 'user' | 'admin' | 'super_admin'
  };
}

/**
 * Authentication service class
 * Provides static methods for user authentication operations
 */
export class AuthService {
  /**
   * Register a new user with email and password
   *
   * @param payload - Registration data
   * @returns Authentication response with token and user data
   * @throws {ApiError} If validation fails or user already exists
   *
   * @example
   * ```typescript
   * const result = await AuthService.register({
   *   email: "user@example.com",
   *   password: "SecureP@ssw0rd123",
   *   firstName: "John",
   *   lastName: "Doe"
   * });
   * ```
   */
  static async register(payload: RegisterPayload): Promise<AuthResponse> {
    try {
      // Validate and normalize email (trim + toLowerCase)
      const normalizedEmail = validateAndNormalizeEmail(payload.email);

      // Validate password
      if (!payload.password) {
        // LOW PRIORITY FIX: Use proper logger instead of console.warn for production
        // Note: Email is logged for debugging but should be sanitized in production logs
        logWarn('[AUTH][REGISTER] Failed - password required', {
          email: normalizedEmail.substring(0, 3) + '***', // Sanitize email in logs
          code: 'INVALID_INPUT',
        });
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Parol kiritilishi shart.', 'INVALID_INPUT');
      }

      const passwordValidation = validatePassword(payload.password);
      if (!passwordValidation.isValid) {
        // LOW PRIORITY FIX: Use proper logger, sanitize email in logs
        logWarn('[AUTH][REGISTER] Failed - weak password', {
          email: normalizedEmail.substring(0, 3) + '***', // Sanitize email
          code: 'WEAK_PASSWORD',
        });
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Parol juda oddiy. Iltimos kamida 6 ta belgidan iborat va hech bo'lmaganda bitta harf bo'lsin.",
          'WEAK_PASSWORD'
        );
      }

      // Check if user already exists (with resilience)
      const existingUser = await resilientOperation(
        prisma,
        () =>
          prisma.user.findUnique({
            where: { email: normalizedEmail },
          }),
        { retry: { maxAttempts: 2 } }
      ).catch((error) => {
        console.error('[AUTH][REGISTER] Database error checking existing user', {
          email: normalizedEmail,
          error: getDatabaseErrorMessage(error),
        });
        throw errors.internalServer(getDatabaseErrorMessage(error));
      });

      if (existingUser) {
        // LOW PRIORITY FIX: Use proper logger, sanitize email
        logWarn('[AUTH][REGISTER] Failed - email already exists', {
          email: normalizedEmail.substring(0, 3) + '***', // Sanitize email
          code: 'EMAIL_ALREADY_EXISTS',
        });
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          'Bu email bilan foydalanuvchi allaqachon mavjud.',
          'EMAIL_ALREADY_EXISTS'
        );
      }

      // Hash password with configured rounds for production security
      const passwordHash = await bcrypt.hash(
        payload.password,
        SECURITY_CONFIG.PASSWORD_HASH_ROUNDS
      );

      // Create user
      let user;
      try {
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            firstName: payload.firstName?.trim(),
            lastName: payload.lastName?.trim(),
            preferences: {
              create: {},
            },
          },
        });
      } catch (createError: any) {
        // Handle Prisma unique constraint error (P2002) for email
        if (createError?.code === 'P2002' && createError?.meta?.target?.includes('email')) {
          // LOW PRIORITY FIX: Use proper logger, sanitize email
          logWarn('[AUTH][REGISTER] Failed - email exists (Prisma constraint)', {
            email: normalizedEmail.substring(0, 3) + '***', // Sanitize email
            code: 'EMAIL_ALREADY_EXISTS',
          });
          throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            'Bu email bilan foydalanuvchi allaqachon mavjud.',
            'EMAIL_ALREADY_EXISTS'
          );
        }
        // Re-throw other errors
        throw createError;
      }

      // Generate token
      const token = generateToken(user.id, user.email, user.role);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          emailVerified: user.emailVerified,
          role: user.role || 'user',
        },
      };
    } catch (error) {
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle other errors
      console.error('[AUTH][REGISTER] Unknown error', {
        email: payload.email || 'unknown',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Ro'yxatdan o'tishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
        'INTERNAL_ERROR'
      );
    }
  }

  /**
   * Login with email and password
   *
   * @param payload - Login credentials
   * @returns Authentication response with token and user data
   * @throws {ApiError} If credentials are invalid
   *
   * @example
   * ```typescript
   * const result = await AuthService.login({
   *   email: "user@example.com",
   *   password: "SecureP@ssw0rd123"
   * });
   * ```
   */
  static async login(payload: LoginPayload): Promise<AuthResponse> {
    // Validate and normalize email
    let normalizedEmail: string;
    try {
      normalizedEmail = validateAndNormalizeEmail(payload.email);
    } catch (error) {
      throw errors.validationError('Please enter a valid email address');
    }

    // Validate password
    if (!payload.password) {
      logWarn('[AUTH][LOGIN] Password required', {
        email: normalizedEmail.substring(0, 3) + '***',
      });
      throw errors.validationError('Password is required');
    }

    if (payload.password.length < 8) {
      logWarn('[AUTH][LOGIN] Password too short', {
        email: normalizedEmail.substring(0, 3) + '***',
        passwordLength: payload.password.length,
      });
      throw errors.validationError('Password must be at least 8 characters');
    }

    try {
      // Find user with resilience for database connection issues
      const user = await resilientOperation(
        prisma,
        () =>
          prisma.user.findUnique({
            where: { email: normalizedEmail },
          }),
        { retry: { maxAttempts: 2 } }
      ).catch((error) => {
        // Log database connection errors for debugging
        console.error('Database error during login:', {
          email: normalizedEmail,
          error: error instanceof Error ? error.message : String(error),
        });
        throw errors.internalServer(
          'Authentication service temporarily unavailable. Please try again.'
        );
      });

      if (!user) {
        // Use generic message to prevent user enumeration
        throw errors.unauthorized('Invalid email or password');
      }

      if (!user.passwordHash) {
        // User exists but has no password (likely signed up with Google)
        throw errors.unauthorized(
          'This account was created with Google Sign-In. Please use Google to sign in, or reset your password.'
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);

      if (!isPasswordValid) {
        // Use generic message to prevent user enumeration
        throw errors.unauthorized('Invalid email or password');
      }

      // Generate token
      const token = generateToken(user.id, user.email, user.role);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          emailVerified: user.emailVerified,
          role: user.role || 'user',
        },
      };
    } catch (error) {
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Database errors
      if (error && typeof error === 'object' && 'code' in error) {
        console.error('Database error during login:', {
          email: normalizedEmail,
          errorCode: (error as any).code,
        });
        throw errors.internalServer(
          'Authentication service temporarily unavailable. Please try again.'
        );
      }

      throw errors.internalServer('Login failed. Please try again.');
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });

    if (!user) {
      throw errors.notFound('User');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      language: user.language,
      timezone: user.timezone,
      currency: user.currency,
      emailVerified: user.emailVerified,
      role: user.role || 'user',
      preferences: user.preferences,
      createdAt: user.createdAt,
    };
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, updates: any) {
    const allowedFields = [
      'firstName',
      'lastName',
      'phone',
      'avatar',
      'language',
      'timezone',
      'currency',
    ];
    const filteredUpdates: any = {};

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const user = await prisma.user.update({
      where: { id: userId },
      data: filteredUpdates,
      include: { preferences: true },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      language: user.language,
      timezone: user.timezone,
      currency: user.currency,
    };
  }

  /**
   * Refresh JWT token (requires valid token)
   * Enhanced with better error handling and validation
   */
  static async refreshToken(userId: string): Promise<string> {
    if (!userId) {
      throw errors.unauthorized('User ID is required for token refresh');
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        throw errors.unauthorized('User not found. Please log in again.');
      }

      // Generate new token with same expiry as original
      return generateToken(user.id, user.email, user.role);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw errors.internalServer('Failed to refresh token. Please log in again.');
    }
  }

  /**
   * Verify Google OAuth login/registration
   * SECURE: Verifies idToken server-side using google-auth-library
   *
   * @param idToken - Google ID token from client
   * @returns Authentication response with token and user data
   * @throws {ApiError} If token verification fails or user creation fails
   */
  static async verifyGoogleAuth(idToken: string): Promise<AuthResponse> {
    // Validate idToken is provided
    if (!idToken || typeof idToken !== 'string') {
      throw errors.validationError('Google ID token is required');
    }

    const envConfig = getEnvConfig();

    // Check if Google OAuth is configured
    if (!envConfig.GOOGLE_CLIENT_ID) {
      logError(
        '[GoogleAuth] GOOGLE_CLIENT_ID not configured',
        new Error('Google OAuth not configured'),
        {}
      );
      throw errors.internalServer('Google Sign-In is not configured. Please contact support.');
    }

    try {
      // Initialize OAuth2Client with Google Client ID
      const client = new OAuth2Client(envConfig.GOOGLE_CLIENT_ID);

      // Verify the ID token
      logInfo('[GoogleAuth] Verifying Google ID token', {
        clientIdLength: envConfig.GOOGLE_CLIENT_ID.length,
      });

      let ticket;
      try {
        ticket = await client.verifyIdToken({
          idToken,
          audience: envConfig.GOOGLE_CLIENT_ID,
        });
      } catch (error: any) {
        logError(
          '[GoogleAuth] Token verification failed',
          error instanceof Error ? error : new Error(String(error)),
          {
            errorName: error?.name,
            errorMessage: error?.message,
            reason: 'google_verify_failed',
          }
        );
        throw errors.unauthorized('GOOGLE_OAUTH_FAILED');
      }

      // Extract payload from verified token
      const payload = ticket.getPayload();
      if (!payload || !payload.sub) {
        logError(
          '[GoogleAuth] Invalid token payload',
          new Error('Missing payload or sub in Google token'),
          {}
        );
        throw errors.unauthorized('Invalid Google ID token: missing user information');
      }

      // Extract verified user data from token (SECURE - from Google, not client)
      const googleId = payload.sub; // Google user ID
      const email = payload.email || null;
      const firstName = payload.given_name || null;
      const lastName = payload.family_name || null;
      const avatar = payload.picture || null;
      const emailVerified = payload.email_verified ?? false;

      logInfo('[GoogleAuth] Token verified successfully', {
        googleId,
        email: email ? `${email.substring(0, 3)}***` : 'no-email',
        hasName: !!(firstName || lastName),
      });

      // Validate email is present (required for user account)
      if (!email) {
        throw errors.validationError(
          'Email not found in Google account. Please ensure your Google account has an email address.'
        );
      }

      // Normalize email
      const normalizedEmail = validateAndNormalizeEmail(email);

      try {
        // Try to find existing user by Google ID first
        let user = await prisma.user.findUnique({
          where: { googleId },
        });

        // If not found by Google ID, try to find by email (for account linking)
        if (!user && normalizedEmail) {
          user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          });
        }

        // Create new user if doesn't exist
        if (!user) {
          logInfo('[GoogleAuth] Creating new user', {
            googleId,
            email: `${normalizedEmail.substring(0, 3)}***`,
          });

          user = await prisma.user.create({
            data: {
              email: normalizedEmail,
              googleId,
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              avatar: avatar || undefined,
              emailVerified: true, // Google verified
              preferences: {
                create: {},
              },
            },
          });

          logInfo('[GoogleAuth] New user created', {
            userId: user.id,
            googleId,
          });
        } else {
          // User exists - update Google ID if not set, or verify it matches
          if (!user.googleId) {
            // Link Google ID to existing email account
            logInfo('[GoogleAuth] Linking Google ID to existing user', {
              userId: user.id,
              googleId,
            });

            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                googleId,
                avatar: avatar || user.avatar,
                emailVerified: emailVerified || user.emailVerified,
                // Update name if not set
                firstName: user.firstName || firstName || undefined,
                lastName: user.lastName || lastName || undefined,
              },
            });
          } else if (user.googleId !== googleId) {
            // Google ID mismatch - security issue
            logError(
              '[GoogleAuth] Google ID mismatch',
              new Error('Email already associated with different Google account'),
              {
                userId: user.id,
                existingGoogleId: user.googleId,
                newGoogleId: googleId,
              }
            );
            throw errors.forbidden(
              'This email is already associated with a different Google account. Please use the original account or contact support.'
            );
          } else {
            // User exists with matching Google ID - update profile info if needed
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                avatar: avatar || user.avatar,
                emailVerified: emailVerified || user.emailVerified,
                firstName: user.firstName || firstName || undefined,
                lastName: user.lastName || lastName || undefined,
              },
            });
          }
        }

        // Generate JWT token (same format as email/password login)
        const token = generateToken(user.id, user.email, user.role);

        logInfo('[GoogleAuth] Authentication successful', {
          userId: user.id,
          email: `${user.email.substring(0, 3)}***`,
        });

        return {
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            emailVerified: user.emailVerified,
            role: user.role || 'user',
          },
        };
      } catch (error) {
        // Database errors
        if (error instanceof ApiError) {
          throw error;
        }

        if (error && typeof error === 'object' && 'code' in error) {
          if (error.code === 'P2002') {
            logError(
              '[GoogleAuth] Database conflict',
              error instanceof Error ? error : new Error(String(error)),
              { googleId, email: normalizedEmail }
            );
            throw errors.conflict('Email or Google ID already exists');
          }
        }

        logError(
          '[GoogleAuth] Database error',
          error instanceof Error ? error : new Error(String(error)),
          {
            googleId,
            email: normalizedEmail,
          }
        );
        throw errors.internalServer('Failed to authenticate with Google. Please try again.');
      }
    } catch (error) {
      // Handle Google token verification errors
      if (error instanceof ApiError) {
        throw error;
      }

      logError('[GoogleAuth] Token verification failed', error as Error, {});

      // Check for specific Google auth errors
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = String(error.message).toLowerCase();
        if (errorMessage.includes('invalid token') || errorMessage.includes('expired')) {
          throw errors.unauthorized('Invalid or expired Google token. Please sign in again.');
        }
      }

      throw errors.unauthorized('Google Sign-In verification failed. Please try again.');
    }
  }
  /**
   * Request password reset
   * Generates a reset token and sends email
   */
  static async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = validateAndNormalizeEmail(email);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Don't reveal if user exists (security best practice)
    if (!user) {
      return;
    }

    // Generate reset token (32 character random string)
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry,
      },
    });

    // Send password reset email
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:19006'}/reset-password?token=${resetToken}`;

    try {
      const { emailService } = await import('./email.service');
      const userName = user.firstName || user.email.split('@')[0];
      await emailService.sendPasswordResetEmail(user.email, resetLink);
    } catch (error) {
      // Do not log raw token; log truncated hash for debugging only
      const tokenPreview = `${resetTokenHash.substring(0, 6)}...`;
      console.warn(
        'Email service not available, reset token hash logged to console for development only',
        {
          email: normalizedEmail.substring(0, 3) + '***',
          tokenPreview,
          resetLink,
        }
      );
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw errors.validationError(passwordValidation.errors.join(', '), {
        field: 'password',
        errors: passwordValidation.errors,
      });
    }

    // Find user by reset token (hashed)
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpiry: {
          gt: new Date(), // Token not expired
        },
      },
    });

    if (!user) {
      throw errors.unauthorized('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SECURITY_CONFIG.PASSWORD_HASH_ROUNDS);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  }
}
