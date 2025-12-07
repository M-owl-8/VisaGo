/**
 * Visa Document Checker Service
 * Compares uploaded documents against VisaRuleSet requirements
 * Uses GPT-4 to evaluate document compliance
 */

import { AIOpenAIService } from './ai-openai.service';
import { getAIConfig } from '../config/ai-models';
import { VisaRuleSetData, VisaRulesService } from './visa-rules.service';
import { AIUserContext, CanonicalAIUserContext, RiskDriver } from '../types/ai-context';
import { buildCanonicalAIUserContext } from './ai-context.service';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { logDocumentVerification, extractApplicationId } from '../utils/gpt-logging';
import { z } from 'zod';
import { PROMPT_VERSIONS } from '../ai-training/config';
import {
  getCountryVisaPlaybook,
  type VisaCategory,
  type CountryVisaPlaybook,
} from '../config/country-visa-playbooks';
import { normalizeDocumentType } from '../config/document-types-map';
import {
  normalizeCountryCode,
  getCountryNameFromCode,
  buildCanonicalCountryContext,
  assertCountryConsistency,
} from '../config/country-registry';

/**
 * Document Check Result Schema (EXPERT VERSION - Phase 3)
 * Includes tri-language notes, expert validation details, and embassy officer assessment
 */
const DocumentCheckResultSchema = z.object({
  status: z.enum(['APPROVED', 'NEED_FIX', 'REJECTED']),
  short_reason: z.string().max(200), // Enforce max length
  notes: z
    .object({
      en: z.string().max(500).optional(),
      uz: z.string().max(500).optional(),
      ru: z.string().max(500).optional(),
    })
    .optional(),
  embassy_risk_level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  technical_notes: z.string().max(1000).nullable().optional(),
  // Phase 3: Expert validation fields (optional for backward compatibility)
  validationDetails: z
    .object({
      documentTypeMatch: z.boolean().optional(), // Does document type match requirement?
      contentComplete: z.boolean().optional(), // Are all required fields present?
      financialValid: z.boolean().nullable().optional(), // Financial validation (null if not applicable)
      dateValidation: z.boolean().optional(), // Date validation passed?
      formatValidation: z.boolean().optional(), // Format compliance?
      issues: z.array(z.string()).optional(), // Array of specific issues found
      recommendations: z.array(z.string()).optional(), // Actionable recommendations
    })
    .optional(),
  embassyOfficerAssessment: z.string().optional(), // Expert perspective on document quality
  financialValidation: z
    .object({
      balanceMeetsRequirement: z.boolean().optional(), // Balance meets minimum?
      currencyCorrect: z.boolean().optional(), // Currency correct?
      statementMonthsSufficient: z.boolean().optional(), // Statement months sufficient?
      incomeStable: z.boolean().optional(), // Income stable?
    })
    .optional(),
  dateValidation: z
    .object({
      expiryValid: z.boolean().optional(), // Expiry date valid?
      issueDateValid: z.boolean().optional(), // Issue date valid?
      validityPeriodMeetsRequirement: z.boolean().optional(), // Validity period sufficient?
    })
    .optional(),
  formatValidation: z
    .object({
      languageCorrect: z.boolean().optional(), // Language correct?
      translationPresent: z.boolean().optional(), // Translation present if required?
      apostillePresent: z.boolean().optional(), // Apostille present if required?
      originalFormat: z.boolean().optional(), // Original/certified copy format correct?
    })
    .optional(),
});

export type DocumentCheckResult = z.infer<typeof DocumentCheckResultSchema>;

/**
 * Internal status enum for mapping
 */
export enum DocumentVerificationStatus {
  APPROVED = 'APPROVED',
  NEED_FIX = 'NEED_FIX',
  REJECTED = 'REJECTED',
}

/**
 * Internal risk level enum for mapping
 */
export enum EmbassyRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

/**
 * Visa Document Checker Service
 */
export class VisaDocCheckerService {
  /**
   * ⚠️ DEV-ONLY: Build system and user prompts for evaluation/testing
   *
   * This helper allows evaluation harnesses to build prompts without hitting the database.
   * It takes synthetic document data and CanonicalAIUserContext and returns the prompts.
   *
   * DO NOT use in production code paths. This is for testing/evaluation only.
   *
   * @param requiredDocumentRule - Synthetic document rule (for evaluation)
   * @param userDocumentText - Document text (synthetic, for evaluation)
   * @param canonicalContext - Synthetic CanonicalAIUserContext (for evaluation)
   * @param metadata - Optional metadata (for evaluation)
   * @returns Object with systemPrompt and userPrompt strings
   */
  static buildPromptsForEvaluation(
    requiredDocumentRule: {
      documentType: string;
      category: 'required' | 'highly_recommended' | 'optional';
      description?: string;
      validityRequirements?: string;
      formatRequirements?: string;
    },
    userDocumentText: string,
    canonicalContext: CanonicalAIUserContext,
    metadata?: any
  ): { systemPrompt: string; userPrompt: string } {
    const systemPrompt = this.buildSystemPromptCompact();
    const userPrompt = this.buildUserPromptCompact(
      requiredDocumentRule as any,
      userDocumentText,
      canonicalContext,
      metadata
    );
    return { systemPrompt, userPrompt };
  }

