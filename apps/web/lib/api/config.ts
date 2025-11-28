/**
 * API Configuration
 * Reads NEXT_PUBLIC_API_URL from environment variables
 * Supports both local development and production
 */

import { logger } from '@/lib/logger';

const getApiBaseUrl = (): string => {
  // Priority 1: Environment variable (set at build time or in .env.local)
  if (typeof window !== 'undefined') {
    // In browser, check Next.js public env vars
    const envUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();
    if (envUrl) {
      logger.debug('Using API URL from environment', { url: envUrl });
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
      logger.warn('NEXT_PUBLIC_API_URL not set, using local backend', {
        url: LOCAL_API_URL,
        hint: 'Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:3000',
      });
    }
    return LOCAL_API_URL;
  }

  // Priority 3: Fallback to production Railway URL
  const FALLBACK_API_URL = 'https://visago-production.up.railway.app';
  if (typeof window !== 'undefined') {
    logger.warn('API base URL not configured, using production fallback', {
      url: FALLBACK_API_URL,
    });
  }
  return FALLBACK_API_URL;
};

export const API_BASE_URL = getApiBaseUrl();

// Log the API URL being used (only once on page load, only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  if (!(window as any).__apiConfigLogged) {
    (window as any).__apiConfigLogged = true;
    console.log('[API Config] Using API base URL:', API_BASE_URL);
    console.log('[API Config] Full API endpoint:', `${API_BASE_URL}/api`);
    console.log('[API Config] NEXT_PUBLIC_API_URL env var:', process.env.NEXT_PUBLIC_API_URL || 'NOT SET');
    
    logger.debug('API configuration', {
      baseUrl: API_BASE_URL,
      endpoint: `${API_BASE_URL}/api`,
      envVar: process.env.NEXT_PUBLIC_API_URL || 'NOT SET',
    });
  }
}
