/**
 * Authentication middleware and JWT utilities
 * Handles token verification and generation
 */

import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { getEnvConfig } from "../config/env";
import { SECURITY_CONFIG, API_MESSAGES, ERROR_CODES, HTTP_STATUS } from "../config/constants";
import { errors } from "../utils/errors";

/**
 * Extended Express Request interface with user information
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        email: string;
        role?: string;
      };
    }
  }
}

/**
 * JWT Payload interface
 */
interface TokenPayload extends JwtPayload {
  id: string;
  email: string;
  role?: string;
}

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
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          status: HTTP_STATUS.UNAUTHORIZED,
          message: API_MESSAGES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        },
      });
      return;
    }

    // Extract token from "Bearer <token>" format
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          status: HTTP_STATUS.UNAUTHORIZED,
          message: "Invalid authorization header format. Expected: Bearer <token>",
          code: ERROR_CODES.INVALID_TOKEN,
        },
      });
      return;
    }

    const token = parts[1];

    // Get JWT secret from environment
    const envConfig = getEnvConfig();
    const jwtSecret = envConfig.JWT_SECRET;

    if (!jwtSecret || jwtSecret.length < 32) {
      console.error("🔴 CRITICAL: JWT_SECRET is not properly configured!");
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          message: API_MESSAGES.INTERNAL_ERROR,
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      });
      return;
    }

    // Verify token
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        const errorMessage =
          err.name === "TokenExpiredError"
            ? "Token has expired"
            : err.name === "JsonWebTokenError"
            ? "Invalid token"
            : "Token verification failed";

        console.warn(`Token verification failed: ${errorMessage}`, {
          error: err.name,
          path: req.path,
        });

        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: {
            status: HTTP_STATUS.FORBIDDEN,
            message: errorMessage,
            code: ERROR_CODES.INVALID_TOKEN,
          },
        });
        return;
      }

      // Type guard for decoded token
      if (!decoded || typeof decoded !== "object" || !("id" in decoded) || !("email" in decoded)) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: {
            status: HTTP_STATUS.FORBIDDEN,
            message: "Invalid token payload",
            code: ERROR_CODES.INVALID_TOKEN,
          },
        });
        return;
      }

      const payload = decoded as TokenPayload;

      // Attach user information to request
      req.userId = payload.id;
      req.user = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
      };

      next();
    });
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: API_MESSAGES.INTERNAL_ERROR,
        code: ERROR_CODES.INTERNAL_ERROR,
      },
    });
  }
};

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
export const generateToken = (userId: string, email: string, role?: string): string => {
  const envConfig = getEnvConfig();
  const jwtSecret = envConfig.JWT_SECRET;

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET is not properly configured in environment variables!");
  }

  const payload: TokenPayload = {
    id: userId,
    email,
    ...(role && { role }),
  };

  return jwt.sign(payload, jwtSecret, {
    expiresIn: SECURITY_CONFIG.JWT_EXPIRES_IN,
    issuer: "visabuddy-api",
    audience: "visabuddy-app",
  });
};

/**
 * Verifies and decodes a JWT token without middleware
 * Useful for background jobs or non-Express contexts
 * 
 * @param token - JWT token string
 * @returns Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export const verifyToken = (token: string): TokenPayload => {
  const envConfig = getEnvConfig();
  const jwtSecret = envConfig.JWT_SECRET;

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET is not properly configured!");
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, {
      issuer: "visabuddy-api",
      audience: "visabuddy-app",
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token has expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    throw error;
  }
};