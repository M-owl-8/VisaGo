/**
 * Authentication service
 * Handles user registration, login, and authentication-related operations
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateToken } from "../middleware/auth";
import { errors, ApiError } from "../utils/errors";
import { validatePassword, validateAndNormalizeEmail } from "../utils/validation";
import { SECURITY_CONFIG } from "../config/constants";
import { resilientOperation, getDatabaseErrorMessage } from "../utils/db-resilience";
import db from "../db";

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
    // Validate email
    const normalizedEmail = validateAndNormalizeEmail(payload.email);

    // Validate password
    if (!payload.password) {
      throw errors.validationError("Password is required");
    }

    const passwordValidation = validatePassword(payload.password);
    if (!passwordValidation.isValid) {
      throw errors.validationError(
        passwordValidation.errors.join(", "),
        { field: "password", errors: passwordValidation.errors }
      );
    }

    // Check if user already exists (with resilience)
    const existingUser = await resilientOperation(
      prisma,
      () => prisma.user.findUnique({
        where: { email: normalizedEmail },
      }),
      { retry: { maxAttempts: 2 } }
    ).catch((error) => {
      throw errors.internalServer(getDatabaseErrorMessage(error));
    });

    if (existingUser) {
      throw errors.conflict("Email");
    }

    // Hash password with configured rounds for production security
    const passwordHash = await bcrypt.hash(
      payload.password,
      SECURITY_CONFIG.PASSWORD_HASH_ROUNDS
    );

    // Create user
    const user = await prisma.user.create({
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

    // Generate token
    const token = generateToken(user.id, user.email);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        emailVerified: user.emailVerified,
      },
    };
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
      throw errors.validationError("Please enter a valid email address");
    }

    // Validate password
    if (!payload.password) {
      throw errors.validationError("Password is required");
    }

    if (payload.password.length < 8) {
      throw errors.validationError("Password must be at least 8 characters");
    }

    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        // Use generic message to prevent user enumeration
        throw errors.unauthorized("Invalid email or password");
      }

      if (!user.passwordHash) {
        // User exists but has no password (likely signed up with Google)
        throw errors.unauthorized(
          "This account was created with Google Sign-In. Please use Google to sign in, or reset your password."
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);

      if (!isPasswordValid) {
        // Use generic message to prevent user enumeration
        throw errors.unauthorized("Invalid email or password");
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
        },
      };
    } catch (error) {
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Database errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw errors.internalServer("Authentication service temporarily unavailable. Please try again.");
      }
      
      throw errors.internalServer("Login failed. Please try again.");
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
      throw errors.notFound("User");
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
      preferences: user.preferences,
      createdAt: user.createdAt,
    };
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, updates: any) {
    const allowedFields = ["firstName", "lastName", "phone", "avatar", "language", "timezone", "currency"];
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
      throw errors.unauthorized("User ID is required for token refresh");
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
        throw errors.unauthorized("User not found. Please log in again.");
      }

      // Generate new token with same expiry as original
      return generateToken(user.id, user.email, user.role);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw errors.internalServer("Failed to refresh token. Please log in again.");
    }
  }

  /**
   * Verify Google OAuth login/registration
   * Enhanced with better error handling and validation
   */
  static async verifyGoogleAuth(payload: {
    googleId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  }): Promise<AuthResponse> {
    // Validate required fields
    if (!payload.googleId || !payload.email) {
      throw errors.validationError("Google ID and email are required for Google Sign-In");
    }

    // Validate email format
    const normalizedEmail = validateAndNormalizeEmail(payload.email);

    // Validate Google ID format (should be numeric string)
    if (!/^\d+$/.test(payload.googleId)) {
      throw errors.validationError("Invalid Google ID format");
    }

    try {
      // Try to find existing user
      let user = await prisma.user.findFirst({
        where: {
          OR: [{ googleId: payload.googleId }, { email: normalizedEmail }],
        },
      });

      // Create new user if doesn't exist
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            googleId: payload.googleId,
            firstName: payload.firstName,
            lastName: payload.lastName,
            avatar: payload.avatar,
            emailVerified: true, // Google verified
            preferences: {
              create: {},
            },
          },
        });
      } else if (!user.googleId) {
        // Link Google ID to existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: payload.googleId,
            avatar: payload.avatar || user.avatar,
          },
        });
      } else if (user.googleId !== payload.googleId) {
        // Google ID mismatch - security issue
        throw errors.forbidden(
          "This email is already associated with a different Google account. Please use the original account or contact support."
        );
      }

      const token = generateToken(user.id, user.email);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          emailVerified: user.emailVerified,
        },
      };
    } catch (error) {
      // Provide user-friendly error messages
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Database errors
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2002') {
          throw errors.conflict("Email or Google ID");
        }
      }
      
      throw errors.internalServer("Failed to authenticate with Google. Please try again.");
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
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
      
      // Save reset token to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      });
      
      // Send password reset email
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:19006'}/reset-password?token=${resetToken}`;
      
      try {
        const { emailService } = await import("./email.service");
        const userName = user.firstName || user.email.split('@')[0];
        await emailService.sendPasswordResetEmail(user.email, resetLink);
      } catch (error) {
        // Log reset token if email service fails (for development)
        console.log(`Password reset token for ${normalizedEmail}: ${resetToken}`);
        console.log(`Reset link: ${resetLink}`);
        console.warn("Email service not available, reset token logged to console");
      }
    }
  
    /**
     * Reset password with token
     */
    static async resetPassword(token: string, newPassword: string): Promise<void> {
      // Validate password
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw errors.validationError(
          passwordValidation.errors.join(", "),
          { field: "password", errors: passwordValidation.errors }
        );
      }
      
      // Find user by reset token
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date(), // Token not expired
          },
        },
      });
      
      if (!user) {
        throw errors.unauthorized("Invalid or expired reset token");
      }
      
      // Hash new password
      const passwordHash = await bcrypt.hash(
        newPassword,
        SECURITY_CONFIG.PASSWORD_HASH_ROUNDS
      );
      
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
