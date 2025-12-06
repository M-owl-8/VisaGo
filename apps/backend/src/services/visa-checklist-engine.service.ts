/**
 * Visa Checklist Engine Service
 * Uses VisaRuleSet from database + AIUserContext to generate personalized checklists
 * This replaces the old GPT-4-based checklist generation with a rule-based + AI enrichment approach
 */

import { AIOpenAIService } from './ai-openai.service';
import { getAIConfig } from '../config/ai-models';
import { getEnvConfig } from '../config/env';
import { VisaRulesService, VisaRuleSetData } from './visa-rules.service';
import { AIUserContext, CanonicalAIUserContext } from '../types/ai-context';
import { buildCanonicalAIUserContext } from './ai-context.service';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { logChecklistGeneration, extractApplicationId } from '../utils/gpt-logging';
import { z } from 'zod';
import { PROMPT_VERSIONS } from '../ai-training/config';

/**
 * Checklist Item Schema (using Zod for validation)
 * Phase 3: Extended with expert fields
 */
const ChecklistItemSchema = z.object({
  id: z.string(),
  documentType: z.string(),
  category: z.enum(['required', 'highly_recommended', 'optional']),
  required: z.boolean(),
  name: z.string(),
  nameUz: z.string(),
  nameRu: z.string(),
  description: z.string(),
  appliesToThisApplicant: z.boolean(),
  reasonIfApplies: z.string().optional(),
  extraRecommended: z.boolean(),
  group: z.enum(['identity', 'financial', 'travel', 'education', 'employment', 'ties', 'other']),
  priority: z.number().int().min(1),
  dependsOn: z.array(z.string()).optional(),
  // Phase 3: Expert fields (optional for backward compatibility)
  expertReasoning: z
    .object({
      financialRelevance: z.string().optional(), // Why this document matters for financial sufficiency
      tiesRelevance: z.string().optional(), // How this document strengthens ties
      riskMitigation: z.array(z.string()).optional(), // Risk factors this document addresses
      embassyOfficerPerspective: z.string().optional(), // What officers look for
    })
    .optional(),
  financialDetails: z
    .object({
      minRequired: z.number().nullable().optional(), // Minimum funds required
      applicantHas: z.number().nullable().optional(), // What applicant has available
      ratio: z.number().nullable().optional(), // applicantHas / minRequired
      meetsRequirement: z.boolean().optional(), // Whether requirement is met
    })
    .optional(),
  tiesDetails: z
    .object({
      strengthensTies: z.boolean().optional(), // Whether this document strengthens ties
      tiesStrengthContribution: z.number().optional(), // Contribution to ties strength (0.0-1.0)
    })
    .optional(),
  countrySpecificRequirements: z
    .object({
      format: z.string().optional(), // Required format
      apostille: z.boolean().optional(), // Whether apostille required
      translation: z.string().optional(), // Translation requirements
      validityPeriod: z.string().optional(), // Validity period requirements
      officerNotes: z.string().optional(), // Country-specific officer notes
    })
    .optional(),
});

const ChecklistResponseSchema = z.object({
  checklist: z.array(ChecklistItemSchema),
});

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type ChecklistResponse = z.infer<typeof ChecklistResponseSchema>;

/**
 * Visa Checklist Engine Service
 */
