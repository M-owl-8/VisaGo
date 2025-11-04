"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_service_1 = require("../services/auth.service");
const auth_1 = require("../middleware/auth");
const errors_1 = require("../utils/errors");
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
/**
 * POST /api/auth/register
 * Register a new user with email and password
 */
router.post("/register", validation_1.validateRegister, validation_1.handleValidationErrors, async (req, res, next) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        const result = await auth_service_1.AuthService.register({
            email,
            password,
            firstName,
            lastName,
        });
        res.status(201).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post("/login", validation_1.validateLogin, validation_1.handleValidationErrors, async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await auth_service_1.AuthService.login({
            email,
            password,
        });
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/auth/google
 * Login/Register with Google OAuth
 */
router.post("/google", async (req, res, next) => {
    try {
        const { googleId, email, firstName, lastName, avatar } = req.body;
        if (!googleId || !email) {
            throw new errors_1.ApiError(422, "googleId and email are required");
        }
        const result = await auth_service_1.AuthService.verifyGoogleAuth({
            googleId,
            email,
            firstName,
            lastName,
            avatar,
        });
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/auth/me
 * Get current user profile (requires authentication)
 */
router.get("/me", auth_1.authenticateToken, async (req, res, next) => {
    try {
        const profile = await auth_service_1.AuthService.getProfile(req.userId);
        res.json({
            success: true,
            data: profile,
        });
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
 */
router.post("/refresh", auth_1.authenticateToken, async (req, res, next) => {
    try {
        const newToken = await auth_service_1.AuthService.refreshToken(req.userId);
        res.json({
            success: true,
            data: {
                token: newToken,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/auth/logout
 * Logout user (optional - just clears client-side)
 */
router.post("/logout", auth_1.authenticateToken, async (req, res, next) => {
    try {
        // In a real app, you might invalidate the token on server side (e.g., add to blacklist)
        // For now, logout is handled client-side by removing the token from AsyncStorage
        res.json({
            success: true,
            message: "Logged out successfully",
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map