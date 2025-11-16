import {create} from 'zustand';
import {persist} from 'zustand/middleware';

let apiClient: any = null;
const getApiClient = () => {
  if (!apiClient) {
    apiClient = require('../services/api').apiClient;
  }
  return apiClient;
};

export interface Notification {
  id: string;
  type:
    | 'payment_confirmed'
    | 'document_uploaded'
    | 'document_verified'
    | 'document_rejected'
    | 'visa_status_update'
    | 'missing_documents'
    | 'deadline_approaching'
    | 'news_update'
    | 'info'
    | 'error'
    | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, any>;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  paymentConfirmations: boolean;
  documentUpdates: boolean;
  visaStatusUpdates: boolean;
  dailyReminders: boolean;
  newsUpdates: boolean;
}

export interface NotificationStore {
  // State
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  isLoading: boolean;
  error: string | null;
  pushPermissionStatus: 'unknown' | 'granted' | 'denied' | 'provisional';
  deviceToken: string | null;
  lastSyncedToken: string | null;
  lastTokenSyncAt: number | null;
  preferencesLoaded: boolean;

  // Actions
  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>,
  ) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  loadNotificationHistory: () => Promise<void>;
  loadPreferences: () => Promise<void>;
  updatePreferences: (
    preferences: Partial<NotificationPreferences>,
  ) => Promise<void>;
  registerDeviceToken: (
    token: string,
    platform?: string,
    deviceId?: string,
    appVersion?: string,
  ) => Promise<void>;
  subscribeToTopic: (topic: string, token: string) => Promise<void>;
  unsubscribeFromTopic: (topic: string, token: string) => Promise<void>;
  setPushPermissionStatus: (
    status: 'unknown' | 'granted' | 'denied' | 'provisional',
  ) => void;
  clearDeviceToken: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      notifications: [],
      unreadCount: 0,
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        paymentConfirmations: true,
        documentUpdates: true,
        visaStatusUpdates: true,
        dailyReminders: true,
        newsUpdates: false,
      },
      isLoading: false,
      error: null,
      pushPermissionStatus: 'unknown',
      deviceToken: null,
      lastSyncedToken: null,
      lastTokenSyncAt: null,
      preferencesLoaded: false,

      // Add notification
      addNotification: notification => {
        const id = Date.now().toString();
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: new Date(),
          read: false,
        };

        set(state => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
          error: null,
        }));

        // Auto-dismiss info/success notifications after 5 seconds
        if (notification.type === 'info' || notification.type === 'success') {
          setTimeout(() => {
            get().removeNotification(id);
          }, 5000);
        }
      },

      // Remove notification
      removeNotification: id => {
        set(state => {
          const notification = state.notifications.find(n => n.id === id);
          return {
            notifications: state.notifications.filter(n => n.id !== id),
            unreadCount:
              state.unreadCount - (notification && !notification.read ? 1 : 0),
          };
        });
      },

      // Mark as read
      markAsRead: id => {
        set(state => ({
          notifications: state.notifications.map(n =>
            n.id === id ? {...n, read: true} : n,
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      },

      // Mark all as read
      markAllAsRead: () => {
        set(state => ({
          notifications: state.notifications.map(n => ({...n, read: true})),
          unreadCount: 0,
        }));
      },

      // Clear all notifications
      clearNotifications: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });
      },

      // Load notification history from backend
      loadNotificationHistory: async () => {
        set({isLoading: true, error: null});
        try {
          const data = await getApiClient().getNotificationHistory();
          const notifications = (data.notifications || []).map(
            (n: any): Notification => ({
              ...n,
              timestamp: new Date(n.timestamp || Date.now()),
            }),
          );

          const unreadCount = notifications.filter(n => !n.read).length;

          set({
            notifications,
            unreadCount,
            isLoading: false,
          });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to load notifications',
            isLoading: false,
          });
        }
      },

      // Load preferences from backend
      loadPreferences: async () => {
        set({isLoading: true, error: null});
        try {
          const preferences = await getApiClient().getNotificationPreferences();
          set({preferences, isLoading: false, preferencesLoaded: true});
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to load preferences',
            isLoading: false,
            preferencesLoaded: false,
          });
        }
      },

      // Update preferences
      updatePreferences: async updates => {
        set({error: null});
        try {
          await getApiClient().updateNotificationPreferences(updates);
          set(state => ({
            preferences: {...state.preferences, ...updates},
          }));
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to update preferences',
          });
          throw error;
        }
      },

      // Register device token
      registerDeviceToken: async (
        token,
        platform = 'unknown',
        deviceId,
        appVersion,
      ) => {
        const state = get();

        if (
          state.lastSyncedToken === token &&
          state.lastTokenSyncAt &&
          Date.now() - state.lastTokenSyncAt < 1000 * 60 * 15
        ) {
          set({deviceToken: token});
          return;
        }

        try {
          await getApiClient().registerDeviceToken(
            token,
            platform,
            deviceId,
            appVersion,
          );
          set({
            deviceToken: token,
            lastSyncedToken: token,
            lastTokenSyncAt: Date.now(),
            error: null,
          });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to register device token',
          });
          throw error;
        }
      },

      // Subscribe to topic
      subscribeToTopic: async (topic, token) => {
        try {
          await getApiClient().subscribeToTopic(topic, token);
        } catch (error) {
          console.error(`Failed to subscribe to ${topic}:`, error);
        }
      },

      // Unsubscribe from topic
      unsubscribeFromTopic: async (topic, token) => {
        try {
          await getApiClient().unsubscribeFromTopic(topic, token);
        } catch (error) {
          console.error(`Failed to unsubscribe from ${topic}:`, error);
        }
      },

      setPushPermissionStatus: status => {
        set({pushPermissionStatus: status});
      },

      clearDeviceToken: () => {
        set({deviceToken: null, lastSyncedToken: null, lastTokenSyncAt: null});
      },
    }),
    {
      name: 'notification-store',
      partialize: state => ({
        notifications: state.notifications,
        preferences: state.preferences,
        pushPermissionStatus: state.pushPermissionStatus,
        deviceToken: state.deviceToken,
        lastSyncedToken: state.lastSyncedToken,
        lastTokenSyncAt: state.lastTokenSyncAt,
        preferencesLoaded: state.preferencesLoaded,
      }),
    },
  ),
);