export class VisaChecklistEngineService {
  /**
   * Generate personalized checklist from VisaRuleSet + AIUserContext
   */
  static async generateChecklist(
    countryCode: string,
    visaType: string,
    aiUserContext: AIUserContext,
    previousChecklist?: ChecklistItem[]
  ): Promise<ChecklistResponse> {
    // Variables for error handling (declared outside try block for catch access)
    let capturedBaseDocuments: any[] = [];
    let capturedRuleSetId: string | null = null;

    try {
      logInfo('[VisaChecklistEngine] Generating checklist', {
        countryCode,
        visaType,
        hasPreviousChecklist: !!previousChecklist,
      });

      // Step 1: Get approved VisaRuleSet from database
      // Check if catalog mode is enabled and if we need references
      let useCatalog = false;
      try {
        const config = getEnvConfig();
        useCatalog = config.USE_GLOBAL_DOCUMENT_CATALOG === true;
      } catch (error) {
        // If config parsing fails, fall back to direct env read (for safety)
        useCatalog = process.env.USE_GLOBAL_DOCUMENT_CATALOG === 'true';
      }

      let ruleSet: VisaRuleSetData | null = null;
      let ruleSetId: string | undefined;
      let ruleSetCountryCode: string | undefined;
      let ruleSetVisaType: string | undefined;
      let documentReferences:
        | Array<{
            id: string;
            documentId: string;
            condition?: string | null;
            categoryOverride?: string | null;
          }>
        | undefined;

      if (useCatalog) {
        // Get full ruleSet with references for catalog mode (if available)
        const ruleSetWithRefs = await VisaRulesService.getActiveRuleSetWithReferences(
          countryCode.toUpperCase(),
          visaType.toLowerCase()
        );

        if (ruleSetWithRefs) {
          ruleSet = ruleSetWithRefs.data;
          ruleSetId = ruleSetWithRefs.id;
          ruleSetCountryCode = ruleSetWithRefs.countryCode;
          ruleSetVisaType = ruleSetWithRefs.visaType;
          // Only use catalog if references exist
          if (ruleSetWithRefs.documentReferences && ruleSetWithRefs.documentReferences.length > 0) {
            documentReferences = ruleSetWithRefs.documentReferences.map((ref) => ({
              id: ref.id,
              documentId: ref.documentId,
              condition: ref.condition,
              categoryOverride: ref.categoryOverride,
            }));
          }
        } else {
          // No rule set found, will fall back to legacy mode
          useCatalog = false;
        }
      }

      // If catalog mode not enabled or no references, get just the data
      if (!useCatalog || !documentReferences || documentReferences.length === 0) {
        if (!ruleSet) {
          ruleSet = await VisaRulesService.getActiveRuleSet(
            countryCode.toUpperCase(),
            visaType.toLowerCase()
          );
        }
        // Clear references if we're not using catalog mode
        documentReferences = undefined;
      }

      if (!ruleSet) {
        logInfo('[VisaChecklistEngine] No approved rule set found, returning null for fallback', {
          countryCode,
          visaType,
        });
        // Return null so caller can fall back to legacy mode
        return null as any;
      }

      // Step 2: Build base checklist from rules (documents are determined here)
      const { buildBaseChecklistFromRules } = await import('./checklist-rules.service');
      const baseDocuments = await buildBaseChecklistFromRules(aiUserContext, ruleSet, {
        ruleSetId,
        countryCode: ruleSetCountryCode,
        visaType: ruleSetVisaType,
        documentReferences,
      });

      // Store for error handling
      capturedBaseDocuments = baseDocuments;
      capturedRuleSetId = ruleSetId || null;

      if (baseDocuments.length === 0) {
        logWarn('[VisaChecklistEngine] Base checklist is empty', {
          countryCode,
          visaType,
        });
        return null as any;
      }

      // Step 3: Get optional embassy summary (if available)
      let embassySummary: string | undefined;
      try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        const source = await prisma.embassySource.findFirst({
          where: {
            countryCode: countryCode.toUpperCase(),
            visaType: visaType.toLowerCase(),
            isActive: true,
          },
          include: {
            pageContents: {
              where: { status: 'success' },
              orderBy: { fetchedAt: 'desc' },
              take: 1,
            },
          },
        });
        if (source?.pageContents?.[0]?.cleanedText) {
          embassySummary = source.pageContents[0].cleanedText.substring(0, 1000);
        }
        await prisma.$disconnect();
      } catch (error) {
        // Embassy summary is optional, continue without it
        logWarn('[VisaChecklistEngine] Could not fetch embassy summary', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Step 4: Build compact system prompt
      const useCompactPrompts = process.env.USE_COMPACT_CHECKLIST_PROMPTS !== 'false'; // Default: true
      const systemPrompt = useCompactPrompts
        ? this.buildSystemPrompt(countryCode, visaType, ruleSet, embassySummary)
        : this.buildSystemPromptLegacy(countryCode, visaType, ruleSet);

      // Step 5: Build compact user prompt with base documents
      const userPrompt = await this.buildUserPrompt(
        aiUserContext,
        baseDocuments,
        previousChecklist
      );

      // Step 4: Resolve model from registry (with fallback)
      const defaultChecklistModel = AIOpenAIService.getChecklistModel();
      const modelRouting = await AIOpenAIService['resolveModelForTask'](
        'checklist_enrichment',
        defaultChecklistModel
      );
      const checklistModel = modelRouting.modelName;
      const modelVersionId = modelRouting.modelVersionId;

      console.log(`[Checklist][AI] Using model: ${checklistModel}`, {
        countryCode,
        visaType,
        mode: 'visa-checklist-engine',
        modelVersionId,
      });

      logInfo('[VisaChecklistEngine] Calling GPT-4 for checklist generation', {
        model: checklistModel,
        modelVersionId,
        countryCode,
        visaType,
      });

      const startTime = Date.now();
      const response = await AIOpenAIService.getOpenAIClient().chat.completions.create({
        model: checklistModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent output
        max_tokens: 3000, // Allow for detailed checklists
        response_format: { type: 'json_object' }, // Force JSON output
      });

      const responseTime = Date.now() - startTime;
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const totalTokens = inputTokens + outputTokens;

      const rawContent = response.choices[0]?.message?.content || '{}';

      logInfo('[VisaChecklistEngine] GPT-4 response received', {
        model: response?.model || checklistModel,
        countryCode,
        visaType,
        responseLength: rawContent.length,
        tokensUsed: totalTokens,
        responseTimeMs: responseTime,
      });

      // Step 5: Parse and validate JSON
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

      // Step 6: Validate against schema
      let validationResult = ChecklistResponseSchema.safeParse(parsed);

      if (!validationResult.success) {
        jsonValidationRetries++;
        logError(
          '[VisaChecklistEngine] Schema validation failed',
          new Error('Invalid checklist structure'),
          {
            countryCode,
            visaType,
            errors: validationResult.error.errors,
          }
        );
      } else {
        // Additional validation: ensure all base documents are present and no extras
        const responseDocTypes = new Set(
          validationResult.data.checklist.map((item) => item.documentType)
        );
        const baseDocTypes = new Set(baseDocuments.map((doc) => doc.documentType));

        const missing = Array.from(baseDocTypes).filter((dt) => !responseDocTypes.has(dt));
        const extra = Array.from(responseDocTypes).filter((dt) => !baseDocTypes.has(dt));

        if (missing.length > 0 || extra.length > 0) {
          logWarn('[VisaChecklistEngine] Document type mismatch', {
            countryCode,
            visaType,
            missing,
            extra,
          });

          // Fix: remove extras, add missing with defaults
          const fixedChecklist = [...validationResult.data.checklist];

          // Remove extras
          const filtered = fixedChecklist.filter((item) => baseDocTypes.has(item.documentType));

          // Add missing
          for (const docType of missing) {
            const baseDoc = baseDocuments.find((d) => d.documentType === docType);
            if (baseDoc) {
              filtered.push({
                id: `DOC_${filtered.length + 1}`,
                documentType: baseDoc.documentType,
                category: baseDoc.category as 'required' | 'highly_recommended' | 'optional',
                required: baseDoc.required,
                name: baseDoc.documentType,
                nameUz: baseDoc.documentType,
                nameRu: baseDoc.documentType,
                description: `Required document: ${baseDoc.documentType}`,
                appliesToThisApplicant: true,
                extraRecommended: false,
                group: 'other',
                priority: filtered.length + 1,
              });
            }
          }

          parsed = { checklist: filtered };
          // Re-validate after fix
          validationResult = ChecklistResponseSchema.safeParse(parsed);
        }
      }

      if (!validationResult.success) {
        jsonValidationRetries++;

        // Try to fix common issues
        const fixed = this.fixCommonIssues(parsed);
        const fixedValidation = ChecklistResponseSchema.safeParse(fixed);

        if (!fixedValidation.success) {
          throw new Error(
            `Schema validation failed: ${validationResult.error.errors.map((e) => e.message).join(', ')}`
          );
        }

        parsed = fixedValidation.data;
        jsonValidationPassed = true;
      } else {
        parsed = validationResult.data;
        jsonValidationPassed = true;
      }

      // Phase 3: Apply risk-weighted prioritization
      const canonical = await buildCanonicalAIUserContext(aiUserContext);
      parsed.checklist = this.applyRiskWeightedPrioritization(parsed.checklist, canonical);

      // Get condition warnings from base documents (reuse already computed baseDocuments)
      const conditionWarnings: string[] = [];
      // Note: condition warnings are logged in buildBaseChecklistFromRules, but we'll capture them here if needed

      // Extract application ID for logging
      const applicationId = extractApplicationId(aiUserContext);

      // Get country name (try to get from context or use code)
      const countryName = (aiUserContext as any)?.application?.country?.name || countryCode;

      // Log structured checklist generation
      logChecklistGeneration({
        applicationId,
        country: countryName,
        countryCode,
        visaType,
        mode: 'rules',
        jsonValidationPassed,
        jsonValidationRetries,
        itemCount: parsed.checklist.length,
        conditionWarnings: conditionWarnings.length > 0 ? conditionWarnings : undefined,
        tokensUsed: totalTokens,
        responseTimeMs: responseTime,
      });

      logInfo('[VisaChecklistEngine] Checklist generated successfully', {
        countryCode,
        visaType,
        itemCount: parsed.checklist.length,
      });

      // Record AI interaction for training data pipeline
      const userId = (aiUserContext as any)?.userProfile?.userId;
      const promptVersion =
        process.env.USE_COMPACT_CHECKLIST_PROMPTS !== 'false'
          ? PROMPT_VERSIONS.CHECKLIST_PROMPT_V2_EXPERT
          : PROMPT_VERSIONS.CHECKLIST_PROMPT_V1;
      const source = process.env.AI_EVAL_MODE === 'true' ? ('eval' as const) : ('prod' as const);

      await AIOpenAIService['recordAIInteraction']({
        taskType: 'checklist_enrichment',
        model: checklistModel,
        promptVersion,
        source,
        modelVersionId,
        requestPayload: {
          systemPrompt,
          userPrompt,
          countryCode,
          visaType,
          baseDocuments,
          canonicalAIUserContext: canonical,
          embassySummary,
        },
        responsePayload: parsed,
        success: true,
        contextMeta: {
          countryCode,
          visaType,
          ruleSetId,
          applicationId,
          userId,
        },
      }).catch((err) => {
        // Don't fail the request if logging fails
        logWarn('[VisaChecklistEngine] Failed to record AI interaction', {
          error: err instanceof Error ? err.message : String(err),
        });
      });

      return parsed as ChecklistResponse;
    } catch (error) {
      const applicationId = extractApplicationId(aiUserContext);
      const countryName = (aiUserContext as any)?.application?.country?.name || countryCode;
      const userId = (aiUserContext as any)?.userProfile?.userId;
      const promptVersion =
        process.env.USE_COMPACT_CHECKLIST_PROMPTS !== 'false'
          ? PROMPT_VERSIONS.CHECKLIST_PROMPT_V2_EXPERT
          : PROMPT_VERSIONS.CHECKLIST_PROMPT_V1;
      const source = process.env.AI_EVAL_MODE === 'true' ? ('eval' as const) : ('prod' as const);

      // Record failed interaction (use captured values if available)
      const failedBaseDocuments = capturedBaseDocuments || [];
      const failedRuleSetId = capturedRuleSetId || null;

      await AIOpenAIService['recordAIInteraction']({
        taskType: 'checklist_enrichment',
        model: AIOpenAIService.getChecklistModel(),
        promptVersion,
        source,
        requestPayload: {
          countryCode,
          visaType,
          baseDocuments: failedBaseDocuments,
        },
        responsePayload: {},
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        contextMeta: {
          countryCode,
          visaType,
          ruleSetId: failedRuleSetId,
          applicationId,
          userId,
        },
      }).catch(() => {
        // Ignore logging errors
      });

      logChecklistGeneration({
        applicationId,
        country: countryName,
        countryCode,
        visaType,
        mode: 'rules',
        jsonValidationPassed: false,
        jsonValidationRetries: 0,
        itemCount: 0,
        error: error instanceof Error ? error.message : String(error),
      });

      logError('[VisaChecklistEngine] Checklist generation failed', error as Error, {
        countryCode,
        visaType,
      });
      // Return null on error so caller can fall back
      return null as any;
    }
  }

  /**
   * Generate checklist for an application (convenience method)
   * @param application - Application object with country and visaType
   * @param aiUserContext - AI user context with questionnaire data
   * @returns ChecklistResponse or null if no rules exist or generation fails
   */
  static async generateChecklistForApplication(
    application: { country: { code: string; name: string }; visaType: { name: string } },
    aiUserContext: AIUserContext
  ): Promise<ChecklistResponse | null> {
    const countryCode = application.country.code.toUpperCase();
    const visaType = application.visaType.name.toLowerCase();

    return this.generateChecklist(countryCode, visaType, aiUserContext);
  }

  /**
   * Build system prompt for checklist generation (EXPERT VERSION - Phase 3)
   * GPT acts as an expert visa officer with deep immigration reasoning
   */
  private static buildSystemPrompt(
    countryCode: string,
    visaType: string,
    ruleSet: VisaRuleSetData,
    embassySummary?: string
  ): string {
    const embassyContext = embassySummary
      ? `\nEMBASSY SUMMARY:\n${embassySummary.substring(0, 2000)}\n`
      : '';

    return `You are an EXPERT VISA OFFICER with 15+ years of experience evaluating visa applications from Uzbek applicants.

================================================================================
YOUR EXPERTISE
================================================================================

You have deep knowledge of:
- Immigration law and visa requirements for ${countryCode} ${visaType.toUpperCase()} visas
- Financial sufficiency assessment (calculating required funds, evaluating income stability, sponsor credibility)
- Ties assessment (property, employment, family, children - all factors that prove return intention)
- Risk factor identification (previous refusals, weak finances, unclear purpose, immigration intent)
- Embassy officer evaluation criteria and decision-making patterns
- Country-specific requirements, terminology, and common refusal reasons

================================================================================
YOUR ROLE: EXPERT CHECKLIST ENRICHMENT
================================================================================

Your ONLY job: Enrich base documents with expert-level names, descriptions, and personalization.

CRITICAL RULES:
- You MUST output exactly the documentTypes provided in BASE_DOCUMENTS
- You MUST NOT add new documentTypes
- You MUST NOT remove documentTypes
- You MUST NOT change category or required status
- You ONLY enrich: name, nameUz, nameRu, description, appliesToThisApplicant, reasonIfApplies

================================================================================
EXPERT REASONING FRAMEWORK
================================================================================

When evaluating appliesToThisApplicant, think like an embassy officer:

1. FINANCIAL SUFFICIENCY REASONING:
   - Calculate: Does applicant have sufficient funds? (availableFunds / requiredFunds ratio)
   - If ratio < 1.0: Financial documents are CRITICAL, emphasize importance
   - If sponsor: Evaluate sponsor credibility (income, relationship, dependents)
   - Consider: Income stability, savings growth trend, account age
   - Red flags: Sudden large deposits, inconsistent income, weak sponsor

2. TIES ASSESSMENT:
   - Property: Ownership duration, value, location (stronger if owned long-term)
   - Employment: Duration, stability, industry (government/established > startup)
   - Family: Spouse, children, dependent family (children = strongest tie)
   - Ties strength score: 0.0-1.0 (higher = stronger return intention)
   - If ties < 0.5: Emphasize documents that strengthen ties

3. RISK FACTOR MITIGATION:
   - Previous refusals: Include explanation letter, additional financial proof
   - Weak finances: Require stronger guarantees, sponsor letters, property docs
   - Unclear purpose: Emphasize detailed itinerary, invitation letters, travel plans
   - Immigration intent concerns: Add employment letters, property docs, family ties

4. EMBASSY OFFICER PERSPECTIVE:
   - What would an officer check first? (Financial capacity, ties, purpose clarity)
   - What documents reduce suspicion? (Employment proof, property docs, travel history)
   - What documents address common refusal reasons? (Country-specific patterns)
   - What makes an application "low risk"? (Strong finances + strong ties + clear purpose)

================================================================================
OUTPUT SCHEMA
================================================================================

{
  "checklist": [
    {
      "id": "string",
      "documentType": "string",      // MUST match BASE_DOCUMENTS exactly
      "category": "required" | "highly_recommended" | "optional",  // MUST match BASE_DOCUMENTS
      "required": boolean,           // MUST match BASE_DOCUMENTS
      "name": "string",              // Expert-level EN name (embassy terminology)
      "nameUz": "string",            // Accurate Uzbek translation
      "nameRu": "string",            // Accurate Russian translation
      "description": "string",       // Expert description explaining WHY this document matters for THIS applicant
      "appliesToThisApplicant": boolean,  // Expert evaluation: Does THIS applicant need it?
      "reasonIfApplies": "string",   // Expert reasoning: Why it applies (financial sufficiency, ties, risk mitigation)
      "extraRecommended": boolean,
      "group": "identity" | "financial" | "travel" | "education" | "employment" | "ties" | "other",
      "priority": number,
      "dependsOn": ["string"]
    }
  ]
}

================================================================================
EXPERT DESCRIPTION GUIDELINES
================================================================================

When writing descriptions, include:
- WHY this document matters for visa approval
- HOW it addresses financial sufficiency / ties / risk factors
- WHAT embassy officers look for in this document
- Country-specific requirements (format, validity, currency)

Example expert description:
"Bank statements showing consistent income and sufficient funds for the trip duration. Embassy officers verify financial capacity, income stability, and ability to cover expenses without overstaying. Required: Last 3-6 months, original documents, sufficient balance (minimum $X for ${visaType} visa to ${countryCode})."

================================================================================
EXPERT REASONING FOR appliesToThisApplicant
================================================================================

Set appliesToThisApplicant = true if:
- Document is required by rules (category = "required")
- Document addresses a specific risk factor (weak finances, weak ties, previous refusal)
- Document strengthens the application (employment proof, property docs, travel history)
- Document is conditionally required AND condition is met (sponsor docs if sponsored, employment letter if employed)

Set appliesToThisApplicant = false ONLY if:
- Document is conditionally required AND condition is NOT met
- Document is truly optional and doesn't address any risk factors

================================================================================
EXPERT REASONING FOR reasonIfApplies
================================================================================

When appliesToThisApplicant = true, provide expert reasoning:

Financial documents:
- "Required to demonstrate financial sufficiency. Applicant has $X available vs $Y required (ratio: Z%). [If ratio < 1.0: Additional proof needed to meet embassy requirements.]"

Ties documents:
- "Strengthens ties to home country. Applicant has [property/employment/family] which demonstrates return intention. Ties strength score: X/1.0."

Risk mitigation:
- "Addresses risk factor: [previous refusal/weak finances/unclear purpose]. This document helps mitigate concerns and improve approval chances."

Country-specific:
- "Required by ${countryCode} embassy for ${visaType} visas. [Specific requirement: format, validity, currency, etc.]"

${embassyContext}

================================================================================
FINAL INSTRUCTIONS
================================================================================

- Think like an expert visa officer evaluating this specific applicant
- Use financial sufficiency, ties assessment, and risk mitigation in your reasoning
- Provide expert-level descriptions that explain WHY documents matter
- Return ONLY valid JSON, no markdown, no explanations outside JSON
- All translations (UZ/RU) must be accurate and natural`;
  }

  /**
   * LEGACY SYSTEM PROMPT (EXPERT VERSION - Phase 3)
   * Enable via feature flag: USE_COMPACT_CHECKLIST_PROMPTS=false
   */
  private static buildSystemPromptLegacy(
    countryCode: string,
    visaType: string,
    ruleSet: VisaRuleSetData
  ): string {
    return `You are an EXPERT VISA OFFICER with 15+ years of experience evaluating visa applications from Uzbek applicants.

================================================================================
YOUR EXPERTISE
================================================================================

You have deep knowledge of:
- Immigration law and visa requirements for ${countryCode} ${visaType.toUpperCase()} visas
- Financial sufficiency assessment (calculating required funds, evaluating income stability, sponsor credibility)
- Ties assessment (property, employment, family, children - all factors that prove return intention)
- Risk factor identification (previous refusals, weak finances, unclear purpose, immigration intent)
- Embassy officer evaluation criteria and decision-making patterns
- Country-specific requirements, terminology, and common refusal reasons

================================================================================
YOUR ROLE: EXPERT CHECKLIST GENERATION
================================================================================

You are "VisaChecklistEngine", an EXPERT embassy-level visa document rules engine.

Your job:
- Use the provided VISA_RULE_SET as the ONLY source of official visa rules.
- Use the provided AI_USER_CONTEXT to decide which documents apply to this specific applicant.
- Produce a personalized visa document checklist for this application.
- Return ONLY valid JSON that matches the given checklist schema.

VISA_RULE_SET for ${countryCode} ${visaType.toUpperCase()}:
${JSON.stringify(ruleSet, null, 2)}

OUTPUT SCHEMA (JSON):
{
  "checklist": [
    {
      "id": "string",                // stable id if provided, or generate like "DOC_1"
      "documentType": "string",      // internal code, e.g. "passport", "bank_statement"
      "category": "required" | "highly_recommended" | "optional",
      "required": boolean,           // true if absolutely mandatory for this case
      "name": "string",              // human readable EN name
      "nameUz": "string",            // Uzbek translation
      "nameRu": "string",            // Russian translation
      "description": "string",       // short description (1–2 sentences, practical)
      "appliesToThisApplicant": boolean, // whether THIS user really needs it
      "reasonIfApplies": "string",   // short explanation why it applies (max 1–2 sentences)
      "extraRecommended": boolean,   // true if not strictly mandatory but strongly recommended
      "group": "identity" | "financial" | "travel" | "education" | "employment" | "ties" | "other",
      "priority": 1,                 // 1 = highest priority, larger number = lower priority
      "dependsOn": [ "DOC_ID", ... ] // ids of other docs that must exist first, if any
    }
  ]
}

================================================================================
EXPERT REASONING FRAMEWORK
================================================================================

When evaluating documents, think like an embassy officer:

1. FINANCIAL SUFFICIENCY REASONING:
   - Calculate: Does applicant have sufficient funds? (availableFunds / requiredFunds ratio)
   - If ratio < 1.0: Financial documents are CRITICAL, emphasize importance
   - If sponsor: Evaluate sponsor credibility (income, relationship, dependents)
   - Consider: Income stability, savings growth trend, account age, source of funds
   - Red flags: Sudden large deposits, inconsistent income, weak sponsor

2. TIES ASSESSMENT:
   - Property: Ownership duration, value, location (stronger if owned long-term)
   - Employment: Duration, stability, industry (government/established > startup)
   - Family: Spouse, children, dependent family (children = strongest tie)
   - Ties strength score: 0.0-1.0 (higher = stronger return intention)
   - If ties < 0.5: Emphasize documents that strengthen ties

3. RISK FACTOR MITIGATION:
   - Previous refusals: Include explanation letter, additional financial proof
   - Weak finances: Require stronger guarantees, sponsor letters, property docs
   - Unclear purpose: Emphasize detailed itinerary, invitation letters, travel plans
   - Immigration intent concerns: Add employment letters, property docs, family ties

4. EMBASSY OFFICER PERSPECTIVE:
   - What would an officer check first? (Financial capacity, ties, purpose clarity)
   - What documents reduce suspicion? (Employment proof, property docs, travel history)
   - What documents address common refusal reasons? (Country-specific patterns)
   - What makes an application "low risk"? (Strong finances + strong ties + clear purpose)

KEY RULES:

1. SOURCE OF TRUTH
- VISA_RULE_SET.requiredDocuments is the ONLY canonical list of official documents.
- You are NOT allowed to invent completely new mandatory documents.
- You may add at most a few "extraRecommended" documents IF they are logically implied by:
  - riskScore is high,
  - previousRefusals exist,
  - weak ties to home country,
  - financial sufficiency ratio < 1.0,
  - ties strength score < 0.5.
- Any "extraRecommended" document MUST have extraRecommended = true and category != "required".

2. EXPERT PERSONALIZATION USING AI_USER_CONTEXT
- For each requiredDocument in VISA_RULE_SET:
  - Apply expert reasoning (financial sufficiency, ties assessment, risk mitigation)
  - Examples:
    - Sponsor-related documents apply only if sponsorType is not "self".
    - Employer letter applies only if employmentStatus is "employed" AND employment duration is stable.
    - Student documents apply only if the applicant is a student or has admission.
    - Extra financial proof may apply when:
      * riskScore is high,
      * sponsor income is low,
      * financial sufficiency ratio < 1.0,
      * savings growth is "decreasing".
    - Property documents apply if ties strength < 0.5 OR riskScore is high.
- Set:
  - required = true only if this document is mandatory for this applicant.
  - appliesToThisApplicant = true if they must or strongly should submit it (use expert reasoning).
  - extraRecommended = true if not mandatory but helpful for approval (addresses risk factors).

3. CATEGORIES AND GROUPS
- Map documents into groups consistently:
  - Passport, ID card → "identity"
  - Bank statements, income proof → "financial"
  - Tickets, hotel booking, itinerary, insurance → "travel"
  - Diploma, transcript, admission letter → "education"
  - Employment contract, employer letter → "employment"
  - Property documents, family ties → "ties"
  - Anything else → "other"
- category field:
  - "required" for officially mandatory documents.
  - "highly_recommended" for documents strongly implied by rules or high risk.
  - "optional" for documents that are nice but not necessary.

4. NAMES AND DESCRIPTIONS
- name: short, clear, embassy-style name in English.
- nameUz / nameRu: localized names if obvious; otherwise reuse the English name.
- description: 1–2 sentences, practical, describing exactly what the applicant needs to provide.

5. DEPENDENCIES AND PRIORITY
- Use dependsOn to indicate logical order where helpful.
- priority: 1 = absolutely critical, 2 = very important, 3+ = supporting documents.

6. STRICTNESS AND CONSERVATISM
- If ambiguous about a document being mandatory: set category = "highly_recommended" and extraRecommended = true.
- Never downgrade clearly mandatory documents.
- Never mark a document as not needed unless the rule set clearly indicates it is conditional and the condition is not met.

7. OUTPUT RULES
- You MUST output only a single JSON object with a "checklist" array.
- No markdown, no comments, no explanations outside the JSON.
- If translations are unknown, fill nameUz/nameRu with the English name (do NOT leave them null).

Return ONLY valid JSON matching the schema, no other text.`;
  }

  /**
   * Apply risk-weighted prioritization to checklist items (Phase 3)
   * Adjusts priority based on risk factors, financial sufficiency, and ties strength
   */
  private static applyRiskWeightedPrioritization(
    checklist: ChecklistItem[],
    canonical: CanonicalAIUserContext
  ): ChecklistItem[] {
    const riskLevel = canonical.riskScore.level;
    const financialRatio = canonical.applicantProfile.financial?.financialSufficiencyRatio;
    const tiesStrength = canonical.applicantProfile.ties?.tiesStrengthScore;
    const hasPreviousRefusals = canonical.applicantProfile.previousVisaRejections;

    return checklist
      .map((item) => {
        let adjustedPriority = item.priority;

        // Risk-based adjustments
        if (riskLevel === 'high') {
          // High risk: prioritize documents that address risk factors
          if (item.group === 'financial' || item.group === 'ties' || item.group === 'employment') {
            adjustedPriority = Math.max(1, item.priority - 1); // Increase priority (lower number = higher priority)
          }
        }

        // Financial sufficiency adjustments
        if (
          financialRatio !== undefined &&
          financialRatio !== null &&
          financialRatio < 1.0 &&
          item.group === 'financial'
        ) {
          adjustedPriority = Math.max(1, item.priority - 1); // Critical if insufficient funds
        }

        // Ties strength adjustments
        if (tiesStrength !== undefined && tiesStrength < 0.5 && item.group === 'ties') {
          adjustedPriority = Math.max(1, item.priority - 1); // Critical if weak ties
        }

        // Previous refusals adjustments
        if (hasPreviousRefusals && (item.group === 'financial' || item.group === 'ties')) {
          adjustedPriority = Math.max(1, item.priority - 1); // Critical to address refusal reasons
        }

        return {
          ...item,
          priority: adjustedPriority,
        };
      })
      .sort((a, b) => a.priority - b.priority); // Sort by priority (ascending)
  }

  /**
   * Build user prompt with base documents (COMPACT VERSION)
   * GPT only enriches, does NOT decide which documents to include
   */
  private static async buildUserPrompt(
    aiUserContext: AIUserContext,
    baseDocuments: Array<{ documentType: string; category: string; required: boolean }>,
    previousChecklist?: ChecklistItem[]
  ): Promise<string> {
    // Convert to canonical format for consistent GPT input
    const canonical = await buildCanonicalAIUserContext(aiUserContext);
    const profile = canonical.applicantProfile;
    const riskScore = canonical.riskScore;

    // Expert applicant context (Phase 3: includes expert fields)
    const applicantContext = {
      // Basic fields
      sponsorType: profile.sponsorType,
      currentStatus: profile.currentStatus,
      hasInternationalTravel: profile.hasInternationalTravel,
      previousVisaRejections: profile.previousVisaRejections,
      bankBalanceUSD: profile.bankBalanceUSD,
      monthlyIncomeUSD: profile.monthlyIncomeUSD,
      hasProperty: profile.hasPropertyInUzbekistan,
      hasFamily: profile.hasFamilyInUzbekistan,
      hasChildren: profile.hasChildren,
      riskLevel: riskScore.level,
      riskProbability: riskScore.probabilityPercent,
      // Expert fields (Phase 3)
      financial: profile.financial
        ? {
            requiredFundsEstimate: profile.financial.requiredFundsEstimate,
            financialSufficiencyRatio: profile.financial.financialSufficiencyRatio,
            savingsGrowth: profile.financial.savingsGrowth,
            sourceOfFunds: profile.financial.sourceOfFunds,
            sponsor: profile.financial.sponsor,
          }
        : undefined,
      employment: profile.employment
        ? {
            employerName: profile.employment.employerName,
            employmentDurationMonths: profile.employment.employmentDurationMonths,
            employerStability: profile.employment.employerStability,
          }
        : undefined,
      ties: profile.ties
        ? {
            tiesStrengthScore: profile.ties.tiesStrengthScore,
            tiesFactors: profile.ties.tiesFactors,
          }
        : undefined,
      property: profile.property,
      embassyContext: canonical.embassyContext
        ? {
            minimumFundsRequired: canonical.embassyContext.minimumFundsRequired,
            minimumStatementMonths: canonical.embassyContext.minimumStatementMonths,
            commonRefusalReasons: canonical.embassyContext.commonRefusalReasons,
            officerEvaluationCriteria: canonical.embassyContext.officerEvaluationCriteria,
          }
        : undefined,
    };

    let prompt = `BASE_DOCUMENTS (enrich these exact documents, no additions/removals):
${JSON.stringify(baseDocuments, null, 2)}

APPLICANT_CONTEXT:
${JSON.stringify(applicantContext, null, 2)}`;

    if (previousChecklist && previousChecklist.length > 0) {
      prompt += `\n\nPREVIOUS_CHECKLIST (preserve IDs where possible):
${JSON.stringify(
  previousChecklist.map((item) => ({ id: item.id, documentType: item.documentType })),
  null,
  2
)}`;
    }

    prompt += `\n\nFor each BASE_DOCUMENT:
1. Set appliesToThisApplicant (true if document applies to this applicant based on context)
2. Set reasonIfApplies (brief explanation if appliesToThisApplicant=true)
3. Add name, nameUz, nameRu, description
4. Keep documentType, category, required EXACTLY as in BASE_DOCUMENTS

Return ONLY valid JSON.`;

    return prompt;
  }

  /**
   * OLD USER PROMPT (kept for reference/rollback)
   */
  private static async buildUserPromptLegacy(
    aiUserContext: AIUserContext,
    ruleSet: VisaRuleSetData,
    previousChecklist?: ChecklistItem[]
  ): Promise<string> {
    // Convert to canonical format for consistent GPT input
    const canonical = await buildCanonicalAIUserContext(aiUserContext);
    const profile = canonical.applicantProfile;
    const riskScore = canonical.riskScore;

    // Build explicit, human-readable context summary from canonical format
    const purpose = profile.visaType === 'student' ? 'study' : 'tourism';
    const duration = profile.duration === 'unknown' ? 'Not specified' : profile.duration;
    const sponsorType = profile.sponsorType;
    const employmentStatus =
      profile.currentStatus === 'unknown' ? 'Not specified' : profile.currentStatus;
    const hasInvitation = profile.hasUniversityInvitation || profile.hasOtherInvitation;
    const travelHistory = profile.hasInternationalTravel;
    const previousRefusals = profile.previousVisaRejections;
    const bankBalance = profile.bankBalanceUSD;
    const monthlyIncome = profile.monthlyIncomeUSD;
    const hasProperty = profile.hasPropertyInUzbekistan;
    const hasFamily = profile.hasFamilyInUzbekistan;
    const hasChildren = profile.hasChildren;
    const age = profile.age;

    let prompt = `Generate a personalized visa document checklist using the VISA_RULE_SET and the following applicant information:

APPLICANT PROFILE:
- Purpose of travel: ${purpose}
- Stay duration: ${duration}
- Employment status: ${employmentStatus}
- Sponsor: ${sponsorType === 'self' ? 'Self-funded' : `Sponsored by ${sponsorType}`}
- Approximate income/savings: ${bankBalance !== null ? `~$${bankBalance}` : monthlyIncome !== null ? `~$${monthlyIncome}/month` : 'Not specified'}
- Has invitation letter: ${hasInvitation ? 'Yes' : 'No'}
- Travel history: ${travelHistory ? 'Has previous international travel' : 'No previous international travel'}
- Previous visa refusals: ${previousRefusals ? 'Yes' : 'No'}
- Ties to home country: ${hasProperty ? 'Has property' : ''}${hasFamily ? (hasProperty ? ', has family' : 'Has family') : ''}${hasChildren ? (hasProperty || hasFamily ? ', has children' : 'Has children') : ''}${!hasProperty && !hasFamily && !hasChildren ? 'Standard ties' : ''}
- Age: ${age !== null ? age : 'Not specified'}
- Risk level: ${riskScore.level} (${riskScore.probabilityPercent}% probability)

VISA_RULE_SET.requiredDocuments:
${JSON.stringify(ruleSet.requiredDocuments, null, 2)}

${ruleSet.financialRequirements ? `\nFinancial Requirements:\n${JSON.stringify(ruleSet.financialRequirements, null, 2)}` : ''}
${ruleSet.processingInfo ? `\nProcessing Info:\n${JSON.stringify(ruleSet.processingInfo, null, 2)}` : ''}
${ruleSet.additionalRequirements ? `\nAdditional Requirements:\n${JSON.stringify(ruleSet.additionalRequirements, null, 2)}` : ''}`;

    if (previousChecklist && previousChecklist.length > 0) {
      prompt += `\n\nOPTIONAL PREVIOUS_CHECKLIST (use for preserving stable IDs and ordering where sensible):\n${JSON.stringify(previousChecklist, null, 2)}`;
    }

    prompt += `\n\nGenerate the checklist following all rules in the system prompt. Return ONLY valid JSON matching the schema.`;

    return prompt;
  }

  /**
   * Fix common issues in GPT-4 responses
   */
  private static fixCommonIssues(parsed: any): any {
    const fixed = { ...parsed };

    // Ensure checklist is an array
    if (!Array.isArray(fixed.checklist)) {
      fixed.checklist = [];
    }

    // Fix each item
    fixed.checklist = fixed.checklist.map((item: any, index: number) => {
      const fixedItem: any = {
        id: item.id || `DOC_${index + 1}`,
        documentType: item.documentType || item.document || 'unknown',
        category: ['required', 'highly_recommended', 'optional'].includes(item.category)
          ? item.category
          : 'optional',
        required: item.required !== undefined ? item.required : item.category === 'required',
        name: item.name || item.documentType || 'Unknown',
        nameUz: item.nameUz || item.name || item.documentType || 'Unknown',
        nameRu: item.nameRu || item.name || item.documentType || 'Unknown',
        description: item.description || '',
        appliesToThisApplicant:
          item.appliesToThisApplicant !== undefined ? item.appliesToThisApplicant : true,
        reasonIfApplies: item.reasonIfApplies || undefined,
        extraRecommended: item.extraRecommended !== undefined ? item.extraRecommended : false,
        group: [
          'identity',
          'financial',
          'travel',
          'education',
          'employment',
          'ties',
          'other',
        ].includes(item.group)
          ? item.group
          : 'other',
        priority: typeof item.priority === 'number' ? item.priority : index + 1,
        dependsOn: Array.isArray(item.dependsOn) ? item.dependsOn : undefined,
      };

      return fixedItem;
    });

    return fixed;
  }
}
