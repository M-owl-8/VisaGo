/**
 * Checklist Generation Mode
 * Defines the three modes for generating document checklists
 */
export type ChecklistGenerationMode = 'rules' | 'legacy_gpt' | 'static_fallback';

/**
 * Checklist metadata stored in checklistData JSON
 */
export interface ChecklistMetadata {
  items: any[];
  aiGenerated: boolean;
  aiFallbackUsed: boolean;
  aiErrorOccurred?: boolean;
  generationMode: ChecklistGenerationMode;
  modelName?: string; // Model used for AI generation (if applicable)
}
