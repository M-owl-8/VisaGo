/**
 * Visa Checklist Engine Service
 * Uses VisaRuleSet from database + AIUserContext to generate personalized checklists
 * This replaces the old GPT-4-based checklist generation with a rule-based + AI enrichment approach
 */

import { AIOpenAIService } from './ai-openai.service';
import { VisaRulesService, VisaRuleSetData } from './visa-rules.service';
import { AIUserContext, CanonicalAIUserContext } from '../types/ai-context';
import { buildCanonicalAIUserContext } from './ai-context.service';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { logChecklistGeneration, extractApplicationId } from '../utils/gpt-logging';
import { z } from 'zod';

/**
 * Checklist Item Schema (using Zod for validation)
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
    try {
      logInfo('[VisaChecklistEngine] Generating checklist', {
        countryCode,
        visaType,
        hasPreviousChecklist: !!previousChecklist,
      });

      // Step 1: Get approved VisaRuleSet from database
      const ruleSet = await VisaRulesService.getActiveRuleSet(
        countryCode.toUpperCase(),
        visaType.toLowerCase()
      );

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
      const baseDocuments = buildBaseChecklistFromRules(aiUserContext, ruleSet);

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
      const userPrompt = this.buildUserPrompt(aiUserContext, baseDocuments, previousChecklist);

      // Step 4: Call GPT-4 with structured output using checklist model
      const checklistModel = AIOpenAIService.getChecklistModel();
      console.log(`[Checklist][AI] Using model: ${checklistModel}`, {
        countryCode,
        visaType,
        mode: 'visa-checklist-engine',
      });

      logInfo('[VisaChecklistEngine] Calling GPT-4 for checklist generation', {
        model: checklistModel,
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

      return parsed as ChecklistResponse;
    } catch (error) {
      const applicationId = extractApplicationId(aiUserContext);
      const countryName = (aiUserContext as any)?.application?.country?.name || countryCode;

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
   * Build system prompt for checklist generation (COMPACT VERSION)
   * GPT only enriches fields, does NOT invent new documentTypes
   */
  private static buildSystemPrompt(
    countryCode: string,
    visaType: string,
    ruleSet: VisaRuleSetData,
    embassySummary?: string
  ): string {
    const embassyContext = embassySummary
      ? `\nEMBASSY SUMMARY:\n${embassySummary.substring(0, 500)}\n`
      : '';

    return `You are a visa checklist enricher. Your ONLY job: enrich base documents with names, descriptions, and personalization flags.

CRITICAL RULES:
- You MUST output exactly the documentTypes provided in BASE_DOCUMENTS
- You MUST NOT add new documentTypes
- You MUST NOT remove documentTypes
- You MUST NOT change category or required status
- You ONLY enrich: name, nameUz, nameRu, description, appliesToThisApplicant, reasonIfApplies

OUTPUT SCHEMA:
{
  "checklist": [
    {
      "id": "string",
      "documentType": "string",      // MUST match BASE_DOCUMENTS exactly
      "category": "required" | "highly_recommended" | "optional",  // MUST match BASE_DOCUMENTS
      "required": boolean,           // MUST match BASE_DOCUMENTS
      "name": "string",              // EN name
      "nameUz": "string",            // Uzbek translation
      "nameRu": "string",            // Russian translation
      "description": "string",       // 1-2 sentences
      "appliesToThisApplicant": boolean,  // Does THIS applicant need it?
      "reasonIfApplies": "string",   // Why it applies (if appliesToThisApplicant=true)
      "extraRecommended": boolean,
      "group": "identity" | "financial" | "travel" | "education" | "employment" | "ties" | "other",
      "priority": number,
      "dependsOn": ["string"]
    }
  ]
}

${embassyContext}Return ONLY valid JSON, no markdown.`;
  }

  /**
   * OLD SYSTEM PROMPT (kept for reference/rollback)
   * Enable via feature flag: USE_COMPACT_CHECKLIST_PROMPTS=false
   */
  private static buildSystemPromptLegacy(
    countryCode: string,
    visaType: string,
    ruleSet: VisaRuleSetData
  ): string {
    return `You are "VisaChecklistEngine", an embassy-level visa document rules engine.

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

KEY RULES:

1. SOURCE OF TRUTH
- VISA_RULE_SET.requiredDocuments is the ONLY canonical list of official documents.
- You are NOT allowed to invent completely new mandatory documents.
- You may add at most a few "extraRecommended" documents IF they are logically implied by:
  - riskScore is high,
  - previousRefusals exist,
  - weak ties to home country.
- Any "extraRecommended" document MUST have extraRecommended = true and category != "required".

2. PERSONALIZATION USING AI_USER_CONTEXT
- For each requiredDocument in VISA_RULE_SET:
  - Decide if it applies based on AI_USER_CONTEXT.
  - Examples:
    - Sponsor-related documents apply only if sponsorType is not "self".
    - Employer letter applies only if employmentStatus is "employed".
    - Student documents apply only if the applicant is a student or has admission.
    - Extra financial proof may apply when riskScore is high or sponsor income is low.
- Set:
  - required = true only if this document is mandatory for this applicant.
  - appliesToThisApplicant = true if they must or strongly should submit it.
  - extraRecommended = true if not mandatory but helpful for approval.

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
   * Build user prompt with base documents (COMPACT VERSION)
   * GPT only enriches, does NOT decide which documents to include
   */
  private static buildUserPrompt(
    aiUserContext: AIUserContext,
    baseDocuments: Array<{ documentType: string; category: string; required: boolean }>,
    previousChecklist?: ChecklistItem[]
  ): string {
    // Convert to canonical format for consistent GPT input
    const canonical = buildCanonicalAIUserContext(aiUserContext);
    const profile = canonical.applicantProfile;
    const riskScore = canonical.riskScore;

    // Compact applicant context
    const applicantContext = {
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
  private static buildUserPromptLegacy(
    aiUserContext: AIUserContext,
    ruleSet: VisaRuleSetData,
    previousChecklist?: ChecklistItem[]
  ): string {
    // Convert to canonical format for consistent GPT input
    const canonical = buildCanonicalAIUserContext(aiUserContext);
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
