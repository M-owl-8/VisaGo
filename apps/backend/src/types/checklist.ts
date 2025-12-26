/**
 * Checklist Generation Mode
 * Defines the three modes for generating document checklists
 */
export type ChecklistGenerationMode = 'rules' | 'legacy_gpt' | 'static_fallback';

/**
 * Checklist metadata stored in checklistData JSON
 */
export interface ChecklistMetadata {
  items: ChecklistItem[];
  aiGenerated: boolean;
  aiFallbackUsed: boolean;
  aiErrorOccurred?: boolean;
  generationMode: ChecklistGenerationMode;
  modelName?: string; // Model used for AI generation (if applicable)
  checklistVersion?: number;
}

export interface ChecklistItem {
  id: string;
  documentType: string;
  category: 'required' | 'highly_recommended' | 'optional';
  required: boolean;
  name: string;
  nameUz: string;
  nameRu: string;
  description: string;
  appliesToThisApplicant?: boolean;
  reasonIfApplies?: string;
  extraRecommended?: boolean;
  group: 'identity' | 'financial' | 'travel' | 'education' | 'employment' | 'ties' | 'other';
  priority: number;
  dependsOn?: string[];
  source?: 'rules' | 'ai_extra' | 'fallback';
  ruleSetId?: string;
  ruleSetVersion?: number;
  embassySourceUrl?: string | null;
  expertReasoning?: {
    financialRelevance?: string | null;
    tiesRelevance?: string | null;
    riskMitigation?: string[] | null;
    embassyOfficerPerspective?: string | null;
  };
  countrySpecificRequirements?: {
    format?: string;
    apostille?: boolean;
    translation?: string;
    validityPeriod?: string;
    officerNotes?: string;
  };
  status?: 'missing' | 'pending' | 'processing' | 'verified' | 'rejected';
  userDocumentId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  verificationNotes?: string;
  aiVerified?: boolean;
  aiConfidence?: number;
  whereToObtain?: string;
  whereToObtainUz?: string;
  whereToObtainRu?: string;
}
