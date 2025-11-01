import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateToken } from "../middleware/auth";
import { errors } from "../utils/errors";

const prisma = new PrismaClient();

interface RegisterPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    emailVerified: boolean;
  };
}

export class AuthService {
  /**
   * Register a new user with email and password
   */
  static async register(payload: RegisterPayload): Promise<AuthResponse> {
    // Validate input
    if (!payload.email || !payload.password) {
      throw errors.validationError("Email and password are required");
    }

    if (payload.password.length < 6) {
      throw errors.validationError("Password must be at least 6 characters");
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    });

    if (existingUser) {
      throw errors.conflict("Email");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(payload.password, 10);

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
   */
  static async login(payload: LoginPayload): Promise<AuthResponse> {
    // Validate input
    if (!payload.email || !payload.password) {
      throw errors.validationError("Email and password are required");
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw errors.unauthorized();
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);

    if (!isPasswordValid) {
      throw errors.unauthorized();
    }

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
   * Verify Google OAuth login/registration
   */
  static async verifyGoogleAuth(payload: {
    googleId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  }): Promise<AuthResponse> {
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
    } else if (!user.googleId) {
      // Link Google ID to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: payload.googleId,
          avatar: payload.avatar || user.avatar,
        },
      });
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
  }
}