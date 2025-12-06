/**
 * Visa Checklist Explanation Service
 * Uses GPT-4 to explain why a specific document is needed
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
 * Checklist Explanation Response Schema
 */
const ChecklistExplanationResponseSchema = z.object({
  documentType: z.string(),
  whyEn: z.string(),
  whyUz: z.string(),
  whyRu: z.string(),
  tipsEn: z.array(z.string()),
  tipsUz: z.array(z.string()),
  tipsRu: z.array(z.string()),
});

export type ChecklistExplanationResponse = z.infer<typeof ChecklistExplanationResponseSchema>;

/**
 * Cache key for explanations (applicationId + documentType)
 */
const explanationCache = new Map<string, ChecklistExplanationResponse>();

/**
 * Visa Checklist Explanation Service
 */
export class VisaChecklistExplanationService {
  /**
   * ⚠️ DEV-ONLY: Build system and user prompts for evaluation/testing
   *
   * This helper allows evaluation harnesses to build prompts without hitting the database.
   * It takes synthetic CanonicalAIUserContext and document info and returns the prompts.
   *
   * DO NOT use in production code paths. This is for testing/evaluation only.
   *
   * @param canonicalContext - Synthetic CanonicalAIUserContext (for evaluation)
   * @param documentType - Document type to explain
   * @param documentRule - Optional document rule (for evaluation)
   * @param countryCode - Country code
   * @param visaType - Visa type
   * @returns Object with systemPrompt and userPrompt strings
   */
  static buildPromptsForEvaluation(
    canonicalContext: CanonicalAIUserContext,
    documentType: string,
    documentRule: any,
    countryCode: string,
    visaType: string
  ): { systemPrompt: string; userPrompt: string } {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(
      canonicalContext,
      documentType,
      documentRule,
      countryCode,
      visaType
    );
    return { systemPrompt, userPrompt };
  }

