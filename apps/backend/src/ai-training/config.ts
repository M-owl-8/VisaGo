/**
 * AI Training Configuration
 */

import * as path from 'path';

export const AI_TRAINING_DATA_DIR = path.resolve(__dirname, '../../../data/ai-training');

export const DEFAULT_TRAIN_VAL_SPLIT = {
  train: 0.9,
  val: 0.1,
};

/**
 * Prompt version constants
 */
export const PROMPT_VERSIONS = {
  CHECKLIST_PROMPT_V1: 'checklist-v1',
  CHECKLIST_PROMPT_V2_EXPERT: 'checklist-v2-expert', // Phase 3 expert prompts
  DOC_CHECK_PROMPT_V1: 'doccheck-v1',
  DOC_CHECK_PROMPT_V2_EXPERT: 'doccheck-v2-expert', // Phase 3 expert prompts
  RISK_EXPLANATION_PROMPT_V1: 'risk-v1',
  DOC_EXPLANATION_PROMPT_V1: 'docexpl-v1',
  RULES_EXTRACTION_PROMPT_V1: 'rules-extraction-v1',
} as const;

export type PromptVersion = (typeof PROMPT_VERSIONS)[keyof typeof PROMPT_VERSIONS];
