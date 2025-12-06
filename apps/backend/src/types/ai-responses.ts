/**
 * AI Response Types
 *
 * Unified TypeScript types for GPT-4 API responses.
 * These types define the JSON contracts that GPT-4 must return.
 *
 * @module ai-responses
 */

/**
 * ValidationProblemAI
 *
 * A problem found during document validation.
 */
export interface ValidationProblemAI {
  /**
   * Problem code (standardized), e.g., "INSUFFICIENT_BALANCE", "EXPIRED_DOCUMENT", "MISSING_SIGNATURE"
   */
  code: string;

  /**
   * English explanation for internal logs
   */
  message: string;

  /**
   * User-facing explanation (optional, for display in UI)
   */
  userMessage?: string;
}

/**
 * ValidationSuggestionAI
 *
 * A suggestion for improving a document or application.
 */
export interface ValidationSuggestionAI {
  /**
   * Suggestion code (standardized), e.g., "ADD_CO_SPONSOR", "PROVIDE_3_MONTHS_HISTORY", "GET_TRANSLATION"
   */
  code: string;

  /**
   * English message explaining the suggestion
   */
  message: string;
}

/**
 * DocumentValidationResultAI
 *
 * Unified GPT-4 response format for document validation.
 * This can be used for both:
 * - Upload-time validation (maps to UserDocument)
 * - Summary doc-check (maps to DocumentCheckResult)
 */
export interface DocumentValidationResultAI {
  /**
   * Overall validation status
   * - "verified": Document meets all requirements (high confidence)
   * - "rejected": Document has critical issues (unacceptable)
   * - "needs_review": Document may be acceptable but needs manual review
   * - "uncertain": Cannot determine status (poor quality, ambiguous)
   */
  status: 'verified' | 'rejected' | 'needs_review' | 'uncertain';

  /**
   * AI confidence score (0.0 to 1.0)
   * - 0.9-1.0: Very high confidence
   * - 0.7-0.89: High confidence
   * - 0.5-0.69: Medium confidence
   * - 0.0-0.49: Low confidence
   */
  confidence: number;

  /**
   * Whether document is verified by AI (true only if status === "verified" AND confidence >= 0.7)
   */
  verifiedByAI: boolean;

  /**
   * Problems found (if any)
   * Empty array if status is "verified"
   */
  problems: ValidationProblemAI[];

  /**
   * Suggestions for improvement (if any)
   * May be empty even if problems exist
   */
  suggestions: ValidationSuggestionAI[];

  /**
   * Multilingual notes/explanation
   * Required in Uzbek, optional in Russian and English
   */
  notes: {
    /**
     * Required: Uzbek explanation
     */
    uz: string;

    /**
     * Optional: Russian explanation
     */
    ru?: string;

    /**
     * Optional: English explanation
     */
    en?: string;
  };

  /**
   * Optional: Raw JSON response from GPT-4 (for debugging/audit)
   * This can be stored separately if needed, not in Prisma models
   */
  rawJson?: string;
}
