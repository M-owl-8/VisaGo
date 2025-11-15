/**
 * User-Friendly Error Messages
 * Provides helpful, actionable error messages for end users
 */

export interface UserFriendlyError {
  message: string;
  suggestion?: string;
  code: string;
  field?: string;
}

/**
 * Convert technical error messages to user-friendly ones
 */
export function getUserFriendlyError(
  error: Error | string,
  context?: {
    field?: string;
    operation?: string;
    resource?: string;
  }
): UserFriendlyError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  // Database errors
  if (lowerMessage.includes('unique constraint') || lowerMessage.includes('duplicate')) {
    return {
      message: context?.field
        ? `This ${context.field} is already in use. Please choose a different one.`
        : 'This information already exists. Please use different details.',
      suggestion: 'Try using a different value or check if you already have an account.',
      code: 'DUPLICATE_ENTRY',
      field: context?.field,
    };
  }

  if (lowerMessage.includes('foreign key') || lowerMessage.includes('constraint')) {
    return {
      message: 'This operation cannot be completed because it references data that no longer exists.',
      suggestion: 'Please refresh the page and try again.',
      code: 'REFERENCE_ERROR',
    };
  }

  if (lowerMessage.includes('connection') || lowerMessage.includes('timeout') || lowerMessage.includes('econnrefused')) {
    return {
      message: 'We are having trouble connecting to our servers. Please try again in a moment.',
      suggestion: 'Check your internet connection and try again. If the problem persists, please contact support.',
      code: 'CONNECTION_ERROR',
    };
  }

  // Validation errors
  if (lowerMessage.includes('required') || lowerMessage.includes('missing')) {
    return {
      message: context?.field
        ? `Please provide ${context.field}.`
        : 'Some required information is missing.',
      suggestion: 'Please fill in all required fields and try again.',
      code: 'MISSING_REQUIRED',
      field: context?.field,
    };
  }

  if (lowerMessage.includes('invalid') && lowerMessage.includes('email')) {
    return {
      message: 'Please enter a valid email address.',
      suggestion: 'Make sure your email address includes @ and a domain (e.g., example@email.com).',
      code: 'INVALID_EMAIL',
      field: 'email',
    };
  }

  if (lowerMessage.includes('invalid') && lowerMessage.includes('password')) {
    return {
      message: 'Password does not meet requirements.',
      suggestion: 'Password must be at least 12 characters and include uppercase, lowercase, number, and special character.',
      code: 'INVALID_PASSWORD',
      field: 'password',
    };
  }

  if (lowerMessage.includes('password') && (lowerMessage.includes('weak') || lowerMessage.includes('short'))) {
    return {
      message: 'Password is too weak.',
      suggestion: 'Use a stronger password with at least 12 characters, including uppercase, lowercase, numbers, and special characters.',
      code: 'WEAK_PASSWORD',
      field: 'password',
    };
  }

  // Authentication errors
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication')) {
    return {
      message: 'You need to sign in to access this.',
      suggestion: 'Please sign in and try again.',
      code: 'AUTHENTICATION_REQUIRED',
    };
  }

  if (lowerMessage.includes('forbidden') || lowerMessage.includes('permission')) {
    return {
      message: "You don't have permission to perform this action.",
      suggestion: 'If you believe this is an error, please contact support.',
      code: 'PERMISSION_DENIED',
    };
  }

  if (lowerMessage.includes('token') && (lowerMessage.includes('expired') || lowerMessage.includes('invalid'))) {
    return {
      message: 'Your session has expired. Please sign in again.',
      suggestion: 'Please sign out and sign back in.',
      code: 'SESSION_EXPIRED',
    };
  }

  // Not found errors
  if (lowerMessage.includes('not found')) {
    return {
      message: context?.resource
        ? `The ${context.resource} you're looking for doesn't exist.`
        : "We couldn't find what you're looking for.",
      suggestion: 'Please check the information and try again, or go back to the previous page.',
      code: 'NOT_FOUND',
    };
  }

  // Rate limiting
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return {
      message: 'You are making requests too quickly. Please slow down.',
      suggestion: 'Please wait a moment before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
    };
  }

  // File upload errors
  if (lowerMessage.includes('file') && lowerMessage.includes('size')) {
    return {
      message: 'The file is too large.',
      suggestion: 'Please upload a file smaller than 50MB.',
      code: 'FILE_TOO_LARGE',
      field: 'file',
    };
  }

  if (lowerMessage.includes('file') && lowerMessage.includes('format') || lowerMessage.includes('type')) {
    return {
      message: 'This file format is not supported.',
      suggestion: 'Please upload a PDF, JPG, PNG, DOC, or DOCX file.',
      code: 'INVALID_FILE_TYPE',
      field: 'file',
    };
  }

  // Payment errors
  if (lowerMessage.includes('payment') && lowerMessage.includes('failed')) {
    return {
      message: 'Payment could not be processed.',
      suggestion: 'Please check your payment method and try again, or try a different payment method.',
      code: 'PAYMENT_FAILED',
    };
  }

  if (lowerMessage.includes('payment') && lowerMessage.includes('declined')) {
    return {
      message: 'Your payment was declined.',
      suggestion: 'Please check your card details or contact your bank. You can also try a different payment method.',
      code: 'PAYMENT_DECLINED',
    };
  }

  // Service unavailable
  if (lowerMessage.includes('service unavailable') || lowerMessage.includes('temporarily unavailable')) {
    return {
      message: 'This service is temporarily unavailable.',
      suggestion: 'Please try again in a few moments. If the problem persists, please contact support.',
      code: 'SERVICE_UNAVAILABLE',
    };
  }

  // Generic fallback
  return {
    message: 'Something went wrong. Please try again.',
    suggestion: 'If the problem continues, please contact support with details about what you were trying to do.',
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * Enhance error response with user-friendly message and suggestion
 */
export function enhanceErrorResponse(error: any, context?: {
  field?: string;
  operation?: string;
  resource?: string;
}): {
  message: string;
  suggestion?: string;
  code: string;
  field?: string;
  originalMessage?: string;
} {
  const friendly = getUserFriendlyError(
    error instanceof Error ? error : new Error(String(error)),
    context
  );

  return {
    ...friendly,
    // Include original message in development for debugging
    ...(process.env.NODE_ENV === 'development' && {
      originalMessage: error instanceof Error ? error.message : String(error),
    }),
  };
}

/**
 * Format validation errors for multiple fields
 */
export function formatValidationErrors(
  errors: Array<{ field: string; message: string }>
): {
  message: string;
  errors: Array<{ field: string; message: string; suggestion?: string }>;
} {
  const friendlyErrors = errors.map((err) => {
    const friendly = getUserFriendlyError(err.message, { field: err.field });
    return {
      field: err.field,
      message: friendly.message,
      suggestion: friendly.suggestion,
    };
  });

  const message =
    friendlyErrors.length === 1
      ? friendlyErrors[0].message
      : `Please fix ${friendlyErrors.length} errors in the form.`;

  return {
    message,
    errors: friendlyErrors,
  };
}








