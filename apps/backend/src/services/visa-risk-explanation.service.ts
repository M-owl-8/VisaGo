/**
 * Visa Risk Explanation Service
 * Uses GPT-4 to explain visa risk and provide improvement advice
 */

import { PrismaClient } from '@prisma/client';
import { AIOpenAIService } from './ai-openai.service';
import { buildCanonicalAIUserContextForApplication, computeRiskLevel } from './ai-context.service';
import { VisaRulesService } from './visa-rules.service';
import { getAIConfig } from '../config/ai-models';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { CanonicalAIUserContext } from '../types/ai-context';
import { z } from 'zod';
import { getCountryVisaPlaybook, type VisaCategory } from '../config/country-visa-playbooks';
import {
  normalizeCountryCode,
  getCountryNameFromCode,
  buildCanonicalCountryContext,
  assertCountryConsistency,
} from '../config/country-registry';

const prisma = new PrismaClient();

const clampPercent = (value: number | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  return Math.min(100, Math.max(0, Math.round(value)));
};

const riskLevelToStrengthPercent = (riskLevel: 'low' | 'medium' | 'high') => {
  switch (riskLevel) {
    case 'low':
      return 80;
    case 'medium':
      return 60;
    default:
      return 40;
  }
};

/**
 * Risk Explanation Response Schema (EXPERT VERSION - Phase 3)
 * Extended with expert fields: factorWeights, improvementImpact, timeline, costEstimate, officerPerspective
 */
const RiskExplanationResponseSchema = z.object({
  riskLevel: z.enum(['low', 'medium', 'high']),
  summaryEn: z.string(),
  summaryUz: z.string(),
  summaryRu: z.string(),
  // Percentage confidence/strength derived from canonical risk score
  profileStrengthPercent: z.number().min(0).max(100).optional(),
  confidencePercent: z.number().min(0).max(100).optional(),
  recommendations: z.array(
    z.object({
      id: z.string(),
      titleEn: z.string(),
      titleUz: z.string(),
      titleRu: z.string(),
      detailsEn: z.string(),
      detailsUz: z.string(),
      detailsRu: z.string(),
      // Phase 3: Expert fields (optional for backward compatibility)
      improvementImpact: z.string().optional(), // Expected impact on approval chances
      timeline: z.string().optional(), // How long to implement
      costEstimate: z.string().optional(), // Estimated cost
    })
  ),
  // Phase 3: Expert fields (optional for backward compatibility)
  factorWeights: z
    .object({
      financial: z.number().optional(), // Weight of financial factors (0.0-1.0)
      ties: z.number().optional(), // Weight of ties factors (0.0-1.0)
      travelHistory: z.number().optional(), // Weight of travel history (0.0-1.0)
      purpose: z.number().optional(), // Weight of purpose clarity (0.0-1.0)
      other: z.number().optional(), // Weight of other factors (0.0-1.0)
    })
    .optional(),
  improvementImpact: z
    .object({
      overall: z.string().optional(), // Overall expected impact
      probabilityIncrease: z.number().optional(), // Expected probability increase (0-100)
    })
    .optional(),
  timeline: z.string().optional(), // Timeline for implementing all recommendations
  costEstimate: z
    .object({
      total: z.number().optional(), // Total estimated cost (USD)
      currency: z.string().optional(), // Currency code
      breakdown: z.array(z.object({ item: z.string(), cost: z.number() })).optional(),
    })
    .optional(),
  officerPerspective: z.string().optional(), // Expert perspective on what officers will evaluate
});

export type RiskExplanationResponse = z.infer<typeof RiskExplanationResponseSchema>;

/**
 * Visa Risk Explanation Service
 */
