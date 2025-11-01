import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../services/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  language?: string;
  currency?: string;
  emailVerified?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isSignedIn: boolean;
  isLoading: boolean;
  
  // Actions
  initializeApp: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  loginWithGoogle: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isSignedIn: false,
  isLoading: true,

  // Initialize app by checking stored token
  initializeApp: async () => {
    try {
      const storedToken = await AsyncStorage.getItem('@auth_token');
      const storedUser = await AsyncStorage.getItem('@user');

      if (storedToken && storedUser) {
        const user = JSON.parse(storedUser);
        set({
          token: storedToken,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            language: user.language || 'en',
            currency: user.currency || 'USD',
            emailVerified: user.emailVerified,
          },
          isSignedIn: true,
        });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Email/Password Login
  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      
      const response = await apiClient.login(email, password);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Login failed');
      }

      const { user, token } = response.data;

      // Store tokens and user
      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@user', JSON.stringify(user));

      set({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          language: 'en',
          currency: 'USD',
          emailVerified: user.emailVerified,
        },
        token,
        isSignedIn: true,
      });
    } catch (error: any) {
      console.error('Login failed:', error.message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Register
  register: async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      set({ isLoading: true });

      const response = await apiClient.register(email, password, firstName, lastName);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Registration failed');
      }

      const { user, token } = response.data;

      // Store tokens and user
      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@user', JSON.stringify(user));

      set({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          language: 'en',
          currency: 'USD',
          emailVerified: user.emailVerified,
        },
        token,
        isSignedIn: true,
      });
    } catch (error: any) {
      console.error('Registration failed:', error.message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Google OAuth Login
  loginWithGoogle: async (googleId: string, email: string, firstName?: string, lastName?: string, avatar?: string) => {
    try {
      set({ isLoading: true });

      const response = await apiClient.loginWithGoogle(googleId, email, firstName, lastName, avatar);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Google login failed');
      }

      const { user, token } = response.data;

      // Store tokens and user
      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@user', JSON.stringify(user));

      set({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          language: 'en',
          currency: 'USD',
          emailVerified: user.emailVerified,
        },
        token,
        isSignedIn: true,
      });
    } catch (error: any) {
      console.error('Google login failed:', error.message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Logout
  logout: async () => {
    try {
      // Optional: Call logout endpoint
      await apiClient.logout();
    } catch (error) {
      console.error('Logout endpoint error:', error);
    } finally {
      // Clear stored data - use correct key names
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@refresh_token');
      await AsyncStorage.removeItem('@user');

      set({
        user: null,
        token: null,
        refreshToken: null,
        isSignedIn: false,
      });
    }
  },

  // Set user
  setUser: (user: User | null) => set({ user }),

  // Set token
  setToken: (token: string | null) => set({ token }),
}));