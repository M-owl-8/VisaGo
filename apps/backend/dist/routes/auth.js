"use strict";
/**
 * Authentication routes
 * Handles user registration, login, and authentication
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_service_1 = require("../services/auth.service");
const auth_1 = require("../middleware/auth");
const errors_1 = require("../utils/errors");
const validation_1 = require("../middleware/validation");
const request_validation_1 = require("../middleware/request-validation");
const validation_2 = require("../utils/validation");
const response_1 = require("../utils/response");
const constants_1 = require("../config/constants");
const router = express_1.default.Router();
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
router.post("/register", (0, request_validation_1.validateRequest)({
    body: {
        required: ["email", "password"],
        optional: ["firstName", "lastName"],
        sanitize: ["email", "firstName", "lastName"],
        validate: {
            email: (val) => (0, validation_2.isValidEmail)(val),
        },
    },
}), validation_1.validateRegister, validation_1.handleValidationErrors, async (req, res, next) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        const result = await auth_service_1.AuthService.register({
            email,
            password,
            firstName,
            lastName,
        });
        (0, response_1.createdResponse)(res, result);
    }
    catch (error) {
        next(error);
    }
});
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
router.post("/login", (0, request_validation_1.validateRequest)({
    body: {
        required: ["email", "password"],
        sanitize: ["email"],
        validate: {
            email: (val) => (0, validation_2.isValidEmail)(val),
        },
    },
}), validation_1.validateLogin, validation_1.handleValidationErrors, async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await auth_service_1.AuthService.login({
            email,
            password,
        });
        (0, response_1.successResponse)(res, result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/auth/google
 * Login/Register with Google OAuth
 * Enhanced with better error messages and validation
 *
 * @route POST /api/auth/google
 * @access Public
 * @body {string} googleId - Google user ID
 * @body {string} email - User email address
 * @body {string} [firstName] - User first name (optional)
 * @body {string} [lastName] - User last name (optional)
 * @body {string} [avatar] - User avatar URL (optional)
 * @returns {object} Authentication response with token and user data
 */
router.post("/google", (0, request_validation_1.validateRequest)({
    body: {
        required: ["googleId", "email"],
        optional: ["firstName", "lastName", "avatar"],
        sanitize: ["email", "firstName", "lastName"],
        validate: {
            email: (val) => (0, validation_2.isValidEmail)(val),
        },
    },
}), async (req, res, next) => {
    try {
        const { googleId, email, firstName, lastName, avatar } = req.body;
        // Check if Google OAuth is configured
        const { getEnvConfig } = require("../config/env");
        const config = getEnvConfig();
        if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
            return (0, response_1.errorResponse)(res, constants_1.HTTP_STATUS.SERVICE_UNAVAILABLE, "Google Sign-In is not configured. Please contact support.", "OAUTH_NOT_CONFIGURED");
        }
        const result = await auth_service_1.AuthService.verifyGoogleAuth({
            googleId,
            email,
            firstName,
            lastName,
            avatar,
        });
        (0, response_1.successResponse)(res, result);
    }
    catch (error) {
        // Provide user-friendly error messages
        if (error instanceof errors_1.ApiError) {
            next(error);
        }
        else {
            // Generic error for OAuth failures
            next(new errors_1.ApiError(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, "Google Sign-In failed. Please try again or use email/password.", "OAUTH_ERROR"));
        }
    }
});
/**
 * GET /api/auth/me
 * Get current user profile (requires authentication)
 *
 * @route GET /api/auth/me
 * @access Private
 * @returns {object} User profile data
 */
router.get("/me", auth_1.authenticateToken, async (req, res, next) => {
    try {
        if (!req.userId) {
            return (0, response_1.errorResponse)(res, constants_1.HTTP_STATUS.UNAUTHORIZED, "User ID not found in request", constants_1.ERROR_CODES.UNAUTHORIZED);
        }
        const profile = await auth_service_1.AuthService.getProfile(req.userId);
        (0, response_1.successResponse)(res, profile);
    }
    catch (error) {
        next(error);
    }
});
/**
 * PUT /api/auth/me
 * Update user profile (requires authentication)
 */
router.put("/me", auth_1.authenticateToken, async (req, res, next) => {
    try {
        const updated = await auth_service_1.AuthService.updateProfile(req.userId, req.body);
        res.json({
            success: true,
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/auth/refresh
 * Refresh JWT token (requires valid token)
 * Enhanced with better error handling
 */
router.post("/refresh", auth_1.authenticateToken, async (req, res, next) => {
    try {
        if (!req.userId) {
            return (0, response_1.errorResponse)(res, constants_1.HTTP_STATUS.UNAUTHORIZED, "User ID not found. Please log in again.", constants_1.ERROR_CODES.UNAUTHORIZED);
        }
        const newToken = await auth_service_1.AuthService.refreshToken(req.userId);
        (0, response_1.successResponse)(res, {
            token: newToken,
            message: "Token refreshed successfully",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/auth/logout
 * Logout user (optional - just clears client-side)
 * Enhanced with better response
 */
router.post("/logout", auth_1.authenticateToken, async (req, res, next) => {
    try {
        // In a real app, you might invalidate the token on server side (e.g., add to blacklist)
        // For now, logout is handled client-side by removing the token from AsyncStorage
        (0, response_1.successResponse)(res, {
            message: "Logged out successfully",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/auth/status
 * Get authentication service status
 * Checks if OAuth and other auth services are configured
 *
 * @route GET /api/auth/status
 * @access Public
 * @returns {object} Authentication service status
 */
router.get("/status", async (req, res) => {
    try {
        const { getEnvConfig } = require("../config/env");
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
        (0, response_1.successResponse)(res, status);
    }
    catch (error) {
        (0, response_1.errorResponse)(res, constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to check authentication status", "STATUS_CHECK_ERROR");
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
router.post("/forgot-password", (0, request_validation_1.validateRequest)({
    body: {
        required: ["email"],
        sanitize: ["email"],
        validate: {
            email: (val) => (0, validation_2.isValidEmail)(val),
        },
    },
}), async (req, res, next) => {
    try {
        const { email } = req.body;
        await auth_service_1.AuthService.requestPasswordReset(email);
        // Always return success to prevent user enumeration
        (0, response_1.successResponse)(res, {
            message: "If an account exists with this email, a password reset link has been sent.",
        });
    }
    catch (error) {
        next(error);
    }
});
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
router.post("/reset-password", (0, request_validation_1.validateRequest)({
    body: {
        required: ["token", "password"],
        sanitize: [],
        validate: {},
    },
}), async (req, res, next) => {
    try {
        const { token, password } = req.body;
        await auth_service_1.AuthService.resetPassword(token, password);
        (0, response_1.successResponse)(res, {
            message: "Password has been reset successfully.",
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map