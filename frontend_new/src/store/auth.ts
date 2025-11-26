import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNotificationStore} from './notifications';
import {DEFAULT_TOPIC} from '../services/pushNotifications';

// Lazy import to avoid circular dependency
let apiClient: any = null;
const getApiClient = () => {
  if (!apiClient) {
    apiClient = require('../services/api').apiClient;
  }
  return apiClient;
};

export type UserRole = 'user' | 'admin' | 'super_admin';

/**
 * Normalize role string to match UserRole type
 * Handles case variations and common formats from backend
 */
function normalizeRole(role: string | undefined | null): UserRole {
  if (!role) return 'user';
  const lower = role.toLowerCase().trim();
  // Handle variations: 'super_admin', 'superadmin', 'SUPER_ADMIN', etc.
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
  bio?: string; // JSON string containing questionnaire data
  questionnaireCompleted?: boolean;
  role?: UserRole; // User role: 'user', 'admin', or 'super_admin'
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
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  fetchUserProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updatePreferences: (
    preferences: Partial<User['preferences']> & {language?: string},
  ) => Promise<void>;
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
      console.log('=== AUTH STORE: initializeApp Starting ===');

      // Add timeout to prevent hanging - reduced to 2 seconds
      const initPromise = (async () => {
        try {
          const storedToken = await AsyncStorage.getItem('@auth_token');
          const storedUser = await AsyncStorage.getItem('@user');

          console.log('=== AUTH STORE: Retrieved from storage ===', {
            hasToken: !!storedToken,
            hasUser: !!storedUser,
          });

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
              });
              console.log('=== AUTH STORE: User restored from storage ===');

              // Load questionnaire data from user bio
              if (restoredUser.bio) {
                try {
                  const {useOnboardingStore} = require('./onboarding');
                  const onboardingStore = useOnboardingStore.getState();
                  onboardingStore.loadFromUserBio(restoredUser.bio);
                } catch (error) {
                  console.warn(
                    'Failed to load questionnaire data on init:',
                    error,
                  );
                }
              }

              // CRITICAL FIX: Fetch fresh data immediately (no setTimeout) to ensure applications load
              // Applications must be loaded synchronously to prevent them from disappearing
              try {
                await get().fetchUserProfile();
                await get().fetchUserApplications();

                // Reload questionnaire data after fetching fresh profile
                const updatedUser = get().user;
                if (updatedUser?.bio) {
                  try {
                    const {useOnboardingStore} = require('./onboarding');
                    const onboardingStore = useOnboardingStore.getState();
                    onboardingStore.loadFromUserBio(updatedUser.bio);
                  } catch (error) {
                    console.warn(
                      'Failed to reload questionnaire data after profile fetch:',
                      error,
                    );
                  }
                }
              } catch (fetchError) {
                console.warn(
                  'Failed to fetch fresh data on init, using stored data:',
                  fetchError,
                );
                // Continue with stored data even if fetch fails
              }
            } catch (parseError) {
              console.error(
                '=== AUTH STORE: Failed to parse user data ===',
                parseError,
              );
              // Clear corrupted data
              await AsyncStorage.removeItem('@auth_token');
              await AsyncStorage.removeItem('@user');
            }
          } else {
            console.log(
              '=== AUTH STORE: No stored credentials, showing login ===',
            );
          }
        } catch (storageError) {
          console.error('=== AUTH STORE: Storage error ===', storageError);
          // Continue anyway - storage errors shouldn't block app startup
        }
      })();

      // Set timeout of 2 seconds - faster timeout
      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Initialization timeout')),
          2000,
        );
      });

      try {
        await Promise.race([initPromise, timeoutPromise]);
      } finally {
        // Cleanup timeout if promise resolved before timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    } catch (error) {
      console.error('=== AUTH STORE: initializeApp Error ===', error);
      // Ensure we always set loading to false, even on error
    } finally {
      console.log('=== AUTH STORE: Setting isLoading to false ===');
      set({isLoading: false});
    }
  },

  // Email/Password Login
  login: async (email: string, password: string) => {
    try {
      set({isLoading: true});

      const response = await getApiClient().login(email, password);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Login failed');
      }

      const {user, token} = response.data;

      // MEDIUM PRIORITY FIX: Store tokens and user atomically to prevent race conditions
      await Promise.all([
        AsyncStorage.setItem('@auth_token', token),
        AsyncStorage.setItem('@user', JSON.stringify(user)),
      ]);

      // Set initial user state
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

      // Sync user's language preference to i18n and AsyncStorage immediately
      if (fullUser.language) {
        try {
          const {default: i18n} = require('../i18n');
          await i18n.changeLanguage(fullUser.language);
          await AsyncStorage.setItem('app_language', fullUser.language);
        } catch (error) {
          console.warn('Failed to sync user language to i18n on login:', error);
        }
      }

      // Fetch complete user profile from server (includes all fields)
      try {
        await get().fetchUserProfile();
      } catch (error) {
        console.warn(
          'Failed to fetch full profile after login, using initial data:',
          error,
        );
      }

      // Load user applications
      try {
        await get().fetchUserApplications();
      } catch (error) {
        console.warn('Failed to fetch applications after login:', error);
      }

      // Load chat history from backend after login
      // CRITICAL FIX: Ensure chat history is loaded so it doesn't appear wiped
      try {
        const {useChatStore} = require('./chat');
        const chatStore = useChatStore.getState();
        await chatStore.loadChatHistory();
      } catch (error) {
        console.warn('Failed to load chat history after login:', error);
        // Don't fail login if chat history load fails
      }

      // Load questionnaire data if it exists
      if (fullUser.bio) {
        try {
          const {useOnboardingStore} = require('./onboarding');
          const onboardingStore = useOnboardingStore.getState();
          onboardingStore.loadFromUserBio(fullUser.bio);
        } catch (error) {
          console.warn('Failed to load questionnaire data:', error);
        }
      }
    } catch (error: any) {
      console.error('Login failed:', error.message);
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  // Register
  register: async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => {
    try {
      set({isLoading: true});

      const response = await getApiClient().register(
        email,
        password,
        firstName,
        lastName,
      );

      if (!response.success || !response.data) {
        // Create error with code and message from backend
        const error = new Error(
          response.error?.message || 'Registration failed',
        ) as any;
        error.code = response.error?.code || 'UNKNOWN_ERROR';
        error.message = response.error?.message || 'Registration failed';
        throw error;
      }

      const {user, token} = response.data;

      // MEDIUM PRIORITY FIX: Store tokens and user atomically to prevent race conditions
      await Promise.all([
        AsyncStorage.setItem('@auth_token', token),
        AsyncStorage.setItem('@user', JSON.stringify(user)),
      ]);

      // Set initial user state
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

      // Fetch complete user profile from server
      try {
        await get().fetchUserProfile();
      } catch (error) {
        console.warn(
          'Failed to fetch full profile after registration, using initial data:',
          error,
        );
      }

      // Load user applications
      try {
        await get().fetchUserApplications();
      } catch (error) {
        console.warn('Failed to fetch applications after registration:', error);
      }

      // Load chat history from backend after registration
      // CRITICAL FIX: Ensure chat history is available for new users
      try {
        const {useChatStore} = require('./chat');
        const chatStore = useChatStore.getState();
        await chatStore.loadChatHistory();
      } catch (error) {
        console.warn('Failed to load chat history after registration:', error);
        // Don't fail registration if chat history load fails
      }
    } catch (error: any) {
      console.error('Registration failed:', error.message);
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  // Google OAuth Login
  // SECURE: Accepts Google ID token for server-side verification
  loginWithGoogle: async (idToken: string) => {
    try {
      set({isLoading: true});

      if (!idToken || typeof idToken !== 'string') {
        throw new Error('Google ID token is required');
      }

      const response = await getApiClient().loginWithGoogle(idToken);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Google login failed');
      }

      const {user, token} = response.data;

      // MEDIUM PRIORITY FIX: Store tokens and user atomically to prevent race conditions
      await Promise.all([
        AsyncStorage.setItem('@auth_token', token),
        AsyncStorage.setItem('@user', JSON.stringify(user)),
      ]);

      // Set initial user state
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

      // Fetch complete user profile from server
      try {
        await get().fetchUserProfile();
      } catch (error) {
        console.warn(
          'Failed to fetch full profile after Google login, using initial data:',
          error,
        );
      }

      // Load user applications
      try {
        await get().fetchUserApplications();
      } catch (error) {
        console.warn('Failed to fetch applications after Google login:', error);
      }

      // Load chat history from backend after Google login
      // CRITICAL FIX: Ensure chat history is loaded so it doesn't appear wiped
      try {
        const {useChatStore} = require('./chat');
        const chatStore = useChatStore.getState();
        await chatStore.loadChatHistory();
      } catch (error) {
        console.warn('Failed to load chat history after Google login:', error);
        // Don't fail login if chat history load fails
      }

      // Load questionnaire data if it exists
      if (fullUser.bio) {
        try {
          const {useOnboardingStore} = require('./onboarding');
          const onboardingStore = useOnboardingStore.getState();
          onboardingStore.loadFromUserBio(fullUser.bio);
        } catch (error) {
          console.warn('Failed to load questionnaire data:', error);
        }
      }
    } catch (error: any) {
      console.error('Google login failed:', error.message);
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  // Logout
  logout: async () => {
    try {
      // Optional: Call logout endpoint
      await getApiClient().logout();
    } catch (error) {
      console.error('Logout endpoint error:', error);
    } finally {
      const notificationState = useNotificationStore.getState();
      if (notificationState.deviceToken) {
        notificationState
          .unsubscribeFromTopic(DEFAULT_TOPIC, notificationState.deviceToken)
          .catch(() => undefined);
      }
      notificationState.clearDeviceToken();

      // Clear stored data - use correct key names
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@refresh_token');
      await AsyncStorage.removeItem('@user');
      await getApiClient().clearSecurityTokens();

      set({
        user: null,
        token: null,
        refreshToken: null,
        isSignedIn: false,
      });

      try {
        const notificationStore = useNotificationStore.getState();
        notificationStore.clearDeviceToken();
        notificationStore.clearNotifications();
      } catch (error) {
        console.warn('Failed to clear notification state on logout', error);
      }
    }
  },

  // Set user
  setUser: (user: User | null) => set({user}),

  // Set token
  setToken: (token: string | null) => set({token}),

  // Fetch user profile from backend
  fetchUserProfile: async () => {
    try {
      set({isLoading: true});
      const user = get().user;

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const response = await getApiClient().getUserProfile();

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

      // Update AsyncStorage
      await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));

      set({user: updatedUser});

      // Sync user's language preference to i18n and AsyncStorage
      if (updatedUser.language) {
        try {
          const {default: i18n} = require('../i18n');
          await i18n.changeLanguage(updatedUser.language);
          await AsyncStorage.setItem('app_language', updatedUser.language);
        } catch (error) {
          console.warn('Failed to sync user language to i18n:', error);
        }
      }

      // Load questionnaire data if it exists
      if (updatedUser.bio) {
        try {
          const {useOnboardingStore} = require('./onboarding');
          const onboardingStore = useOnboardingStore.getState();
          onboardingStore.loadFromUserBio(updatedUser.bio);
        } catch (error) {
          console.warn(
            'Failed to load questionnaire data after profile fetch:',
            error,
          );
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch profile:', error.message);
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  // Update user profile
  updateProfile: async (data: Partial<User>) => {
    try {
      set({isLoading: true});
      const user = get().user;

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const response = await getApiClient().updateUserProfile(user.id, data);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update profile');
      }

      const updatedUser = {
        ...user,
        ...response.data,
        bio: response.data.bio,
        questionnaireCompleted: response.data.questionnaireCompleted ?? false,
      };

      // Update AsyncStorage
      await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));

      set({user: updatedUser});

      // Load questionnaire data if bio was updated
      if (data.bio !== undefined && updatedUser.bio) {
        try {
          const {useOnboardingStore} = require('./onboarding');
          const onboardingStore = useOnboardingStore.getState();
          onboardingStore.loadFromUserBio(updatedUser.bio);
        } catch (error) {
          console.warn(
            'Failed to load questionnaire data after profile update:',
            error,
          );
        }
      }

      console.log('=== AUTH STORE: User profile updated ===', {
        questionnaireCompleted: updatedUser.questionnaireCompleted,
        hasBio: !!updatedUser.bio,
      });
    } catch (error: any) {
      console.error('Failed to update profile:', error.message);
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  // Update user preferences
  updatePreferences: async (
    preferences: Partial<User['preferences']> & {language?: string},
  ) => {
    try {
      set({isLoading: true});
      const user = get().user;

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const response = await getApiClient().updateUserPreferences(
        user.id,
        preferences,
      );

      if (!response.success) {
        throw new Error(
          response.error?.message || 'Failed to update preferences',
        );
      }

      // Update user language if provided
      if (preferences.language) {
        const updatedUser = {
          ...user,
          language: preferences.language,
        };
        await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));
        set({user: updatedUser});
      }

      // Update preferences in user object
      if (
        preferences.notificationsEnabled !== undefined ||
        preferences.emailNotifications !== undefined ||
        preferences.pushNotifications !== undefined ||
        preferences.twoFactorEnabled !== undefined
      ) {
        const updatedUser = {
          ...user,
          preferences: {
            ...user.preferences,
            ...preferences,
          },
        };
        await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));
        set({user: updatedUser});
      }
    } catch (error: any) {
      console.error('Failed to update preferences:', error.message);
      throw error;
    } finally {
      set({isLoading: false});
    }
  },

  // Fetch user applications
  fetchUserApplications: async () => {
    try {
      const user = get().user;

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const response = await getApiClient().getUserApplications(user.id);

      if (!response.success || !response.data) {
        throw new Error(
          response.error?.message || 'Failed to fetch applications',
        );
      }

      set({userApplications: response.data});
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

      const response = await getApiClient().getUserPaymentHistory(user.id);

      if (!response.success || !response.data) {
        throw new Error(
          response.error?.message || 'Failed to fetch payment history',
        );
      }

      set({paymentHistory: response.data});
    } catch (error: any) {
      console.error('Failed to fetch payment history:', error.message);
      throw error;
    }
  },
}));
