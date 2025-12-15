/**
 * API Configuration
 * Reads NEXT_PUBLIC_API_URL from environment variables
 * Supports both local development and production
 * 
 * IMPORTANT: This is lazy-loaded to prevent SSR access to window.location
 */

import { logger } from '@/lib/logger';

let cachedApiBaseUrl: string | null = null;

const getApiBaseUrl = (): string => {
  // Return cached value if available
  if (cachedApiBaseUrl !== null) {
    return cachedApiBaseUrl;
  }

  // Priority 1: Environment variable (set at build time or in .env.local)
  if (typeof window !== 'undefined') {
    // In browser, check Next.js public env vars
    const envUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();
    if (envUrl) {
      logger.debug('Using API URL from environment', { url: envUrl });
      cachedApiBaseUrl = envUrl;
      return envUrl;
    }
  }

  // Priority 2: Check if we're in development mode
  let isDevelopment = false;
  try {
    isDevelopment =
      typeof window !== 'undefined'
        ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        : process.env.NODE_ENV === 'development';
  } catch (error) {
    // If window.location access fails, fall back to NODE_ENV
    console.warn('[API Config] Could not access window.location, using NODE_ENV:', error);
    isDevelopment = process.env.NODE_ENV === 'development';
  }

  if (isDevelopment) {
    // For local development, backend runs on port 3000, Next.js on 3001
    // Set NEXT_PUBLIC_API_URL in .env.local to override this
    const LOCAL_API_URL = 'http://localhost:3000';
    if (typeof window !== 'undefined') {
      logger.warn('NEXT_PUBLIC_API_URL not set, using local backend', {
        url: LOCAL_API_URL,
        hint: 'Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:3000',
      });
    }
    cachedApiBaseUrl = LOCAL_API_URL;
    return LOCAL_API_URL;
  }

  // Priority 3: Fallback to production Railway URL
  const FALLBACK_API_URL = 'https://visago-production.up.railway.app';
  if (typeof window !== 'undefined') {
    logger.warn('API base URL not configured, using production fallback', {
      url: FALLBACK_API_URL,
      envVar: process.env.NEXT_PUBLIC_API_URL || 'NOT SET',
    });
    console.warn('[API Config] Using fallback URL:', FALLBACK_API_URL);
    console.warn('[API Config] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL || 'NOT SET');
  }
  cachedApiBaseUrl = FALLBACK_API_URL;
  return FALLBACK_API_URL;
};

// Lazy getter - only evaluates when accessed, not at module load time
export const getAPI_BASE_URL = (): string => {
  return getApiBaseUrl();
};

// For backward compatibility - use getter function to prevent SSR evaluation
// This will be evaluated lazily when actually needed (in browser)
export const API_BASE_URL = (() => {
  // During SSR, return a safe default without accessing window
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'https://visago-production.up.railway.app';
  }
  // In browser, evaluate lazily
  return getApiBaseUrl();
})();

// Log the API URL being used (only once on page load, only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  if (!(window as any).__apiConfigLogged) {
    (window as any).__apiConfigLogged = true;
    const url = getApiBaseUrl();
    console.log('[API Config] Using API base URL:', url);
    console.log('[API Config] Full API endpoint:', `${url}/api`);
    console.log('[API Config] NEXT_PUBLIC_API_URL env var:', process.env.NEXT_PUBLIC_API_URL || 'NOT SET');
    
    logger.debug('API configuration', {
      baseUrl: url,
      endpoint: `${url}/api`,
      envVar: process.env.NEXT_PUBLIC_API_URL || 'NOT SET',
    });
  }
}
