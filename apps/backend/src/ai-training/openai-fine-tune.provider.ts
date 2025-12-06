/**
 * OpenAI Fine-Tune Provider
 * Stub implementation - TODO: Wire to actual OpenAI fine-tuning API
 */

import { FineTuneJobOptions, FineTuneProvider } from './fine-tune.service';

export class OpenAIFineTuneProvider implements FineTuneProvider {
  async startJob(options: FineTuneJobOptions): Promise<{ externalJobId: string }> {
    // TODO: Implement using OpenAI SDK:
    // 1. Upload train/val files using files.create()
    // 2. Create fine-tune job using fineTuning.jobs.create()
    // 3. Return externalJobId from the job

    throw new Error(
      'OpenAIFineTuneProvider.startJob not implemented. ' +
        'TODO: Wire to OpenAI fine-tuning API. ' +
        `Task: ${options.taskType}, Train: ${options.trainFilePath}`
    );
  }

  async fetchStatus(externalJobId: string): Promise<{
    status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
    resultModelName?: string;
    metrics?: any;
    errorMessage?: string;
  }> {
    // TODO: Implement status polling:
    // 1. Call fineTuning.jobs.retrieve(externalJobId)
    // 2. Map OpenAI status to our status enum
    // 3. Extract resultModelName from fine_tuned_model field
    // 4. Extract metrics from training_file, validation_file, etc.

    throw new Error(
      'OpenAIFineTuneProvider.fetchStatus not implemented. ' +
        'TODO: Wire to OpenAI fine-tuning API. ' +
        `Job ID: ${externalJobId}`
    );
  }
}
