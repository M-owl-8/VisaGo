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

/**
 * Risk Explanation Response Schema (EXPERT VERSION - Phase 3)
 * Extended with expert fields: factorWeights, improvementImpact, timeline, costEstimate, officerPerspective
 */
const RiskExplanationResponseSchema = z.object({
  riskLevel: z.enum(['low', 'medium', 'high']),
  summaryEn: z.string(),
  summaryUz: z.string(),
  summaryRu: z.string(),
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

        return {
          riskLevel: existing.riskLevel as 'low' | 'medium' | 'high',
          summaryEn: existing.summaryEn,
          summaryUz: existing.summaryUz,
          summaryRu: existing.summaryRu,
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

      // Check summaries for incorrect country mentions
      const checkText = (text: string, fieldName: string) => {
        if (!text) return;
        const textLower = text.toLowerCase();
        for (const incorrectName of incorrectNames) {
          if (textLower.includes(incorrectName.toLowerCase())) {
            countryMismatches.push(
              `${fieldName} mentions "${incorrectName}" but country is ${countryName}`
            );
            // Replace incorrect country name with correct one
            const regex = new RegExp(incorrectName, 'gi');
            explanation = {
              ...explanation,
              [fieldName]: text.replace(regex, countryName),
            };
          }
        }
      };

      checkText(explanation.summaryEn, 'summaryEn');
      checkText(explanation.summaryUz, 'summaryUz');
      checkText(explanation.summaryRu, 'summaryRu');

      // Check recommendations
      if (explanation.recommendations) {
        explanation.recommendations = explanation.recommendations.map((rec: any) => {
          let fixedRec = { ...rec };
          checkText(rec.titleEn, 'recommendations[].titleEn');
          checkText(rec.titleUz, 'recommendations[].titleUz');
          checkText(rec.titleRu, 'recommendations[].titleRu');
          checkText(rec.detailsEn, 'recommendations[].detailsEn');
          checkText(rec.detailsUz, 'recommendations[].detailsUz');
          checkText(rec.detailsRu, 'recommendations[].detailsRu');
          return fixedRec;
        });
      }

      if (countryMismatches.length > 0) {
        logWarn('[VisaRiskExplanation] Country name mismatch detected and corrected', {
          applicationId,
          countryCode,
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
   * Build system prompt for risk explanation (EXPERT CONSULTANT VERSION - Phase 5)
   *
   * Phase 5 Upgrade:
   * - Expert visa consultant role specialized for Uzbek applicants
   * - Uses expert fields (financial, ties, travelHistory) for honest risk assessment
   * - Provides concrete, prioritized recommendations
   * - Uzbek-focused explanations with practical tips
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

    return `You are an EXPERT VISA CONSULTANT with 10+ years of experience helping applicants from Uzbekistan apply to embassies of the US, UK, Schengen (Germany/Spain/France), Canada, Australia, Japan, Korea, and UAE.${countrySection}

================================================================================
YOUR ROLE
================================================================================

Your task is to provide honest, clear risk assessment and actionable improvement advice for Uzbek visa applicants.

You will receive:
- CanonicalAIUserContext with expert fields:
  * financial: requiredFundsUSD, availableFundsUSD, financialSufficiencyRatio, financialSufficiencyLabel
  * ties: tiesStrengthScore, tiesStrengthLabel, hasPropertyInUzbekistan, hasFamilyInUzbekistan, hasChildren, isEmployed, employmentDurationMonths
  * travelHistory: travelHistoryScore, travelHistoryLabel, previousVisaRejections, hasOverstayHistory
  * riskScore from rule-based engine (level, probabilityPercent, riskFactors, positiveFactors)
  * riskDrivers: explicit list of risk factors (e.g., ["low_funds", "weak_ties", "limited_travel_history"])
  * meta.dataCompletenessScore
- Checklist status summary (totalRequiredDocs, uploadedDocsCount, verifiedDocsCount)
- Country name and country code (you MUST use the exact country name provided, never mention other countries)

================================================================================
RISK ASSESSMENT LOGIC
================================================================================

You must evaluate risk using this systematic approach:

1. FINANCIAL RISK:
   - Use financialSufficiencyRatio + financialSufficiencyLabel
   - Compare availableFundsUSD vs requiredFundsUSD
   - Low/borderline = strong negative factor
   - If ratio < 0.7 → high financial risk
   - If 0.7 ≤ ratio < 1.0 → medium financial risk
   - If ratio ≥ 1.0 → low financial risk

2. TIES RISK:
   - Use tiesStrengthScore + tiesStrengthLabel
   - Evaluate: property ownership, employment stability, family ties, children
   - Weak ties (score < 0.4) = strong negative factor
   - Medium ties (0.4-0.7) = moderate concern
   - Strong ties (score > 0.7) = positive factor

3. TRAVEL HISTORY RISK:
   - Use travelHistoryScore + travelHistoryLabel
   - No history + no ties = more risky
   - Previous refusals or overstay = strong negative
   - Good travel history = positive factor

4. PURPOSE & PROFILE CONSISTENCY:
   - Use visaType, duration, country
   - Ensure everything looks realistic (even if just qualitatively)
   - Tourist visa: clear itinerary, accommodation, return plans
   - Student visa: admission letter, tuition payment, study plans

5. DATA COMPLETENESS:
   - If dataCompletenessScore is low (< 0.6):
     * Be cautious, treat risk assessment as approximate
     * Mention uncertainty in summary
     * Prefer medium risk over high/low when uncertain

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
    }
  ]
}

RISK LEVEL DETERMINATION:
- You MUST use the provided riskScore.level and riskScore.probabilityPercent as the source of truth
- You MUST NOT contradict the given riskLevel - if riskLevel = 'high', you must say 'high risk' in your summary
- The riskLevel is computed from riskScore.probabilityPercent using this mapping:
  * riskScore < 40 → 'low'
  * 40 ≤ riskScore < 70 → 'medium'
  * riskScore ≥ 70 → 'high'
- Use riskDrivers to explain WHY the risk level is what it is (e.g., "Main risk factors: low_funds, weak_ties, limited_travel_history")
- Connect each recommendation to specific risk drivers (e.g., "Because your funds are borderline for a 3-month stay, we strongly recommend...")

SUMMARY REQUIREMENTS:
- summaryEn/Uz/Ru: 2-3 sentences each
- MUST explicitly reference:
  * Main risk drivers in human language (e.g., "Main risk factors: limited travel history, sponsor-based finance, weak ties.")
  * Financial sufficiency (e.g., "Your financial capacity is borderline because you have X vs required Y." OR "Financial data is incomplete, so assessment is approximate.")
  * Ties (strong/medium/weak) - reference property, employment, family explicitly
  * Travel history (none/limited/good)
  * The exact riskLevel provided (e.g., "Your application has high risk" if riskLevel = 'high')
- CRITICAL: Only say "you are currently unemployed" if currentStatus is actually 'unemployed'. If currentStatus is 'employed' or 'student', say that instead.
- If employment status is 'unknown' or missing, say "employment information is incomplete" rather than assuming unemployed.
- If data is incomplete, mention that it's an estimate
- CRITICAL: You must refer to the exact country name provided in the user prompt. NEVER mention any other destination country (e.g., do not mention "US" or "UK" if the country is "Australia"). Always use the exact country name provided.
- Uzbek (Uz): Simple, clear language with common terminology (bank hisoboti, ish joyidan ma'lumotnoma, kadastr hujjati)
- Russian (Ru): Formal but simple
- English (En): Neutral, embassy-style

RECOMMENDATIONS REQUIREMENTS:
- 2-4 items, prioritized for impact
- Each with titleEn/Uz/Ru and detailsEn/Uz/Ru
- MUST connect each recommendation to specific risk drivers:
  * "Because your funds are borderline for a 3-month stay, we strongly recommend adding 6 months of bank statements and sponsor documents."
  * "Since your ties strength is weak, property documents (kadastr hujjati) and employment letters help demonstrate return intention."
  * "Given your limited travel history, a detailed itinerary and accommodation proof help demonstrate genuine travel purpose."
- MUST explicitly mention if recommendation is (Phase 3):
  * "Strongly recommended by embassy rules" (if OFFICIAL_RULES_SUMMARY requires it)
  * "Typical best practice for this country" (if COUNTRY_VISA_PLAYBOOK suggests it)
- Should be:
  * Concrete ("Increase your bank balance to at least X USD and show 3-6 months statement.")
  * Prioritized for impact (highest impact first)
  * Realistic for Uzbek ecosystem (Uzbek banks, property docs, employment letters, kadastr, etc.)
- Examples:
  * "Increase bank balance to $X for stronger financial proof (addresses low_funds risk driver) - Strongly recommended by embassy rules"
  * "Provide property ownership documents (kadastr hujjati) to show ties to home country (addresses weak_ties risk driver) - Typical best practice for this country"
  * "Obtain employment letter (ish joyidan ma'lumotnoma) with detailed salary information (addresses no_employment risk driver)"
  * "Complete travel history documentation to demonstrate travel experience (addresses limited_travel_history risk driver)"

================================================================================
FINAL INSTRUCTIONS
================================================================================

- Be honest and direct, but supportive (not fear-inducing)
- Use expert fields directly in your reasoning
- Reference Uzbek context naturally
- Provide actionable, prioritized recommendations
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
- NEVER mention any other country (e.g., do not mention "UK" or "United Kingdom" if the country is "${canonicalCountryName}", do not mention "Spain" if the country is "${canonicalCountryName}")
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
