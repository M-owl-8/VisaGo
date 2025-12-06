/**
 * AI Model Registry Types
 */

export type AITaskType =
  | 'checklist_enrichment'
  | 'document_check'
  | 'risk_explanation'
  | 'document_explanation'
  | 'rules_extraction';

export type AIProvider = 'openai' | 'deepseek' | 'other';

export interface ModelRoutingDecision {
  provider: AIProvider;
  modelName: string;
  baseModel: string;
  modelVersionId?: string;
}

export interface RoutingOptions {
  forceModelName?: string; // env override
  allowCandidates?: boolean; // use canary
}

// Re-export for use in other modules
export type { RoutingOptions as AIRoutingOptions };
