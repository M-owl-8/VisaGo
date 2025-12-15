import { z } from 'zod';

export type ValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
};

/**
 * Validate a value against a Zod schema
 */
export function validateField<T>(
  schema: z.ZodSchema<T>,
  value: any
): { isValid: boolean; error?: string } {
  try {
    schema.parse(value);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.errors[0]?.message || 'Validation failed',
      };
    }
    return { isValid: false, error: 'Validation failed' };
  }
}

/**
 * Validate an entire form against a Zod schema
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  values: any
): ValidationResult {
  try {
    schema.parse(values);
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { isValid: false, errors };
    }
    return { isValid: false, errors: { _form: 'Validation failed' } };
  }
}

// Common validation schemas
export const validationSchemas = {
  email: z.string().email('Please enter a valid email address'),
  
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  phone: z
    .string()
    .regex(/^\+?[\d\s-()]+$/, 'Please enter a valid phone number')
    .min(10, 'Phone number must be at least 10 digits'),
  
  required: (fieldName: string) =>
    z.string().min(1, `${fieldName} is required`),
  
  url: z.string().url('Please enter a valid URL'),
  
  date: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Please enter a valid date'),
};

/**
 * Hook for form validation
 */
export function useFormValidation<T extends Record<string, any>>(
  schema: z.ZodSchema<T>,
  initialValues: T
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (name: keyof T, value: any) => {
    try {
      schema.parse({ ...values, [name]: value });
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find((err) => err.path[0] === name);
        if (fieldError) {
          setErrors((prev) => ({
            ...prev,
            [name as string]: fieldError.message,
          }));
        }
      }
      return false;
    }
  };

  const handleChange = (name: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    
    // Validate on change if field has been touched
    if (touched[name as string]) {
      validateField(name, value);
    }
  };

  const handleBlur = (name: keyof T) => {
    setTouched((prev) => ({ ...prev, [name as string]: true }));
    validateField(name, values[name]);
  };

  const handleSubmit = (onValid: (values: T) => void) => {
    const result = validateForm(schema, values);
    
    if (result.isValid) {
      onValid(values);
    } else {
      setErrors(result.errors);
      // Focus first error field
      const firstErrorField = Object.keys(result.errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
      element?.focus();
    }
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setValues,
    isValid: Object.keys(errors).length === 0,
  };
}

