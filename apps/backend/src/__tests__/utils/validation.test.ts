/**
 * Unit tests for validation utilities
 */

import {
  validatePassword,
  isValidEmail,
  validateAndNormalizeEmail,
  isValidUUID,
  isValidURL,
  sanitizeString,
  validatePagination,
} from '../../utils/validation';
import { errors } from '../../utils/errors';

describe('Validation Utilities', () => {
  describe('validatePassword', () => {
    it('should validate a strong password', () => {
      const result = validatePassword('SecureP@ssw0rd123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const result = validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters');
    });

    it('should reject password without uppercase', () => {
      const result = validatePassword('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = validatePassword('UPPERCASE123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePassword('NoNumbers!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = validatePassword('NoSpecial123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should return multiple errors for invalid password', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@example.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@example')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('validateAndNormalizeEmail', () => {
    it('should normalize and return valid email', () => {
      const result = validateAndNormalizeEmail('  User@Example.COM  ');
      expect(result).toBe('user@example.com');
    });

    it('should throw error for invalid email', () => {
      expect(() => validateAndNormalizeEmail('invalid')).toThrow();
    });

    it('should throw error for empty email', () => {
      expect(() => validateAndNormalizeEmail('')).toThrow();
    });
  });

  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('00000000-0000-0000-0000-000000000000')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('isValidURL', () => {
    it('should validate correct URLs', () => {
      expect(isValidURL('https://example.com')).toBe(true);
      expect(isValidURL('http://example.com/path')).toBe(true);
      expect(isValidURL('https://example.com:8080/path?query=value')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidURL('not-a-url')).toBe(false);
      expect(isValidURL('example.com')).toBe(false);
      expect(isValidURL('')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeString("<script>alert('xss')</script>")).not.toContain('<script>');
      expect(sanitizeString("javascript:alert('xss')")).not.toContain('javascript:');
      expect(sanitizeString("onclick=alert('xss')")).not.toContain('onclick=');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test');
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(123 as any)).toBe('');
    });
  });

  describe('validatePagination', () => {
    it('should return default values for missing params', () => {
      const result = validatePagination(undefined, undefined);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should normalize valid pagination params', () => {
      const result = validatePagination(2, 20);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it('should handle string numbers', () => {
      const result = validatePagination('3', '15');
      expect(result.page).toBe(3);
      expect(result.limit).toBe(15);
    });

    it('should enforce minimum values', () => {
      const result = validatePagination(0, -5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
    });

    it('should enforce maximum limit', () => {
      const result = validatePagination(1, 200, 100);
      expect(result.limit).toBe(100);
    });

    it('should handle invalid string values', () => {
      const result = validatePagination('invalid', 'also-invalid');
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });
});
