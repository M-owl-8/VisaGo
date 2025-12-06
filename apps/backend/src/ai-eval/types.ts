/**
 * AI Evaluation Framework Types
 * Common types for evaluating GPT-4 expert subsystems
 */

/**
 * Base scenario interface
 */
export interface AIEvalScenarioBase {
  id: string;
  name: string;
  description: string;
  subsystem: 'checklist' | 'doccheck' | 'risk' | 'doc-explanation' | 'rules-extraction';
}

/**
 * Checklist evaluation scenario
 */
export interface ChecklistEvalScenario extends AIEvalScenarioBase {
  subsystem: 'checklist';
  countryCode: string;
  visaType: 'student' | 'tourist';
  canonicalAIUserContext: any; // CanonicalAIUserContext (mocked)
  baseDocuments: Array<{
    documentType: string;
    category: 'required' | 'highly_recommended' | 'optional';
    required: boolean;
  }>;
  expectedConstraints: {
    mustNotAddDocuments?: boolean;
    mustNotRemoveDocuments?: boolean;
    mustProduceValidJson?: boolean;
    shouldSetAppliesToThisApplicant?: boolean;
    shouldGiveReasonIfApplies?: boolean;
    minItems?: number;
    maxItems?: number;
  };
}

/**
 * Document check evaluation scenario
 */
export interface DocCheckEvalScenario extends AIEvalScenarioBase {
  subsystem: 'doccheck';
  requiredDocumentRule: {
    documentType: string;
    category: 'required' | 'highly_recommended' | 'optional';
    description?: string;
    validityRequirements?: string;
    formatRequirements?: string;
  };
  userDocumentText: string; // Realistic fake OCR text
  metadata?: {
    fileType?: string;
    issueDate?: string;
    expiryDate?: string;
    amounts?: Array<{ value: number; currency: string }>;
    bankName?: string;
    accountHolder?: string;
  };
  canonicalAIUserContext?: any; // Optional CanonicalAIUserContext
  expectedConstraints: {
    statusInSet?: ('APPROVED' | 'NEED_FIX' | 'REJECTED')[];
    shortReasonNonEmpty?: boolean;
    notesUzPresent?: boolean;
    ifInsufficientAmountThenRiskNotLow?: boolean;
    validationDetailsPresent?: boolean;
  };
}

/**
 * Risk explanation evaluation scenario
 */
export interface RiskEvalScenario extends AIEvalScenarioBase {
  subsystem: 'risk';
  canonicalAIUserContext: any; // CanonicalAIUserContext (mocked)
  expectedRiskLevel: 'low' | 'medium' | 'high';
  expectedConstraints: {
    riskLevelMatches?: boolean;
    summaryEnNonEmpty?: boolean;
    summaryUzNonEmpty?: boolean;
    summaryRuNonEmpty?: boolean;
    recommendationsCount?: { min?: number; max?: number };
    recommendationsMentionFactors?: boolean;
    factorWeightsPresent?: boolean;
  };
}

/**
 * Document explanation evaluation scenario
 */
export interface DocExplanationEvalScenario extends AIEvalScenarioBase {
  subsystem: 'doc-explanation';
  documentType: string;
  countryCode: string;
  visaType: 'student' | 'tourist';
  canonicalAIUserContext?: any; // Optional CanonicalAIUserContext
  expectedConstraints: {
    whyMentionsVisaType?: boolean;
    whyMentionsCountry?: boolean;
    tipsLength?: { min?: number };
    mentionsCommonMistake?: boolean;
    mentionsOfficerChecks?: boolean;
  };
}

/**
 * Rules extraction evaluation scenario
 */
export interface RulesExtractionEvalScenario extends AIEvalScenarioBase {
  subsystem: 'rules-extraction';
  countryCode: string;
  visaType: string;
  embassyPageText: string; // Artificial embassy page text
  expectedConstraints: {
    allDocumentsInTextAppear?: boolean;
    noExtraDocuments?: boolean;
    financialRequirementsPresent?: boolean;
    confidenceThreshold?: number; // e.g., 0.6
    requiredDocumentsCount?: { min?: number };
  };
}

/**
 * Evaluation metric
 */
export interface EvalMetric {
  name: string; // e.g., "json_valid", "no_extra_documents"
  ok: boolean;
  details?: string;
  critical?: boolean; // If true, failure of this metric fails the scenario
}

/**
 * Evaluation result for a single scenario
 */
export interface EvalResult {
  scenarioId: string;
  scenarioName: string;
  subsystem: 'checklist' | 'doccheck' | 'risk' | 'doc-explanation' | 'rules-extraction';
  passed: boolean;
  metrics: EvalMetric[];
  rawRequest?: any;
  rawResponse?: any;
  error?: string;
  executionTimeMs?: number;
}

/**
 * Evaluation summary
 */
export interface EvalSummary {
  totalScenarios: number;
  passed: number;
  failed: number;
  bySubsystem: Record<string, { total: number; passed: number; failed: number }>;
  criticalFailures: number;
  executionTimeMs: number;
}
