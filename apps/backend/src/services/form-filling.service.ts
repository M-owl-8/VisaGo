/**
 * Form Filling Service
 * AI-powered form pre-filling for visa applications
 */

import { PrismaClient } from '@prisma/client';
import { getEnvConfig } from '../config/env';
import { errors } from '../utils/errors';
import { logError, logInfo } from '../middleware/logger';
import AIOpenAIService from './ai-openai.service';

const prisma = new PrismaClient();

/**
 * Form field interface
 */
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'date' | 'number' | 'select' | 'textarea';
  value?: string | number | null;
  required: boolean;
  options?: string[];
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

/**
 * Form template interface
 */
export interface FormTemplate {
  id: string;
  countryId: string;
  visaTypeId: string;
  title: string;
  fields: FormField[];
  instructions?: string;
}

/**
 * Pre-filled form data
 */
export interface PreFilledForm {
  template: FormTemplate;
  preFilledData: Record<string, any>;
  confidence: number; // 0-1, how confident we are in the pre-filled data
  missingFields: string[];
  suggestions: Record<string, string>; // Field suggestions
}

/**
 * Form Filling Service
 * Handles AI-powered form pre-filling
 */
export class FormFillingService {
  /**
   * Get form template for a visa type
   *
   * @param countryId - Country ID
   * @param visaTypeId - Visa type ID
   * @returns Form template
   */
  static async getFormTemplate(countryId: string, visaTypeId: string): Promise<FormTemplate> {
    const country = await prisma.country.findUnique({
      where: { id: countryId },
    });

    const visaType = await prisma.visaType.findUnique({
      where: { id: visaTypeId },
      include: { country: true },
    });

    if (!country || !visaType) {
      throw errors.notFound('Country or Visa Type');
    }

    // Generate form template based on visa type and country
    const fields = this.generateFormFields(country, visaType);

    return {
      id: `form-${countryId}-${visaTypeId}`,
      countryId,
      visaTypeId,
      title: `${visaType.name} Application Form - ${country.name}`,
      fields,
      instructions: `Please fill out this form for ${visaType.name} to ${country.name}. All fields marked with * are required.`,
    };
  }

