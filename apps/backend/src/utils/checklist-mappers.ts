/**
 * Checklist Mappers
 * 
 * Adapter functions to convert between canonical schemas and legacy API formats.
 * These mappers ensure backward compatibility while using the new canonical types.
 */

import type {
  ChecklistBrainOutput,
  ChecklistBrainItem,
  ApplicantProfile,
} from '../types/visa-brain';

/**
 * Legacy checklist item format (what the frontend currently expects)
 */
export interface LegacyChecklistItem {
  document: string;
  name?: string;
  nameUz?: string;
  nameRu?: string;
  category?: 'required' | 'highly_recommended' | 'optional';
  required: boolean;
  priority?: 'high' | 'medium' | 'low';
  description?: string;
  descriptionUz?: string;
  descriptionRu?: string;
  whereToObtain?: string;
  whereToObtainUz?: string;
  whereToObtainRu?: string;
}

/**
 * Legacy checklist response format (what the frontend currently expects)
 */
export interface LegacyChecklistResponse {
  type: string;
  country?: string;
  checklist: LegacyChecklistItem[];
}

/**
 * Map ChecklistBrainItem status to legacy category
 */
function mapStatusToCategory(
  status: ChecklistBrainItem['status']
): 'required' | 'highly_recommended' | 'optional' {
  switch (status) {
    case 'REQUIRED':
      return 'required';
    case 'HIGHLY_RECOMMENDED':
      return 'highly_recommended';
    case 'OPTIONAL':
      return 'optional';
    case 'CONDITIONAL':
      // Conditional items are typically highly_recommended in legacy format
      return 'highly_recommended';
    default:
      return 'optional';
  }
}

/**
 * Map ChecklistBrainItem to legacy format
 */
function mapBrainItemToLegacy(item: ChecklistBrainItem): LegacyChecklistItem {
  const category = mapStatusToCategory(item.status);
  const required = category === 'required';

  return {
    document: item.id,
    name: item.name,
    nameUz: item.nameUz,
    nameRu: item.nameRu,
    category,
    required,
    priority: item.priority,
    description: item.description,
    descriptionUz: item.descriptionUz,
    descriptionRu: item.descriptionRu,
    whereToObtain: item.whereToObtain,
    whereToObtainUz: item.whereToObtainUz,
    whereToObtainRu: item.whereToObtainRu,
  };
}

/**
 * Map ChecklistBrainOutput to legacy response format
 * 
 * This is the main adapter function that converts the canonical brain output
 * to the format expected by the frontend API.
 */
export function mapBrainOutputToLegacy(
  brainOutput: ChecklistBrainOutput,
  visaType: string
): LegacyChecklistResponse {
  return {
    type: visaType,
    country: brainOutput.countryName,
    checklist: brainOutput.requiredDocuments.map(mapBrainItemToLegacy),
  };
}

/**
 * Map legacy checklist response to ChecklistBrainOutput
 * 
 * This is useful when GPT-4 returns the old format and we need to convert it
 * to the canonical format for internal processing.
 */
export function mapLegacyToBrainOutput(
  legacy: LegacyChecklistResponse,
  profile: ApplicantProfile
): ChecklistBrainOutput {
  const requiredDocuments: ChecklistBrainItem[] = legacy.checklist.map((item) => {
    // Map legacy category to brain status
    let status: ChecklistBrainItem['status'];
    switch (item.category) {
      case 'required':
        status = 'REQUIRED';
        break;
      case 'highly_recommended':
        status = 'HIGHLY_RECOMMENDED';
        break;
      case 'optional':
        status = 'OPTIONAL';
        break;
      default:
        status = 'OPTIONAL';
    }

    return {
      id: item.document,
      status,
      whoNeedsIt: 'applicant', // Default, can be enhanced later
      name: item.name || item.document,
      nameUz: item.nameUz || item.name || item.document,
      nameRu: item.nameRu || item.name || item.document,
      description: item.description || '',
      descriptionUz: item.descriptionUz || item.description || '',
      descriptionRu: item.descriptionRu || item.description || '',
      whereToObtain: item.whereToObtain || '',
      whereToObtainUz: item.whereToObtainUz || item.whereToObtain || '',
      whereToObtainRu: item.whereToObtainRu || item.whereToObtain || '',
      priority: item.priority || (item.required ? 'high' : 'medium'),
      isCoreRequired: item.required || false,
      isConditional: item.category === 'highly_recommended' && !item.required,
    };
  });

  return {
    countryCode: profile.destinationCountryCode,
    countryName: legacy.country || profile.destinationCountryName,
    visaTypeCode: profile.visaTypeCode,
    visaTypeLabel: profile.visaTypeLabel,
    profileSummary: `Applicant from ${profile.nationality} applying for ${profile.visaTypeLabel} to ${profile.destinationCountryName}`,
    requiredDocuments,
    disclaimer:
      'This checklist is based on general requirements. Always verify current requirements with the official embassy or consulate website before submitting your application.',
  };
}

/**
 * Parse GPT-4 response that may be in either format
 * 
 * This function tries to parse the response as ChecklistBrainOutput first,
 * then falls back to legacy format if needed.
 */
export function parseChecklistResponse(
  rawContent: string,
  profile: ApplicantProfile
): {
  brainOutput: ChecklistBrainOutput | null;
  legacy: LegacyChecklistResponse | null;
  format: 'brain' | 'legacy' | 'unknown';
} {
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(rawContent);

    // Check if it matches ChecklistBrainOutput structure
    if (
      parsed.countryCode &&
      parsed.visaTypeCode &&
      Array.isArray(parsed.requiredDocuments)
    ) {
      // It's in brain output format
      return {
        brainOutput: parsed as ChecklistBrainOutput,
        legacy: null,
        format: 'brain',
      };
    }

    // Check if it matches legacy format
    if (parsed.checklist && Array.isArray(parsed.checklist)) {
      // It's in legacy format
      const legacy = parsed as LegacyChecklistResponse;
      return {
        brainOutput: null,
        legacy,
        format: 'legacy',
      };
    }

    return {
      brainOutput: null,
      legacy: null,
      format: 'unknown',
    };
  } catch (error) {
    return {
      brainOutput: null,
      legacy: null,
      format: 'unknown',
    };
  }
}



