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
 * IMPORTANT: Physical devices ALWAYS use Railway URL (or env var)
 * Only emulators/simulators can use localhost/10.0.2.2 (via explicit env var)
 * 
 * Priority:
 * 1. EXPO_PUBLIC_API_URL (if set, use it - even if localhost for emulator dev)
 * 2. REACT_APP_API_URL (if set, use it - even if localhost for emulator dev)
 * 3. Production Railway URL (default - always safe for physical devices)
 */
const getApiBaseUrl = (): string => {
  // Priority 1: Environment variable (set at build time)
  // If explicitly set, use it (even if localhost/10.0.2.2 for emulator development)
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    const envUrl = process.env.EXPO_PUBLIC_API_URL.trim();
    if (envUrl) {
      return envUrl;
    }
  }
  if (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) {
    const envUrl = process.env.REACT_APP_API_URL.trim();
    if (envUrl) {
      return envUrl;
    }
  }

  // Priority 2: Always use Railway URL by default
  // This ensures physical devices NEVER try to connect to localhost/10.0.2.2
  // For emulator development, set EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 explicitly
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
