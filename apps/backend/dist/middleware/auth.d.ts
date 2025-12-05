/**
 * Authentication middleware and JWT utilities
 * Handles token verification and generation
 */
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';
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
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => void;
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
export declare const generateToken: (userId: string, email: string, role?: string) => string;
/**
 * Verifies and decodes a JWT token without middleware
 * Useful for background jobs or non-Express contexts
 *
 * @param token - JWT token string
 * @returns Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export declare const verifyToken: (token: string) => TokenPayload;
export {};
//# sourceMappingURL=auth.d.ts.map