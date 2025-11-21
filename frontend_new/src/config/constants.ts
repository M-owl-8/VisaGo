/**
 * Application Constants & Configuration
 * Update these values with your actual configuration from Google Cloud Console
 */

import {Platform} from 'react-native';

/**
 * Google OAuth Web Client ID
 * Get this from Google Cloud Console:
 * 1. Go to https://console.cloud.google.com
 * 2. Create a new project or select existing one
 * 3. Enable Google+ API
 * 4. Create OAuth 2.0 credentials (Web application)
 * 5. Copy the Web Client ID (looks like: 123456789-abcdefg.apps.googleusercontent.com)
 *
 * IMPORTANT: Also create OAuth credentials for Android:
 * 1. In OAuth 2.0 credentials, create "Android" credentials
 * 2. Use package name: com.visabuddy.app
 * 3. Get SHA-1 fingerprint of your signing key
 */
/**
 * Google OAuth Web Client ID
 * Get from: https://console.cloud.google.com/apis/credentials
 *
 * In Expo, use EXPO_PUBLIC_ prefix for environment variables
 */
const getGoogleClientId = (): string => {
  // Expo environment variables (available at build time)
  if (
    typeof process !== 'undefined' &&
    process.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  ) {
    return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  }
  // Fallback for other environments
  if (typeof process !== 'undefined' && process.env?.GOOGLE_WEB_CLIENT_ID) {
    return process.env.GOOGLE_WEB_CLIENT_ID;
  }
  // Default placeholder
  return 'YOUR_GOOGLE_WEB_CLIENT_ID_HERE';
};

export const GOOGLE_WEB_CLIENT_ID = getGoogleClientId();

/**
 * Backend API Configuration
 * Priority:
 * 1. EXPO_PUBLIC_API_URL (for Expo) - must not contain localhost/10.0.2.2
 * 2. REACT_APP_API_URL (fallback) - must not contain localhost/10.0.2.2
 * 3. Production Railway URL (default) - always used on physical devices
 * 4. Localhost/emulator addresses - ONLY when actually in emulator/simulator
 */
const getApiBaseUrl = (): string => {
  // Priority 1: Environment variable (set at build time)
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    const envUrl = process.env.EXPO_PUBLIC_API_URL.trim();
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('10.0.2.2')) {
      return envUrl;
    }
  }
  if (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) {
    const envUrl = process.env.REACT_APP_API_URL.trim();
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('10.0.2.2')) {
      return envUrl;
    }
  }

  // Priority 2: Only use localhost/emulator addresses in development AND when actually in emulator/simulator
  // For physical devices, always use production URL
  // Note: __DEV__ can be true on physical devices too, so we check for emulator/simulator specifically
  const isEmulator = __DEV__ && (
    Platform.OS === 'android' && Platform.isTV === false // Android emulator (not TV)
  ) || (
    Platform.OS === 'ios' && Platform.isPad === false && Platform.isTV === false // iOS simulator
  );

  if (isEmulator) {
    // Only use localhost/emulator addresses when actually running in emulator/simulator
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000'; // Android emulator only
    }
    return 'http://localhost:3000'; // iOS simulator only
  }

  // Priority 3: Production Railway URL (always used on physical devices and production builds)
  return 'https://zippy-perfection-production.up.railway.app';
};

export const API_BASE_URL = getApiBaseUrl();

const getSentryDsn = (): string | undefined => {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SENTRY_DSN) {
    return process.env.EXPO_PUBLIC_SENTRY_DSN;
  }
  if (typeof process !== 'undefined' && process.env?.SENTRY_DSN) {
    return process.env.SENTRY_DSN;
  }
  return undefined;
};

export const SENTRY_DSN = getSentryDsn();

/**
 * App Version
 */
export const APP_VERSION = '1.0.0';

/**
 * Feature Flags
 */
export const FEATURES = {
  GOOGLE_OAUTH: true,
  FACEBOOK_OAUTH: false,
  APPLE_SIGNIN: false,
};