  /**
   * Pre-fill form with user data using AI
   *
   * @param userId - User ID
   * @param countryId - Country ID
   * @param visaTypeId - Visa type ID
   * @returns Pre-filled form data
   */
  static async preFillForm(
    userId: string,
    countryId: string,
    visaTypeId: string
  ): Promise<PreFilledForm> {
    try {
      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          preferences: true,
        },
      });

      if (!user) {
        throw errors.notFound('User');
      }

      // Get form template
      const template = await this.getFormTemplate(countryId, visaTypeId);

      // Get country and visa type info
      const country = await prisma.country.findUnique({
        where: { id: countryId },
      });

      const visaType = await prisma.visaType.findUnique({
        where: { id: visaTypeId },
        include: { country: true },
      });

      if (!country || !visaType) {
        throw errors.notFound('Country or Visa Type');
      }

      // Pre-fill with user data
      const preFilledData: Record<string, any> = {};
      const suggestions: Record<string, string> = {};
      const missingFields: string[] = [];

      for (const field of template.fields) {
        const value = this.extractFieldValue(field, user);

        if (value !== null && value !== undefined) {
          preFilledData[field.name] = value;
        } else if (field.required) {
          missingFields.push(field.name);
          // Generate AI suggestion for missing required fields
          const suggestion = await this.generateFieldSuggestion(field, user, country, visaType);
          if (suggestion) {
            suggestions[field.name] = suggestion;
          }
        }
      }

      // Calculate confidence based on how many fields were filled
      const totalFields = template.fields.length;
      const filledFields = Object.keys(preFilledData).length;
      const confidence = totalFields > 0 ? filledFields / totalFields : 0;

      logInfo('Form pre-filled successfully', {
        userId,
        countryId,
        visaTypeId,
        filledFields,
        totalFields,
        confidence,
      });

      return {
        template,
        preFilledData,
        confidence,
        missingFields,
        suggestions,
      };
    } catch (error) {
      logError('Error pre-filling form', error as Error, {
        userId,
        countryId,
        visaTypeId,
      });
      throw error;
    }
  }

  /**
   * Generate form fields based on country and visa type
   */
  private static generateFormFields(country: any, visaType: any): FormField[] {
    const baseFields: FormField[] = [
      {
        name: 'firstName',
        label: 'First Name',
        type: 'text',
        required: true,
        placeholder: 'Enter your first name',
      },
      {
        name: 'lastName',
        label: 'Last Name',
        type: 'text',
        required: true,
        placeholder: 'Enter your last name',
      },
      {
        name: 'email',
        label: 'Email Address',
        type: 'email',
        required: true,
        placeholder: 'your.email@example.com',
      },
      {
        name: 'phone',
        label: 'Phone Number',
        type: 'text',
        required: true,
        placeholder: '+1 234 567 8900',
      },
      {
        name: 'dateOfBirth',
        label: 'Date of Birth',
        type: 'date',
        required: true,
      },
      {
        name: 'nationality',
        label: 'Nationality',
        type: 'select',
        required: true,
        placeholder: 'Select your nationality',
      },
      {
        name: 'passportNumber',
        label: 'Passport Number',
        type: 'text',
        required: true,
        placeholder: 'Enter passport number',
      },
      {
        name: 'passportIssueDate',
        label: 'Passport Issue Date',
        type: 'date',
        required: true,
      },
      {
        name: 'passportExpiryDate',
        label: 'Passport Expiry Date',
        type: 'date',
        required: true,
      },
      {
        name: 'purposeOfVisit',
        label: 'Purpose of Visit',
        type: 'textarea',
        required: true,
        placeholder: 'Describe the purpose of your visit',
      },
      {
        name: 'intendedArrivalDate',
        label: 'Intended Arrival Date',
        type: 'date',
        required: true,
      },
      {
        name: 'intendedDepartureDate',
        label: 'Intended Departure Date',
        type: 'date',
        required: true,
      },
      {
        name: 'addressInDestination',
        label: 'Address in Destination Country',
        type: 'textarea',
        required: false,
        placeholder: 'Enter your address in the destination country',
      },
    ];

    // Add visa-type specific fields
    if (visaType.name.toLowerCase().includes('work')) {
      baseFields.push({
        name: 'employerName',
        label: 'Employer Name',
        type: 'text',
        required: true,
        placeholder: 'Enter employer name',
      });
      baseFields.push({
        name: 'jobTitle',
        label: 'Job Title',
        type: 'text',
        required: true,
        placeholder: 'Enter job title',
      });
    }

    if (visaType.name.toLowerCase().includes('student')) {
      baseFields.push({
        name: 'schoolName',
        label: 'School/University Name',
        type: 'text',
        required: true,
        placeholder: 'Enter school name',
      });
      baseFields.push({
        name: 'courseOfStudy',
        label: 'Course of Study',
        type: 'text',
        required: true,
        placeholder: 'Enter course name',
      });
    }

    return baseFields;
  }

  /**
   * Extract field value from user data
   */
  private static extractFieldValue(field: FormField, user: any): any {
    switch (field.name) {
      case 'firstName':
        return user.firstName || null;
      case 'lastName':
        return user.lastName || null;
      case 'email':
        return user.email || null;
      case 'phone':
        return user.phone || null;
      case 'nationality':
        // TODO: Add nationality to User model
        return null;
      default:
        return null;
    }
  }

  /**
   * Generate AI suggestion for a missing field
   */
  private static async generateFieldSuggestion(
    field: FormField,
    user: any,
    country: any,
    visaType: any
  ): Promise<string | null> {
    try {
      const envConfig = getEnvConfig();
      if (!envConfig.OPENAI_API_KEY) {
        return null;
      }

      const prompt = `You are helping a user fill out a visa application form for ${visaType.name} to ${country.name}.

User information:
- Name: ${user.firstName || ''} ${user.lastName || ''}
- Email: ${user.email}

Field that needs to be filled:
- Label: ${field.label}
- Type: ${field.type}
${field.placeholder ? `- Placeholder: ${field.placeholder}` : ''}

Provide a helpful suggestion or example for this field. Keep it brief (1-2 sentences).`;

      const response = await AIOpenAIService.chat(
        [{ role: 'user', content: prompt }],
        'You are a helpful visa application assistant.'
      );

      return response.message || null;
    } catch (error) {
      logError('Error generating field suggestion', error as Error);
      return null;
    }
  }

  /**
   * Validate form data
   *
   * @param template - Form template
   * @param data - Form data to validate
   * @returns Validation result
   */
  static validateFormData(
    template: FormTemplate,
    data: Record<string, any>
  ): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    for (const field of template.fields) {
      const value = data[field.name];

      // Check required fields
      if (field.required && (value === null || value === undefined || value === '')) {
        errors[field.name] = `${field.label} is required`;
        continue;
      }

      // Type validation
      if (value !== null && value !== undefined && value !== '') {
        switch (field.type) {
          case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              errors[field.name] = 'Invalid email format';
            }
            break;

          case 'date':
            if (isNaN(Date.parse(value))) {
              errors[field.name] = 'Invalid date format';
            }
            break;

          case 'number':
            if (isNaN(Number(value))) {
              errors[field.name] = 'Must be a number';
            } else {
              if (field.validation?.min && Number(value) < field.validation.min) {
                errors[field.name] = `Must be at least ${field.validation.min}`;
              }
              if (field.validation?.max && Number(value) > field.validation.max) {
                errors[field.name] = `Must be at most ${field.validation.max}`;
              }
            }
            break;
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Save form data to application
   *
   * @param applicationId - Application ID
   * @param formData - Form data
   */
  static async saveFormData(applicationId: string, formData: Record<string, any>): Promise<void> {
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw errors.notFound('Application');
    }

    // Store form data in notes or create a separate form data field
    // For now, we'll store it as JSON in notes
    const existingNotes = application.notes ? JSON.parse(application.notes) : {};
    const updatedNotes = {
      ...existingNotes,
      formData,
      formFilledAt: new Date().toISOString(),
    };

    await prisma.visaApplication.update({
      where: { id: applicationId },
      data: {
        notes: JSON.stringify(updatedNotes),
        progressPercentage: 50, // Form filled = 50% progress
      },
    });
  }
}
