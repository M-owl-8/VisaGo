// Form validation utilities for enhanced UX

export interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
}

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const passwordMinLength = 8;

export const validationRules = {
  email: {
    test: (value: string) => emailRegex.test(value),
    message: 'Please enter a valid email address',
  },
  required: {
    test: (value: string) => value.trim().length > 0,
    message: 'This field is required',
  },
  minLength: (min: number): ValidationRule => ({
    test: (value: string) => value.length >= min,
    message: `Must be at least ${min} characters`,
  }),
  password: {
    test: (value: string) => {
      return (
        value.length >= passwordMinLength &&
        /[A-Z]/.test(value) &&
        /[a-z]/.test(value) &&
        /[0-9]/.test(value)
      );
    },
    message: `Password must be at least ${passwordMinLength} characters and include uppercase, lowercase, and numbers`,
  },
};

export function validateField(value: string, rules: ValidationRule[]): string | null {
  for (const rule of rules) {
    if (!rule.test(value)) {
      return rule.message;
    }
  }
  return null;
}




