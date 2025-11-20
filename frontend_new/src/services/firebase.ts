/**
 * Firebase Initialization Service
 * 
 * Ensures Firebase is properly initialized before any Firebase services are used.
 * This prevents "No Firebase App '[DEFAULT]' has been created" errors.
 */

import { Platform } from 'react-native';
import firebaseApp from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';

let isInitialized = false;
let initializationPromise: Promise<boolean> | null = null;

/**
 * Check if Firebase app is initialized
 */
export const isFirebaseInitialized = (): boolean => {
  try {
    // Try to get the default app - if it exists, Firebase is initialized
    // React Native Firebase auto-initializes, so we just need to check if it's ready
    const app = firebaseApp.app();
    return app !== null && app.name === '[DEFAULT]';
  } catch (error: any) {
    // If the error is about no app being created, Firebase is not initialized
    // This is expected if Firebase is not configured
    const errorMessage = error?.message || '';
    if (errorMessage.includes('No Firebase App') || 
        errorMessage.includes('has been created')) {
      return false;
    }
    // For other errors, assume not initialized
    return false;
  }
};

/**
 * Initialize Firebase app
 * React Native Firebase auto-initializes from google-services.json on Android
 * and GoogleService-Info.plist on iOS, but we need to ensure it's ready
 */
export const initializeFirebase = async (): Promise<boolean> => {
  // If already initialized, return immediately
  if (isInitialized && isFirebaseInitialized()) {
    return true;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      // React Native Firebase auto-initializes, but it might take a moment
      // Wait a bit and retry a few times to allow auto-initialization to complete
      const maxRetries = 5;
      const retryDelay = 200; // 200ms between retries
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Check if Firebase is already initialized
        if (isFirebaseInitialized()) {
          isInitialized = true;
          if (__DEV__) {
            console.log('[Firebase] Firebase app initialized successfully');
          }
          return true;
        }

        // If not initialized yet and not the last attempt, wait a bit
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      // After retries, check one more time
      if (isFirebaseInitialized()) {
        isInitialized = true;
        if (__DEV__) {
          console.log('[Firebase] Firebase app initialized after retry');
        }
        return true;
      }

      // If still not initialized, Firebase config might be missing or invalid
      // This is not a critical error - the app can still function without Firebase
      // Only log as info (not warning) since this is expected if Firebase isn't configured
      if (__DEV__) {
        console.info(
          '[Firebase] Firebase not configured. Push notifications will not be available. ' +
          'To enable Firebase: 1) Ensure google-services.json is in android/app/, ' +
          '2) Rebuild the app with: cd android && ./gradlew clean && cd .. && npm run android'
        );
      }
      
      return false;
    } catch (error: any) {
      // Catch any errors during initialization check
      // This is expected if Firebase is not configured
      if (__DEV__) {
        const errorMessage = error?.message || 'Unknown error';
        // Only log if it's not the expected "no app" error
        if (!errorMessage.includes('No Firebase App') && !errorMessage.includes('has been created')) {
          console.error('[Firebase] Unexpected error during initialization check:', errorMessage);
        }
      }
      return false;
    } finally {
      // Clear the promise so we can retry if needed
      initializationPromise = null;
    }
  })();

  return initializationPromise;
};

/**
 * Get Firebase messaging instance (only if initialized)
 */
export const getMessaging = () => {
  if (!isFirebaseInitialized()) {
    throw new Error(
      'Firebase is not initialized. Call initializeFirebase() first.'
    );
  }
  return messaging();
};

/**
 * Safely set up background message handler
 * This should be called after Firebase is confirmed initialized
 */
export const setupBackgroundMessageHandler = async (
  handler: (remoteMessage: any) => Promise<void>
): Promise<boolean> => {
  try {
    // Ensure Firebase is initialized first
    const initialized = await initializeFirebase();
    if (!initialized) {
      if (__DEV__) {
        console.warn(
          '[Firebase] Cannot set up background message handler: Firebase not initialized'
        );
      }
      return false;
    }

    // Set up the background message handler
    messaging().setBackgroundMessageHandler(handler);
    
    if (__DEV__) {
      console.log('[Firebase] Background message handler set up successfully');
    }
    
    return true;
  } catch (error: any) {
    if (__DEV__) {
      console.error(
        '[Firebase] Failed to set up background message handler:',
        error.message
      );
    }
    return false;
  }
};

/**
 * Check if Firebase is available and configured
 */
export const isFirebaseAvailable = (): boolean => {
  try {
    return isFirebaseInitialized();
  } catch {
    return false;
  }
};

