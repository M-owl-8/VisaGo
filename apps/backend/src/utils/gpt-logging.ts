/**
 * Structured Logging Utility for GPT Interactions
 *
 * Provides consistent, searchable logging for checklist generation and document verification.
 * All logs include applicationId for easy aggregation and searching.
 */

import { logInfo, logWarn, logError } from '../middleware/logger';

export interface ChecklistGenerationLog {
  applicationId: string;
  country: string;
  countryCode: string;
  visaType: string;
  mode: 'rules' | 'legacy' | 'fallback';
  jsonValidationPassed: boolean;
  jsonValidationRetries: number;
  itemCount: number;
  conditionWarnings?: string[];
  ruleEvaluationWarnings?: string[];
  tokensUsed?: number;
  responseTimeMs?: number;
  error?: string;
}

export interface DocumentVerificationLog {
  applicationId: string;
  documentId?: string;
  documentType: string;
  country: string;
  countryCode: string;
  visaType: string;
  status: 'APPROVED' | 'NEED_FIX' | 'REJECTED';
  embassyRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  jsonValidationPassed: boolean;
  jsonValidationRetries: number;
  tokensUsed?: number;
  responseTimeMs?: number;
  error?: string;
}

/**
 * Log checklist generation with structured data
 */
export function logChecklistGeneration(data: ChecklistGenerationLog): void {
  const {
    applicationId,
    country,
    countryCode,
    visaType,
    mode,
    jsonValidationPassed,
    jsonValidationRetries,
    itemCount,
    conditionWarnings,
    ruleEvaluationWarnings,
    tokensUsed,
    responseTimeMs,
    error,
  } = data;

  const logData = {
    applicationId,
    country,
    countryCode,
    visaType,
    mode,
    jsonValidation: {
      passed: jsonValidationPassed,
      retries: jsonValidationRetries,
    },
    itemCount,
    ...(conditionWarnings && conditionWarnings.length > 0 && { conditionWarnings }),
    ...(ruleEvaluationWarnings && ruleEvaluationWarnings.length > 0 && { ruleEvaluationWarnings }),
    ...(tokensUsed && { tokensUsed }),
    ...(responseTimeMs && { responseTimeMs }),
    ...(error && { error }),
  };

  if (error) {
    logError('[GPT][Checklist] Generation failed', new Error(error), logData);
  } else if (jsonValidationRetries > 0) {
    logWarn('[GPT][Checklist] Generation completed with retries', logData);
  } else {
    logInfo('[GPT][Checklist] Generation completed', logData);
  }
}

/**
 * Log document verification with structured data
 */
export function logDocumentVerification(data: DocumentVerificationLog): void {
  const {
    applicationId,
    documentId,
    documentType,
    country,
    countryCode,
    visaType,
    status,
    embassyRiskLevel,
    jsonValidationPassed,
    jsonValidationRetries,
    tokensUsed,
    responseTimeMs,
    error,
  } = data;

  const logData = {
    applicationId,
    ...(documentId && { documentId }),
    documentType,
    country,
    countryCode,
    visaType,
    status,
    embassyRiskLevel,
    jsonValidation: {
      passed: jsonValidationPassed,
      retries: jsonValidationRetries,
    },
    ...(tokensUsed && { tokensUsed }),
    ...(responseTimeMs && { responseTimeMs }),
    ...(error && { error }),
  };

  if (error) {
    logError('[GPT][DocVerification] Verification failed', new Error(error), logData);
  } else if (jsonValidationRetries > 0) {
    logWarn('[GPT][DocVerification] Verification completed with retries', logData);
  } else {
    logInfo('[GPT][DocVerification] Verification completed', logData);
  }
}

/**
 * Helper to extract applicationId from context
 */
export function extractApplicationId(context: any): string {
  return context?.application?.applicationId || context?.application?.id || 'unknown';
}
