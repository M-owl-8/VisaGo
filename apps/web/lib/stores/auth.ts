import { create } from 'zustand';
import { apiClient } from '../api/client';

export type UserRole = 'user' | 'admin' | 'super_admin';

function normalizeRole(role: string | undefined | null): UserRole {
  if (!role) return 'user';
  const lower = role.toLowerCase().trim();
  if (lower === 'super_admin' || lower === 'superadmin') return 'super_admin';
  if (lower === 'admin') return 'admin';
  return 'user';
}

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
  bio?: string;
  questionnaireCompleted?: boolean;
  role?: UserRole;
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

interface AuthState {
  user: User | null;
  token: string | null;
  isSignedIn: boolean;
  isLoading: boolean;
  userApplications: UserApplication[];

  // Actions
  initializeApp: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  fetchUserProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  fetchUserApplications: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isSignedIn: false,
  isLoading: true,
  userApplications: [],

  initializeApp: async () => {
    try {
      if (typeof window === 'undefined') {
        set({ isLoading: false });
        return;
      }

      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          const user = JSON.parse(storedUser);
          const restoredUser = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            avatar: user.avatar,
            language: user.language || 'en',
            currency: user.currency || 'USD',
            emailVerified: user.emailVerified,
            bio: user.bio,
            questionnaireCompleted: user.questionnaireCompleted || false,
            role: normalizeRole(user.role),
          };

          set({
            token: storedToken,
            user: restoredUser,
            isSignedIn: true,
            isLoading: false, // Set loading to false immediately after restoring from storage
          });

          // Fetch fresh data in background (don't block initialization)
          get().fetchUserProfile().catch((error) => {
            console.warn('Failed to fetch fresh profile on init:', error);
          });
          get().fetchUserApplications().catch((error) => {
            console.warn('Failed to fetch applications on init:', error);
          });
        } catch (parseError) {
          console.error('Failed to parse user data:', parseError);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          set({ isLoading: false });
        }
      } else {
        // No stored credentials, set loading to false immediately
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('initializeApp error:', error);
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true });

      const response = await apiClient.login(email, password);

      if (!response.success || !response.data) {
        // Provide user-friendly error messages
        let errorMessage = response.error?.message || 'Login failed';
        
        // Translate common error codes to user-friendly messages
        if (response.error?.code === 'NETWORK_ERROR' || response.error?.status === 0) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (response.error?.status === 401) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (response.error?.status === 400) {
          errorMessage = response.error?.message || 'Invalid request. Please check your input.';
        }
        
        const error = new Error(errorMessage) as any;
        error.code = response.error?.code;
        error.status = response.error?.status;
        throw error;
      }

      const { user, token } = response.data;

      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
      }

      const fullUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatar: user.avatar,
        language: user.language || 'en',
        currency: user.currency || 'USD',
        emailVerified: user.emailVerified,
        bio: user.bio,
        questionnaireCompleted: user.questionnaireCompleted || false,
        role: normalizeRole(user.role),
      };

      set({
        user: fullUser,
        token,
        isSignedIn: true,
      });

      // Fetch complete user profile
      try {
        await get().fetchUserProfile();
      } catch (error) {
        console.warn('Failed to fetch full profile after login:', error);
      }

      // Load user applications in background (non-blocking)
      get().fetchUserApplications().catch((error) => {
        console.warn('Failed to fetch applications after login:', error);
      });
      
      // Set loading to false immediately after successful login
      set({ isLoading: false });
    } catch (error: any) {
      console.error('Login failed:', error.message);
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => {
    try {
      set({ isLoading: true });

      const response = await apiClient.register(
        email,
        password,
        firstName,
        lastName,
      );

      if (!response.success || !response.data) {
        // Provide user-friendly error messages
        let errorMessage = response.error?.message || 'Registration failed';
        
        // Translate common error codes to user-friendly messages
        if (response.error?.code === 'NETWORK_ERROR' || response.error?.status === 0) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (response.error?.status === 409) {
          errorMessage = 'This email is already registered. Please use a different email or try logging in.';
        } else if (response.error?.status === 400) {
          errorMessage = response.error?.message || 'Invalid input. Please check your information.';
        }
        
        const error = new Error(errorMessage) as any;
        error.code = response.error?.code || 'UNKNOWN_ERROR';
        error.status = response.error?.status;
        throw error;
      }

      const { user, token } = response.data;

      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
      }

      const fullUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatar: user.avatar,
        language: user.language || 'en',
        currency: user.currency || 'USD',
        emailVerified: user.emailVerified,
        bio: user.bio,
        questionnaireCompleted: user.questionnaireCompleted || false,
        role: normalizeRole(user.role),
      };

      set({
        user: fullUser,
        token,
        isSignedIn: true,
      });

      // Fetch complete user profile
      try {
        await get().fetchUserProfile();
      } catch (error) {
        console.warn('Failed to fetch full profile after registration:', error);
      }

      // Load user applications in background (non-blocking)
      get().fetchUserApplications().catch((error) => {
        console.warn('Failed to fetch applications after registration:', error);
      });
      
      // Set loading to false immediately after successful registration
      set({ isLoading: false });
    } catch (error: any) {
      console.error('Registration failed:', error.message);
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout endpoint error:', error);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }

      set({
        user: null,
        token: null,
        isSignedIn: false,
        userApplications: [],
      });
    }
  },

  setUser: (user: User | null) => set({ user }),

  setToken: (token: string | null) => {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
    set({ token });
  },

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
        bio: response.data.bio,
        questionnaireCompleted: response.data.questionnaireCompleted,
        role: normalizeRole(response.data.role),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      set({ user: updatedUser });
    } catch (error: any) {
      console.error('Failed to fetch profile:', error.message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (data: Partial<User>) => {
    try {
      set({ isLoading: true });
      const user = get().user;

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.updateProfile(data);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update profile');
      }

      const updatedUser = {
        ...user,
        ...response.data,
        bio: response.data.bio,
        questionnaireCompleted: response.data.questionnaireCompleted ?? false,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      set({ user: updatedUser });
    } catch (error: any) {
      console.error('Failed to update profile:', error.message);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUserApplications: async () => {
    try {
      const user = get().user;

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.getUserApplications(user.id);

      if (!response.success || !response.data) {
        throw new Error(
          response.error?.message || 'Failed to fetch applications',
        );
      }

      set({ userApplications: response.data });
    } catch (error: any) {
      console.error('Failed to fetch applications:', error.message);
      throw error;
    }
  },
}));

