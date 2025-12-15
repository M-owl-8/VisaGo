import { toast } from '@/lib/stores/toast';

export interface APIError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export class AppError extends Error {
  code?: string;
  status?: number;
  details?: any;

  constructor(message: string, options?: { code?: string; status?: number; details?: any }) {
    super(message);
    this.name = 'AppError';
    this.code = options?.code;
    this.status = options?.status;
    this.details = options?.details;
  }
}

/**
 * Parse API error response into user-friendly message
 */
export function parseAPIError(error: any): APIError {
  // Handle network errors
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return {
      message: 'Network error. Please check your internet connection.',
      code: 'NETWORK_ERROR',
      status: 0,
    };
  }

  // Handle API response errors
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    // Common HTTP status codes
    if (status === 401) {
      return {
        message: 'Your session has expired. Please log in again.',
        code: 'UNAUTHORIZED',
        status: 401,
      };
    }

    if (status === 403) {
      return {
        message: 'You don't have permission to perform this action.',
        code: 'FORBIDDEN',
        status: 403,
      };
    }

    if (status === 404) {
      return {
        message: 'The requested resource was not found.',
        code: 'NOT_FOUND',
        status: 404,
      };
    }

    if (status === 500) {
      return {
        message: 'Server error. Please try again later.',
        code: 'SERVER_ERROR',
        status: 500,
      };
    }

    // Use error message from API if available
    if (data?.error?.message) {
      return {
        message: data.error.message,
        code: data.error.code,
        status,
        details: data.error.details,
      };
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
    };
  }

  return {
    message: 'An unexpected error occurred. Please try again.',
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * Handle API error with toast notification
 */
export function handleAPIError(error: any, options?: { showToast?: boolean; onRetry?: () => void }) {
  const parsedError = parseAPIError(error);

  // Log to console for debugging
  console.error('[API Error]', {
    message: parsedError.message,
    code: parsedError.code,
    status: parsedError.status,
    details: parsedError.details,
    originalError: error,
  });

  // Show toast notification
  if (options?.showToast !== false) {
    toast.error(parsedError.message, {
      action: options?.onRetry
        ? {
            label: 'Retry',
            onClick: options.onRetry,
          }
        : undefined,
    });
  }

  return parsedError;
}

/**
 * Determine if error is transient (network, timeout, 5xx)
 */
export function isTransientError(error: APIError): boolean {
  if (error.code === 'NETWORK_ERROR') return true;
  if (error.code === 'TIMEOUT_ERROR') return true;
  if (error.status && error.status >= 500 && error.status < 600) return true;
  return false;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: any) => boolean;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries || 3;
  const initialDelay = options?.initialDelay || 1000;
  const maxDelay = options?.maxDelay || 10000;
  const shouldRetry = options?.shouldRetry || ((error) => isTransientError(parseAPIError(error)));

  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error)) {
        throw error;
      }

      if (i < maxRetries - 1) {
        const delay = Math.min(initialDelay * Math.pow(2, i), maxDelay);
        console.log(`[Retry] Attempt ${i + 1} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

