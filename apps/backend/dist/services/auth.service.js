"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../middleware/auth");
const errors_1 = require("../utils/errors");
const prisma = new client_1.PrismaClient();
class AuthService {
    /**
     * Register a new user with email and password
     */
    static async register(payload) {
        // Validate input
        if (!payload.email || !payload.password) {
            throw errors_1.errors.validationError("Email and password are required");
        }
        if (payload.password.length < 6) {
            throw errors_1.errors.validationError("Password must be at least 6 characters");
        }
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: payload.email.toLowerCase() },
        });
        if (existingUser) {
            throw errors_1.errors.conflict("Email");
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(payload.password, 10);
        // Create user
        const user = await prisma.user.create({
            data: {
                email: payload.email.toLowerCase(),
                passwordHash,
                firstName: payload.firstName,
                lastName: payload.lastName,
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
     */
    static async login(payload) {
        // Validate input
        if (!payload.email || !payload.password) {
            throw errors_1.errors.validationError("Email and password are required");
        }
        // Find user
        const user = await prisma.user.findUnique({
            where: { email: payload.email.toLowerCase() },
        });
        if (!user || !user.passwordHash) {
            throw errors_1.errors.unauthorized();
        }
        // Verify password
        const isPasswordValid = await bcryptjs_1.default.compare(payload.password, user.passwordHash);
        if (!isPasswordValid) {
            throw errors_1.errors.unauthorized();
        }
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
     * Verify Google OAuth login/registration
     */
    static async verifyGoogleAuth(payload) {
        // Try to find existing user
        let user = await prisma.user.findFirst({
            where: {
                OR: [{ googleId: payload.googleId }, { email: payload.email.toLowerCase() }],
            },
        });
        // Create new user if doesn't exist
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: payload.email.toLowerCase(),
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
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map