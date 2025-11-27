/**
 * API Configuration
 * Reads NEXT_PUBLIC_API_URL from environment variables
 * Supports both local development and production
 */

const getApiBaseUrl = (): string => {
  // Priority 1: Environment variable (set at build time or in .env.local)
  if (typeof window !== 'undefined') {
    // In browser, check Next.js public env vars
    const envUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();
    if (envUrl) {
      console.log('🌐 Using API URL from environment:', envUrl);
      return envUrl;
    }
  }

  // Priority 2: Check if we're in development mode
  const isDevelopment =
    typeof window !== 'undefined'
      ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      : process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    // For local development, backend runs on port 3000, Next.js on 3001
    // Set NEXT_PUBLIC_API_URL in .env.local to override this
    const LOCAL_API_URL = 'http://localhost:3000';
    if (typeof window !== 'undefined') {
      console.warn(
        '⚠️ NEXT_PUBLIC_API_URL not set. Using local backend:',
        LOCAL_API_URL,
        '\n💡 Create .env.local with: NEXT_PUBLIC_API_URL=http://localhost:3000',
        '\n💡 Make sure backend is running on port 3000'
      );
    }
    return LOCAL_API_URL;
  }

  // Priority 3: Fallback to production Railway URL
  const FALLBACK_API_URL = 'https://visago-production.up.railway.app';
  if (typeof window !== 'undefined') {
    console.warn('⚠️ API base URL is not configured. Using production fallback:', FALLBACK_API_URL);
  }
  return FALLBACK_API_URL;
};

export const API_BASE_URL = getApiBaseUrl();

// Log the API URL being used
if (typeof window !== 'undefined') {
  console.log('🔗 API Base URL:', API_BASE_URL);
  console.log('🔗 Full API endpoint will be:', `${API_BASE_URL}/api`);
}
