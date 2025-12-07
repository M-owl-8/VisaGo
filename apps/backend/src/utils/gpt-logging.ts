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
  mode: 'rules' | 'rules_base_fallback' | 'legacy' | 'fallback';
  jsonValidationPassed: boolean;
  jsonValidationRetries: number;
  itemCount: number;
  conditionWarnings?: string[];
  ruleEvaluationWarnings?: string[];
  tokensUsed?: number;
  responseTimeMs?: number;
  error?: string;
  fallbackReason?: string;
  // Phase 2: Risk drivers and risk level
  riskDrivers?: string[];
  riskLevel?: 'low' | 'medium' | 'high';
  // Phase 3: Embassy rules and playbook metadata
  hasVisaRuleSet?: boolean;
  hasEmbassyContent?: boolean;
  hasCountryPlaybook?: boolean;
  rulesConfidence?: number | null;
  playbookCountryCode?: string;
  playbookVisaCategory?: string;
  // Phase 8: Country consistency fields
  countryCodeCanonical?: string;
  countryNameCanonical?: string;
  countryConsistencyStatus?: 'consistent' | 'corrected' | 'mismatch_detected';
}

export interface DocumentVerificationLog {
  applicationId: string;
  documentId?: string;
  documentType: string;
  canonicalDocumentType?: string; // Phase 5: Normalized document type
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
  // Phase 5: Enhanced logging fields
  aiDecision?: 'APPROVED' | 'NEED_FIX' | 'REJECTED'; // AI decision (same as status, kept for clarity)
  aiConfidence?: number; // AI confidence score (0.0-1.0)
  riskDrivers?: string[]; // Risk drivers from context
  hasVisaRuleSet?: boolean; // Whether official rules were used
  hasEmbassyContent?: boolean; // Whether embassy content was available
  hasCountryPlaybook?: boolean; // Whether country playbook was used
  rulesConfidence?: number | null; // Confidence of rules extraction
  playbookCountryCode?: string; // Playbook country code
  playbookVisaCategory?: 'tourist' | 'student'; // Playbook visa category
  violatesRiskAlignment?: boolean; // Quick check if decision aligns with risk profile
  // Phase 8: Country consistency fields
  countryCodeCanonical?: string;
  countryNameCanonical?: string;
  countryConsistencyStatus?: 'consistent' | 'corrected' | 'mismatch_detected';
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
    // Phase 8: Country consistency fields
    ...(data.countryCodeCanonical && { countryCodeCanonical: data.countryCodeCanonical }),
    ...(data.countryNameCanonical && { countryNameCanonical: data.countryNameCanonical }),
    ...(data.countryConsistencyStatus && {
      countryConsistencyStatus: data.countryConsistencyStatus,
    }),
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
    canonicalDocumentType,
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
    // Phase 5 fields
    aiDecision,
    aiConfidence,
    riskDrivers,
    hasVisaRuleSet,
    hasEmbassyContent,
    hasCountryPlaybook,
    rulesConfidence,
    playbookCountryCode,
    playbookVisaCategory,
    violatesRiskAlignment,
  } = data;

  const logData = {
    applicationId,
    ...(documentId && { documentId }),
    documentType,
    ...(canonicalDocumentType && { canonicalDocumentType }),
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
    // Phase 5: Enhanced metadata
    ...(aiDecision && { aiDecision }),
    ...(aiConfidence !== undefined && { aiConfidence }),
    ...(riskDrivers && riskDrivers.length > 0 && { riskDrivers }),
    ...(hasVisaRuleSet !== undefined && { hasVisaRuleSet }),
    ...(hasEmbassyContent !== undefined && { hasEmbassyContent }),
    ...(hasCountryPlaybook !== undefined && { hasCountryPlaybook }),
    ...(rulesConfidence !== undefined && rulesConfidence !== null && { rulesConfidence }),
    ...(playbookCountryCode && { playbookCountryCode }),
    ...(playbookVisaCategory && { playbookVisaCategory }),
    ...(violatesRiskAlignment !== undefined && { violatesRiskAlignment }),
    // Phase 8: Country consistency fields
    ...(data.countryCodeCanonical && { countryCodeCanonical: data.countryCodeCanonical }),
    ...(data.countryNameCanonical && { countryNameCanonical: data.countryNameCanonical }),
    ...(data.countryConsistencyStatus && {
      countryConsistencyStatus: data.countryConsistencyStatus,
    }),
  };

  if (error) {
    logError('[GPT][DocVerification] Verification failed', new Error(error), logData);
  } else if (jsonValidationRetries > 0) {
    logWarn('[GPT][DocVerification] Verification completed with retries', logData);
  } else if (violatesRiskAlignment) {
    logWarn('[GPT][DocVerification] Verification completed with risk alignment violation', logData);
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

/**
 * Chat log interface (Phase 6)
 */
export interface ChatLog {
  userId: string;
  applicationId?: string;
  countryCode?: string;
  visaType?: string;
  visaCategory?: 'tourist' | 'student';
  messageLength: number;
  replyLength: number;
  tokensUsed?: number;
  responseTimeMs?: number;
  // Phase 6: Self-check metadata
  selfCheckPassed?: boolean;
  selfCheckFlags?: string[];
  riskLevel?: 'low' | 'medium' | 'high';
  riskDrivers?: string[];
  hasVisaRuleSet?: boolean;
  hasCountryPlaybook?: boolean;
  error?: string;
  // Phase 8: Country consistency fields
  countryCodeCanonical?: string;
  countryNameCanonical?: string;
  countryConsistencyStatus?: 'consistent' | 'corrected' | 'mismatch_detected';
}

/**
 * Log chat interaction with structured data (Phase 6)
 */
export function logChat(data: ChatLog): void {
  const {
    userId,
    applicationId,
    countryCode,
    visaType,
    visaCategory,
    messageLength,
    replyLength,
    tokensUsed,
    responseTimeMs,
    selfCheckPassed,
    selfCheckFlags,
    riskLevel,
    riskDrivers,
    hasVisaRuleSet,
    hasCountryPlaybook,
    error,
  } = data;

  const logData = {
    userId,
    ...(applicationId && { applicationId }),
    ...(countryCode && { countryCode }),
    ...(visaType && { visaType }),
    ...(visaCategory && { visaCategory }),
    messageLength,
    replyLength,
    ...(tokensUsed && { tokensUsed }),
    ...(responseTimeMs && { responseTimeMs }),
    // Phase 6: Self-check metadata
    ...(selfCheckPassed !== undefined && { selfCheckPassed }),
    ...(selfCheckFlags && selfCheckFlags.length > 0 && { selfCheckFlags }),
    ...(riskLevel && { riskLevel }),
    ...(riskDrivers && riskDrivers.length > 0 && { riskDrivers }),
    ...(hasVisaRuleSet !== undefined && { hasVisaRuleSet }),
    ...(hasCountryPlaybook !== undefined && { hasCountryPlaybook }),
    ...(error && { error }),
  };

  if (error) {
    logError('[GPT][Chat] Chat failed', new Error(error), logData);
  } else if (selfCheckPassed === false && selfCheckFlags && selfCheckFlags.length > 0) {
    logWarn('[GPT][Chat] Chat completed with self-check flags', logData);
  } else {
    logInfo('[GPT][Chat] Chat completed', logData);
  }
}
