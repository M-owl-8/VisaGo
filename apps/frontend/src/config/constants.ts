/**
 * Application Constants & Configuration
 * Update these values with your actual configuration from Google Cloud Console
 */

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
export const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID || 'YOUR_GOOGLE_WEB_CLIENT_ID_HERE';

/**
 * Backend API Configuration
 */
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

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