export class VisaRiskExplanationService {
  /**
   * ⚠️ DEV-ONLY: Build system and user prompts for evaluation/testing
   *
   * This helper allows evaluation harnesses to build prompts without hitting the database.
   * It takes synthetic CanonicalAIUserContext and returns the prompts that would be sent to GPT-4.
   *
   * DO NOT use in production code paths. This is for testing/evaluation only.
   *
   * @param canonicalContext - Synthetic CanonicalAIUserContext (for evaluation)
   * @param checklistItems - Optional synthetic checklist items (for evaluation)
   * @returns Object with systemPrompt and userPrompt strings
   */
  static buildPromptsForEvaluation(
    canonicalContext: CanonicalAIUserContext,
    checklistItems: any[] = []
  ): { systemPrompt: string; userPrompt: string } {
    // Phase 8: Use canonical country from countryContext
    const countryCode =
      canonicalContext.countryContext?.countryCode || canonicalContext.application.country;
    const countryName = canonicalContext.countryContext?.countryName || 'Unknown';
    const schengen = canonicalContext.countryContext?.schengen || false;
    const systemPrompt = this.buildSystemPrompt(countryCode, countryName, schengen);

    // Phase 3: Get playbook for evaluation (if country/visaType available)
    const visaType = canonicalContext.applicantProfile.visaType;
    let playbook: any = null;
    if (countryCode && visaType) {
      const visaCategory: VisaCategory =
        visaType.toLowerCase().includes('student') ||
        visaType.toLowerCase().includes('study') ||
        visaType.toLowerCase() === 'f-1' ||
        visaType.toLowerCase() === 'j-1'
          ? 'student'
          : 'tourist';
      playbook = getCountryVisaPlaybook(countryCode, visaCategory);
    }
    const userPrompt = this.buildUserPrompt(
      canonicalContext,
      checklistItems,
      undefined,
      playbook || undefined,
      countryCode,
      countryName
    );
    return { systemPrompt, userPrompt };
  }

