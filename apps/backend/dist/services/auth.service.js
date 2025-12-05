"use strict";
/**
 * Authentication service
 * Handles user registration, login, and authentication-related operations
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const google_auth_library_1 = require("google-auth-library");
const auth_1 = require("../middleware/auth");
const errors_1 = require("../utils/errors");
const validation_1 = require("../utils/validation");
const constants_1 = require("../config/constants");
const db_resilience_1 = require("../utils/db-resilience");
const logger_1 = require("../middleware/logger");
const env_1 = require("../config/env");
const db_1 = __importDefault(require("../db"));
const prisma = db_1.default; // Use shared resilient instance
/**
 * Authentication service class
 * Provides static methods for user authentication operations
 */
class AuthService {
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
    static async register(payload) {
        try {
            // Validate and normalize email (trim + toLowerCase)
            const normalizedEmail = (0, validation_1.validateAndNormalizeEmail)(payload.email);
            // Validate password
            if (!payload.password) {
                // LOW PRIORITY FIX: Use proper logger instead of console.warn for production
                // Note: Email is logged for debugging but should be sanitized in production logs
                (0, logger_1.logWarn)('[AUTH][REGISTER] Failed - password required', {
                    email: normalizedEmail.substring(0, 3) + '***', // Sanitize email in logs
                    code: 'INVALID_INPUT',
                });
                throw new errors_1.ApiError(constants_1.HTTP_STATUS.BAD_REQUEST, 'Parol kiritilishi shart.', 'INVALID_INPUT');
            }
            const passwordValidation = (0, validation_1.validatePassword)(payload.password);
            if (!passwordValidation.isValid) {
                // LOW PRIORITY FIX: Use proper logger, sanitize email in logs
                (0, logger_1.logWarn)('[AUTH][REGISTER] Failed - weak password', {
                    email: normalizedEmail.substring(0, 3) + '***', // Sanitize email
                    code: 'WEAK_PASSWORD',
                });
                throw new errors_1.ApiError(constants_1.HTTP_STATUS.BAD_REQUEST, "Parol juda oddiy. Iltimos kamida 6 ta belgidan iborat va hech bo'lmaganda bitta harf bo'lsin.", 'WEAK_PASSWORD');
            }
            // Check if user already exists (with resilience)
            const existingUser = await (0, db_resilience_1.resilientOperation)(prisma, () => prisma.user.findUnique({
                where: { email: normalizedEmail },
            }), { retry: { maxAttempts: 2 } }).catch((error) => {
                console.error('[AUTH][REGISTER] Database error checking existing user', {
                    email: normalizedEmail,
                    error: (0, db_resilience_1.getDatabaseErrorMessage)(error),
                });
                throw errors_1.errors.internalServer((0, db_resilience_1.getDatabaseErrorMessage)(error));
            });
            if (existingUser) {
                // LOW PRIORITY FIX: Use proper logger, sanitize email
                (0, logger_1.logWarn)('[AUTH][REGISTER] Failed - email already exists', {
                    email: normalizedEmail.substring(0, 3) + '***', // Sanitize email
                    code: 'EMAIL_ALREADY_EXISTS',
                });
                throw new errors_1.ApiError(constants_1.HTTP_STATUS.BAD_REQUEST, 'Bu email bilan foydalanuvchi allaqachon mavjud.', 'EMAIL_ALREADY_EXISTS');
            }
            // Hash password with configured rounds for production security
            const passwordHash = await bcryptjs_1.default.hash(payload.password, constants_1.SECURITY_CONFIG.PASSWORD_HASH_ROUNDS);
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
            }
            catch (createError) {
                // Handle Prisma unique constraint error (P2002) for email
                if (createError?.code === 'P2002' && createError?.meta?.target?.includes('email')) {
                    // LOW PRIORITY FIX: Use proper logger, sanitize email
                    (0, logger_1.logWarn)('[AUTH][REGISTER] Failed - email exists (Prisma constraint)', {
                        email: normalizedEmail.substring(0, 3) + '***', // Sanitize email
                        code: 'EMAIL_ALREADY_EXISTS',
                    });
                    throw new errors_1.ApiError(constants_1.HTTP_STATUS.BAD_REQUEST, 'Bu email bilan foydalanuvchi allaqachon mavjud.', 'EMAIL_ALREADY_EXISTS');
                }
                // Re-throw other errors
                throw createError;
            }
            // Generate token
            const token = (0, auth_1.generateToken)(user.id, user.email, user.role);
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
        }
        catch (error) {
            // Re-throw ApiError as-is
            if (error instanceof errors_1.ApiError) {
                throw error;
            }
            // Handle other errors
            console.error('[AUTH][REGISTER] Unknown error', {
                email: payload.email || 'unknown',
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw new errors_1.ApiError(constants_1.HTTP_STATUS.BAD_REQUEST, "Ro'yxatdan o'tishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.", 'INTERNAL_ERROR');
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
    static async login(payload) {
        // Validate and normalize email
        let normalizedEmail;
        try {
            normalizedEmail = (0, validation_1.validateAndNormalizeEmail)(payload.email);
        }
        catch (error) {
            throw errors_1.errors.validationError('Please enter a valid email address');
        }
        // Validate password
        if (!payload.password) {
            (0, logger_1.logWarn)('[AUTH][LOGIN] Password required', {
                email: normalizedEmail.substring(0, 3) + '***',
            });
            throw errors_1.errors.validationError('Password is required');
        }
        if (payload.password.length < 8) {
            (0, logger_1.logWarn)('[AUTH][LOGIN] Password too short', {
                email: normalizedEmail.substring(0, 3) + '***',
                passwordLength: payload.password.length,
            });
            throw errors_1.errors.validationError('Password must be at least 8 characters');
        }
        try {
            // Find user with resilience for database connection issues
            const user = await (0, db_resilience_1.resilientOperation)(prisma, () => prisma.user.findUnique({
                where: { email: normalizedEmail },
            }), { retry: { maxAttempts: 2 } }).catch((error) => {
                // Log database connection errors for debugging
                console.error('Database error during login:', {
                    email: normalizedEmail,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw errors_1.errors.internalServer('Authentication service temporarily unavailable. Please try again.');
            });
            if (!user) {
                // Use generic message to prevent user enumeration
                throw errors_1.errors.unauthorized('Invalid email or password');
            }
            if (!user.passwordHash) {
                // User exists but has no password (likely signed up with Google)
                throw errors_1.errors.unauthorized('This account was created with Google Sign-In. Please use Google to sign in, or reset your password.');
            }
            // Verify password
            const isPasswordValid = await bcryptjs_1.default.compare(payload.password, user.passwordHash);
            if (!isPasswordValid) {
                // Use generic message to prevent user enumeration
                throw errors_1.errors.unauthorized('Invalid email or password');
            }
            // Generate token
            const token = (0, auth_1.generateToken)(user.id, user.email, user.role);
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
        }
        catch (error) {
            // Re-throw ApiError as-is
            if (error instanceof errors_1.ApiError) {
                throw error;
            }
            // Database errors
            if (error && typeof error === 'object' && 'code' in error) {
                console.error('Database error during login:', {
                    email: normalizedEmail,
                    errorCode: error.code,
                });
                throw errors_1.errors.internalServer('Authentication service temporarily unavailable. Please try again.');
            }
            throw errors_1.errors.internalServer('Login failed. Please try again.');
        }
    }
    /**
     * Get current user profile
     */
    static async getProfile(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { preferences: true },
        });
        if (!user) {
            throw errors_1.errors.notFound('User');
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
    static async updateProfile(userId, updates) {
        const allowedFields = [
            'firstName',
            'lastName',
            'phone',
            'avatar',
            'language',
            'timezone',
            'currency',
        ];
        const filteredUpdates = {};
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
    static async refreshToken(userId) {
        if (!userId) {
            throw errors_1.errors.unauthorized('User ID is required for token refresh');
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
                throw errors_1.errors.unauthorized('User not found. Please log in again.');
            }
            // Generate new token with same expiry as original
            return (0, auth_1.generateToken)(user.id, user.email, user.role);
        }
        catch (error) {
            if (error instanceof errors_1.ApiError) {
                throw error;
            }
            throw errors_1.errors.internalServer('Failed to refresh token. Please log in again.');
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
    static async verifyGoogleAuth(idToken) {
        // Validate idToken is provided
        if (!idToken || typeof idToken !== 'string') {
            throw errors_1.errors.validationError('Google ID token is required');
        }
        const envConfig = (0, env_1.getEnvConfig)();
        // Check if Google OAuth is configured
        if (!envConfig.GOOGLE_CLIENT_ID) {
            (0, logger_1.logError)('[GoogleAuth] GOOGLE_CLIENT_ID not configured', new Error('Google OAuth not configured'), {});
            throw errors_1.errors.internalServer('Google Sign-In is not configured. Please contact support.');
        }
        try {
            // Initialize OAuth2Client with Google Client ID
            const client = new google_auth_library_1.OAuth2Client(envConfig.GOOGLE_CLIENT_ID);
            // Verify the ID token
            (0, logger_1.logInfo)('[GoogleAuth] Verifying Google ID token', {
                clientIdLength: envConfig.GOOGLE_CLIENT_ID.length,
            });
            const ticket = await client.verifyIdToken({
                idToken,
                audience: envConfig.GOOGLE_CLIENT_ID,
            });
            // Extract payload from verified token
            const payload = ticket.getPayload();
            if (!payload || !payload.sub) {
                (0, logger_1.logError)('[GoogleAuth] Invalid token payload', new Error('Missing payload or sub in Google token'), {});
                throw errors_1.errors.unauthorized('Invalid Google ID token: missing user information');
            }
            // Extract verified user data from token (SECURE - from Google, not client)
            const googleId = payload.sub; // Google user ID
            const email = payload.email || null;
            const firstName = payload.given_name || null;
            const lastName = payload.family_name || null;
            const avatar = payload.picture || null;
            const emailVerified = payload.email_verified ?? false;
            (0, logger_1.logInfo)('[GoogleAuth] Token verified successfully', {
                googleId,
                email: email ? `${email.substring(0, 3)}***` : 'no-email',
                hasName: !!(firstName || lastName),
            });
            // Validate email is present (required for user account)
            if (!email) {
                throw errors_1.errors.validationError('Email not found in Google account. Please ensure your Google account has an email address.');
            }
            // Normalize email
            const normalizedEmail = (0, validation_1.validateAndNormalizeEmail)(email);
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
                    (0, logger_1.logInfo)('[GoogleAuth] Creating new user', {
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
                    (0, logger_1.logInfo)('[GoogleAuth] New user created', {
                        userId: user.id,
                        googleId,
                    });
                }
                else {
                    // User exists - update Google ID if not set, or verify it matches
                    if (!user.googleId) {
                        // Link Google ID to existing email account
                        (0, logger_1.logInfo)('[GoogleAuth] Linking Google ID to existing user', {
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
                    }
                    else if (user.googleId !== googleId) {
                        // Google ID mismatch - security issue
                        (0, logger_1.logError)('[GoogleAuth] Google ID mismatch', new Error('Email already associated with different Google account'), {
                            userId: user.id,
                            existingGoogleId: user.googleId,
                            newGoogleId: googleId,
                        });
                        throw errors_1.errors.forbidden('This email is already associated with a different Google account. Please use the original account or contact support.');
                    }
                    else {
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
                const token = (0, auth_1.generateToken)(user.id, user.email, user.role);
                (0, logger_1.logInfo)('[GoogleAuth] Authentication successful', {
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
            }
            catch (error) {
                // Database errors
                if (error instanceof errors_1.ApiError) {
                    throw error;
                }
                if (error && typeof error === 'object' && 'code' in error) {
                    if (error.code === 'P2002') {
                        (0, logger_1.logError)('[GoogleAuth] Database conflict', error instanceof Error ? error : new Error(String(error)), { googleId, email: normalizedEmail });
                        throw errors_1.errors.conflict('Email or Google ID already exists');
                    }
                }
                (0, logger_1.logError)('[GoogleAuth] Database error', error instanceof Error ? error : new Error(String(error)), {
                    googleId,
                    email: normalizedEmail,
                });
                throw errors_1.errors.internalServer('Failed to authenticate with Google. Please try again.');
            }
        }
        catch (error) {
            // Handle Google token verification errors
            if (error instanceof errors_1.ApiError) {
                throw error;
            }
            (0, logger_1.logError)('[GoogleAuth] Token verification failed', error, {});
            // Check for specific Google auth errors
            if (error && typeof error === 'object' && 'message' in error) {
                const errorMessage = String(error.message).toLowerCase();
                if (errorMessage.includes('invalid token') || errorMessage.includes('expired')) {
                    throw errors_1.errors.unauthorized('Invalid or expired Google token. Please sign in again.');
                }
            }
            throw errors_1.errors.unauthorized('Google Sign-In verification failed. Please try again.');
        }
    }
    /**
     * Request password reset
     * Generates a reset token and sends email
     */
    static async requestPasswordReset(email) {
        const normalizedEmail = (0, validation_1.validateAndNormalizeEmail)(email);
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
            const { emailService } = await Promise.resolve().then(() => __importStar(require('./email.service')));
            const userName = user.firstName || user.email.split('@')[0];
            await emailService.sendPasswordResetEmail(user.email, resetLink);
        }
        catch (error) {
            // Log reset token if email service fails (for development)
            console.log(`Password reset token for ${normalizedEmail}: ${resetToken}`);
            console.log(`Reset link: ${resetLink}`);
            console.warn('Email service not available, reset token logged to console');
        }
    }
    /**
     * Reset password with token
     */
    static async resetPassword(token, newPassword) {
        // Validate password
        const passwordValidation = (0, validation_1.validatePassword)(newPassword);
        if (!passwordValidation.isValid) {
            throw errors_1.errors.validationError(passwordValidation.errors.join(', '), {
                field: 'password',
                errors: passwordValidation.errors,
            });
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
            throw errors_1.errors.unauthorized('Invalid or expired reset token');
        }
        // Hash new password
        const passwordHash = await bcryptjs_1.default.hash(newPassword, constants_1.SECURITY_CONFIG.PASSWORD_HASH_ROUNDS);
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
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map