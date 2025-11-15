/**
 * Application Constants & Configuration
 * Update these values with your actual configuration from Google Cloud Console
 */

import { Platform } from 'react-native';

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
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
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
 * 1. EXPO_PUBLIC_API_URL (for Expo)
 * 2. REACT_APP_API_URL (fallback)
 * 3. API_BASE_URL (fallback)
 * 4. Production Railway URL (default)
 * 5. Localhost (development fallback)
 */
const getApiBaseUrl = (): string => {
  // Check if process is available (not available in some Expo contexts)
  if (typeof process === 'undefined') {
    // In emulator, use 10.0.2.2 instead of localhost
    // Check if we're on Android (emulator uses 10.0.2.2 for localhost)
    if (typeof Platform !== 'undefined' && Platform.OS === 'android') {
      return __DEV__ ? 'http://10.0.2.2:3000' : 'https://visabuddy-backend-production.up.railway.app';
    }
    // Fallback to localhost in development
    return __DEV__ ? 'http://localhost:3000' : 'https://visabuddy-backend-production.up.railway.app';
  }

  // Expo environment variables (available at build time)
  if (process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (process.env?.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  if (process.env?.API_BASE_URL && process.env.API_BASE_URL !== 'http://localhost:3000') {
    return process.env.API_BASE_URL;
  }
  // Production default (Railway)
  if (process.env?.NODE_ENV === 'production') {
    return 'https://visabuddy-backend-production.up.railway.app';
  }
  // Development fallback - use 10.0.2.2 for Android emulator
  // Note: For emulator, set EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
  return 'http://localhost:3000';
};

export const API_BASE_URL = getApiBaseUrl();

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