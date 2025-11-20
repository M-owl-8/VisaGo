import {Platform} from 'react-native';
import {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import {useNotificationStore} from '../store/notifications';
import {addBreadcrumb, logError, logMessage} from './errorLogger';
import {APP_VERSION} from '../config/constants';
import {getMessaging, isFirebaseInitialized, initializeFirebase} from './firebase';

export const DEFAULT_TOPIC = 'visabuddy-general';

let initialized = false;
let unsubscribeOnMessage: (() => void) | null = null;
let unsubscribeOnTokenRefresh: (() => void) | null = null;
let unsubscribeOnNotificationOpened: (() => void) | null = null;

const mapAuthorizationStatus = (
  status: FirebaseMessagingTypes.AuthorizationStatus,
): 'granted' | 'denied' | 'provisional' | 'unknown' => {
  const messaging = getMessaging();
  switch (status) {
    case messaging.AuthorizationStatus.AUTHORIZED:
      return 'granted';
    case messaging.AuthorizationStatus.PROVISIONAL:
      return 'provisional';
    case messaging.AuthorizationStatus.DENIED:
      return 'denied';
    case messaging.AuthorizationStatus.NOT_DETERMINED:
    default:
      return 'unknown';
  }
};

const syncDeviceToken = async (token: string | null | undefined) => {
  if (!token) {
    return;
  }

  const notificationStore = useNotificationStore.getState();

  try {
    await notificationStore.registerDeviceToken(
      token,
      Platform.OS,
      undefined,
      APP_VERSION,
    );
    await notificationStore.subscribeToTopic(DEFAULT_TOPIC, token);
  } catch (error) {
    logError(error, {
      scope: 'PushNotifications',
      message: 'Failed to sync device token',
    });
  }
};

const handleRemoteMessage = async (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  source: 'foreground' | 'background' | 'initial' | 'opened',
) => {
  const notification = remoteMessage.notification;
  const data = remoteMessage.data || {};

  addBreadcrumb({
    category: 'push',
    message: `Notification received (${source})`,
    level: 'info',
    data: {
      messageId: remoteMessage.messageId,
      type: data.type,
    },
  });

  const notificationStore = useNotificationStore.getState();

  notificationStore.addNotification({
    type: (data.type as any) || 'info',
    title: notification?.title || 'VisaBuddy',
    message: notification?.body || 'You have a new update from VisaBuddy.',
    data,
  });
};

export const initializePushNotifications = async (): Promise<void> => {
  if (initialized) {
    return;
  }

  const notificationStore = useNotificationStore.getState();
  const {preferences} = notificationStore;

  if (!preferences.pushNotifications) {
    logMessage(
      'Push notifications disabled in preferences, skipping registration.',
    );
    return;
  }

  try {
    // Ensure Firebase is initialized before using messaging
    const firebaseReady = await initializeFirebase();
    if (!firebaseReady) {
      // Don't log as an error - Firebase might not be configured, which is okay
      if (__DEV__) {
        logMessage(
          'Push notifications skipped: Firebase not configured. ' +
          'This is normal if Firebase setup is not complete.'
        );
      }
      return;
    }

    const messaging = getMessaging();
    await messaging.registerDeviceForRemoteMessages();

    let authorizationStatus = await messaging.hasPermission();

    if (
      authorizationStatus === messaging.AuthorizationStatus.NOT_DETERMINED ||
      authorizationStatus === messaging.AuthorizationStatus.DENIED
    ) {
      authorizationStatus = await messaging.requestPermission();
    }

    notificationStore.setPushPermissionStatus(
      mapAuthorizationStatus(authorizationStatus),
    );

    if (
      authorizationStatus !== messaging.AuthorizationStatus.AUTHORIZED &&
      authorizationStatus !== messaging.AuthorizationStatus.PROVISIONAL
    ) {
      logMessage('Push notification permission not granted.');
      return;
    }

    const token = await messaging.getToken();
    await syncDeviceToken(token);

    if (!unsubscribeOnTokenRefresh) {
      unsubscribeOnTokenRefresh = messaging.onTokenRefresh(async newToken => {
        await syncDeviceToken(newToken);
      });
    }

    if (!unsubscribeOnMessage) {
      unsubscribeOnMessage = messaging.onMessage(async remoteMessage => {
        await handleRemoteMessage(remoteMessage, 'foreground');
      });
    }

    if (!unsubscribeOnNotificationOpened) {
      unsubscribeOnNotificationOpened = messaging.onNotificationOpenedApp(
        async remoteMessage => {
          if (remoteMessage) {
            await handleRemoteMessage(remoteMessage, 'opened');
          }
        },
      );
    }

    const initialNotification = await messaging.getInitialNotification();
    if (initialNotification) {
      await handleRemoteMessage(initialNotification, 'initial');
    }

    initialized = true;
    logMessage('Push notifications initialized');
  } catch (error) {
    logError(error, {
      scope: 'PushNotifications',
      message: 'Failed to initialize push notifications',
    });
  }
};

export const cleanupPushNotifications = () => {
  if (unsubscribeOnMessage) {
    unsubscribeOnMessage();
    unsubscribeOnMessage = null;
  }

  if (unsubscribeOnTokenRefresh) {
    unsubscribeOnTokenRefresh();
    unsubscribeOnTokenRefresh = null;
  }

  if (unsubscribeOnNotificationOpened) {
    unsubscribeOnNotificationOpened();
    unsubscribeOnNotificationOpened = null;
  }

  initialized = false;
};

export const handleBackgroundNotification = async (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) => {
  try {
    await handleRemoteMessage(remoteMessage, 'background');
  } catch (error) {
    logError(error, {
      scope: 'PushNotifications',
      message: 'Failed to handle background notification',
    });
  }
};
