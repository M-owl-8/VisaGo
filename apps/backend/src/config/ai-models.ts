/**
 * AI Models Configuration
 * Centralized configuration for all GPT-4 model usage across the backend
 *
 * This file ensures consistency in:
 * - Model selection (gpt-4o, gpt-4o-mini, etc.)
 * - Temperature settings
 * - Max tokens
 * - Timeout settings
 * - Response format (JSON vs text)
 *
 * To change models globally, update this file.
 */

export interface AIModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number; // milliseconds
  responseFormat?: { type: 'json_object' } | null;
}

/**
 * Model names for different tasks
 */
export const AI_MODELS = {
  // Checklist generation - uses GPT-4o for quality
  CHECKLIST: process.env.OPENAI_MODEL_CHECKLIST || 'gpt-4o',

  // Document verification - uses GPT-4o for accuracy
  DOC_VERIFICATION: process.env.OPENAI_MODEL_DOC_VERIFICATION || 'gpt-4o',

  // Rules extraction from embassy pages - uses GPT-4o for structured extraction
  RULES_EXTRACTION: process.env.OPENAI_MODEL_RULES_EXTRACTION || 'gpt-4o',

  // Risk explanation - uses GPT-4o for quality explanations
  RISK_EXPLANATION: process.env.OPENAI_MODEL_RISK_EXPLANATION || 'gpt-4o',

  // Checklist item explanation - uses GPT-4o for quality explanations
  CHECKLIST_EXPLANATION: process.env.OPENAI_MODEL_CHECKLIST_EXPLANATION || 'gpt-4o',

  // General chat/RAG - can use cheaper model
  CHAT: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  // Evaluation scripts - uses GPT-4o for consistency
  EVALUATION: process.env.OPENAI_MODEL_EVALUATION || 'gpt-4o',
} as const;

/**
 * Default configuration for different task types
 */
export const AI_CONFIG: Record<string, AIModelConfig> = {
  /**
   * Checklist Generation (Rules Mode)
   * - Uses GPT-4o for quality
   * - Low temperature for consistency
   * - JSON output required
   * - Higher max tokens for detailed checklists
   */
  checklist: {
    model: AI_MODELS.CHECKLIST,
    temperature: 0.3, // Lower for more consistent output
    maxTokens: 3000, // Allow for detailed checklists
    timeout: 60000, // 60 seconds
    responseFormat: { type: 'json_object' },
  },

  /**
   * Checklist Generation (Legacy Mode)
   * - Uses GPT-4o for quality
   * - Low temperature for consistency
   * - JSON output required
   * - Higher max tokens for detailed checklists
   */
  checklistLegacy: {
    model: AI_MODELS.CHECKLIST,
    temperature: 0.3,
    maxTokens: 3000,
    timeout: 60000,
    responseFormat: { type: 'json_object' },
  },

  /**
   * Document Verification
   * - Uses GPT-4o for accuracy
   * - Very low temperature for strict evaluation
   * - JSON output required
   * - Lower max tokens for concise responses
   */
  docVerification: {
    model: AI_MODELS.DOC_VERIFICATION,
    temperature: 0.2, // Very low for strict evaluation
    maxTokens: 500, // Concise responses
    timeout: 30000, // 30 seconds
    responseFormat: { type: 'json_object' },
  },

  /**
   * Rules Extraction from Embassy Pages
   * - Uses GPT-4o for structured extraction
   * - Low temperature for consistency
   * - JSON output required
   * - Higher max tokens for complete rule sets
   */
  rulesExtraction: {
    model: AI_MODELS.RULES_EXTRACTION,
    temperature: 0.3,
    maxTokens: 4000, // Complete rule sets can be large
    timeout: 60000, // 60 seconds
    responseFormat: { type: 'json_object' },
  },

  /**
   * Risk Explanation
   * - Uses GPT-4o for quality explanations
   * - Low temperature for deterministic output
   * - JSON output required
   * - Moderate max tokens
   */
  riskExplanation: {
    model: AI_MODELS.RISK_EXPLANATION,
    temperature: 0.3, // Low for deterministic explanations
    maxTokens: 1500, // Enough for summary + recommendations
    timeout: 30000, // 30 seconds
    responseFormat: { type: 'json_object' },
  },

  /**
   * Checklist Item Explanation
   * - Uses GPT-4o for quality explanations
   * - Low temperature for deterministic output
   * - JSON output required
   * - Moderate max tokens
   */
  checklistExplanation: {
    model: AI_MODELS.CHECKLIST_EXPLANATION,
    temperature: 0.3, // Low for deterministic explanations
    maxTokens: 1000, // Enough for why + tips
    timeout: 30000, // 30 seconds
    responseFormat: { type: 'json_object' },
  },

  /**
   * General Chat/RAG
   * - Can use cheaper model (gpt-4o-mini)
   * - Higher temperature for natural conversation
   * - Text output (no JSON)
   * - Standard max tokens
   */
  chat: {
    model: AI_MODELS.CHAT,
    temperature: 0.7, // Higher for natural conversation
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
    timeout: 30000, // 30 seconds
    responseFormat: null, // Text output
  },

  /**
   * Evaluation Scripts
   * - Uses GPT-4o for consistency
   * - Low temperature for reproducible results
   * - JSON output if needed
   * - Standard max tokens
   */
  evaluation: {
    model: AI_MODELS.EVALUATION,
    temperature: 0.3,
    maxTokens: 2000,
    timeout: 60000, // 60 seconds
    responseFormat: { type: 'json_object' },
  },
} as const;

/**
 * Get configuration for a specific task type
 */
export function getAIConfig(taskType: keyof typeof AI_CONFIG): AIModelConfig {
  return AI_CONFIG[taskType];
}

/**
 * Get model name for a specific task type
 */
export function getAIModel(taskType: keyof typeof AI_CONFIG): string {
  return AI_CONFIG[taskType].model;
}

/**
 * Get temperature for a specific task type
 */
export function getAITemperature(taskType: keyof typeof AI_CONFIG): number {
  return AI_CONFIG[taskType].temperature;
}

/**
 * Get max tokens for a specific task type
 */
export function getAIMaxTokens(taskType: keyof typeof AI_CONFIG): number {
  return AI_CONFIG[taskType].maxTokens;
}

/**
 * Get timeout for a specific task type
 */
export function getAITimeout(taskType: keyof typeof AI_CONFIG): number {
  return AI_CONFIG[taskType].timeout;
}

/**
 * Get response format for a specific task type
 */
export function getAIResponseFormat(
  taskType: keyof typeof AI_CONFIG
): { type: 'json_object' } | undefined {
  return AI_CONFIG[taskType].responseFormat || undefined;
}