  /**
   * Generate risk explanation for an application
   */
  static async generateRiskExplanation(
    userId: string,
    applicationId: string
  ): Promise<RiskExplanationResponse> {
    try {
      // Check if explanation already exists
      const existing = await prisma.visaRiskExplanation.findUnique({
        where: { applicationId },
      });

      if (existing) {
        // Return cached explanation
        const recommendations =
          typeof existing.recommendations === 'string'
            ? JSON.parse(existing.recommendations)
            : existing.recommendations;

        const cachedRiskLevel = existing.riskLevel as 'low' | 'medium' | 'high';
        const cachedStrengthPercent = riskLevelToStrengthPercent(cachedRiskLevel);

        return {
          riskLevel: cachedRiskLevel,
          summaryEn: existing.summaryEn,
          summaryUz: existing.summaryUz,
          summaryRu: existing.summaryRu,
          profileStrengthPercent: cachedStrengthPercent,
          confidencePercent: cachedStrengthPercent,
          recommendations: Array.isArray(recommendations) ? recommendations : [],
        };
      }

      // Get application
      const application = await prisma.visaApplication.findUnique({
        where: { id: applicationId },
        include: {
          country: true,
          visaType: true,
        },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // Verify ownership
      if (application.userId !== userId) {
        throw new Error('Unauthorized');
      }

      // Build canonical context
      const canonicalContext = await buildCanonicalAIUserContextForApplication(
        userId,
        applicationId
      );

      // Phase 8: Normalize country code using CountryRegistry
      const normalizedCountryCode =
        normalizeCountryCode(application.country.code) || application.country.code.toUpperCase();
      const countryContext = buildCanonicalCountryContext(normalizedCountryCode);
      const countryName = countryContext?.countryName || application.country.name;

      // Assert consistency
      const consistency = assertCountryConsistency(
        normalizedCountryCode,
        application.country.code,
        canonicalContext.application.country,
        canonicalContext.countryContext?.countryCode
      );
      if (!consistency.consistent) {
        logWarn('[VisaRiskExplanation] Country consistency check failed', {
          mismatches: consistency.mismatches,
          normalizedCountryCode,
          originalCountryCode: application.country.code,
        });
      }

      // Phase 3: Get ruleSet and playbook
      const visaTypeNameForPlaybook = application.visaType.name.toLowerCase();
      let ruleSet: any = null;
      try {
        ruleSet = await VisaRulesService.getActiveRuleSet(
          normalizedCountryCode,
          visaTypeNameForPlaybook
        );
        if (ruleSet) {
          (canonicalContext as any).ruleSet = ruleSet;
        }
      } catch (error) {
        // Non-blocking, continue without ruleSet
      }

      // Phase 3: Get country visa playbook
      const visaCategory: VisaCategory =
        visaTypeNameForPlaybook.toLowerCase().includes('student') ||
        visaTypeNameForPlaybook.toLowerCase().includes('study') ||
        visaTypeNameForPlaybook.toLowerCase() === 'f-1' ||
        visaTypeNameForPlaybook.toLowerCase() === 'j-1'
          ? 'student'
          : 'tourist';
      const playbook = getCountryVisaPlaybook(normalizedCountryCode, visaCategory);

      // Get checklist if available (to see document situation)
      const checklist = await prisma.documentChecklist.findUnique({
        where: { applicationId },
      });

      let checklistItems: any[] = [];
      if (checklist?.checklistData) {
        try {
          const checklistData =
            typeof checklist.checklistData === 'string'
              ? JSON.parse(checklist.checklistData)
              : checklist.checklistData;
          checklistItems = checklistData.items || checklistData.checklist || [];
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Build prompts (Phase 8: Pass canonical country context)
      const systemPrompt = this.buildSystemPrompt(
        normalizedCountryCode,
        countryName,
        countryContext?.schengen || false
      );
      const userPrompt = this.buildUserPrompt(
        canonicalContext,
        checklistItems,
        ruleSet,
        playbook || undefined,
        normalizedCountryCode,
        countryName
      );

      // Get AI config
      const aiConfig = getAIConfig('riskExplanation');

      logInfo('[VisaRiskExplanation] Calling GPT-4 for risk explanation', {
        task: 'riskExplanation',
        applicationId,
        countryCode: normalizedCountryCode,
        countryName,
        countryCodeCanonical: normalizedCountryCode,
        countryNameCanonical: countryName,
        countryConsistencyStatus: consistency.consistent ? 'consistent' : 'mismatch_detected',
        visaType: application.visaType.name,
        riskLevel: canonicalContext.riskScore.level,
        model: aiConfig.model,
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
      });

      const startTime = Date.now();
      const response = await AIOpenAIService.getOpenAIClient().chat.completions.create({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
        response_format: aiConfig.responseFormat || undefined,
      });

      const responseTime = Date.now() - startTime;
      const rawContent = response.choices[0]?.message?.content || '{}';
      const tokensUsed = response.usage?.total_tokens || 0;

      logInfo('[VisaRiskExplanation] GPT-4 response received', {
        task: 'riskExplanation',
        applicationId,
        countryCode: application.country.code,
        visaType: application.visaType.name,
        model: aiConfig.model,
        tokensUsed,
        responseTimeMs: responseTime,
      });

      // Parse and validate
      let parsed: any;
      try {
        parsed = JSON.parse(rawContent);
      } catch (parseError) {
        throw new Error(`Failed to parse GPT response: ${parseError}`);
      }

      const validationResult = RiskExplanationResponseSchema.safeParse(parsed);
      if (!validationResult.success) {
        logError(
          '[VisaRiskExplanation] Schema validation failed',
          new Error('Invalid response structure'),
          {
            applicationId,
            errors: validationResult.error.errors,
          }
        );
        throw new Error(
          `Invalid response structure: ${validationResult.error.errors.map((e) => e.message).join(', ')}`
        );
      }

      let explanation = validationResult.data;

      // Post-processing: Fix country name mismatches and ensure riskLevel consistency
      // Phase 8: Use canonical country name from CountryRegistry (already set above)
      const visaTypeName = application.visaType.name;

      // Phase 2: Use centralized computeRiskLevel for consistency
      const canonicalRiskScorePercent = canonicalContext?.riskScore?.probabilityPercent || 70;
      const canonicalRiskLevel = computeRiskLevel(canonicalRiskScorePercent);
      const profileStrengthPercent = clampPercent(100 - canonicalRiskScorePercent);
      const confidencePercent = clampPercent(100 - canonicalRiskScorePercent);

      // Check for country name mismatches in text
      const countryMismatches: string[] = [];
      const commonCountryNames: Record<string, string[]> = {
        ES: ['Spain', 'Ispaniya', 'Испания'],
        GB: ['UK', 'United Kingdom', 'United Kingdom', 'Великобритания'],
        US: ['USA', 'United States', 'US', 'Америка'],
        DE: ['Germany', 'Germaniya', 'Германия'],
        CA: ['Canada', 'Kanada', 'Канада'],
        AU: ['Australia', 'Avstraliya', 'Австралия'],
        JP: ['Japan', 'Yaponiya', 'Япония'],
        KR: ['South Korea', 'Koreya', 'Корея'],
        AE: ['UAE', 'United Arab Emirates', 'ОАЭ'],
      };

      // Phase 8: Use canonical country name from CountryRegistry
      const correctNames = [countryName]; // Only canonical name is correct
      const incorrectNames = Object.entries(commonCountryNames)
        .filter(([code]) => code !== normalizedCountryCode)
        .flatMap(([, names]) => names);

      // Helper function to fix country name leakage in text
      const fixCountryLeakage = (text: string): string => {
        if (!text) return text;
        let fixedText = text;
        const textLower = text.toLowerCase();

        for (const incorrectName of incorrectNames) {
          if (textLower.includes(incorrectName.toLowerCase())) {
            // Replace incorrect country name with correct one (case-insensitive, whole word or phrase)
            const escapedName = incorrectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
            fixedText = fixedText.replace(regex, countryName);

            // Also replace common variations
            if (
              incorrectName.toLowerCase() === 'uk' ||
              incorrectName.toLowerCase() === 'united kingdom'
            ) {
              fixedText = fixedText.replace(/\bUK\b/gi, countryName);
              fixedText = fixedText.replace(/\bUnited Kingdom\b/gi, countryName);
              fixedText = fixedText.replace(/\bGreat Britain\b/gi, countryName);
              fixedText = fixedText.replace(/\bBritain\b/gi, countryName);
            }
            if (
              incorrectName.toLowerCase() === 'us' ||
              incorrectName.toLowerCase() === 'united states' ||
              incorrectName.toLowerCase() === 'usa'
            ) {
              fixedText = fixedText.replace(/\bUS\b/gi, countryName);
              fixedText = fixedText.replace(/\bUSA\b/gi, countryName);
              fixedText = fixedText.replace(/\bUnited States\b/gi, countryName);
              fixedText = fixedText.replace(/\bUnited States of America\b/gi, countryName);
            }
          }
        }

        return fixedText;
      };

      // Check and fix summaries
      const originalSummaryEn = explanation.summaryEn;
      const originalSummaryUz = explanation.summaryUz;
      const originalSummaryRu = explanation.summaryRu;

      explanation.summaryEn = fixCountryLeakage(explanation.summaryEn);
      explanation.summaryUz = fixCountryLeakage(explanation.summaryUz);
      explanation.summaryRu = fixCountryLeakage(explanation.summaryRu);

      // Log mismatches for summaries
      if (explanation.summaryEn !== originalSummaryEn) {
        countryMismatches.push('summaryEn mentions incorrect country but was corrected');
      }
      if (explanation.summaryUz !== originalSummaryUz) {
        countryMismatches.push('summaryUz mentions incorrect country but was corrected');
      }
      if (explanation.summaryRu !== originalSummaryRu) {
        countryMismatches.push('summaryRu mentions incorrect country but was corrected');
      }

      // Check and fix recommendations
      if (explanation.recommendations) {
        explanation.recommendations = explanation.recommendations.map((rec: any, index: number) => {
          const fixedRec = { ...rec };
          let wasFixed = false;

          // Fix each field
          const originalTitleEn = fixedRec.titleEn;
          const originalTitleUz = fixedRec.titleUz;
          const originalTitleRu = fixedRec.titleRu;
          const originalDetailsEn = fixedRec.detailsEn;
          const originalDetailsUz = fixedRec.detailsUz;
          const originalDetailsRu = fixedRec.detailsRu;

          fixedRec.titleEn = fixCountryLeakage(fixedRec.titleEn || '');
          fixedRec.titleUz = fixCountryLeakage(fixedRec.titleUz || '');
          fixedRec.titleRu = fixCountryLeakage(fixedRec.titleRu || '');
          fixedRec.detailsEn = fixCountryLeakage(fixedRec.detailsEn || '');
          fixedRec.detailsUz = fixCountryLeakage(fixedRec.detailsUz || '');
          fixedRec.detailsRu = fixCountryLeakage(fixedRec.detailsRu || '');

          // Log if any field was fixed
          if (
            fixedRec.titleEn !== originalTitleEn ||
            fixedRec.titleUz !== originalTitleUz ||
            fixedRec.titleRu !== originalTitleRu ||
            fixedRec.detailsEn !== originalDetailsEn ||
            fixedRec.detailsUz !== originalDetailsUz ||
            fixedRec.detailsRu !== originalDetailsRu
          ) {
            wasFixed = true;
            countryMismatches.push(
              `recommendations[${index}] mentions incorrect country but was corrected`
            );
          }

          return fixedRec;
        });
      }

      if (countryMismatches.length > 0) {
        logWarn('[VisaRiskExplanation] Country name mismatch detected and corrected', {
          applicationId,
          countryCode: normalizedCountryCode,
          countryName,
          visaType: visaTypeName,
          mismatches: countryMismatches,
        });
      }

      // Phase 2: Ensure riskLevel consistency - always use canonical risk level as source of truth
      // If GPT's riskLevel differs from canonical, use canonical (source of truth)
      if (explanation.riskLevel !== canonicalRiskLevel) {
        logWarn('[VisaRiskExplanation] Risk level mismatch: using canonical risk level', {
          applicationId,
          gptRiskLevel: explanation.riskLevel,
          canonicalRiskLevel,
          riskScorePercent: canonicalRiskScorePercent,
          decision: 'using_canonical',
        });
        explanation = {
          ...explanation,
          riskLevel: canonicalRiskLevel,
        };
      }

      // Always attach normalized strength/confidence derived from canonical risk score
      explanation = {
        ...explanation,
        profileStrengthPercent:
          profileStrengthPercent ?? riskLevelToStrengthPercent(explanation.riskLevel),
        confidencePercent: confidencePercent ?? riskLevelToStrengthPercent(explanation.riskLevel),
      };

      // Store in database
      await prisma.visaRiskExplanation.upsert({
        where: { applicationId },
        create: {
          applicationId,
          userId,
          countryCode: normalizedCountryCode,
          visaType: application.visaType.name.toLowerCase(),
          riskLevel: explanation.riskLevel,
          summaryEn: explanation.summaryEn,
          summaryUz: explanation.summaryUz,
          summaryRu: explanation.summaryRu,
          recommendations: JSON.stringify(explanation.recommendations) as any,
        },
        update: {
          riskLevel: explanation.riskLevel,
          summaryEn: explanation.summaryEn,
          summaryUz: explanation.summaryUz,
          summaryRu: explanation.summaryRu,
          recommendations: JSON.stringify(explanation.recommendations) as any,
        },
      });

      logInfo('[VisaRiskExplanation] Risk explanation generated successfully', {
        task: 'riskExplanation',
        applicationId,
        countryCode: application.country.code,
        visaType: application.visaType.name,
        riskLevel: explanation.riskLevel,
        recommendationsCount: explanation.recommendations.length,
        model: aiConfig.model,
        tokensUsed,
        responseTimeMs: responseTime,
      });

      return explanation;
    } catch (error) {
      logError('[VisaRiskExplanation] Error generating risk explanation', error as Error, {
        userId,
        applicationId,
      });
      throw error;
    }
  }

  /**
   * Build system prompt for risk explanation (Risk Engine v2)
   *
   * v2 Changes:
   * - GPT-4 NEVER changes numbers or risk levels (explanation + recommendations only)
   * - Must base reasons only on riskDrivers and expertFields
   * - Always output exactly 3 recommendations tied to riskDrivers
   * - Must not invent new reasons not supported by data
   */
  private static buildSystemPrompt(
    countryCode?: string,
    countryName?: string,
    schengen?: boolean
  ): string {
    // Phase 8: Use canonical country in prompt
    const countrySection =
      countryCode && countryName
        ? `\n\nIMPORTANT COUNTRY CONTEXT:\n- The ONLY valid country for this task is ${countryName} (${countryCode})\n- You MUST NOT refer to any other country\n- If embassy rules for other countries appear in your memory, ignore them${schengen ? '\n- This is a Schengen country. You may reference "Schengen" as a group, but always specify ' + countryName + ' as the primary country' : ''}\n`
        : '';

    return `You are Ketdik's visa risk explanation engine.${countrySection}

================================================================================
YOUR ROLE
================================================================================

You NEVER change any numbers or risk levels.

You ONLY explain and give recommendations based on the structured data provided.

You are given:
- riskSummary (riskScore 0–100, riskLevel, probabilityPercent, riskDrivers, positiveFactors)
- expertFields (financial sufficiency, ties strength, travel history, previous refusals, etc.)
- profile (visa type, country, duration, basic demographics)

================================================================================
CRITICAL RULES
================================================================================

1. Treat riskSummary.riskLevel and riskSummary.probabilityPercent as the single source of truth.

2. If riskLevel = 'high' you MUST explicitly say "high risk".

3. You MUST NOT contradict or recalculate these values.

4. Explanations must be 100% grounded in riskDrivers and expertFields.

5. Only explain reasons that appear in riskDrivers or can be directly derived from expertFields.

6. DO NOT invent any new reasons that are not supported by the data.

================================================================================
OUTPUT REQUIREMENTS
================================================================================

You MUST return ONLY valid JSON matching this exact schema:

{
  "riskLevel": "low" | "medium" | "high",
  "summaryEn": "Brief explanation in English (2-3 sentences)",
  "summaryUz": "Brief explanation in Uzbek (2-3 sentences)",
  "summaryRu": "Brief explanation in Russian (2-3 sentences)",
  "recommendations": [
    {
      "id": "rec_1",
      "titleEn": "Recommendation title in English",
      "titleUz": "Recommendation title in Uzbek",
      "titleRu": "Recommendation title in Russian",
      "detailsEn": "Detailed explanation in English (1-2 sentences)",
      "detailsUz": "Detailed explanation in Uzbek (1-2 sentences)",
      "detailsRu": "Detailed explanation in Russian (1-2 sentences)"
    },
    {
      "id": "rec_2",
      ...
    },
    {
      "id": "rec_3",
      ...
    }
  ]
}

================================================================================
SUMMARY REQUIREMENTS
================================================================================

- summaryEn/Uz/Ru: 2-3 sentences each
- MUST explicitly reference:
  * Main risk drivers in human language (e.g., "Main risk factors: limited travel history, sponsor-based finance, weak ties.")
  * Financial sufficiency (e.g., "Your financial capacity is borderline because you have X vs required Y.")
  * Ties (strong/medium/weak) - reference property, employment, family explicitly
  * Travel history (none/limited/good/strong)
  * The exact riskLevel provided (e.g., "Your application has high risk" if riskLevel = 'high')
- CRITICAL: You must refer ONLY to the exact country name provided in the user prompt. NEVER mention any other destination country.
- Uzbek (Uz): Simple, clear language with common terminology (bank hisoboti, ish joyidan ma'lumotnoma, kadastr hujjati)
- Russian (Ru): Formal but simple
- English (En): Neutral, embassy-style

================================================================================
RECOMMENDATIONS REQUIREMENTS
================================================================================

- EXACTLY 3 recommendations (no more, no less)
- Each with titleEn/Uz/Ru and detailsEn/Uz/Ru
- MUST connect each recommendation to specific riskDrivers:
  * Example: if limited_travel_history is present, recommend detailed itinerary, previous passport stamps, etc.
  * Example: if low_funds or borderline_funds is present, recommend improving balance over 3–6 months, adding sponsor with proof, etc.
  * Example: if weak_ties, recommend stronger proof of ties (employment letters, property docs, family documents).
- Be realistic and clear:
  * Do NOT guarantee approval.
  * Your tone: honest, helpful, not scary.
- Should be:
  * Concrete ("Increase your bank balance to at least X USD and show 3-6 months statement.")
  * Prioritized for impact (highest impact first)
  * Realistic for Uzbek ecosystem (Uzbek banks, property docs, employment letters, kadastr, etc.)

================================================================================
FINAL INSTRUCTIONS
================================================================================

- Be honest and direct, but supportive (not fear-inducing)
- Use expert fields directly in your reasoning
- Reference Uzbek context naturally
- Return ONLY valid JSON, no markdown, no extra text`;
  }

  /**
   * Build user prompt with applicant context (EXPERT CONSULTANT VERSION - Phase 5)
   *
   * Phase 5 Upgrade:
   * - Structured APPLICANT_CONTEXT with expert fields grouped
   * - Explicit "EXPERT RISK ANALYSIS REQUIRED" section
   * - Clear instructions on using expert fields for risk assessment
   *
   * Phase 8 Upgrade:
   * - Uses canonical country code and name from CountryRegistry
   */
  private static buildUserPrompt(
    context: any,
    checklistItems: any[],
    ruleSet?: any,
    playbook?: any,
    countryCode?: string,
    countryName?: string
  ): string {
    const profile = context.applicantProfile;
    const riskScore = context.riskScore;

    // Phase 8: Use canonical country from parameters or context
    const canonicalCountryCode =
      countryCode ||
      context.countryContext?.countryCode ||
      context.application?.country ||
      profile.targetCountry ||
      'Unknown';
    const canonicalCountryName = countryName || context.countryContext?.countryName || 'Unknown';
    const isSchengen = context.countryContext?.schengen || false;

    let prompt = `EXPERT RISK ANALYSIS REQUIRED:

You are analyzing a visa application for an Uzbek applicant. Your task:
1. Determine riskLevel (low/medium/high) with short justification based on expert fields
2. Write 3-language summaries (En/Uz/Ru) explicitly referencing:
   - Financial sufficiency (availableFundsUSD vs requiredFundsUSD, financialSufficiencyLabel)
   - Ties strength (tiesStrengthLabel, property, employment, family)
   - Travel history (travelHistoryLabel, previous rejections, overstay)
3. Provide 2-4 prioritized recommendations:
   - Highest impact first
   - Realistic to do in Uzbekistan (Uzbek banks, kadastr, employment letters, etc.)
   - Each with En/Uz/Ru titles+details

================================================================================
APPLICATION CONTEXT
================================================================================

- Country Code: ${canonicalCountryCode}
- Country Name: ${canonicalCountryName}
- Visa Type: ${profile.visaType}
${isSchengen ? '- Note: This is a Schengen country. You may reference "Schengen" as a group, but always specify ' + canonicalCountryName + ' as the primary country.\n' : ''}
CRITICAL COUNTRY IDENTITY (Phase 8):
- The ONLY valid country for this task is ${canonicalCountryName} (${canonicalCountryCode})
- You MUST NOT refer to any other country
- If embassy rules for other countries appear in your memory, ignore them
- NEVER mention any other country. Only refer to "${canonicalCountryName}" (${canonicalCountryCode})
- Use the exact country name "${canonicalCountryName}" in all summaries and recommendations
- Duration: ${profile.duration || 'Unknown'}

================================================================================
APPLICANT PROFILE
================================================================================

- Citizenship: ${profile.citizenship || 'Unknown'}
- Age: ${profile.age || 'Unknown'}
- Current Status: ${profile.currentStatus || 'Unknown'}
- Sponsor Type: ${profile.sponsorType || 'Unknown'}
- Bank Balance USD: ${profile.bankBalanceUSD ? `$${profile.bankBalanceUSD.toLocaleString()}` : 'Unknown'}
- Monthly Income USD: ${profile.monthlyIncomeUSD ? `$${profile.monthlyIncomeUSD.toLocaleString()}` : 'Unknown'}

================================================================================
EXPERT FIELDS (Pre-computed metrics for risk assessment)
================================================================================

FINANCIAL:
${
  profile.financial
    ? `- Required Funds USD: ${profile.financial.requiredFundsUSD ? `$${profile.financial.requiredFundsUSD.toLocaleString()}` : 'N/A'}
- Available Funds USD: ${profile.financial.availableFundsUSD ? `$${profile.financial.availableFundsUSD.toLocaleString()}` : 'N/A'}
- Financial Sufficiency Ratio: ${profile.financial.financialSufficiencyRatio?.toFixed(2) ?? 'N/A'}
- Financial Sufficiency Label: ${profile.financial.financialSufficiencyLabel ?? 'N/A'}`
    : '- Financial metrics: Not available'
}

TIES:
${
  profile.ties
    ? `- Ties Strength Score: ${profile.ties.tiesStrengthScore?.toFixed(2) ?? 'N/A'}
- Ties Strength Label: ${profile.ties.tiesStrengthLabel ?? 'N/A'}
- Has Property in Uzbekistan: ${(profile as any).hasPropertyInUzbekistan ? 'Yes' : 'No'}
- Has Family in Uzbekistan: ${(profile as any).hasFamilyInUzbekistan ? 'Yes' : 'No'}
- Has Children: ${(profile as any).hasChildren ? 'Yes' : 'No'}
- Current Employment Status: ${profile.currentStatus || 'Unknown'} (${profile.isEmployed ? 'Employed' : profile.currentStatus === 'student' ? 'Student' : profile.currentStatus === 'unemployed' ? 'Unemployed' : 'Unknown'})
- Employment Duration (months): ${profile.ties.employmentDurationMonths ?? 'N/A'}`
    : '- Ties metrics: Not available'
}

TRAVEL HISTORY:
${
  profile.travelHistory
    ? `- Travel History Score: ${profile.travelHistory.travelHistoryScore?.toFixed(2) ?? 'N/A'}
- Travel History Label: ${profile.travelHistory.travelHistoryLabel ?? 'N/A'}
- Previous Visa Rejections Count: ${profile.travelHistory.previousVisaRejections ?? 0}
- Has Overstay History: ${profile.travelHistory.hasOverstayHistory ? 'Yes' : 'No'}`
    : '- Travel history metrics: Not available'
}

UZBEK CONTEXT:
${
  context.uzbekContext
    ? `- Is Uzbek Citizen: ${context.uzbekContext.isUzbekCitizen ? 'Yes' : 'No'}
- Resides in Uzbekistan: ${context.uzbekContext.residesInUzbekistan ? 'Yes' : 'No'}`
    : '- Uzbek context: Not available'
}

================================================================================
RULE-BASED RISK SCORE
================================================================================

- Risk Level: ${riskScore.level} (MUST use this exact level in your response - do not contradict it)
- Probability: ${riskScore.probabilityPercent}%
- Risk Factors: ${riskScore.riskFactors.join(', ') || 'None'}
- Positive Factors: ${riskScore.positiveFactors.join(', ') || 'None'}

================================================================================
RISK DRIVERS (Phase 2: Explicit risk factors)
================================================================================

${JSON.stringify((context as any).riskDrivers || [], null, 2)}

Use these risk drivers to:
1. List main risk drivers in human language in your summary (e.g., "Main risk factors: limited travel history, sponsor-based finance, weak ties.")
2. Connect each recommendation to specific risk drivers (e.g., "Because your funds are borderline for a 3-month stay, we strongly recommend adding 6 months of bank statements and sponsor documents.")

================================================================================
DATA COMPLETENESS
================================================================================

${
  context.meta
    ? `- Data Completeness Score: ${context.meta.dataCompletenessScore?.toFixed(2) ?? 'N/A'}${context.meta.missingCriticalFields && context.meta.missingCriticalFields.length > 0 ? `\n- Missing Critical Fields: ${context.meta.missingCriticalFields.join(', ')}` : ''}`
    : '- Data completeness: Not available'
}

================================================================================
CHECKLIST STATUS
================================================================================

- Total Documents: ${checklistItems.length}
- Required Documents: ${checklistItems.filter((i: any) => i.category === 'required' || i.required).length}
- Uploaded Documents: ${checklistItems.filter((i: any) => i.status === 'verified' || i.status === 'uploaded').length}
- Verified Documents: ${checklistItems.filter((i: any) => i.status === 'verified').length}

================================================================================

Provide expert risk analysis using the systematic approach described in the system prompt.`;

    return prompt;
  }
}
