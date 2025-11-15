/**
 * User-Friendly Error Messages Tests
 */

import {
  getUserFriendlyError,
  enhanceErrorResponse,
  formatValidationErrors,
} from '../../utils/user-friendly-errors';

describe('User-Friendly Error Messages', () => {
  describe('getUserFriendlyError', () => {
    it('should convert duplicate entry error', () => {
      const error = new Error('Unique constraint violation');
      const result = getUserFriendlyError(error, { field: 'email' });
      
      expect(result.message).toContain('already in use');
      expect(result.suggestion).toBeDefined();
      expect(result.field).toBe('email');
    });

    it('should convert connection error', () => {
      const error = new Error('Connection timeout');
      const result = getUserFriendlyError(error);
      
      expect(result.message).toContain('trouble connecting');
      expect(result.suggestion).toBeDefined();
    });

    it('should convert invalid email error', () => {
      const error = new Error('Invalid email');
      const result = getUserFriendlyError(error, { field: 'email' });
      
      expect(result.message).toContain('valid email');
      expect(result.field).toBe('email');
    });

    it('should convert weak password error', () => {
      const error = new Error('Password is too weak');
      const result = getUserFriendlyError(error, { field: 'password' });
      
      expect(result.message).toContain('too weak');
      expect(result.suggestion).toContain('12 characters');
    });

    it('should convert unauthorized error', () => {
      const error = new Error('Unauthorized');
      const result = getUserFriendlyError(error);
      
      expect(result.message).toContain('sign in');
      expect(result.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('should convert not found error', () => {
      const error = new Error('User not found');
      const result = getUserFriendlyError(error, { resource: 'user' });
      
      expect(result.message).toContain("doesn't exist");
      expect(result.suggestion).toBeDefined();
    });

    it('should convert rate limit error', () => {
      const error = new Error('Rate limit exceeded');
      const result = getUserFriendlyError(error);
      
      expect(result.message).toContain('too quickly');
      expect(result.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should convert file size error', () => {
      const error = new Error('File size exceeds limit');
      const result = getUserFriendlyError(error, { field: 'file' });
      
      expect(result.message).toContain('too large');
      expect(result.suggestion).toContain('50MB');
    });

    it('should return generic error for unknown errors', () => {
      const error = new Error('Unknown error type');
      const result = getUserFriendlyError(error);
      
      expect(result.message).toContain('Something went wrong');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('enhanceErrorResponse', () => {
    it('should enhance error with user-friendly message', () => {
      const error = new Error('Connection timeout');
      const result = enhanceErrorResponse(error);
      
      expect(result.message).not.toContain('timeout');
      expect(result.message).toContain('trouble connecting');
      expect(result.suggestion).toBeDefined();
    });

    it('should include original message in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Connection timeout');
      const result = enhanceErrorResponse(error);
      
      expect(result.originalMessage).toBe('Connection timeout');
    });

    it('should include field information', () => {
      const error = new Error('Invalid email');
      const result = enhanceErrorResponse(error, { field: 'email' });
      
      expect(result.field).toBe('email');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format single validation error', () => {
      const errors = [
        { field: 'email', message: 'Invalid email address' },
      ];
      
      const result = formatValidationErrors(errors);
      
      expect(result.message).toContain('valid email');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('email');
    });

    it('should format multiple validation errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Password too weak' },
      ];
      
      const result = formatValidationErrors(errors);
      
      expect(result.message).toContain('2 errors');
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].suggestion).toBeDefined();
    });

    it('should provide suggestions for each error', () => {
      const errors = [
        { field: 'password', message: 'Password must be at least 12 characters' },
      ];
      
      const result = formatValidationErrors(errors);
      
      expect(result.errors[0].suggestion).toBeDefined();
      expect(result.errors[0].suggestion).toContain('12 characters');
    });
  });
});








