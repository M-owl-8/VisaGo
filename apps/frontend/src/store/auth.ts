import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../services/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  language?: string;
  timezone?: string;
  currency?: string;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  preferences?: {
    notificationsEnabled?: boolean;
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    twoFactorEnabled?: boolean;
  };
}

interface UserApplication {
  id: string;
  countryId: string;
  visaTypeId: string;
  status: string;
  progressPercentage: number;
  submissionDate?: string;
  approvalDate?: string;
  country: {
    name: string;
    flagEmoji: string;
    code: string;
  };
  visaType: {
    name: string;
    fee: number;
    processingDays: number;
    validity: string;
  };
  payment?: {
    amount: number;
    status: string;
    paidAt?: string;
  };
  checkpoints: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
    dueDate?: string;
  }>;
}

interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  transactionId?: string;
  paidAt?: string;
  application: {
    countryId: string;
    visaType: {
      name: string;
    };
    country: {
      name: string;
      flagEmoji: string;
    };
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isSignedIn: boolean;
  isLoading: boolean;
  userApplications: UserApplication[];
  paymentHistory: PaymentHistory[];
  
  // Actions
  initializeApp: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  loginWithGoogle: (googleId: string, email: string, firstName?: string, lastName?: string, avatar?: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  fetchUserProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updatePreferences: (preferences: Partial<User['preferences']> & { language?: string }) => Promise<void>;
  fetchUserApplications: () => Promise<void>;
  fetchPaymentHistory: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isSignedIn: false,
  isLoading: true,
  userApplications: [],
  paymentHistory: [],

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

      const response = await apiClient.loginWithGoogle(googleId, email, firstName || '', lastName || '', avatar);

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
          avatar: avatar,
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

  // Fetch user profile from backend
  fetchUserProfile: async () => {
    try {
      set({ isLoading: true });
      const user = get().user;
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.getUserProfile();

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch profile');
      }

      const updatedUser = {
        ...response.data,
        language: response.data.language || 'en',
        currency: response.data.currency || 'USD',
      };

      // Update AsyncStorage
      await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));

      set({ user: updatedUser });
    } catch (error: any) {
      console.error('Failed to fetch profile:', error.message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Update user profile
  updateProfile: async (data: Partial<User>) => {
    try {
      set({ isLoading: true });
      const user = get().user;
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.updateUserProfile(user.id, data);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update profile');
      }

      const updatedUser = {
        ...user,
        ...response.data,
      };

      // Update AsyncStorage
      await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));

      set({ user: updatedUser });
    } catch (error: any) {
      console.error('Failed to update profile:', error.message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Update user preferences
  updatePreferences: async (preferences: Partial<User['preferences']> & { language?: string }) => {
    try {
      set({ isLoading: true });
      const user = get().user;
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.updateUserPreferences(user.id, preferences);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update preferences');
      }

      // Update user language if provided
      if (preferences.language) {
        const updatedUser = {
          ...user,
          language: preferences.language,
        };
        await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
      }

      // Update preferences in user object
      if (preferences.notificationsEnabled !== undefined || 
          preferences.emailNotifications !== undefined ||
          preferences.pushNotifications !== undefined ||
          preferences.twoFactorEnabled !== undefined) {
        const updatedUser = {
          ...user,
          preferences: {
            ...user.preferences,
            ...preferences,
          },
        };
        await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));
        set({ user: updatedUser });
      }
    } catch (error: any) {
      console.error('Failed to update preferences:', error.message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch user applications
  fetchUserApplications: async () => {
    try {
      const user = get().user;
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.getUserApplications(user.id);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch applications');
      }

      set({ userApplications: response.data });
    } catch (error: any) {
      console.error('Failed to fetch applications:', error.message);
      throw error;
    }
  },

  // Fetch payment history
  fetchPaymentHistory: async () => {
    try {
      const user = get().user;
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.getUserPaymentHistory(user.id);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch payment history');
      }

      set({ paymentHistory: response.data });
    } catch (error: any) {
      console.error('Failed to fetch payment history:', error.message);
      throw error;
    }
  },
}));