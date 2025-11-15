"use strict";
/**
 * Authentication service
 * Handles user registration, login, and authentication-related operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../middleware/auth");
const errors_1 = require("../utils/errors");
const validation_1 = require("../utils/validation");
const constants_1 = require("../config/constants");
const db_resilience_1 = require("../utils/db-resilience");
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
        // Validate email
        const normalizedEmail = (0, validation_1.validateAndNormalizeEmail)(payload.email);
        // Validate password
        if (!payload.password) {
            throw errors_1.errors.validationError("Password is required");
        }
        const passwordValidation = (0, validation_1.validatePassword)(payload.password);
        if (!passwordValidation.isValid) {
            throw errors_1.errors.validationError(passwordValidation.errors.join(", "), { field: "password", errors: passwordValidation.errors });
        }
        // Check if user already exists (with resilience)
        const existingUser = await (0, db_resilience_1.resilientOperation)(prisma, () => prisma.user.findUnique({
            where: { email: normalizedEmail },
        }), { retry: { maxAttempts: 2 } }).catch((error) => {
            throw errors_1.errors.internalServer((0, db_resilience_1.getDatabaseErrorMessage)(error));
        });
        if (existingUser) {
            throw errors_1.errors.conflict("Email");
        }
        // Hash password with configured rounds for production security
        const passwordHash = await bcryptjs_1.default.hash(payload.password, constants_1.SECURITY_CONFIG.PASSWORD_HASH_ROUNDS);
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
        const token = (0, auth_1.generateToken)(user.id, user.email);
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
    static async login(payload) {
        // Validate and normalize email
        let normalizedEmail;
        try {
            normalizedEmail = (0, validation_1.validateAndNormalizeEmail)(payload.email);
        }
        catch (error) {
            throw errors_1.errors.validationError("Please enter a valid email address");
        }
        // Validate password
        if (!payload.password) {
            throw errors_1.errors.validationError("Password is required");
        }
        if (payload.password.length < 8) {
            throw errors_1.errors.validationError("Password must be at least 8 characters");
        }
        try {
            // Find user
            const user = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });
            if (!user) {
                // Use generic message to prevent user enumeration
                throw errors_1.errors.unauthorized("Invalid email or password");
            }
            if (!user.passwordHash) {
                // User exists but has no password (likely signed up with Google)
                throw errors_1.errors.unauthorized("This account was created with Google Sign-In. Please use Google to sign in, or reset your password.");
            }
            // Verify password
            const isPasswordValid = await bcryptjs_1.default.compare(payload.password, user.passwordHash);
            if (!isPasswordValid) {
                // Use generic message to prevent user enumeration
                throw errors_1.errors.unauthorized("Invalid email or password");
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
                throw errors_1.errors.internalServer("Authentication service temporarily unavailable. Please try again.");
            }
            throw errors_1.errors.internalServer("Login failed. Please try again.");
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
            throw errors_1.errors.notFound("User");
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
    static async updateProfile(userId, updates) {
        const allowedFields = ["firstName", "lastName", "phone", "avatar", "language", "timezone", "currency"];
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
            throw errors_1.errors.unauthorized("User ID is required for token refresh");
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
                throw errors_1.errors.unauthorized("User not found. Please log in again.");
            }
            // Generate new token with same expiry as original
            return (0, auth_1.generateToken)(user.id, user.email, user.role);
        }
        catch (error) {
            if (error instanceof errors_1.ApiError) {
                throw error;
            }
            throw errors_1.errors.internalServer("Failed to refresh token. Please log in again.");
        }
    }
    /**
     * Verify Google OAuth login/registration
     * Enhanced with better error handling and validation
     */
    static async verifyGoogleAuth(payload) {
        // Validate required fields
        if (!payload.googleId || !payload.email) {
            throw errors_1.errors.validationError("Google ID and email are required for Google Sign-In");
        }
        // Validate email format
        const normalizedEmail = (0, validation_1.validateAndNormalizeEmail)(payload.email);
        // Validate Google ID format (should be numeric string)
        if (!/^\d+$/.test(payload.googleId)) {
            throw errors_1.errors.validationError("Invalid Google ID format");
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
            }
            else if (!user.googleId) {
                // Link Google ID to existing user
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        googleId: payload.googleId,
                        avatar: payload.avatar || user.avatar,
                    },
                });
            }
            else if (user.googleId !== payload.googleId) {
                // Google ID mismatch - security issue
                throw errors_1.errors.forbidden("This email is already associated with a different Google account. Please use the original account or contact support.");
            }
            const token = (0, auth_1.generateToken)(user.id, user.email);
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
        catch (error) {
            // Provide user-friendly error messages
            if (error instanceof errors_1.ApiError) {
                throw error;
            }
            // Database errors
            if (error && typeof error === 'object' && 'code' in error) {
                if (error.code === 'P2002') {
                    throw errors_1.errors.conflict("Email or Google ID");
                }
            }
            throw errors_1.errors.internalServer("Failed to authenticate with Google. Please try again.");
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map