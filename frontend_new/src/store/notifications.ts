import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// Note: Push notifications will be implemented later with @react-native-community/push-notification-ios
// For now, using a stub implementation
const Notifications = {
  setNotificationHandler: () => {},
  requestPermissionsAsync: async () => ({ status: 'granted' }),
  getPermissionsAsync: async () => ({ status: 'granted' }),
  scheduleNotificationAsync: async () => '',
  cancelScheduledNotificationAsync: async () => {},
  cancelAllScheduledNotificationsAsync: async () => {},
  addNotificationReceivedListener: () => ({ remove: () => {} }),
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
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

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  loadNotificationHistory: () => Promise<void>;
  loadPreferences: () => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  registerDeviceToken: (token: string) => Promise<void>;
  subscribeToTopic: (topic: string, token: string) => Promise<void>;
  unsubscribeFromTopic: (topic: string, token: string) => Promise<void>;
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

      // Add notification
      addNotification: (notification) => {
        const id = Date.now().toString();
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: new Date(),
          read: false,
        };

        set((state) => ({
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
      removeNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount:
              state.unreadCount - (notification && !notification.read ? 1 : 0),
          };
        });
      },

      // Mark as read
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      },

      // Mark all as read
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
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
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/notifications/history', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          if (!response.ok) throw new Error('Failed to load notification history');

          const data = await response.json();
          const notifications = data.notifications.map(
            (n: any): Notification => ({
              ...n,
              timestamp: new Date(n.timestamp),
            }),
          );

          const unreadCount = notifications.filter((n: Notification) => !n.read).length;

          set({
            notifications,
            unreadCount,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load notifications',
            isLoading: false,
          });
        }
      },

      // Load preferences from backend
      loadPreferences: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/notifications/preferences', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          if (!response.ok) throw new Error('Failed to load preferences');

          const preferences = await response.json();
          set({ preferences, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load preferences',
            isLoading: false,
          });
        }
      },

      // Update preferences
      updatePreferences: async (updates) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/notifications/preferences', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
            body: JSON.stringify(updates),
          });

          if (!response.ok) throw new Error('Failed to update preferences');

          set((state) => ({
            preferences: { ...state.preferences, ...updates },
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update preferences',
            isLoading: false,
          });
          throw error;
        }
      },

      // Register device token
      registerDeviceToken: async (token) => {
        try {
          const response = await fetch('/api/notifications/register-device', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
            body: JSON.stringify({ deviceToken: token }),
          });

          if (!response.ok) throw new Error('Failed to register device token');

          console.log('✅ Device token registered');
        } catch (error) {
          console.error('Failed to register device token:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to register device token',
          });
        }
      },

      // Subscribe to topic
      subscribeToTopic: async (topic, token) => {
        try {
          const response = await fetch('/api/notifications/subscribe-topic', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
            body: JSON.stringify({ deviceToken: token, topic }),
          });

          if (!response.ok) throw new Error('Failed to subscribe to topic');

          console.log(`✅ Subscribed to ${topic}`);
        } catch (error) {
          console.error(`Failed to subscribe to ${topic}:`, error);
        }
      },

      // Unsubscribe from topic
      unsubscribeFromTopic: async (topic, token) => {
        try {
          const response = await fetch('/api/notifications/unsubscribe-topic', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
            body: JSON.stringify({ deviceToken: token, topic }),
          });

          if (!response.ok) throw new Error('Failed to unsubscribe from topic');

          console.log(`✅ Unsubscribed from ${topic}`);
        } catch (error) {
          console.error(`Failed to unsubscribe from ${topic}:`, error);
        }
      },
    }),
    {
      name: 'notification-store',
      partialize: (state) => ({
        notifications: state.notifications,
        preferences: state.preferences,
      }),
    },
  ),
);