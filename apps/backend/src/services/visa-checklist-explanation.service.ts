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
        applicationId,
        documentType,
        countryCode,
        visaType: visaTypeName,
        hasRuleDefinition: !!documentRule,
        model: aiConfig.model,
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
        applicationId,
        documentType,
        responseTimeMs: responseTime,
        tokensUsed: response.usage?.total_tokens || 0,
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
   * Build system prompt for checklist explanation
   */
  private static buildSystemPrompt(): string {
    return `You are an expert visa consultant for VisaBuddy. Your task is to explain why a specific document is needed for a visa application.

CRITICAL REQUIREMENTS:
1. You MUST return ONLY valid JSON matching the exact schema (no markdown, no explanations).
2. Explain why THIS document is needed for THIS applicant, for THIS visa, for THIS country.
3. Explain what embassy officers want to see in this document.
4. Provide 1-2 short, practical tips on how to avoid common mistakes.
5. All text must be in three languages: English (En), Uzbek (Uz), and Russian (Ru).

OUTPUT FORMAT (JSON):
{
  "documentType": "passport_international",
  "whyEn": "Why this document is needed (2-3 sentences in English)",
  "whyUz": "Why this document is needed (2-3 sentences in Uzbek)",
  "whyRu": "Why this document is needed (2-3 sentences in Russian)",
  "tipsEn": ["Tip 1 in English", "Tip 2 in English"],
  "tipsUz": ["Tip 1 in Uzbek", "Tip 2 in Uzbek"],
  "tipsRu": ["Tip 1 in Russian", "Tip 2 in Russian"]
}

Be specific, practical, and tailored to the applicant's profile and visa type.`;
  }

  /**
   * Build user prompt with document and applicant context
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

    let prompt = `Explain why this document is needed for this visa application.

DOCUMENT:
- Type: ${documentType}
${documentRule ? `- Category: ${documentRule.category || 'required'}\n- Description: ${documentRule.description || 'N/A'}` : ''}

APPLICANT PROFILE:
- Country: ${countryName}
- Visa Type: ${visaTypeName}
- Citizenship: ${profile.citizenship}
- Current Status: ${profile.currentStatus}
- Sponsor Type: ${profile.sponsorType}
- Bank Balance: ${profile.bankBalanceUSD ? `$${profile.bankBalanceUSD}` : 'Unknown'}
- Has Property: ${profile.hasPropertyInUzbekistan ? 'Yes' : 'No'}
- Has Family Ties: ${profile.hasFamilyInUzbekistan ? 'Yes' : 'No'}
- Previous Rejections: ${profile.previousVisaRejections ? 'Yes' : 'No'}
- Risk Level: ${riskScore.level}

Explain:
1. Why THIS document is specifically needed for THIS applicant's profile
2. What embassy officers want to see in this document
3. 1-2 practical tips to avoid common mistakes

Provide explanation in EN, UZ, and RU languages.`;

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
