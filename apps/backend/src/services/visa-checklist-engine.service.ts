/**
 * Visa Checklist Engine Service
 * Uses VisaRuleSet from database + AIUserContext to generate personalized checklists
 * This replaces the old GPT-4-based checklist generation with a rule-based + AI enrichment approach
 */

import { AIOpenAIService } from './ai-openai.service';
import { VisaRulesService, VisaRuleSetData } from './visa-rules.service';
import { AIUserContext } from '../types/ai-context';
import { logInfo, logError, logWarn } from '../middleware/logger';
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
        logWarn('[VisaChecklistEngine] No approved rule set found, using fallback', {
          countryCode,
          visaType,
        });
        // Fall back to existing logic or return empty checklist
        return { checklist: [] };
      }

      // Step 2: Build system prompt
      const systemPrompt = this.buildSystemPrompt(countryCode, visaType, ruleSet);

      // Step 3: Build user prompt with context
      const userPrompt = this.buildUserPrompt(aiUserContext, ruleSet, previousChecklist);

      // Step 4: Call GPT-4 with structured output
      const response = await AIOpenAIService.getOpenAIClient().chat.completions.create({
        model: AIOpenAIService.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent output
        max_tokens: 3000, // Allow for detailed checklists
        response_format: { type: 'json_object' }, // Force JSON output
      });

      const rawContent = response.choices[0]?.message?.content || '{}';

      logInfo('[VisaChecklistEngine] GPT-4 response received', {
        countryCode,
        visaType,
        responseLength: rawContent.length,
      });

      // Step 5: Parse and validate JSON
      let parsed: any;
      try {
        parsed = JSON.parse(rawContent);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/i);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          const objectMatch = rawContent.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            parsed = JSON.parse(objectMatch[0]);
          } else {
            throw new Error('No valid JSON found in response');
          }
        }
      }

      // Step 6: Validate against schema
      const validationResult = ChecklistResponseSchema.safeParse(parsed);

      if (!validationResult.success) {
        logError(
          '[VisaChecklistEngine] Schema validation failed',
          new Error('Invalid checklist structure'),
          {
            countryCode,
            visaType,
            errors: validationResult.error.errors,
          }
        );

        // Try to fix common issues
        const fixed = this.fixCommonIssues(parsed);
        const fixedValidation = ChecklistResponseSchema.safeParse(fixed);

        if (!fixedValidation.success) {
          throw new Error(
            `Schema validation failed: ${validationResult.error.errors.map((e) => e.message).join(', ')}`
          );
        }

        parsed = fixedValidation.data;
      } else {
        parsed = validationResult.data;
      }

      logInfo('[VisaChecklistEngine] Checklist generated successfully', {
        countryCode,
        visaType,
        itemCount: parsed.checklist.length,
      });

      return parsed as ChecklistResponse;
    } catch (error) {
      logError('[VisaChecklistEngine] Checklist generation failed', error as Error, {
        countryCode,
        visaType,
      });
      throw error;
    }
  }

  /**
   * Build system prompt for checklist generation
   */
  private static buildSystemPrompt(
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
   * Build user prompt with AIUserContext
   */
  private static buildUserPrompt(
    aiUserContext: AIUserContext,
    ruleSet: VisaRuleSetData,
    previousChecklist?: ChecklistItem[]
  ): string {
    const contextSummary = {
      basicInfo: {
        age: aiUserContext.userProfile?.age,
        citizenship: aiUserContext.userProfile?.citizenship,
        residenceCountry:
          aiUserContext.questionnaireSummary?.personalInfo?.currentResidenceCountry || 'Uzbekistan',
      },
      visaInfo: {
        visaType: aiUserContext.questionnaireSummary?.visaType,
        targetCountry: aiUserContext.questionnaireSummary?.targetCountry,
        intendedDuration: aiUserContext.questionnaireSummary?.travelInfo?.duration,
        travelDates: aiUserContext.questionnaireSummary?.travelInfo?.plannedDates,
      },
      sponsorInfo: {
        sponsorType: aiUserContext.questionnaireSummary?.sponsorType,
        sponsorIncome:
          aiUserContext.questionnaireSummary?.financialInfo?.sponsorDetails?.annualIncomeUSD,
        sponsorSavings: aiUserContext.questionnaireSummary?.financialInfo?.selfFundsUSD,
      },
      workStudy: {
        employmentStatus: aiUserContext.questionnaireSummary?.employment?.currentStatus,
        employerType: aiUserContext.questionnaireSummary?.employment?.employerName,
        studentStatus: aiUserContext.questionnaireSummary?.education?.isStudent,
        admissionStatus: aiUserContext.questionnaireSummary?.education?.hasGraduated,
      },
      travelRisk: {
        travelHistory: aiUserContext.questionnaireSummary?.hasInternationalTravel,
        previousRefusals: aiUserContext.questionnaireSummary?.previousVisaRejections,
        riskScore: aiUserContext.riskScore?.level,
        riskProbability: aiUserContext.riskScore?.probabilityPercent,
      },
    };

    let prompt = `Generate a personalized visa document checklist using the VISA_RULE_SET and AI_USER_CONTEXT.

AI_USER_CONTEXT:
${JSON.stringify(contextSummary, null, 2)}

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
