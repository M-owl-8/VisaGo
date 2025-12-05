/**
 * Fallback Checklist Helper
 * Converts static fallback checklists to ChecklistItem format
 */

import { getFallbackChecklist, FallbackChecklistItem } from '../data/fallback-checklists';
import { normalizeVisaTypeForRules } from './visa-type-aliases';
import { ChecklistItem } from '../services/document-checklist.service';
import { logInfo, logWarn } from '../middleware/logger';

/**
 * Build fallback checklist from static configuration
 * @param countryCode - Country code (e.g., "US", "CA")
 * @param visaTypeName - Visa type name from application (e.g., "b1/b2 visitor", "student")
 * @param existingDocuments - Existing uploaded documents for merge
 * @returns ChecklistItem[] array
 */
export function buildFallbackChecklistFromStaticConfig(
  countryCode: string,
  visaTypeName: string,
  existingDocuments: Array<{
    type: string;
    status: string;
    id: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    uploadedAt?: Date;
    verificationNotes?: string | null;
    verifiedByAI?: boolean | null;
    aiConfidence?: number | null;
    aiNotesUz?: string | null;
    aiNotesRu?: string | null;
    aiNotesEn?: string | null;
  }>
): ChecklistItem[] {
  // Normalize visa type using alias mapping (same as VisaRulesService)
  const normalizedVisaType = normalizeVisaTypeForRules(countryCode, visaTypeName);
  
  // Map to fallback checklist type
  const visaTypeSlug: 'student' | 'tourist' = normalizedVisaType.includes('student') || normalizedVisaType.includes('study')
    ? 'student'
    : 'tourist';

  logInfo('[FallbackChecklist] Building from static config', {
    countryCode,
    originalVisaType: visaTypeName,
    normalizedVisaType: visaTypeSlug,
  });

  // Get fallback checklist items
  const fallbackItems = getFallbackChecklist(countryCode, visaTypeSlug);

  if (!fallbackItems || fallbackItems.length === 0) {
    logWarn('[FallbackChecklist] No fallback found, using generic US checklist', {
      countryCode,
      visaTypeSlug,
    });
    // Use US as generic fallback
    const genericItems = getFallbackChecklist('US', visaTypeSlug);
    if (!genericItems || genericItems.length === 0) {
      // Last resort: return empty array (should not happen)
      return [];
    }
    return convertFallbackItemsToChecklistItems(genericItems, existingDocuments);
  }

  return convertFallbackItemsToChecklistItems(fallbackItems, existingDocuments);
}

/**
 * Convert FallbackChecklistItem[] to ChecklistItem[]
 */
function convertFallbackItemsToChecklistItems(
  fallbackItems: FallbackChecklistItem[],
  existingDocuments: Array<{
    type: string;
    status: string;
    id: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    uploadedAt?: Date;
    verificationNotes?: string | null;
    verifiedByAI?: boolean | null;
    aiConfidence?: number | null;
    aiNotesUz?: string | null;
    aiNotesRu?: string | null;
    aiNotesEn?: string | null;
  }>
): ChecklistItem[] {
  const existingDocsMap = new Map(
    existingDocuments.map((doc) => [doc.type, doc])
  );

  return fallbackItems.map((item, index) => {
    const existingDoc = existingDocsMap.get(item.document);
    
    return {
      id: `checklist-item-${index}`,
      documentType: item.document,
      name: item.name,
      nameUz: item.nameUz,
      nameRu: item.nameRu,
      description: item.description,
      descriptionUz: item.descriptionUz,
      descriptionRu: item.descriptionRu,
      category: item.category,
      required: item.required,
      priority: item.priority,
      status: existingDoc ? (existingDoc.status as any) : 'missing',
      userDocumentId: existingDoc?.id,
      fileUrl: existingDoc?.fileUrl,
      fileName: existingDoc?.fileName,
      fileSize: existingDoc?.fileSize,
      uploadedAt: existingDoc?.uploadedAt?.toISOString(),
      verificationNotes: existingDoc?.aiNotesUz || existingDoc?.verificationNotes || undefined,
      aiVerified: existingDoc?.verifiedByAI === true,
      aiConfidence: existingDoc?.aiConfidence || undefined,
      whereToObtain: item.whereToObtain,
      whereToObtainUz: item.whereToObtainUz,
      whereToObtainRu: item.whereToObtainRu,
    };
  });
}

