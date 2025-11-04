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
export declare class AuthService {
    /**
     * Register a new user with email and password
     */
    static register(payload: RegisterPayload): Promise<AuthResponse>;
    /**
     * Login with email and password
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
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            notificationsEnabled: boolean;
            emailNotifications: boolean;
            pushNotifications: boolean;
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
     * Refresh JWT token
     */
    static refreshToken(userId: string): Promise<string>;
    /**
     * Verify Google OAuth login/registration
     */
    static verifyGoogleAuth(payload: {
        googleId: string;
        email: string;
        firstName?: string;
        lastName?: string;
        avatar?: string;
    }): Promise<AuthResponse>;
}
export {};
//# sourceMappingURL=auth.service.d.ts.map