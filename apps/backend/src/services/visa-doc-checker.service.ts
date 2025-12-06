/**
 * Visa Document Checker Service
 * Compares uploaded documents against VisaRuleSet requirements
 * Uses GPT-4 to evaluate document compliance
 */

import { AIOpenAIService } from './ai-openai.service';
import { getAIConfig } from '../config/ai-models';
import { VisaRuleSetData } from './visa-rules.service';
import { AIUserContext, CanonicalAIUserContext } from '../types/ai-context';
import { buildCanonicalAIUserContext } from './ai-context.service';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { logDocumentVerification, extractApplicationId } from '../utils/gpt-logging';
import { z } from 'zod';
import { PROMPT_VERSIONS } from '../ai-training/config';

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
   * Check a single document against a requirement
   *
   * @param requiredDocumentRule - Specific document rule (condition already resolved if applicable)
   * @param userDocumentText - Full text of uploaded document (or best OCR output)
   * @param aiUserContext - AIUserContext (will be converted to CanonicalAIUserContext)
   * @param metadata - Optional document metadata
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
    }
  ): Promise<DocumentCheckResult> {
    try {
      logInfo('[VisaDocChecker] Checking document', {
        documentType: requiredDocumentRule.documentType,
        textLength: userDocumentText.length,
        hasMetadata: !!metadata,
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

      // Build compact system prompt
      const useCompactPrompts = process.env.USE_COMPACT_DOC_VERIFICATION_PROMPTS !== 'false'; // Default: true
      const systemPrompt = useCompactPrompts
        ? this.buildSystemPromptCompact()
        : this.buildSystemPromptLegacy();

      // Build compact user prompt
      const userPrompt = useCompactPrompts
        ? this.buildUserPromptCompact(
            requiredDocumentRule,
            userDocumentText,
            canonicalContext,
            metadata
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
        documentType: requiredDocumentRule.documentType,
        responseLength: rawContent.length,
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
      const countryCode = (aiUserContext as any)?.application?.country?.code || 'unknown';
      const countryName = (aiUserContext as any)?.application?.country?.name || countryCode;
      const visaType = (aiUserContext as any)?.application?.visaType?.name || 'unknown';

      // Log structured document verification
      logDocumentVerification({
        applicationId,
        documentType: requiredDocumentRule.documentType,
        country: countryName,
        countryCode,
        visaType,
        status: result.status,
        embassyRiskLevel: result.embassy_risk_level,
        jsonValidationPassed,
        jsonValidationRetries,
        tokensUsed: totalTokens,
        responseTimeMs: responseTime,
      });

      logInfo('[VisaDocChecker] Document check completed', {
        documentType: requiredDocumentRule.documentType,
        status: result.status,
        riskLevel: result.embassy_risk_level,
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
          countryCode: countryCode !== 'unknown' ? countryCode : null,
          visaType: visaType !== 'unknown' ? visaType : null,
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
   * Build compact system prompt for document checking (COMPACT VERSION)
   */
  private static buildSystemPromptCompact(): string {
    return `You are an EXPERT VISA DOCUMENT VERIFIER with 15+ years of experience reviewing visa documents for embassy submissions.

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

================================================================================
EXPERT VALIDATION FRAMEWORK
================================================================================

When verifying documents, check:

1. DOCUMENT TYPE ACCURACY:
   - Is this the correct document type for the requirement?
   - Does it match the REQUIRED_DOCUMENT_RULE documentType?
   - Are there any mismatches (e.g., employment letter vs bank statement)?

2. CONTENT COMPLETENESS:
   - Are all required fields present? (name, dates, amounts, signatures, stamps)
   - Is the information sufficient for embassy evaluation?
   - Are there missing critical elements?

3. FINANCIAL VALIDATION (for financial documents):
   - Balance verification: Does the balance meet minimum requirements?
   - Currency: Is the currency correct? (convert if needed)
   - Statement months: Does it cover the required period?
   - Income stability: Is income consistent? Any suspicious patterns?
   - Source of funds: Is the source clear and legitimate?

4. DATE VALIDATION:
   - Expiry dates: Is the document still valid?
   - Issue dates: Are dates logical and consistent?
   - Validity periods: Does validity meet embassy requirements?
   - Travel dates: Do dates align with visa application dates?

5. FORMAT COMPLIANCE:
   - Language: Is it in the required language(s)?
   - Translation: Is translation required and present?
   - Apostille: Is apostille required and present?
   - Original vs copy: Is the format correct (original/certified copy)?

6. SIGNATURES AND STAMPS:
   - Are required signatures present?
   - Are official stamps/seals present?
   - Are signatures/stamps from authorized entities?

7. EMBASSY-SPECIFIC REQUIREMENTS:
   - Country-specific formats (e.g., UK 28-day rule, Schengen insurance)
   - Specific terminology and document names
   - Additional requirements for the destination country

8. RISK ASSESSMENT:
   - Are there red flags? (suspicious patterns, inconsistencies, fraud indicators)
   - Does the document raise immigration intent concerns?
   - Is the document likely to be accepted by embassy officers?

================================================================================
OUTPUT SCHEMA
================================================================================

{
  "status": "APPROVED" | "NEED_FIX" | "REJECTED",
  "short_reason": "string (max 200 chars)",
  "notes": {
    "en": "string (optional, max 500 chars)",
    "uz": "string (optional, max 500 chars)",
    "ru": "string (optional, max 500 chars)"
  },
  "embassy_risk_level": "LOW" | "MEDIUM" | "HIGH",
  "technical_notes": "string | null (optional, max 1000 chars)",
  "validationDetails": {
    "documentTypeMatch": boolean,
    "contentComplete": boolean,
    "financialValid": boolean | null,
    "dateValid": boolean,
    "formatCompliant": boolean,
    "signaturesPresent": boolean,
    "issues": string[],
    "recommendations": string[]
  },
  "embassyOfficerAssessment": "string (expert perspective on document quality)",
  "actionableSteps": string[] (specific steps to fix issues)
}

================================================================================
DECISION RULES
================================================================================

STATUS:
- APPROVED: Document satisfies ALL key conditions, no critical issues
- NEED_FIX: Document has correctable issues (missing months, wrong language, low amount, missing signatures)
- REJECTED: Document is unusable (wrong type, expired, far below requirements, fraud indicators)

EMBASSY_RISK_LEVEL:
- LOW: Solid and compliant, likely to be accepted
- MEDIUM: Some weaknesses but might be accepted with additional documents
- HIGH: Serious issues likely to cause refusal or additional scrutiny

VALIDATION DETAILS:
- documentTypeMatch: true if document type matches requirement
- contentComplete: true if all required fields present
- financialValid: true if financial requirements met (null if not applicable)
- dateValid: true if dates are valid and meet requirements
- formatCompliant: true if format meets embassy requirements
- signaturesPresent: true if required signatures/stamps present
- issues: Array of specific issues found
- recommendations: Array of actionable recommendations

EMBASSY OFFICER ASSESSMENT:
Provide expert perspective: "This document [strengths/weaknesses]. Embassy officers will likely [accept/reject/request additional documents] because [reasoning]."

ACTIONABLE STEPS:
Provide specific, actionable steps to fix issues, e.g.:
- "Obtain bank statement covering last 3 months (currently only 1 month)"
- "Translate document to English and add apostille"
- "Update document to show minimum balance of $X (currently $Y)"

Return ONLY valid JSON.`;
  }

  /**
   * OLD SYSTEM PROMPT (kept for reference/rollback)
   */
  private static buildSystemPromptLegacy(): string {
    return `You are "VisaDocChecker", an embassy-level visa document reviewer.

Your job:
- Compare ONE uploaded user document against ONE official document requirement.
- Decide if the user document satisfies the requirement according to the official rules.
- Return a strict, concise JSON result.
- You must be strict but fair, similar to an experienced visa officer.

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
   * Build compact user prompt (COMPACT VERSION)
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
    }
  ): string {
    // Limit document text to 8000 chars (reasonable for GPT)
    const truncatedText =
      userDocumentText.length > 8000
        ? userDocumentText.substring(0, 8000) + '\n\n[Text truncated]'
        : userDocumentText;

    let prompt = `REQUIRED_DOCUMENT_RULE:
${JSON.stringify(requiredDocumentRule, null, 2)}

USER_DOCUMENT_TEXT:
${truncatedText}`;

    if (metadata) {
      prompt += `\n\nMETADATA:\n${JSON.stringify(metadata, null, 2)}`;
    }

    if (canonicalContext) {
      // Include expert context for document verification (Phase 3)
      const relevantContext = {
        sponsorType: canonicalContext.applicantProfile.sponsorType,
        currentStatus: canonicalContext.applicantProfile.currentStatus,
        bankBalanceUSD: canonicalContext.applicantProfile.bankBalanceUSD,
        monthlyIncomeUSD: canonicalContext.applicantProfile.monthlyIncomeUSD,
        riskLevel: canonicalContext.riskScore.level,
        // Expert fields (Phase 3)
        financial: canonicalContext.applicantProfile.financial
          ? {
              requiredFundsEstimate:
                canonicalContext.applicantProfile.financial.requiredFundsEstimate,
              financialSufficiencyRatio:
                canonicalContext.applicantProfile.financial.financialSufficiencyRatio,
              minimumFundsRequired: canonicalContext.embassyContext?.minimumFundsRequired,
              minimumStatementMonths: canonicalContext.embassyContext?.minimumStatementMonths,
            }
          : undefined,
        embassyContext: canonicalContext.embassyContext
          ? {
              commonRefusalReasons: canonicalContext.embassyContext.commonRefusalReasons,
              officerEvaluationCriteria: canonicalContext.embassyContext.officerEvaluationCriteria,
            }
          : undefined,
      };
      prompt += `\n\nAPPLICANT_CONTEXT (expert fields for validation):\n${JSON.stringify(relevantContext, null, 2)}`;
    }

    prompt += `\n\nEvaluate and return JSON result.`;

    return prompt;
  }

  /**
   * OLD USER PROMPT (kept for reference/rollback)
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
    let prompt = `Check if the uploaded user document satisfies the official requirement.

REQUIRED_DOCUMENT_RULE:
${JSON.stringify(requiredDocumentRule, null, 2)}

USER_DOCUMENT_TEXT:
${userDocumentText.substring(0, 10000)}${userDocumentText.length > 10000 ? '\n\n[Text truncated for length]' : ''}`;

    if (metadata) {
      prompt += `\n\nOPTIONAL METADATA:\n${JSON.stringify(metadata, null, 2)}`;
    }

    if (aiUserContext) {
      const contextSummary = {
        sponsorType: aiUserContext.questionnaireSummary?.sponsorType,
        employmentStatus: aiUserContext.questionnaireSummary?.employment?.currentStatus,
        travelDates: aiUserContext.questionnaireSummary?.travelInfo?.plannedDates,
        riskScore: aiUserContext.riskScore?.level,
      };
      prompt += `\n\nAI_USER_CONTEXT (for conditional requirements):\n${JSON.stringify(contextSummary, null, 2)}`;
    }

    prompt += `\n\nEvaluate the document and return the JSON result following all rules in the system prompt.`;

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
