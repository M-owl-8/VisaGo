/**
 * AI Model Registry Service
 * Manages model versions, routing, and canary rollouts
 */

import { PrismaClient } from '@prisma/client';

// Type for AIModelStatus enum
type AIModelStatus = 'ACTIVE' | 'CANDIDATE' | 'DEPRECATED' | 'ARCHIVED';
import { AITaskType, ModelRoutingDecision, RoutingOptions } from './types';
import { getAIConfig } from '../config/ai-models';

const prisma = new PrismaClient();

/**
 * Get default model for task from AI config
 */
function getDefaultModelForTask(taskType: AITaskType): string {
  switch (taskType) {
    case 'checklist_enrichment':
      return process.env.OPENAI_MODEL_CHECKLIST || 'gpt-4o';
    case 'document_check':
      return getAIConfig('docVerification').model;
    case 'risk_explanation':
      return getAIConfig('riskExplanation').model;
    case 'document_explanation':
      return getAIConfig('docExplanation').model;
    case 'rules_extraction':
      return getAIConfig('rulesExtraction').model;
    default:
      return 'gpt-4o-mini';
  }
}

/**
 * Get active model for task with weighted routing
 */
export async function getActiveModelForTask(
  taskType: AITaskType,
  options: RoutingOptions = {}
): Promise<ModelRoutingDecision> {
  // 1. Check force override
  if (options.forceModelName) {
    return {
      provider: 'openai', // Default provider
      modelName: options.forceModelName,
      baseModel: options.forceModelName,
    };
  }

  // 2. Query registry for active/candidate models
  const models = await (prisma as any).aIModelVersion.findMany({
    where: {
      taskType,
      status: {
        in: options.allowCandidates !== false ? ['ACTIVE', 'CANDIDATE'] : ['ACTIVE'],
      },
      trafficPercent: {
        gt: 0,
      },
    },
    orderBy: {
      trafficPercent: 'desc',
    },
  });

  if (models.length === 0) {
    // Fallback to default
    const defaultModel = getDefaultModelForTask(taskType);
    return {
      provider: 'openai',
      modelName: defaultModel,
      baseModel: defaultModel,
    };
  }

  // 3. Weighted random selection by trafficPercent
  const totalWeight = models.reduce((sum: number, m: any) => sum + m.trafficPercent, 0);
  if (totalWeight === 0) {
    // All have 0% traffic, use default
    const defaultModel = getDefaultModelForTask(taskType);
    return {
      provider: 'openai',
      modelName: defaultModel,
      baseModel: defaultModel,
    };
  }

  let random = Math.random() * totalWeight;
  for (const model of models) {
    random -= model.trafficPercent;
    if (random <= 0) {
      return {
        provider: model.provider as any,
        modelName: model.modelName,
        baseModel: model.baseModel,
        modelVersionId: model.id,
      };
    }
  }

  // Fallback to first model (shouldn't happen)
  const selected = models[0];
  return {
    provider: selected.provider as any,
    modelName: selected.modelName,
    baseModel: selected.baseModel,
    modelVersionId: selected.id,
  };
}

/**
 * Register a new model candidate
 */
export async function registerModelCandidate(params: {
  taskType: AITaskType;
  provider: string;
  baseModel: string;
  modelName: string;
  externalModelId?: string;
  promptVersion?: string;
  dataSnapshot?: any;
  notes?: string;
}): Promise<string> {
  const model = await (prisma as any).aIModelVersion.create({
    data: {
      taskType: params.taskType,
      provider: params.provider,
      baseModel: params.baseModel,
      modelName: params.modelName,
      externalModelId: params.externalModelId || null,
      status: 'CANDIDATE' as any,
      trafficPercent: 0,
      promptVersion: params.promptVersion || null,
      dataSnapshot: params.dataSnapshot || null,
      notes: params.notes || null,
    },
  });

  return model.id;
}

/**
 * Promote model to active
 */
export async function promoteModelToActive(params: {
  modelVersionId: string;
  trafficPercent?: number; // default 100
  deactivateOthers?: boolean; // default true
}): Promise<void> {
  const trafficPercent = params.trafficPercent ?? 100;
  const deactivateOthers = params.deactivateOthers ?? true;

  // Get the model to promote
  const model = await (prisma as any).aIModelVersion.findUnique({
    where: { id: params.modelVersionId },
  });

  if (!model) {
    throw new Error(`Model version ${params.modelVersionId} not found`);
  }

  // Update this model
  await (prisma as any).aIModelVersion.update({
    where: { id: params.modelVersionId },
    data: {
      status: 'ACTIVE' as any,
      trafficPercent,
      activatedAt: new Date(),
    },
  });

  // Deactivate others if requested
  if (deactivateOthers) {
    await (prisma as any).aIModelVersion.updateMany({
      where: {
        taskType: model.taskType,
        id: {
          not: params.modelVersionId,
        },
        status: {
          in: ['ACTIVE', 'CANDIDATE'],
        },
      },
      data: {
        status: 'DEPRECATED' as any,
        trafficPercent: 0,
      },
    });
  }
}

/**
 * Update canary traffic percentage
 */
export async function updateCanaryTraffic(params: {
  modelVersionId: string;
  trafficPercent: number;
}): Promise<void> {
  if (params.trafficPercent < 0 || params.trafficPercent > 100) {
    throw new Error('trafficPercent must be between 0 and 100');
  }

  await (prisma as any).aIModelVersion.update({
    where: { id: params.modelVersionId },
    data: {
      trafficPercent: params.trafficPercent,
    },
  });
}

/**
 * Get all models for a task
 */
export async function listModelsForTask(taskType: AITaskType) {
  return (prisma as any).aIModelVersion.findMany({
    where: { taskType },
    orderBy: { createdAt: 'desc' },
  });
}