  /**
   * Check a single document against a requirement
   *
   * @param requiredDocumentRule - Specific document rule (condition already resolved if applicable)
   * @param userDocumentText - Full text of uploaded document (or best OCR output)
   * @param aiUserContext - AIUserContext (will be converted to CanonicalAIUserContext)
   * @param metadata - Optional document metadata
   * @param countryCode - Country code (e.g., 'US', 'GB') for fetching embassy rules and playbooks
   * @param visaType - Visa type ('tourist' | 'student') for fetching embassy rules and playbooks
   */
  static async checkDocument(
    requiredDocumentRule: VisaRuleSetData['requiredDocuments'][0],
    userDocumentText: string,
    aiUserContext?: AIUserContext,
    metadata?: {
      fileType?: string;
      issueDate?: string;
      expiryDate?: string;
      amounts?: Array<{ value: number; currency: string }>;
      bankName?: string;
      accountHolder?: string;
    },
    countryCode?: string,
    visaType?: 'tourist' | 'student'
  ): Promise<DocumentCheckResult> {
    try {
      logInfo('[VisaDocChecker] Checking document', {
        documentType: requiredDocumentRule.documentType,
        textLength: userDocumentText.length,
        hasMetadata: !!metadata,
        countryCode,
        visaType,
      });

      // Convert to CanonicalAIUserContext for consistent input
      let canonicalContext: CanonicalAIUserContext | null = null;
      if (aiUserContext) {
        try {
          canonicalContext = await buildCanonicalAIUserContext(aiUserContext);
        } catch (error) {
          logWarn('[VisaDocChecker] Failed to build canonical context', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Phase 5: Fetch embassy rules and playbook
      // Phase 8: Normalize country code using CountryRegistry
      let ruleSet: VisaRuleSetData | null = null;
      let playbook: CountryVisaPlaybook | null = null;
      let countryCodeForRules = countryCode;
      let visaCategory: VisaCategory | undefined = visaType;

      // Try to get country/visaType from context if not provided
      if (!countryCodeForRules && canonicalContext) {
        countryCodeForRules =
          canonicalContext.countryContext?.countryCode ||
          (canonicalContext.applicantProfile as any).countryCode ||
          canonicalContext.applicantProfile.targetCountry;
      }
      if (!visaCategory && canonicalContext) {
        visaCategory = canonicalContext.applicantProfile.visaType;
      }

      // Phase 8: Normalize country code
      const normalizedCountryCodeForRules = countryCodeForRules
        ? normalizeCountryCode(countryCodeForRules) || countryCodeForRules.toUpperCase()
        : null;
      const countryContextForRules = normalizedCountryCodeForRules
        ? buildCanonicalCountryContext(normalizedCountryCodeForRules)
        : null;
      const countryNameForRules = countryContextForRules?.countryName || null;

      // Assert consistency if we have multiple country sources
      if (
        normalizedCountryCodeForRules &&
        countryCode &&
        countryCode !== normalizedCountryCodeForRules
      ) {
        const consistency = assertCountryConsistency(normalizedCountryCodeForRules, countryCode);
        if (!consistency.consistent) {
          logWarn('[VisaDocChecker] Country consistency check failed', {
            mismatches: consistency.mismatches,
            normalizedCountryCodeForRules,
            originalCountryCode: countryCode,
          });
        }
      }

      if (normalizedCountryCodeForRules && visaCategory) {
        try {
          ruleSet = await VisaRulesService.getActiveRuleSet(
            normalizedCountryCodeForRules,
            visaCategory
          );
          playbook = getCountryVisaPlaybook(normalizedCountryCodeForRules, visaCategory);
        } catch (error) {
          logWarn('[VisaDocChecker] Failed to fetch embassy rules or playbook', {
            error: error instanceof Error ? error.message : String(error),
            countryCode: countryCodeForRules,
            visaCategory,
          });
        }
      }

      // Build compact system prompt (Phase 5: includes embassy rules and playbook)
      // Phase 8: Pass canonical country context
      const useCompactPrompts = process.env.USE_COMPACT_DOC_VERIFICATION_PROMPTS !== 'false'; // Default: true
      const systemPrompt = useCompactPrompts
        ? this.buildSystemPromptCompact(
            ruleSet || undefined,
            playbook || undefined,
            normalizedCountryCodeForRules || countryCodeForRules,
            countryNameForRules || undefined,
            countryContextForRules?.schengen || false
          )
        : this.buildSystemPromptLegacy();

      // Build compact user prompt (Phase 5: includes embassy rules, playbook, and risk drivers)
      const userPrompt = useCompactPrompts
        ? this.buildUserPromptCompact(
            requiredDocumentRule,
            userDocumentText,
            canonicalContext,
            metadata,
            ruleSet || undefined,
            playbook || undefined,
            normalizedCountryCodeForRules || countryCodeForRules,
            countryNameForRules || undefined,
            countryContextForRules?.schengen || false,
            visaCategory
          )
        : this.buildUserPromptLegacy(
            requiredDocumentRule,
            userDocumentText,
            aiUserContext,
            metadata
          );

      const startTime = Date.now();

      // Resolve model from registry (with fallback)
      const aiConfig = getAIConfig('docVerification');
      // Access private method via type assertion (registry integration)
      const modelRouting = await (AIOpenAIService as any).resolveModelForTask(
        'document_check',
        aiConfig.model
      );
      const docCheckModel = modelRouting.modelName;
      const modelVersionId = modelRouting.modelVersionId;

      logInfo('[VisaDocChecker] Calling GPT-4 for document verification', {
        task: 'document_check',
        model: docCheckModel,
        modelVersionId,
        documentType: requiredDocumentRule.documentType,
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
      });

      const response = await AIOpenAIService.getOpenAIClient().chat.completions.create({
        model: docCheckModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
        response_format: aiConfig.responseFormat || undefined,
      });

      const responseTime = Date.now() - startTime;
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const totalTokens = inputTokens + outputTokens;

      const rawContent = response.choices[0]?.message?.content || '{}';

      logInfo('[VisaDocChecker] GPT-4 response received', {
        task: 'document_check',
        model: docCheckModel,
        documentType: requiredDocumentRule.documentType,
        responseLength: rawContent.length,
        tokensUsed: totalTokens,
        responseTimeMs: responseTime,
      });

      // Parse and validate JSON
      let parsed: any;
      let jsonValidationRetries = 0;
      let jsonValidationPassed = false;
      try {
        parsed = JSON.parse(rawContent);
        jsonValidationPassed = true;
      } catch (parseError) {
        jsonValidationRetries++;
        // Try to extract JSON from markdown code blocks
        const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/i);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[1]);
            jsonValidationPassed = true;
          } catch (e) {
            // Continue to next attempt
          }
        }
        if (!jsonValidationPassed) {
          const objectMatch = rawContent.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            try {
              parsed = JSON.parse(objectMatch[0]);
              jsonValidationPassed = true;
            } catch (e) {
              // Continue
            }
          }
        }
        if (!jsonValidationPassed) {
          throw new Error('No valid JSON found in response');
        }
      }

