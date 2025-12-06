/**
 * Fine-Tune Orchestration Service
 * Provider-agnostic fine-tuning job management
 */

import { PrismaClient } from '@prisma/client';

// Type for AIFineTuneStatus enum
type AIFineTuneStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
import { AITaskType } from '../ai-model-registry/types';
import { registerModelCandidate } from '../ai-model-registry/registry.service';

const prisma = new PrismaClient();

export interface FineTuneJobOptions {
  taskType: AITaskType;
  provider: 'openai' | 'deepseek' | 'other';
  baseModel: string;
  trainFilePath: string;
  valFilePath?: string;
  promptVersion?: string;
  notes?: string;
}

export interface FineTuneProvider {
  startJob(options: FineTuneJobOptions): Promise<{
    externalJobId: string;
  }>;
  fetchStatus(externalJobId: string): Promise<{
    status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
    resultModelName?: string;
    metrics?: any;
    errorMessage?: string;
  }>;
}

/**
 * Get provider implementation
 */
function getProvider(provider: string): FineTuneProvider {
  switch (provider) {
    case 'openai':
      // Dynamic import to avoid breaking if provider not implemented
      const { OpenAIFineTuneProvider } = require('./openai-fine-tune.provider');
      return new OpenAIFineTuneProvider();
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Start a fine-tune job
 */
export async function startFineTuneJob(options: FineTuneJobOptions): Promise<{ jobId: string }> {
  const providerImpl = getProvider(options.provider);

  // 1. Create model candidate row (status=CANDIDATE, trafficPercent=0)
  const modelVersionId = await registerModelCandidate({
    taskType: options.taskType,
    provider: options.provider,
    baseModel: options.baseModel,
    modelName: 'PENDING_MODEL_NAME', // will update after job succeeds
    promptVersion: options.promptVersion,
    dataSnapshot: {
      trainFilePath: options.trainFilePath,
      valFilePath: options.valFilePath ?? null,
    },
    notes: options.notes,
  });

  // 2. Start provider job
  const { externalJobId } = await providerImpl.startJob(options);

  // 3. Store AIFineTuneJob row
  const job = await (prisma as any).aIFineTuneJob.create({
    data: {
      taskType: options.taskType,
      provider: options.provider,
      baseModel: options.baseModel,
      status: 'QUEUED' as any,
      externalJobId,
      trainFilePath: options.trainFilePath,
      valFilePath: options.valFilePath ?? null,
      modelVersionId,
    },
  });

  return { jobId: job.id };
}

/**
 * Refresh fine-tune job status from provider
 */
export async function refreshFineTuneJobStatus(jobId: string) {
  const job = await (prisma as any).aIFineTuneJob.findUnique({ where: { id: jobId } });
  if (!job || !job.externalJobId) {
    throw new Error(`Job ${jobId} not found or has no externalJobId`);
  }

  const providerImpl = getProvider(job.provider);
  const status = await providerImpl.fetchStatus(job.externalJobId);

  const updated = await (prisma as any).aIFineTuneJob.update({
    where: { id: jobId },
    data: {
      status: status.status as any,
      resultModelName: status.resultModelName ?? job.resultModelName,
      metrics: status.metrics ?? job.metrics,
      errorMessage: status.errorMessage ?? job.errorMessage,
      completedAt:
        status.status === 'SUCCEEDED' || status.status === 'FAILED' ? new Date() : job.completedAt,
    },
  });

  // If job succeeded and resultModelName exists, update model version
  if (status.status === 'SUCCEEDED' && status.resultModelName) {
    if (job.modelVersionId) {
      await (prisma as any).aIModelVersion.update({
        where: { id: job.modelVersionId },
        data: {
          modelName: status.resultModelName,
          externalModelId: status.resultModelName,
          notes: 'Fine-tuned model completed successfully',
        },
      });
    }
  }

  return updated;
}

/**
 * List fine-tune jobs
 */
export async function listFineTuneJobs(taskType?: AITaskType) {
  return (prisma as any).aIFineTuneJob.findMany({
    where: taskType ? { taskType } : {},
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      modelVersion: true,
    },
  });
}