  /**
   * Get explanation for a checklist item
   */
  static async getExplanation(
    userId: string,
    applicationId: string,
    documentType: string
  ): Promise<ChecklistExplanationResponse> {
    try {
      // Check cache first
      const cacheKey = `${applicationId}:${documentType}`;
      if (explanationCache.has(cacheKey)) {
        logInfo('[ChecklistExplanation] Returning cached explanation', {
          applicationId,
          documentType,
        });
        return explanationCache.get(cacheKey)!;
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

      // Get rule set to find document definition
      const countryCode = application.country.code.toUpperCase();
      const visaTypeName = application.visaType.name.toLowerCase();
      const ruleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaTypeName);

      // Find document definition in rule set
      const documentRule = ruleSet?.requiredDocuments?.find(
        (doc) => doc.documentType === documentType
      );

      // Build prompts
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(
        canonicalContext,
        documentType,
        documentRule,
        application.country.name,
        application.visaType.name
      );

      // Get AI config
      const aiConfig = getAIConfig('checklistExplanation');

      logInfo('[ChecklistExplanation] Calling GPT-4 for document explanation', {
        task: 'checklistExplanation',
        applicationId,
        documentType,
        countryCode,
        visaType: visaTypeName,
        hasRuleDefinition: !!documentRule,
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

      logInfo('[ChecklistExplanation] GPT-4 response received', {
        task: 'checklistExplanation',
        applicationId,
        documentType,
        countryCode,
        visaType: visaTypeName,
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

      const validationResult = ChecklistExplanationResponseSchema.safeParse(parsed);
      if (!validationResult.success) {
        logError(
          '[ChecklistExplanation] Schema validation failed',
          new Error('Invalid response structure'),
          {
            applicationId,
            documentType,
            errors: validationResult.error.errors,
          }
        );
        throw new Error(
          `Invalid response structure: ${validationResult.error.errors.map((e) => e.message).join(', ')}`
        );
      }

      const explanation = validationResult.data;

      // Cache explanation
      explanationCache.set(cacheKey, explanation);
      logInfo('[ChecklistExplanation] Document explanation generated successfully', {
        task: 'checklistExplanation',
        applicationId,
        documentType,
        countryCode,
        visaType: visaTypeName,
        model: aiConfig.model,
        tokensUsed,
        responseTimeMs: responseTime,
      });

      return explanation;
    } catch (error) {
      logError('[ChecklistExplanation] Error generating explanation', error as Error, {
        userId,
        applicationId,
        documentType,
      });
      throw error;
    }
  }

  /**
   * Build system prompt for checklist explanation (EXPERT DOCUMENT CONSULTANT VERSION - Phase 5)
   *
   * Phase 5 Upgrade:
   * - Expert visa document consultant role specialized for Uzbek applicants
   * - Explains why specific documents are needed for THIS applicant
   * - Connects to financialSufficiency, tiesStrength, travelHistory, risk
   * - Provides practical Uzbek-focused tips
   */
  private static buildSystemPrompt(): string {
    return `You are an EXPERT VISA DOCUMENT CONSULTANT. You explain to Uzbek applicants why specific documents are needed for their visa application, and how these documents help their case.

================================================================================
YOUR ROLE
================================================================================

Your task is to explain why a specific document is needed for THIS applicant, for THIS visa type, for THIS country, and how it addresses their specific risk profile.

You will receive:
- documentType, category, base description
- APPLICANT_CONTEXT (CanonicalAIUserContext with expert fields):
  * financial: requiredFundsUSD, availableFundsUSD, financialSufficiencyRatio, financialSufficiencyLabel
  * ties: tiesStrengthScore, tiesStrengthLabel, hasPropertyInUzbekistan, hasFamilyInUzbekistan, hasChildren, isEmployed, employmentDurationMonths
  * travelHistory: travelHistoryScore, travelHistoryLabel, previousVisaRejections, hasOverstayHistory
  * riskScore.level
  * meta.dataCompletenessScore
- documentRule (from VisaRuleSet if available)

================================================================================
YOUR TASK
================================================================================

1. Explain WHY this document is needed for:
   - THIS visa type (tourist vs student)
   - THIS country (US, UK, Schengen, Canada, Australia, Japan, Korea, UAE)
   - THIS applicant profile (financial/ties/travel)

2. Explain what embassy officers look for in this document:
   - For financial docs (bank statements, sponsor docs):
     * Sufficient balance, stable history, real bank, not random fresh deposits
     * Minimum balance requirements, statement period (e.g., 3-6 months)
     * Currency conversion if needed
   - For ties docs (property, employment, family):
     * Real ownership/employment, official stamps, kadastr documents for property
     * Employment letter (ish joyidan ma'lumotnoma) with salary, duration
     * Family ties documentation
   - For travel docs (itinerary, accommodation, insurance):
     * Clear itinerary with dates and locations
     * Confirmed accommodation bookings
     * Travel insurance meeting minimum coverage (e.g., €30,000 for Schengen)

3. Connect to applicant risk:
   - If financialSufficiencyLabel is 'low' or 'borderline' and this is a bank statement:
     * Explain how it addresses financial concerns
     * Emphasize importance of showing sufficient balance and stable history
   - If tiesStrengthLabel is 'weak' and this is property/employment/family doc:
     * Explain how it strengthens ties
     * Emphasize importance of proving return intent
   - If travelHistoryScore is low and this is itinerary/accommodation:
     * Explain how it helps mitigate risk for first-time travelers
     * Emphasize clarity and completeness

================================================================================
OUTPUT REQUIREMENTS
================================================================================

You MUST return ONLY valid JSON matching this exact schema:

{
  "documentType": "passport_international",
  "whyEn": "Why this document is needed (3-5 sentences in English)",
  "whyUz": "Why this document is needed (3-5 sentences in Uzbek)",
  "whyRu": "Why this document is needed (3-5 sentences in Russian)",
  "tipsEn": ["Tip 1 in English", "Tip 2 in English", "Tip 3 in English"],
  "tipsUz": ["Tip 1 in Uzbek", "Tip 2 in Uzbek", "Tip 3 in Uzbek"],
  "tipsRu": ["Tip 1 in Russian", "Tip 2 in Russian", "Tip 3 in Russian"]
}

WHY REQUIREMENTS:
- whyEn/Uz/Ru: 3-5 sentences each
- MUST mention:
  * Purpose of document
  * Embassy perspective (what officers look for)
  * Applicant-specific relevance (Uzbek context)
- Reference expert metrics when relevant:
  * "Because your financial sufficiency is borderline, this bank statement is critical..."
  * "Because your ties score is weak, property documents help prove you will return..."
- Uzbek (Uz): Simple, clear language with common terminology
- Russian (Ru): Formal but simple
- English (En): Neutral, embassy-style

TIPS REQUIREMENTS:
- tipsEn/Uz/Ru: 2-3 tips per language
- Very practical:
  * Where to get in Uzbekistan (e.g., bank branch, ish joyi, kadastr organlari)
  * Common mistakes to avoid (e.g., fresh big deposits, missing stamps, wrong dates)
  * Formatting notes (e.g., full name match, correct dates, official stamps)
- Examples:
  * "Get bank statement from your Uzbek bank (Kapital Bank, Uzsanoatqurilishbank, etc.) showing last 3-6 months"
  * "Avoid large deposits right before application - embassy officers look for stable balance"
  * "Ensure property document (kadastr hujjati) has official stamp and matches your passport name"
  * "Employment letter (ish joyidan ma'lumotnoma) must include salary, position, and employment duration"

================================================================================
FINAL INSTRUCTIONS
================================================================================

- Be direct, supportive, not fear-inducing
- Use expert fields to explain why THIS document is especially important (or less important) for THIS applicant's weaknesses
- Reference Uzbek context naturally (Uzbek banks, kadastr, employment letters)
- Provide actionable, practical tips
- Return ONLY valid JSON, no markdown, no extra text`;
  }

  /**
   * Build user prompt with document and applicant context (EXPERT CONSULTANT VERSION - Phase 5)
   *
   * Phase 5 Upgrade:
   * - Structured APPLICANT_CONTEXT with expert fields grouped
   * - Explicit "EXPERT EXPLANATION REQUIRED" section
   * - Clear instructions on connecting document to applicant risk profile
   */
  private static buildUserPrompt(
    context: any,
    documentType: string,
    documentRule: any,
    countryName: string,
    visaTypeName: string
  ): string {
    const profile = context.applicantProfile;
    const riskScore = context.riskScore;

    let prompt = `EXPERT EXPLANATION REQUIRED:

You are explaining why a specific document is needed for THIS Uzbek applicant. Your task:
1. Explain why this document is especially important (or less important) for THIS applicant's weaknesses
2. Reference expert metrics (financialSufficiencyLabel, tiesStrengthLabel, travelHistoryLabel, riskScore.level)
3. Connect to applicant risk profile (e.g., "Because your financial sufficiency is borderline, this bank statement is critical...")
4. Provide 2-3 practical tips specific to Uzbekistan (where to get, common mistakes, formatting)
5. Adapt tone: direct, supportive, not fear-inducing

================================================================================
DOCUMENT INFORMATION
================================================================================

- Document Type: ${documentType}
${
  documentRule
    ? `- Category: ${documentRule.category || 'required'}
- Description: ${documentRule.description || 'N/A'}`
    : '- No specific rule definition available'
}

================================================================================
APPLICATION CONTEXT
================================================================================

- Country: ${countryName}
- Visa Type: ${visaTypeName}
- Country Code: ${(context.application as any)?.countryCode || profile.targetCountry || 'Unknown'}

================================================================================
APPLICANT PROFILE
================================================================================

- Citizenship: ${profile.citizenship || 'Unknown'}
- Current Status: ${profile.currentStatus || 'Unknown'}
- Sponsor Type: ${profile.sponsorType || 'Unknown'}
- Bank Balance USD: ${profile.bankBalanceUSD ? `$${profile.bankBalanceUSD.toLocaleString()}` : 'Unknown'}
- Monthly Income USD: ${profile.monthlyIncomeUSD ? `$${profile.monthlyIncomeUSD.toLocaleString()}` : 'Unknown'}

================================================================================
EXPERT FIELDS (Pre-computed metrics for document relevance)
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
- Is Employed: ${profile.ties.isEmployed ? 'Yes' : 'No'}
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

RISK LEVEL:
- Risk Level: ${riskScore.level}
- Probability: ${riskScore.probabilityPercent}%

DATA COMPLETENESS:
${
  context.meta
    ? `- Data Completeness Score: ${context.meta.dataCompletenessScore?.toFixed(2) ?? 'N/A'}`
    : '- Data completeness: Not available'
}

EMBASSY RULES CONFIDENCE:
${
  (context as any).ruleSet?.sourceInfo?.confidence !== undefined
    ? `- Embassy Rules Confidence: ${((context as any).ruleSet.sourceInfo.confidence * 100).toFixed(0)}%${(context as any).ruleSet.sourceInfo.confidence < 0.7 ? '\n- Note: Embassy rules have low confidence. Some requirements may change - user should always check official website.' : ''}`
    : '- Embassy rules: Not available'
}

================================================================================

Provide expert explanation connecting this document to the applicant's risk profile and provide practical Uzbek-focused tips.`;

    return prompt;
  }

  /**
   * Clear cache for an application (useful for testing or when checklist changes)
   */
  static clearCache(applicationId: string): void {
    const keysToDelete: string[] = [];
    for (const key of explanationCache.keys()) {
      if (key.startsWith(`${applicationId}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => explanationCache.delete(key));
    logInfo('[ChecklistExplanation] Cache cleared', {
      applicationId,
      clearedCount: keysToDelete.length,
    });
  }
}
