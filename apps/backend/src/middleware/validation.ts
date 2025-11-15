import { body, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to handle validation errors
 * Enhanced with user-friendly error messages
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const { formatValidationErrors } = require('../utils/user-friendly-errors');
    
    const errorDetails = errors.array().map((err: any) => ({
      field: err.path || err.param || 'unknown',
      message: err.msg,
    }));
    
    const formatted = formatValidationErrors(errorDetails);
    
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: formatted.message,
        code: 'VALIDATION_ERROR',
        details: formatted.errors,
      },
    });
  }
  next();
};

/**
 * Validation rules for registration
 */
export const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail()
    .toLowerCase(),
  body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/)
    .withMessage('Password must contain at least one special character (!@#$%^&*)')
    .custom((value) => !/\s/.test(value))
    .withMessage('Password cannot contain spaces'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be 2-50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be 2-50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
];

/**
 * Validation rules for login
 */
export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail()
    .toLowerCase(),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required')
    .trim(),
];

/**
 * Validation rules for email
 */
export const validateEmail = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail()
    .toLowerCase(),
];

/**
 * Validation rules for password change
 */
export const validatePasswordChange = [
  body('currentPassword')
    .isLength({ min: 1 })
    .withMessage('Current password is required')
    .trim(),
  body('newPassword')
    .isLength({ min: 12 })
    .withMessage('New password must be at least 12 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/)
    .withMessage('Password must contain at least one special character (!@#$%^&*)')
    .custom((value) => !/\s/.test(value))
    .withMessage('Password cannot contain spaces'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
];

/**
 * Validation rules for phone number
 */
export const validatePhone = [
  body('phone')
    .isMobilePhone('any')
    .withMessage('Invalid phone number'),
];

/**
 * Validation rules for payment information
 */
export const validatePayment = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('paymentMethod')
    .isIn(['card', 'payme', 'click', 'uzum', 'stripe'])
    .withMessage('Invalid payment method'),
];

/**
 * Validation rules for visa application
 */
export const validateVisaApplication = [
  body('countryId')
    .isUUID()
    .withMessage('Invalid country ID'),
  body('visaTypeId')
    .isUUID()
    .withMessage('Invalid visa type ID'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes cannot exceed 2000 characters'),
];

/**
 * Validation rules for document upload
 */
export const validateDocumentUpload = [
  body('documentType')
    .isIn(['passport', 'visa', 'bank_statement', 'employment_letter', 'invitation', 'other'])
    .withMessage('Invalid document type'),
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date format (ISO 8601)'),
];

/**
 * Validation rules for user profile update
 */
export const validateUserProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be 2-50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be 2-50 characters'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Invalid phone number'),
  body('language')
    .optional()
    .isIn(['en', 'uz', 'ru'])
    .withMessage('Invalid language selection'),
  body('timezone')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Invalid timezone'),
];

/**
 * Validation rules for chat message
 */
export const validateChatMessage = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 4000 })
    .withMessage('Message must be 1-4000 characters'),
  body('sessionId')
    .isUUID()
    .withMessage('Invalid session ID'),
];