      // Validate against schema with stronger validation
      let validationResult = DocumentCheckResultSchema.safeParse(parsed);

      if (!validationResult.success) {
        jsonValidationRetries++;
        logError(
          '[VisaDocChecker] Schema validation failed',
          new Error('Invalid check result structure'),
          {
            documentType: requiredDocumentRule.documentType,
            errors: validationResult.error.errors,
            rawResponse: rawContent.substring(0, 500),
          }
        );

        // Try to fix common issues
        const fixed = this.fixCommonValidationIssues(parsed);
        validationResult = DocumentCheckResultSchema.safeParse(fixed);

        if (!validationResult.success) {
          // Extract application context for logging
          const applicationId = aiUserContext ? extractApplicationId(aiUserContext) : 'unknown';
          const countryCode = (aiUserContext as any)?.application?.country?.code || 'unknown';
          const countryName = (aiUserContext as any)?.application?.country?.name || countryCode;
          const visaType = (aiUserContext as any)?.application?.visaType?.name || 'unknown';

          logDocumentVerification({
            applicationId,
            documentType: requiredDocumentRule.documentType,
            country: countryName,
            countryCode,
            visaType,
            status: 'NEED_FIX',
            embassyRiskLevel: 'MEDIUM',
            jsonValidationPassed: false,
            jsonValidationRetries,
            error: `Validation error: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
          });

          // Fallback: create a conservative result
          return {
            status: 'NEED_FIX',
            short_reason: 'Document validation could not be completed. Please review manually.',
            embassy_risk_level: 'MEDIUM',
            technical_notes: `Validation error: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
          };
        }
        jsonValidationPassed = true;
      } else {
        jsonValidationPassed = true;
      }

      // Map to internal enums and validate
      const result = this.mapToInternalEnums(validationResult.data);

      // Extract application context for logging
      const applicationId = aiUserContext ? extractApplicationId(aiUserContext) : 'unknown';
      const extractedCountryCode =
        (aiUserContext as any)?.application?.country?.code || countryCode || 'unknown';
      const extractedCountryName =
        (aiUserContext as any)?.application?.country?.name || extractedCountryCode;
      const extractedVisaType =
        (aiUserContext as any)?.application?.visaType?.name || visaType || 'unknown';

      // Log structured document verification
      logDocumentVerification({
        applicationId,
        documentType: requiredDocumentRule.documentType,
        country: extractedCountryName,
        countryCode: extractedCountryCode,
        visaType: extractedVisaType,
        status: result.status,
        embassyRiskLevel: result.embassy_risk_level,
        jsonValidationPassed,
        jsonValidationRetries,
        tokensUsed: totalTokens,
        responseTimeMs: responseTime,
      });

      logInfo('[VisaDocChecker] Document check completed', {
        task: 'document_check',
        model: docCheckModel,
        documentType: requiredDocumentRule.documentType,
        status: result.status,
        riskLevel: result.embassy_risk_level,
        tokensUsed: totalTokens,
        responseTimeMs: responseTime,
      });

      // Record AI interaction for training data pipeline
      const userId = aiUserContext ? (aiUserContext as any)?.userProfile?.userId : null;
      const promptVersion =
        process.env.USE_COMPACT_DOC_VERIFICATION_PROMPTS !== 'false'
          ? PROMPT_VERSIONS.DOC_CHECK_PROMPT_V2_EXPERT
          : PROMPT_VERSIONS.DOC_CHECK_PROMPT_V1;
      const source = process.env.AI_EVAL_MODE === 'true' ? ('eval' as const) : ('prod' as const);

      await AIOpenAIService['recordAIInteraction']({
        taskType: 'document_check',
        model: docCheckModel,
        promptVersion,
        source,
        modelVersionId,
        requestPayload: {
          systemPrompt,
          userPrompt,
          requiredDocumentRule,
          userDocumentText,
          metadata,
          canonicalAIUserContext: canonicalContext,
        },
        responsePayload: result,
        success: true,
        contextMeta: {
          countryCode: extractedCountryCode !== 'unknown' ? extractedCountryCode : null,
          visaType: extractedVisaType !== 'unknown' ? extractedVisaType : null,
          applicationId: applicationId !== 'unknown' ? applicationId : null,
          userId,
        },
      }).catch((err) => {
        logWarn('[VisaDocChecker] Failed to record AI interaction', {
          error: err instanceof Error ? err.message : String(err),
        });
      });

      return result;
    } catch (error) {
      const applicationId = aiUserContext ? extractApplicationId(aiUserContext) : 'unknown';
      const extractedCountryCode =
        (aiUserContext as any)?.application?.country?.code || countryCode || 'unknown';
      const extractedCountryName =
        (aiUserContext as any)?.application?.country?.name || extractedCountryCode;
      const extractedVisaType =
        (aiUserContext as any)?.application?.visaType?.name || visaType || 'unknown';

      logDocumentVerification({
        applicationId,
        documentType: requiredDocumentRule.documentType,
        country: extractedCountryName,
        countryCode: extractedCountryCode,
        visaType: extractedVisaType,
        status: 'NEED_FIX',
        embassyRiskLevel: 'MEDIUM',
        jsonValidationPassed: false,
        jsonValidationRetries: 0,
        error: error instanceof Error ? error.message : String(error),
      });

      logError('[VisaDocChecker] Document check failed', error as Error, {
        documentType: requiredDocumentRule.documentType,
      });

      // Return conservative fallback
      return {
        status: 'NEED_FIX',
        short_reason: 'Document check could not be completed. Please review manually.',
        embassy_risk_level: 'MEDIUM',
        technical_notes: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Build compact system prompt for document checking (EXPERT OFFICER VERSION - Phase 5)
   * GPT acts as an expert embassy document reviewer with deep knowledge of 10 countries × 2 visa types
   *
   * Phase 5 Upgrade:
   * - Includes OFFICIAL_RULES from embassy sources (VisaRuleSet)
   * - Includes COUNTRY_VISA_PLAYBOOK for country-specific patterns
   * - Explicitly uses riskDrivers to guide validation strictness
   * - Uzbek-focused guidance with embassy rules as ground truth
   */
  private static buildSystemPromptCompact(
    ruleSet?: VisaRuleSetData,
    playbook?: CountryVisaPlaybook,
    countryCode?: string,
    countryName?: string,
    schengen?: boolean
  ): string {
    // Phase 8: Use canonical country in prompt
    const countrySection =
      countryCode && countryName
        ? `\n\nIMPORTANT COUNTRY CONTEXT:\n- The ONLY valid country for this task is ${countryName} (${countryCode})\n- You MUST NOT refer to any other country\n- If embassy rules for other countries appear in your memory, ignore them${schengen ? '\n- This is a Schengen country. You may reference "Schengen" as a group, but always specify ' + countryName + ' as the primary country' : ''}\n`
        : '';

    return `You are an EXPERT VISA DOCUMENT REVIEWER with 10+ years of experience at embassies (US, UK, Schengen (Germany/Spain/France), Canada, Australia, Japan, Korea, UAE), specializing in applicants from Uzbekistan.${countrySection}

================================================================================
YOUR EXPERTISE
================================================================================

You have deep knowledge of:
- Document type accuracy (identifying correct vs incorrect document types)
- Content completeness (checking all required fields, dates, amounts, signatures)
- Format compliance (embassy-specific requirements, language, validity periods)
- Financial validation (balance verification, currency conversion, statement months)
- Date validation (expiry dates, issue dates, validity periods, travel dates)
- Embassy-specific requirements (country-specific formats, apostilles, translations)
- Risk assessment (identifying documents that raise red flags)
- Fraud detection (inconsistencies, impossible dates, mismatched information)
- Uzbek applicant context (Uzbek banks, kadastr documents, employment patterns)

================================================================================
INPUTS YOU WILL RECEIVE
================================================================================

1. REQUIRED_DOCUMENT_RULE:
   - From VisaRuleSet, includes conditions, validity, format requirements
   - Specifies documentType, category, required fields, validity periods
   - May include financial requirements (minimum balance, statement months)

2. USER_DOCUMENT_TEXT:
   - OCR/parsed text from uploaded document (may be incomplete or truncated)
   - Contains document content: names, dates, amounts, institution names, etc.

3. METADATA:
   - fileType, issueDate, expiryDate
   - bankName, accountHolder (for financial documents)
   - amounts: Array of {value, currency} extracted from document

4. APPLICANT_CONTEXT (CanonicalAIUserContext):
   - financial: {
       requiredFundsUSD, availableFundsUSD,
       financialSufficiencyRatio, financialSufficiencyLabel ('low' | 'borderline' | 'sufficient' | 'strong')
     }
   - ties: {
       tiesStrengthScore, tiesStrengthLabel ('weak' | 'medium' | 'strong'),
       hasPropertyInUzbekistan, hasFamilyInUzbekistan, hasChildren,
       isEmployed, employmentDurationMonths
     }
   - travelHistory: {
       travelHistoryScore, travelHistoryLabel ('none' | 'limited' | 'good' | 'strong'),
       previousVisaRejections, hasOverstayHistory
     }
   - uzbekContext: {
       isUzbekCitizen, residesInUzbekistan
     }
   - meta: {
       dataCompletenessScore (0.0-1.0), missingCriticalFields
     }

================================================================================
REVIEW PROCESS
================================================================================

Follow this systematic review process:

1. DOCUMENT TYPE AND RULE MATCH:
   - "Is this document actually what the rule asks for?"
   - Compare USER_DOCUMENT_TEXT against REQUIRED_DOCUMENT_RULE.documentType
   - Check for mismatches (e.g., employment letter vs bank statement)

2. CONTENT COMPLETENESS:
   - Are key fields present? (name, dates, amounts, institution, signatures, stamps)
   - For bank statements: period coverage, balance, consistency
   - For employment letters: employer name, position, salary, duration
   - For property docs: kadastr number, property value, ownership proof

3. VALIDITY:
   - Dates not expired / within requested period
   - Issue date is logical and consistent
   - Validity period meets embassy requirements
   - Travel dates align with visa application dates (if applicable)

4. FORMAT:
   - Does it appear to be a real official document (to the extent text reveals)?
   - Is language acceptable? (Uzbek/Russian with translation if required)
   - Are required translations present?
   - Are required apostilles/legalizations present?
   - Is format correct (original/certified copy)?

5. RISK ASSESSMENT (using expert fields):
   - For financial documents (bank statements, sponsor docs):
     * If financialSufficiencyLabel is 'low' or 'borderline', be STRICT
     * Compare document amounts against requiredFundsUSD and availableFundsUSD
     * If balance is far below requiredFundsUSD → higher risk
   - For ties documents (property, family ties, employment letter):
     * If tiesStrengthLabel is 'weak', this document is CRITICAL
     * Emphasize importance in notes if ties are weak
   - For travel documents (itinerary, history, insurance):
     * If travelHistoryScore is 'none' or 'limited', explain how these docs help
     * These documents help mitigate risk for first-time travelers

6. DATA COMPLETENESS AWARENESS:
   - If dataCompletenessScore is low (< 0.6):
     * Be cautious; avoid overconfident judgments
     * Use NEED_FIX instead of REJECTED if you lack information
     * Explain what's missing in notes

================================================================================
OUTPUT DEFINITION
================================================================================

You must return a JSON object with the following structure:

{
  "status": "APPROVED" | "NEED_FIX" | "REJECTED",
  "short_reason": "string (max 200 chars, concise embassy-style reasoning)",
  "notes": {
    "uz": "string (REQUIRED, max 500 chars, primary explanation in Uzbek)",
    "ru": "string (optional, max 500 chars, Russian version)",
    "en": "string (optional, max 500 chars, English version)"
  },
  "embassy_risk_level": "LOW" | "MEDIUM" | "HIGH",
  "technical_notes": "string | null (optional, max 1000 chars, internal debug notes)"
}

STATUS SEMANTICS:
- APPROVED: Document is sufficient and consistent with REQUIRED_DOCUMENT_RULE. All key conditions met, no critical issues. Embassy officers would likely accept this document.
- NEED_FIX: Document is mostly correct but has fixable issues. Examples:
  * Missing months of history (e.g., need 3 months, only 1 month provided)
  * Wrong language when translation is required
  * Amount slightly below minimum (but close)
  * Missing signature or stamp
  * Format issue that can be corrected
  The user can fix this by obtaining an updated or corrected document.
- REJECTED: Document is unusable or clearly wrong. Examples:
  * Completely wrong document type (e.g., employment letter when bank statement required)
  * Expired when validity is clearly required
  * Amounts far below requirements (e.g., $500 when $10,000 required)
  * Obviously fake or inconsistent (impossible dates, mismatched names)
  * No relevant information present

EMBASSY_RISK_LEVEL:
- LOW: Document appears solid and compliant. Embassy officers will likely accept it without additional scrutiny.
- MEDIUM: Some weaknesses or small deviations, but it might still be accepted with additional supporting documents or explanations.
- HIGH: Serious issues that are likely to cause refusal or additional scrutiny if not fixed. Embassy officers will be concerned.

NOTES REQUIREMENTS:
- notes.uz is REQUIRED and should be the primary explanation for Uzbek users
- Write in clear, simple Uzbek (not overly formal, understandable for average users)
- notes.ru and notes.en are optional but recommended
- Keep explanations short and actionable
- Reference Uzbek context naturally (e.g., "Uzbek banklar", "kadastr hujjatlari")

SHORT_REASON:
- ≤ 200 characters, concise, embassy-style reasoning in English
- Should summarize the key issue or approval reason
- Neutral, professional tone

================================================================================
OFFICIAL EMBASSY RULES (Phase 5)
================================================================================

${
  ruleSet && ruleSet.sourceInfo?.extractedFrom
    ? `OFFICIAL_RULES: Rules extracted from ${ruleSet.sourceInfo.extractedFrom} (confidence: ${(ruleSet.sourceInfo.confidence! * 100).toFixed(0)}%).

These are AUTHORITATIVE requirements from the official embassy/consulate website. You MUST use these as ground truth when validating documents.

Key requirements from official rules:
${
  ruleSet.financialRequirements
    ? `- Financial: Minimum balance ${ruleSet.financialRequirements.minimumBalance || 'N/A'} ${ruleSet.financialRequirements.currency || 'USD'}, ${ruleSet.financialRequirements.bankStatementMonths || 'N/A'} months of statements required`
    : ''
}
${
  ruleSet.additionalRequirements?.travelInsurance
    ? `- Travel Insurance: ${ruleSet.additionalRequirements.travelInsurance.required ? 'Required' : 'Optional'}, Minimum coverage ${ruleSet.additionalRequirements.travelInsurance.minimumCoverage || 'N/A'} ${ruleSet.additionalRequirements.travelInsurance.currency || ''}`
    : ''
}
${
  ruleSet.processingInfo
    ? `- Processing: ${ruleSet.processingInfo.appointmentRequired ? 'Appointment required' : 'No appointment'}, ${ruleSet.processingInfo.interviewRequired ? 'Interview required' : 'No interview'}, ${ruleSet.processingInfo.biometricsRequired ? 'Biometrics required' : 'No biometrics'}`
    : ''
}

CRITICAL: When validating documents, compare against these official rules. If a document violates an explicit rule from OFFICIAL_RULES, mark it as NEED_FIX or REJECTED accordingly.`
    : 'OFFICIAL_RULES: Not available. Use general embassy practice knowledge.'
}

================================================================================
COUNTRY VISA PLAYBOOK (Phase 5)
================================================================================

${
  playbook
    ? `COUNTRY_VISA_PLAYBOOK: Typical patterns for ${playbook.countryCode} ${playbook.visaCategory} visas.

Typical refusal reasons:
${playbook.typicalRefusalReasonsEn.map((r) => `- ${r}`).join('\n')}

Key officer focus areas:
${playbook.keyOfficerFocusEn.map((f) => `- ${f}`).join('\n')}

Uzbek context hints:
${playbook.uzbekContextHintsEn.map((h) => `- ${h}`).join('\n')}

Document-specific hints:
${
  playbook.documentHints.length > 0
    ? playbook.documentHints.map((h) => `- ${h.documentType}: ${h.officerFocusHintEn}`).join('\n')
    : 'No specific hints available.'
}

Use these patterns to understand what embassy officers typically look for and what common issues arise.`
    : 'COUNTRY_VISA_PLAYBOOK: Not available. Use general embassy practice knowledge.'
}

================================================================================
RISK DRIVERS (Phase 5)
================================================================================

You will receive explicit RISK_DRIVERS in APPLICANT_CONTEXT (e.g., ["low_funds", "weak_ties", "limited_travel_history"]).

Use risk drivers to guide validation strictness:
- If "low_funds" or "borderline_funds" is present and this is a financial document:
  * Be STRICT on balance requirements
  * Compare amounts against requiredFundsUSD
  * If balance is insufficient, mark as NEED_FIX or REJECTED
- If "weak_ties" is present and this is a ties document (property, employment, family):
  * This document is CRITICAL for the application
  * Be strict on completeness and authenticity
  * Emphasize importance in notes.uz
- If "limited_travel_history" is present and this is a travel document:
  * Explain how this document helps mitigate risk
  * Be clear about completeness requirements

Explicitly mention which risk drivers this document addresses in your notes.

================================================================================
FINAL INSTRUCTIONS
================================================================================

- OFFICIAL_RULES are AUTHORITATIVE - never ignore them when validating
- Use COUNTRY_VISA_PLAYBOOK to understand typical officer focus and common issues
- Use RISK_DRIVERS to guide strictness and explain document importance
- Use expert fields from APPLICANT_CONTEXT to guide your strictness:
  * Low financial sufficiency → be strict on financial docs
  * Weak ties → emphasize importance of ties docs
  * Limited travel history → explain how travel docs help
- If dataCompletenessScore is low, be cautious and prefer NEED_FIX over REJECTED
- Write notes.uz as the primary explanation (clear, simple Uzbek)
- Reference Uzbek context naturally (Uzbek banks, kadastr, employment letters)
- Return ONLY valid JSON, no markdown, no extra text

Return ONLY valid JSON matching the schema above.`;
  }

  /**
   * Legacy system prompt (aligned with expert officer mindset - Phase 4)
   *
   * Phase 4 Upgrade:
   * - Same expert officer role as compact version
   * - Conservative approach when expert fields are missing
   * - Same status semantics: APPROVED / NEED_FIX / REJECTED
   */
  private static buildSystemPromptLegacy(): string {
    return `You are an EXPERT VISA DOCUMENT REVIEWER with 10+ years of experience at embassies (US, UK, Schengen (Germany/Spain), Canada, Australia, Japan, Korea, UAE), specializing in applicants from Uzbekistan.

Your job:
- Compare ONE uploaded user document against ONE official document requirement.
- Decide if the user document satisfies the requirement according to the official rules.
- Return a strict, concise JSON result.
- You must be strict but fair, similar to an experienced visa officer.

NOTE: In legacy mode, some expert fields (financialSufficiencyRatio, tiesStrengthScore, travelHistoryScore, dataCompletenessScore) may be missing from APPLICANT_CONTEXT.
When expert fields are missing, be conservative in your reasoning and mark documents as NEED_FIX rather than REJECTED if uncertain.

OUTPUT SCHEMA (JSON):
{
  "status": "APPROVED" | "NEED_FIX" | "REJECTED",
  "short_reason": "string",            // 1–2 short sentences, practical and clear
  "embassy_risk_level": "LOW" | "MEDIUM" | "HIGH",
  "technical_notes": "string | null"   // optional, short extra details for internal logs
}

DECISION RULES:

1. STATUS
- APPROVED: The document clearly satisfies the key conditions described in REQUIRED_DOCUMENT_RULE.
  Any minor formatting or wording differences do not matter for a typical embassy officer.
- NEED_FIX: The document is on the right track but has one or more correctable issues, for example:
  - Not enough months of history.
  - Missing stamp/signature.
  - Wrong language when translation is required.
  - Amount slightly below the recommended minimum.
  The user could fix this by getting an updated or corrected document.
- REJECTED: The document is clearly unusable for this requirement, for example:
  - Completely wrong document type.
  - No relevant information present.
  - Expired when validity is clearly required.
  - Amounts or dates are far below or outside the stated rules.
  - Obviously fake or inconsistent (e.g. impossible dates, mismatched names) if clearly visible.

2. EMBASSY_RISK_LEVEL
- LOW: Document appears solid and compliant with the requirement.
- MEDIUM: There are some weaknesses or small deviations, but it might still be accepted.
- HIGH: Serious issues that are likely to cause refusal or additional scrutiny if not fixed.

3. REASONING GUIDELINES
- short_reason: MUST be 1–2 sentences, simple, direct, written for the user.
- technical_notes: Optional, use for slightly more technical or internal comments.

4. USE OF REQUIRED_DOCUMENT_RULE
- You must align your judgment with REQUIRED_DOCUMENT_RULE, not with generic visa knowledge.
- If REQUIRED_DOCUMENT_RULE specifies:
  - minimum history months → check if USER_DOCUMENT_TEXT indicates that history.
  - minimum balance / amount → check approximate amounts.
  - required language → check whether it appears to be in the required language(s).
  - validity months → check expiry vs intended travel dates if available.
- If something is not specified in REQUIRED_DOCUMENT_RULE: Do NOT invent strict rules.
  Lean toward NEED_FIX or MEDIUM risk only when a typical embassy officer would reasonably worry.

5. HANDLING UNCLEAR OR INCOMPLETE TEXT
- If USER_DOCUMENT_TEXT is extremely short, corrupted, or clearly incomplete:
  - Prefer REJECTED or NEED_FIX with an explanation.
- If you cannot find any evidence for crucial required fields:
  - Do not assume it is present.
  - Mark as NEED_FIX or REJECTED, depending on severity.

6. CONSISTENCY AND CONSERVATISM
- When in doubt, be slightly conservative:
  - If the document might be accepted but has visible weaknesses:
    - status: NEED_FIX, embassy_risk_level: MEDIUM or HIGH.
- Do NOT mark REJECTED unless you see clear, strong reasons.

7. OUTPUT RULES
- You MUST output only the JSON object with fields: status, short_reason, embassy_risk_level, technical_notes.
- No markdown, no comments, no extra explanation outside the JSON.
- The JSON must be syntactically valid (no trailing commas).

Return ONLY valid JSON matching the schema, no other text.`;
  }

  /**
   * Build compact user prompt (EXPERT OFFICER VERSION - Phase 5)
   *
   * Phase 5 Upgrade:
   * - Includes OFFICIAL_RULES summary
   * - Includes COUNTRY_VISA_PLAYBOOK summary
   * - Explicitly includes RISK_DRIVERS
   * - Clear instructions on using embassy rules as ground truth
   */
  private static buildUserPromptCompact(
    requiredDocumentRule: VisaRuleSetData['requiredDocuments'][0],
    userDocumentText: string,
    canonicalContext: CanonicalAIUserContext | null,
    metadata?: {
      fileType?: string;
      issueDate?: string;
      expiryDate?: string;
      amounts?: Array<{ value: number; currency: string }>;
      bankName?: string;
      accountHolder?: string;
    },
    ruleSet?: VisaRuleSetData,
    playbook?: CountryVisaPlaybook,
    countryCode?: string,
    countryName?: string,
    schengen?: boolean,
    visaCategory?: VisaCategory
  ): string {
    // Limit document text to 8000 chars (reasonable for GPT)
    const truncatedText =
      userDocumentText.length > 8000
        ? userDocumentText.substring(0, 8000) + '\n\n[Text truncated]'
        : userDocumentText;

    let prompt = `EXPERT DECISION REQUIRED:

You are reviewing a document uploaded by an Uzbek applicant. Your task:
1. Decide status: APPROVED / NEED_FIX / REJECTED
2. Consider:
   - REQUIRED_DOCUMENT_RULE as ground truth (check document type, validity, format, amounts)
   - USER_DOCUMENT_TEXT and METADATA to validate content, dates, amounts
   - APPLICANT_CONTEXT to understand how critical this document is for this applicant
3. Write short_reason in neutral, embassy-style English (≤200 chars)
4. Write notes.uz as the primary explanation (clear, simple Uzbek, required)
5. Write notes.ru and notes.en if helpful (optional)
6. If uncertain because of missing info, prefer NEED_FIX with explanation instead of REJECTED

================================================================================
REQUIRED_DOCUMENT_RULE
================================================================================

${JSON.stringify(requiredDocumentRule, null, 2)}

================================================================================
USER_DOCUMENT_TEXT
================================================================================

${truncatedText}

================================================================================
METADATA
================================================================================

${metadata ? JSON.stringify(metadata, null, 2) : 'No metadata provided'}

================================================================================
APPLICANT_CONTEXT
================================================================================`;

    if (canonicalContext) {
      // Phase 4: Structured expert context with grouped fields
      const applicantContext = {
        visaType: canonicalContext.applicantProfile.visaType,
        countryCode:
          countryCode ||
          canonicalContext.countryContext?.countryCode ||
          (canonicalContext.applicantProfile as any).countryCode ||
          canonicalContext.applicantProfile.targetCountry,
        duration: canonicalContext.applicantProfile.duration,
        sponsorType: canonicalContext.applicantProfile.sponsorType,
        financial: canonicalContext.applicantProfile.financial
          ? {
              requiredFundsUSD: (canonicalContext.applicantProfile.financial as any)
                .requiredFundsUSD,
              availableFundsUSD: (canonicalContext.applicantProfile.financial as any)
                .availableFundsUSD,
              financialSufficiencyRatio:
                canonicalContext.applicantProfile.financial.financialSufficiencyRatio,
              financialSufficiencyLabel: (canonicalContext.applicantProfile.financial as any)
                .financialSufficiencyLabel,
            }
          : undefined,
        ties: canonicalContext.applicantProfile.ties
          ? {
              tiesStrengthScore: canonicalContext.applicantProfile.ties.tiesStrengthScore,
              tiesStrengthLabel: (canonicalContext.applicantProfile.ties as any).tiesStrengthLabel,
              hasPropertyInUzbekistan: (canonicalContext.applicantProfile as any)
                .hasPropertyInUzbekistan,
              hasFamilyInUzbekistan: (canonicalContext.applicantProfile as any)
                .hasFamilyInUzbekistan,
              hasChildren: (canonicalContext.applicantProfile as any).hasChildren,
              isEmployed: (canonicalContext.applicantProfile as any).isEmployed,
              employmentDurationMonths: (canonicalContext.applicantProfile.ties as any)
                .employmentDurationMonths,
            }
          : undefined,
        travelHistory: canonicalContext.applicantProfile.travelHistory
          ? {
              travelHistoryScore: (canonicalContext.applicantProfile.travelHistory as any)
                .travelHistoryScore,
              travelHistoryLabel: (canonicalContext.applicantProfile.travelHistory as any)
                .travelHistoryLabel,
              previousVisaRejections: (canonicalContext.applicantProfile.travelHistory as any)
                .previousVisaRejections,
              hasOverstayHistory: (canonicalContext.applicantProfile.travelHistory as any)
                .hasOverstayHistory,
            }
          : undefined,
        uzbekContext: (canonicalContext as any).uzbekContext
          ? {
              isUzbekCitizen: (canonicalContext as any).uzbekContext.isUzbekCitizen,
              residesInUzbekistan: (canonicalContext as any).uzbekContext.residesInUzbekistan,
            }
          : undefined,
        meta: (canonicalContext as any).meta
          ? {
              dataCompletenessScore: (canonicalContext as any).meta.dataCompletenessScore,
              missingCriticalFields: (canonicalContext as any).meta.missingCriticalFields,
            }
          : undefined,
      };
      prompt += `\n${JSON.stringify(applicantContext, null, 2)}`;
    } else {
      prompt += `\nNo applicant context available.`;
    }

    prompt += `\n\nEvaluate the document using expert officer reasoning and return JSON result.`;

    return prompt;
  }

  /**
   * Legacy user prompt (aligned with expert officer mindset - Phase 4)
   *
   * Phase 4 Upgrade:
   * - Same structured context approach as compact version
   * - Note that some expert fields may be missing
   * - Same "EXPERT DECISION REQUIRED" instructions
   */
  private static buildUserPromptLegacy(
    requiredDocumentRule: VisaRuleSetData['requiredDocuments'][0],
    userDocumentText: string,
    aiUserContext?: AIUserContext,
    metadata?: {
      fileType?: string;
      issueDate?: string;
      expiryDate?: string;
      amounts?: Array<{ value: number; currency: string }>;
      bankName?: string;
      accountHolder?: string;
    }
  ): string {
    let prompt = `EXPERT DECISION REQUIRED:

You are reviewing a document uploaded by an Uzbek applicant. Your task:
1. Decide status: APPROVED / NEED_FIX / REJECTED
2. Consider:
   - REQUIRED_DOCUMENT_RULE as ground truth
   - USER_DOCUMENT_TEXT and METADATA to validate content, dates, amounts
   - APPLICANT_CONTEXT to understand how critical this document is (if available)
3. Write short_reason in neutral, embassy-style English (≤200 chars)
4. If uncertain because of missing info, prefer NEED_FIX with explanation instead of REJECTED

NOTE: In legacy mode, some expert fields may be missing. Be conservative when expert fields are unavailable.

================================================================================
REQUIRED_DOCUMENT_RULE
================================================================================

${JSON.stringify(requiredDocumentRule, null, 2)}

================================================================================
USER_DOCUMENT_TEXT
================================================================================

${userDocumentText.substring(0, 10000)}${userDocumentText.length > 10000 ? '\n\n[Text truncated for length]' : ''}

================================================================================
METADATA
================================================================================

${metadata ? JSON.stringify(metadata, null, 2) : 'No metadata provided'}

================================================================================
APPLICANT_CONTEXT
================================================================================`;

    if (aiUserContext) {
      // In legacy mode, use basic context (canonical context building is async and not available here)
      // Use basic context summary instead
      const contextSummary = {
        sponsorType: aiUserContext.questionnaireSummary?.sponsorType,
        employmentStatus: aiUserContext.questionnaireSummary?.employment?.currentStatus,
        travelDates: aiUserContext.questionnaireSummary?.travelInfo?.plannedDates,
        riskScore: aiUserContext.riskScore?.level,
        bankBalanceUSD: (aiUserContext as any).applicantProfile?.bankBalanceUSD,
        monthlyIncomeUSD: (aiUserContext as any).applicantProfile?.monthlyIncomeUSD,
        hasPropertyInUzbekistan: (aiUserContext as any).applicantProfile?.hasPropertyInUzbekistan,
        hasFamilyInUzbekistan: (aiUserContext as any).applicantProfile?.hasFamilyInUzbekistan,
        isEmployed: (aiUserContext as any).applicantProfile?.isEmployed,
        previousVisaRejections: (aiUserContext as any).applicantProfile?.previousVisaRejections,
      };

      // Check if we have any expert fields available (they might be pre-computed)
      const hasExpertFields =
        (aiUserContext as any).applicantProfile?.financial?.financialSufficiencyRatio !==
          undefined ||
        (aiUserContext as any).applicantProfile?.ties?.tiesStrengthScore !== undefined;

      if (hasExpertFields) {
        // Use structured context if expert fields are available
        const applicantContext = {
          visaType: (aiUserContext as any).applicantProfile?.visaType,
          sponsorType: contextSummary.sponsorType,
          financial: (aiUserContext as any).applicantProfile?.financial
            ? {
                requiredFundsUSD: (aiUserContext as any).applicantProfile.financial
                  .requiredFundsUSD,
                availableFundsUSD: (aiUserContext as any).applicantProfile.financial
                  .availableFundsUSD,
                financialSufficiencyRatio: (aiUserContext as any).applicantProfile.financial
                  .financialSufficiencyRatio,
                financialSufficiencyLabel: (aiUserContext as any).applicantProfile.financial
                  .financialSufficiencyLabel,
              }
            : undefined,
          ties: (aiUserContext as any).applicantProfile?.ties
            ? {
                tiesStrengthScore: (aiUserContext as any).applicantProfile.ties.tiesStrengthScore,
                tiesStrengthLabel: (aiUserContext as any).applicantProfile.ties.tiesStrengthLabel,
                hasPropertyInUzbekistan: contextSummary.hasPropertyInUzbekistan,
                hasFamilyInUzbekistan: contextSummary.hasFamilyInUzbekistan,
                isEmployed: contextSummary.isEmployed,
              }
            : undefined,
          travelHistory: (aiUserContext as any).applicantProfile?.travelHistory
            ? {
                travelHistoryScore: (aiUserContext as any).applicantProfile.travelHistory
                  .travelHistoryScore,
                travelHistoryLabel: (aiUserContext as any).applicantProfile.travelHistory
                  .travelHistoryLabel,
                previousVisaRejections: contextSummary.previousVisaRejections,
              }
            : undefined,
        };
        prompt += `\n${JSON.stringify(applicantContext, null, 2)}`;
      } else {
        // Fallback to basic context
        prompt += `\n${JSON.stringify(contextSummary, null, 2)}\n\nNOTE: Expert fields (financialSufficiencyRatio, tiesStrengthScore, etc.) are not available in legacy mode.`;
      }
    } else {
      prompt += `\nNo applicant context available.`;
    }

    prompt += `\n\nEvaluate the document using expert officer reasoning and return JSON result.`;

    return prompt;
  }

  /**
   * Fix common validation issues in GPT response
   */
  private static fixCommonValidationIssues(parsed: any): any {
    const fixed: any = {
      status: ['APPROVED', 'NEED_FIX', 'REJECTED'].includes(parsed.status)
        ? parsed.status
        : 'NEED_FIX',
      short_reason:
        typeof parsed.short_reason === 'string'
          ? parsed.short_reason.substring(0, 200)
          : 'Document validation completed',
      embassy_risk_level: ['LOW', 'MEDIUM', 'HIGH'].includes(parsed.embassy_risk_level)
        ? parsed.embassy_risk_level
        : 'MEDIUM',
    };

    // Handle notes (support both old and new format)
    if (parsed.notes && typeof parsed.notes === 'object') {
      fixed.notes = {
        en: typeof parsed.notes.en === 'string' ? parsed.notes.en.substring(0, 500) : undefined,
        uz: typeof parsed.notes.uz === 'string' ? parsed.notes.uz.substring(0, 500) : undefined,
        ru: typeof parsed.notes.ru === 'string' ? parsed.notes.ru.substring(0, 500) : undefined,
      };
    } else {
      // Try old format (notesEn, notesUz, notesRu)
      if (parsed.notesEn || parsed.notesUz || parsed.notesRu) {
        fixed.notes = {
          en: typeof parsed.notesEn === 'string' ? parsed.notesEn.substring(0, 500) : undefined,
          uz: typeof parsed.notesUz === 'string' ? parsed.notesUz.substring(0, 500) : undefined,
          ru: typeof parsed.notesRu === 'string' ? parsed.notesRu.substring(0, 500) : undefined,
        };
      }
    }

    if (parsed.technical_notes !== undefined) {
      fixed.technical_notes =
        typeof parsed.technical_notes === 'string'
          ? parsed.technical_notes.substring(0, 1000)
          : null;
    }

    return fixed;
  }

  /**
   * Map validated result to internal enums and ensure type safety
   */
  private static mapToInternalEnums(result: DocumentCheckResult): DocumentCheckResult {
    // Validate status enum
    const status = Object.values(DocumentVerificationStatus).includes(
      result.status as DocumentVerificationStatus
    )
      ? result.status
      : DocumentVerificationStatus.NEED_FIX;

    // Validate risk level enum
    const riskLevel = Object.values(EmbassyRiskLevel).includes(
      result.embassy_risk_level as EmbassyRiskLevel
    )
      ? result.embassy_risk_level
      : EmbassyRiskLevel.MEDIUM;

    return {
      ...result,
      status,
      embassy_risk_level: riskLevel,
    };
  }
}
