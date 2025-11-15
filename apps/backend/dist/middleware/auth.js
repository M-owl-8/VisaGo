"use strict";
/**
 * Authentication middleware and JWT utilities
 * Handles token verification and generation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const constants_1 = require("../config/constants");
/**
 * Authentication middleware
 * Verifies JWT token and attaches user information to request
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @returns Error response if authentication fails, otherwise calls next()
 *
 * @example
 * ```typescript
 * router.get('/protected', authenticateToken, (req, res) => {
 *   // req.userId and req.user are available here
 *   res.json({ userId: req.userId });
 * });
 * ```
 */
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(constants_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                error: {
                    status: constants_1.HTTP_STATUS.UNAUTHORIZED,
                    message: constants_1.API_MESSAGES.UNAUTHORIZED,
                    code: constants_1.ERROR_CODES.UNAUTHORIZED,
                },
            });
            return;
        }
        // Extract token from "Bearer <token>" format
        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer") {
            res.status(constants_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                error: {
                    status: constants_1.HTTP_STATUS.UNAUTHORIZED,
                    message: "Invalid authorization header format. Expected: Bearer <token>",
                    code: constants_1.ERROR_CODES.INVALID_TOKEN,
                },
            });
            return;
        }
        const token = parts[1];
        // Get JWT secret from environment
        const envConfig = (0, env_1.getEnvConfig)();
        const jwtSecret = envConfig.JWT_SECRET;
        if (!jwtSecret || jwtSecret.length < 32) {
            console.error("🔴 CRITICAL: JWT_SECRET is not properly configured!");
            res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: {
                    status: constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR,
                    message: constants_1.API_MESSAGES.INTERNAL_ERROR,
                    code: constants_1.ERROR_CODES.INTERNAL_ERROR,
                },
            });
            return;
        }
        // Verify token
        jsonwebtoken_1.default.verify(token, jwtSecret, (err, decoded) => {
            if (err) {
                const errorMessage = err.name === "TokenExpiredError"
                    ? "Token has expired"
                    : err.name === "JsonWebTokenError"
                        ? "Invalid token"
                        : "Token verification failed";
                console.warn(`Token verification failed: ${errorMessage}`, {
                    error: err.name,
                    path: req.path,
                });
                res.status(constants_1.HTTP_STATUS.FORBIDDEN).json({
                    success: false,
                    error: {
                        status: constants_1.HTTP_STATUS.FORBIDDEN,
                        message: errorMessage,
                        code: constants_1.ERROR_CODES.INVALID_TOKEN,
                    },
                });
                return;
            }
            // Type guard for decoded token
            if (!decoded || typeof decoded !== "object" || !("id" in decoded) || !("email" in decoded)) {
                res.status(constants_1.HTTP_STATUS.FORBIDDEN).json({
                    success: false,
                    error: {
                        status: constants_1.HTTP_STATUS.FORBIDDEN,
                        message: "Invalid token payload",
                        code: constants_1.ERROR_CODES.INVALID_TOKEN,
                    },
                });
                return;
            }
            const payload = decoded;
            // Attach user information to request
            req.userId = payload.id;
            req.user = {
                id: payload.id,
                email: payload.email,
                role: payload.role,
            };
            next();
        });
    }
    catch (error) {
        console.error("Authentication middleware error:", error);
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: {
                status: constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR,
                message: constants_1.API_MESSAGES.INTERNAL_ERROR,
                code: constants_1.ERROR_CODES.INTERNAL_ERROR,
            },
        });
    }
};
exports.authenticateToken = authenticateToken;
/**
 * Generates a JWT token for a user
 *
 * @param userId - User ID
 * @param email - User email
 * @param role - User role (optional)
 * @returns JWT token string
 * @throws {Error} If JWT_SECRET is not configured
 *
 * @example
 * ```typescript
 * const token = generateToken("user123", "user@example.com", "user");
 * ```
 */
const generateToken = (userId, email, role) => {
    const envConfig = (0, env_1.getEnvConfig)();
    const jwtSecret = envConfig.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
        throw new Error("JWT_SECRET is not properly configured in environment variables!");
    }
    const payload = {
        id: userId,
        email,
        ...(role && { role }),
    };
    return jsonwebtoken_1.default.sign(payload, jwtSecret, {
        expiresIn: constants_1.SECURITY_CONFIG.JWT_EXPIRES_IN,
        issuer: "visabuddy-api",
        audience: "visabuddy-app",
    });
};
exports.generateToken = generateToken;
/**
 * Verifies and decodes a JWT token without middleware
 * Useful for background jobs or non-Express contexts
 *
 * @param token - JWT token string
 * @returns Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
    const envConfig = (0, env_1.getEnvConfig)();
    const jwtSecret = envConfig.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
        throw new Error("JWT_SECRET is not properly configured!");
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret, {
            issuer: "visabuddy-api",
            audience: "visabuddy-app",
        });
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new Error("Token has expired");
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new Error("Invalid token");
        }
        throw error;
    }
};
exports.verifyToken = verifyToken;
//# sourceMappingURL=auth.js.map