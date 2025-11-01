"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_service_1 = require("../services/auth.service");
const auth_1 = require("../middleware/auth");
const errors_1 = require("../utils/errors");
const router = express_1.default.Router();
/**
 * POST /api/auth/register
 * Register a new user with email and password
 */
router.post("/register", async (req, res, next) => {
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
router.post("/login", async (req, res, next) => {
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
exports.default = router;
//# sourceMappingURL=auth.js.map