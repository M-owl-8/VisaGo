/**
 * Risk Explanation Training Data Mapper
 * Maps AIInteraction records to TrainingExample for risk explanation
 */

import { TrainingExample, AITrainingMeta } from './types';

// AIInteraction type from Prisma
type AIInteraction = {
  id: string;
  taskType: string;
  model: string;
  promptVersion: string | null;
  requestPayload: any;
  responsePayload: any;
  success: boolean;
  errorMessage: string | null;
  source: string;
  countryCode: string | null;
  visaType: string | null;
  ruleSetId: string | null;
  applicationId: string | null;
  userId: string | null;
  qualityScore: number | null;
  createdAt: Date;
};

export function mapRiskInteractionToTrainingExample(
  interaction: AIInteraction
): TrainingExample | null {
  try {
    const requestPayload = interaction.requestPayload as any;
    const responsePayload = interaction.responsePayload as any;

    // Build meta
    const meta: AITrainingMeta = {
      taskType: 'risk_explanation',
      source: interaction.source as any,
      countryCode: interaction.countryCode,
      visaType: interaction.visaType,
      ruleSetId: interaction.ruleSetId,
      applicationId: interaction.applicationId,
      userId: interaction.userId,
      model: interaction.model,
      promptVersion: interaction.promptVersion,
      createdAt: interaction.createdAt.toISOString(),
      qualityScore: interaction.qualityScore,
      success: interaction.success,
    };

    // Build input
    const input = {
      canonicalAIUserContext: requestPayload.canonicalAIUserContext || {},
      riskScore: requestPayload.riskScore || {},
      countryCode: requestPayload.countryCode,
      visaType: requestPayload.visaType,
    };

    // Build output (the risk explanation)
    const output = responsePayload;

    // Build chatExample
    const chatExample = {
      messages: [
        {
          role: 'system' as const,
          content: requestPayload.systemPrompt || '',
        },
        {
          role: 'user' as const,
          content: requestPayload.userPrompt || '',
        },
        {
          role: 'assistant' as const,
          content: JSON.stringify(output, null, 2),
        },
      ],
    };

    return {
      id: interaction.id,
      taskType: 'risk_explanation',
      source: interaction.source as any,
      meta,
      input,
      output,
      chatExample,
    };
  } catch (error) {
    console.error('[Mapper] Failed to map risk interaction', {
      interactionId: interaction.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
