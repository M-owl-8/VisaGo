/**
 * Visa Risk Explanation Service
 * Uses GPT-4 to explain visa risk and provide improvement advice
 */

import { PrismaClient } from '@prisma/client';
import { AIOpenAIService } from './ai-openai.service';
import { buildCanonicalAIUserContextForApplication } from './ai-context.service';
import { VisaRulesService } from './visa-rules.service';
import { getAIConfig } from '../config/ai-models';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { CanonicalAIUserContext } from '../types/ai-context';
import { z } from 'zod';

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
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(canonicalContext, checklistItems);
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

      // Phase 6: Get ruleSet for embassyRulesConfidence
      try {
        const ruleSet = await VisaRulesService.getActiveRuleSet(
          application.country.code.toUpperCase(),
          application.visaType.name.toLowerCase()
        );
        if (ruleSet) {
          (canonicalContext as any).ruleSet = ruleSet;
        }
      } catch (error) {
        // Non-blocking, continue without ruleSet
      }

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

      // Build prompts
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(canonicalContext, checklistItems);

      // Get AI config
      const aiConfig = getAIConfig('riskExplanation');

      logInfo('[VisaRiskExplanation] Calling GPT-4 for risk explanation', {
        task: 'riskExplanation',
        applicationId,
        countryCode: application.country.code,
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
      const countryName = application.country.name;
      const countryCode = application.country.code.toUpperCase();
      const visaTypeName = application.visaType.name;

      // Use already-built canonical context for risk level (source of truth)
      const canonicalRiskLevel = canonicalContext?.riskScore?.level || 'medium';

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

      const correctNames = commonCountryNames[countryCode] || [countryName];
      const incorrectNames = Object.entries(commonCountryNames)
        .filter(([code]) => code !== countryCode)
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

      // Ensure riskLevel consistency: use canonical risk level as source of truth
      // Map numeric riskScore to riskLevel if needed
      const riskScorePercent = canonicalContext.riskScore?.probabilityPercent || 50;
      let expectedRiskLevel: 'low' | 'medium' | 'high' = 'medium';
      if (riskScorePercent >= 75) {
        expectedRiskLevel = 'high';
      } else if (riskScorePercent <= 40) {
        expectedRiskLevel = 'low';
      }

      // If GPT's riskLevel differs significantly from canonical, use canonical
      const riskLevelMap: Record<string, number> = { low: 1, medium: 2, high: 3 };
      const gptLevel = riskLevelMap[explanation.riskLevel] || 2;
      const canonicalLevel = riskLevelMap[canonicalRiskLevel] || 2;

      if (Math.abs(gptLevel - canonicalLevel) > 1) {
        // Significant mismatch - use canonical
        logWarn('[VisaRiskExplanation] Risk level mismatch: using canonical risk level', {
          applicationId,
          gptRiskLevel: explanation.riskLevel,
          canonicalRiskLevel,
          riskScorePercent,
          decision: 'using_canonical',
        });
        explanation = {
          ...explanation,
          riskLevel: canonicalRiskLevel as 'low' | 'medium' | 'high',
        };
      } else if (
        explanation.riskLevel !== expectedRiskLevel &&
        Math.abs(gptLevel - riskLevelMap[expectedRiskLevel]) <= 1
      ) {
        // Minor mismatch - prefer expected based on numeric score
        explanation = {
          ...explanation,
          riskLevel: expectedRiskLevel,
        };
      }

      // Store in database
      await prisma.visaRiskExplanation.upsert({
        where: { applicationId },
        create: {
          applicationId,
          userId,
          countryCode: application.country.code.toUpperCase(),
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
  private static buildSystemPrompt(): string {
    return `You are an EXPERT VISA CONSULTANT with 10+ years of experience helping applicants from Uzbekistan apply to embassies of the US, UK, Schengen (Germany/Spain), Canada, Australia, Japan, Korea, and UAE.

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
  * meta.dataCompletenessScore
- Checklist status summary (totalRequiredDocs, uploadedDocsCount, verifiedDocsCount)

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
- riskLevel MUST reflect combined effect of financial, ties, travel history, and rule-based riskScore.level
- If rule-based level is high OR financial/ties are very weak → 'high'
- If mixed (some strong, some weak) → 'medium'
- If strong finances + strong ties + no serious negatives → 'low'

SUMMARY REQUIREMENTS:
- summaryEn/Uz/Ru: 2-3 sentences each
- MUST explicitly reference:
  * Financial sufficiency (e.g., "Your financial capacity is borderline because you have X vs required Y." OR "Financial data is incomplete, so assessment is approximate.")
  * Ties (strong/medium/weak) - reference property, employment, family explicitly
  * Travel history (none/limited/good)
- CRITICAL: Only say "you are currently unemployed" if currentStatus is actually 'unemployed'. If currentStatus is 'employed' or 'student', say that instead.
- If employment status is 'unknown' or missing, say "employment information is incomplete" rather than assuming unemployed.
- If data is incomplete, mention that it's an estimate
- Uzbek (Uz): Simple, clear language with common terminology (bank hisoboti, ish joyidan ma'lumotnoma, kadastr hujjati)
- Russian (Ru): Formal but simple
- English (En): Neutral, embassy-style

RECOMMENDATIONS REQUIREMENTS:
- 2-4 items, prioritized for impact
- Each with titleEn/Uz/Ru and detailsEn/Uz/Ru
- Should be:
  * Concrete ("Increase your bank balance to at least X USD and show 3-6 months statement.")
  * Prioritized for impact (highest impact first)
  * Realistic for Uzbek ecosystem (Uzbek banks, property docs, employment letters, kadastr, etc.)
- Examples:
  * "Increase bank balance to $X for stronger financial proof"
  * "Provide property ownership documents (kadastr hujjati) to show ties to home country"
  * "Obtain employment letter (ish joyidan ma'lumotnoma) with detailed salary information"
  * "Complete travel history documentation to demonstrate travel experience"

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
   */
  private static buildUserPrompt(context: any, checklistItems: any[]): string {
    const profile = context.applicantProfile;
    const riskScore = context.riskScore;

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

- Country: ${context.application?.country || profile.targetCountry || 'Unknown'}
- Country Name: ${context.application?.country || context.application?.country?.name || profile.targetCountry || 'Unknown'}
- Visa Type: ${profile.visaType}
- Country Code: ${(context.application as any)?.countryCode || profile.targetCountry || 'Unknown'}

CRITICAL: You must ALWAYS refer to the exact country name "${context.application?.country || context.application?.country?.name || profile.targetCountry || 'Unknown'}" when writing summaries and recommendations. NEVER mention any other country (e.g., do not mention "UK" if the country is "Spain", do not mention "Spain" if the country is "UK"). Use the exact country name provided above.
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

- Risk Level: ${riskScore.level}
- Probability: ${riskScore.probabilityPercent}%
- Risk Factors: ${riskScore.riskFactors.join(', ') || 'None'}
- Positive Factors: ${riskScore.positiveFactors.join(', ') || 'None'}

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
