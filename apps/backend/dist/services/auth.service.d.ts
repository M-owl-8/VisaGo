/**
 * Authentication service
 * Handles user registration, login, and authentication-related operations
 */
/**
 * User registration payload
 */
export interface RegisterPayload {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}
/**
 * User login payload
 */
export interface LoginPayload {
    email: string;
    password: string;
}
/**
 * Authentication response
 */
export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
        emailVerified: boolean;
    };
}
/**
 * Authentication service class
 * Provides static methods for user authentication operations
 */
export declare class AuthService {
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
    static register(payload: RegisterPayload): Promise<AuthResponse>;
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
    static login(payload: LoginPayload): Promise<AuthResponse>;
    /**
     * Get current user profile
     */
    static getProfile(userId: string): Promise<{
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        avatar: string | null;
        language: string;
        timezone: string | null;
        currency: string;
        emailVerified: boolean;
        preferences: {
            userId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            notificationsEnabled: boolean;
            emailNotifications: boolean;
            pushNotifications: boolean;
            paymentConfirmations: boolean;
            documentUpdates: boolean;
            visaStatusUpdates: boolean;
            dailyReminders: boolean;
            newsUpdates: boolean;
            twoFactorEnabled: boolean;
        } | null;
        createdAt: Date;
    }>;
    /**
     * Update user profile
     */
    static updateProfile(userId: string, updates: any): Promise<{
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        avatar: string | null;
        language: string;
        timezone: string | null;
        currency: string;
    }>;
    /**
     * Refresh JWT token (requires valid token)
     * Enhanced with better error handling and validation
     */
    static refreshToken(userId: string): Promise<string>;
    /**
     * Verify Google OAuth login/registration
     * Enhanced with better error handling and validation
     */
    static verifyGoogleAuth(payload: {
        googleId: string;
        email: string;
        firstName?: string;
        lastName?: string;
        avatar?: string;
    }): Promise<AuthResponse>;
    /**
   * Request password reset
   * Generates a reset token and sends email
   */
    static requestPasswordReset(email: string): Promise<void>;
    /**
     * Reset password with token
     */
    static resetPassword(token: string, newPassword: string): Promise<void>;
}
//# sourceMappingURL=auth.service.d.ts.map