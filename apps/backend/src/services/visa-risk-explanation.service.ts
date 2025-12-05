/**
 * Visa Risk Explanation Service
 * Uses GPT-4 to explain visa risk and provide improvement advice
 */

import { PrismaClient } from '@prisma/client';
import { AIOpenAIService } from './ai-openai.service';
import { buildCanonicalAIUserContextForApplication } from './ai-context.service';
import { getAIConfig } from '../config/ai-models';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { z } from 'zod';

const prisma = new PrismaClient();

/**
 * Risk Explanation Response Schema
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
    })
  ),
});

export type RiskExplanationResponse = z.infer<typeof RiskExplanationResponseSchema>;

/**
 * Visa Risk Explanation Service
 */
export class VisaRiskExplanationService {
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
        applicationId,
        countryCode: application.country.code,
        visaType: application.visaType.name,
        riskLevel: canonicalContext.riskScore.level,
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

      const explanation = validationResult.data;

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
        applicationId,
        countryCode: application.country.code,
        visaType: application.visaType.name,
        riskLevel: explanation.riskLevel,
        recommendationsCount: explanation.recommendations.length,
        responseTimeMs: responseTime,
        tokensUsed: response.usage?.total_tokens || 0,
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
   * Build system prompt for risk explanation
   */
  private static buildSystemPrompt(): string {
    return `You are an expert visa consultant for VisaBuddy. Your task is to explain visa risk and provide actionable improvement advice.

CRITICAL REQUIREMENTS:
1. You MUST return ONLY valid JSON matching the exact schema (no markdown, no explanations).
2. Explain why the risk level is low/medium/high based on the applicant profile.
3. Provide 2-4 specific, actionable recommendations to improve approval chances.
4. All text must be in three languages: English (En), Uzbek (Uz), and Russian (Ru).

OUTPUT FORMAT (JSON):
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

RECOMMENDATION EXAMPLES:
- "Increase bank balance to $X for stronger financial proof"
- "Provide property ownership documents to show ties to home country"
- "Complete travel history documentation to demonstrate travel experience"
- "Obtain employment letter with detailed salary information"

Be specific, actionable, and tailored to the applicant's profile.`;
  }

  /**
   * Build user prompt with applicant context
   */
  private static buildUserPrompt(context: any, checklistItems: any[]): string {
    const profile = context.applicantProfile;
    const riskScore = context.riskScore;

    let prompt = `Analyze this visa application and provide risk explanation with improvement advice.

APPLICANT PROFILE:
- Country: ${context.application.country}
- Visa Type: ${profile.visaType}
- Citizenship: ${profile.citizenship}
- Age: ${profile.age || 'Unknown'}
- Current Status: ${profile.currentStatus}
- Sponsor Type: ${profile.sponsorType}
- Bank Balance: ${profile.bankBalanceUSD ? `$${profile.bankBalanceUSD}` : 'Unknown'}
- Monthly Income: ${profile.monthlyIncomeUSD ? `$${profile.monthlyIncomeUSD}` : 'Unknown'}
- Has Property in Uzbekistan: ${profile.hasPropertyInUzbekistan ? 'Yes' : 'No'}
- Has Family in Uzbekistan: ${profile.hasFamilyInUzbekistan ? 'Yes' : 'No'}
- Has International Travel: ${profile.hasInternationalTravel ? 'Yes' : 'No'}
- Previous Visa Rejections: ${profile.previousVisaRejections ? 'Yes' : 'No'}
- Has Invitation: ${profile.hasOtherInvitation ? 'Yes' : 'No'}

RISK ASSESSMENT:
- Risk Level: ${riskScore.level}
- Probability: ${riskScore.probabilityPercent}%
- Risk Factors: ${riskScore.riskFactors.join(', ') || 'None'}
- Positive Factors: ${riskScore.positiveFactors.join(', ') || 'None'}

CHECKLIST STATUS:
- Total Documents: ${checklistItems.length}
- Required Documents: ${checklistItems.filter((i: any) => i.category === 'required' || i.required).length}
- Uploaded Documents: ${checklistItems.filter((i: any) => i.status === 'verified' || i.status === 'uploaded').length}

Provide risk explanation and 2-4 specific recommendations to improve approval chances.`;

    return prompt;
  }
}
