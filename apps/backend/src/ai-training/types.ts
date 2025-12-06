/**
 * AI Training Types
 * Common types for training data pipeline and fine-tuning export
 */

export type AITrainingSource = 'prod' | 'eval' | 'synthetic' | 'human_correction';

export type AITrainingTaskType =
  | 'checklist_enrichment'
  | 'document_check'
  | 'risk_explanation'
  | 'document_explanation'
  | 'rules_extraction';

export interface AITrainingMeta {
  taskType: AITrainingTaskType;
  source: AITrainingSource;
  countryCode?: string | null;
  visaType?: string | null;
  ruleSetId?: string | null;
  applicationId?: string | null;
  userId?: string | null;
  model?: string | null;
  promptVersion?: string | null;
  createdAt?: string; // ISO
  qualityScore?: number | null; // 0..1
  success?: boolean;
  // Optional flags
  isHighRiskCase?: boolean;
  hasPreviousRefusal?: boolean;
  profileRiskLevel?: string | null;
}

export interface ChatFineTuneExample {
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  // Optional metadata for some providers
  metadata?: Record<string, any>;
}

export interface TrainingExample {
  id: string;
  taskType: AITrainingTaskType;
  source: AITrainingSource;
  meta: AITrainingMeta;
  // Generic input/output (model-agnostic)
  input: any;
  output: any;
  // For OpenAI-style chat fine-tuning
  chatExample: ChatFineTuneExample;
}

export interface TrainingDataset {
  taskType: AITrainingTaskType;
  examples: TrainingExample[];
}
