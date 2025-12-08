/**
 * Document Type Mapping Configuration
 *
 * Central mapping for canonical document types and their aliases.
 * This ensures consistent document type handling across:
 * - Checklist generation
 * - Document uploads
 * - Document validation
 * - Document matching
 *
 * @module document-types-map
 */

/**
 * Canonical document types used throughout the system
 * These align with DocumentCatalog.documentType values and are the single source of truth
 * for document type normalization.
 */
export type CanonicalDocumentType =
  | 'passport'
  | 'passport_photo'
  | 'passport_biometric'
  | 'visa_application_form'
  | 'travel_insurance'
  | 'bank_statement'
  | 'bank_statements_applicant'
  | 'sponsor_bank_statements'
  | 'income_certificate'
  | 'salary_certificate'
  | 'financial_guarantee'
  | 'proof_of_funds'
  | 'sponsor_documents'
  | 'flight_booking'
  | 'flight_reservation'
  | 'accommodation_proof'
  | 'property_documents'
  | 'property_document'
  | 'property_ownership'
  | 'kadastr_document'
  | 'family_ties_documents'
  | 'previous_visas'
  | 'travel_itinerary'
  | 'cover_letter'
  | 'university_acceptance'
  | 'coe_letter'
  | 'i20_form'
  | 'cas_letter'
  | 'loa_letter'
  | 'tuition_payment_proof'
  | 'gic_proof'
  | 'sevis_fee_receipt'
  | 'scholarship_letter'
  | 'employment_letter'
  | 'employment_contract'
  | 'study_enrollment'
  | 'parental_consent'
  | 'birth_certificate'
  | 'marriage_certificate'
  | 'biometric_data'
  | 'police_clearance'
  | 'medical_exam'
  | 'tb_test_certificate'
  | 'health_insurance'
  | 'dli_letter'
  | 'academic_transcripts'
  | 'diploma'
  | 'additional_supporting_docs'
  | 'invitation_letter'
  | 'sponsor_letter'
  | 'host_letter'
  | 'tax_returns'
  | 'business_registration'
  | 'leave_letter'
  | 'ds160_confirmation'
  | 'visa_fee_receipt'
  | 'appointment_confirmation';

/**
 * Document type mapping with canonical type and aliases
 */
export interface DocumentTypeMapping {
  canonical: CanonicalDocumentType;
  aliases: string[]; // All variants used in different parts of the code
}

/**
 * Document type mappings
 * Maps aliases to canonical document types
 */
export const DOCUMENT_TYPE_MAPPINGS: DocumentTypeMapping[] = [
  {
    canonical: 'passport',
    aliases: [
      'passport',
      'passport_international',
      'international_passport',
      'international passport',
      'valid passport',
      'International Passport', // Common GPT output
      'Passport', // Capitalized
    ],
  },
  {
    canonical: 'passport_photo',
    aliases: ['passport_photo', 'passport_photos', 'photo', 'photos'],
  },
  {
    canonical: 'bank_statement',
    aliases: [
      'bank_statement',
      'bank_statements',
      'bank_statements_applicant',
      'financial_evidence',
      'financial_evidence_applicant',
      'bank_account_statement',
      'account_statement',
    ],
  },
  {
    canonical: 'sponsor_bank_statements',
    aliases: [
      'sponsor_bank_statements',
      'sponsor_bank_statement',
      'sponsor_financial_documents',
      'sponsor_financial_evidence',
    ],
  },
  {
    canonical: 'property_documents',
    aliases: [
      'property_documents',
      'property_document',
      'kadastr',
      'kadastr_document',
      'real_estate_docs',
      'property_ownership',
      'property_ownership_document',
    ],
  },
  {
    canonical: 'employment_letter',
    aliases: [
      'employment_letter',
      'employment_contract',
      'work_letter',
      'employer_letter',
      'job_letter',
      'salary_certificate',
      'employment letter',
      'Employment Letter', // Common GPT output
      'employment verification letter',
      'Employment Verification Letter', // Common GPT output
    ],
  },
  {
    canonical: 'income_certificate',
    aliases: ['income_certificate', 'income_proof', 'income_document', 'salary_certificate'],
  },
  {
    canonical: 'travel_insurance',
    aliases: [
      'travel_insurance',
      'insurance',
      'health_insurance',
      'medical_insurance',
      'travel insurance',
      'Travel Insurance', // Common GPT output
      'medical / travel insurance',
      'medical travel insurance',
      'Medical / Travel Insurance', // Common GPT output
    ],
  },
  {
    canonical: 'flight_booking',
    aliases: ['flight_booking', 'flight_reservation', 'return_ticket', 'flight_ticket'],
  },
  {
    canonical: 'accommodation_proof',
    aliases: [
      'accommodation_proof',
      'hotel_booking',
      'accommodation_booking',
      'hotel_reservation',
      'lodging_proof',
      'proof of accommodation',
      'Proof of Accommodation', // Common GPT output
      'hotel booking',
      'airbnb booking',
      'Hotel Booking', // Common GPT output
    ],
  },
  {
    canonical: 'travel_itinerary',
    aliases: ['travel_itinerary', 'itinerary', 'travel_plan', 'trip_itinerary'],
  },
  {
    canonical: 'family_ties_documents',
    aliases: [
      'family_ties_documents',
      'family_ties',
      'family_documents',
      'family_proof',
      'marriage_certificate',
      'birth_certificate',
    ],
  },
  {
    canonical: 'previous_visas',
    aliases: ['previous_visas', 'previous_visa', 'visa_history', 'travel_history'],
  },
  {
    canonical: 'cover_letter',
    aliases: ['cover_letter', 'personal_statement', 'motivation_letter', 'explanation_letter'],
  },
  {
    canonical: 'coe_letter',
    aliases: ['coe_letter', 'coe', 'confirmation_of_enrollment', 'university_acceptance'],
  },
  {
    canonical: 'i20_form',
    aliases: ['i20_form', 'i20', 'i-20', 'form_i20', 'sevis_i20'],
  },
  {
    canonical: 'cas_letter',
    aliases: ['cas_letter', 'cas', 'confirmation_of_acceptance_for_studies'],
  },
  {
    canonical: 'loa_letter',
    aliases: ['loa_letter', 'loa', 'letter_of_acceptance', 'acceptance_letter'],
  },
  {
    canonical: 'tuition_payment_proof',
    aliases: [
      'tuition_payment_proof',
      'tuition_payment',
      'tuition_receipt',
      'payment_receipt',
      'fee_payment',
    ],
  },
  {
    canonical: 'gic_proof',
    aliases: ['gic_proof', 'gic', 'guaranteed_investment_certificate'],
  },
  {
    canonical: 'scholarship_letter',
    aliases: ['scholarship_letter', 'scholarship', 'scholarship_document', 'funding_letter'],
  },
  {
    canonical: 'parental_consent',
    aliases: ['parental_consent', 'parent_consent', 'minor_consent', 'guardian_consent'],
  },
  {
    canonical: 'invitation_letter',
    aliases: ['invitation_letter', 'invitation', 'sponsor_letter', 'host_letter'],
  },
  {
    canonical: 'proof_of_funds',
    aliases: [
      'proof_of_funds',
      'financial_guarantee',
      'funds_proof',
      'financial_proof',
      'proof of financial means',
      'Proof of Financial Means', // Common GPT output
      'proof of funds',
      'Proof of Funds', // Common GPT output
      'bank statements / income proof',
      'Bank Statements / Income Proof', // Common GPT output
      'financial means',
    ],
  },
  {
    canonical: 'tax_returns',
    aliases: ['tax_returns', 'tax_return', 'tax_document', 'income_tax'],
  },
  {
    canonical: 'business_registration',
    aliases: [
      'business_registration',
      'business_license',
      'company_registration',
      'business_document',
    ],
  },
  {
    canonical: 'medical_exam',
    aliases: ['medical_exam', 'medical_examination', 'health_exam', 'medical_check'],
  },
  {
    canonical: 'tb_test_certificate',
    aliases: ['tb_test_certificate', 'tuberculosis_test', 'tb_test', 'medical_test'],
  },
  {
    canonical: 'police_clearance',
    aliases: ['police_clearance', 'police_certificate', 'criminal_record', 'background_check'],
  },
  {
    canonical: 'academic_transcripts',
    aliases: ['academic_transcripts', 'transcripts', 'academic_records', 'grade_transcripts'],
  },
  {
    canonical: 'diploma',
    aliases: ['diploma', 'degree', 'certificate', 'graduation_certificate'],
  },
  {
    canonical: 'additional_supporting_docs',
    aliases: [
      'additional_supporting_docs',
      'supporting_documents',
      'additional_docs',
      'other_documents',
    ],
  },
  {
    canonical: 'ds160_confirmation',
    aliases: [
      'ds160_confirmation',
      'ds160',
      'ds-160',
      'ds_160',
      'ds160_form',
      'ds_160_confirmation',
    ],
  },
  {
    canonical: 'visa_fee_receipt',
    aliases: ['visa_fee_receipt', 'visa_fee', 'fee_receipt', 'visa_payment_receipt'],
  },
  {
    canonical: 'appointment_confirmation',
    aliases: [
      'appointment_confirmation',
      'appointment',
      'interview_appointment',
      'visa_appointment',
    ],
  },
  {
    canonical: 'visa_application_form',
    aliases: [
      'visa_application_form',
      'visa_form',
      'visa_application',
      'application_form',
      'visa_application_form_completed',
      'visa application form',
      'Visa Application Form', // Common GPT output
      'schengen visa application form',
      'schengen_visa_form', // ES tourist specific
      'schengen application form',
      'Schengen Visa Application Form', // Common GPT output
    ],
  },
  {
    canonical: 'passport_photo',
    aliases: [
      'passport_photo',
      'photo_passport', // ES tourist specific
      'passport_photos',
      'photo',
      'photos',
    ],
  },
  {
    canonical: 'sponsor_bank_statements',
    aliases: [
      'sponsor_bank_statements',
      'bank_statements_sponsor', // ES tourist specific
      'sponsor_bank_statement',
      'sponsor_financial_documents',
      'sponsor_financial_evidence',
    ],
  },
  {
    canonical: 'sponsor_documents',
    aliases: [
      'sponsor_documents',
      'sponsor_affidavit', // ES tourist specific
      'sponsor_letter',
      'sponsor_employment_letter', // ES tourist specific
    ],
  },
  {
    canonical: 'business_registration',
    aliases: [
      'business_registration',
      'business_license',
      'company_registration',
      'business_document',
      'business_bank_statements', // ES tourist specific
    ],
  },
  {
    canonical: 'study_enrollment',
    aliases: [
      'study_enrollment',
      'student_enrollment_letter', // ES tourist specific
      'enrollment_letter',
      'student_enrollment',
    ],
  },
  {
    canonical: 'academic_transcripts',
    aliases: [
      'academic_transcripts',
      'transcripts',
      'academic_records',
      'grade_transcripts',
      'student_transcript', // ES tourist specific
    ],
  },
  {
    canonical: 'invitation_letter',
    aliases: [
      'invitation_letter',
      'invitation',
      'sponsor_letter',
      'host_letter',
      'host_passport_copy', // ES tourist specific
      'host_registration_document', // ES tourist specific
    ],
  },
  {
    canonical: 'previous_visas',
    aliases: [
      'previous_visas',
      'previous_visa',
      'visa_history',
      'travel_history',
      'travel_history_evidence', // ES tourist specific
    ],
  },
  {
    canonical: 'cover_letter',
    aliases: [
      'cover_letter',
      'personal_statement',
      'motivation_letter',
      'explanation_letter',
      'refusal_explanation', // ES tourist specific
    ],
  },
  {
    canonical: 'proof_of_funds',
    aliases: [
      'proof_of_funds',
      'financial_guarantee',
      'funds_proof',
      'financial_proof',
      'proof of financial means',
      'Proof of Financial Means', // Common GPT output
      'proof of funds',
      'Proof of Funds', // Common GPT output
      'bank statements / income proof',
      'Bank Statements / Income Proof', // Common GPT output
      'financial means',
      'additional_financial_docs', // ES tourist specific
    ],
  },
  {
    canonical: 'marriage_certificate',
    aliases: ['marriage_certificate', 'marriage_cert', 'wedding_certificate'],
  },
];

/**
 * Normalize a document type string to its canonical form
 *
 * @param raw - Raw document type string (may be an alias)
 * @returns Canonical document type or null if not found
 */
export function normalizeDocumentType(raw: string): CanonicalDocumentType | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const normalized = raw.trim().toLowerCase();

  // First, check if it's already a canonical type
  for (const mapping of DOCUMENT_TYPE_MAPPINGS) {
    if (mapping.canonical === normalized) {
      return mapping.canonical;
    }
  }

  // Then check aliases
  for (const mapping of DOCUMENT_TYPE_MAPPINGS) {
    if (mapping.aliases.some((alias) => alias.toLowerCase() === normalized)) {
      return mapping.canonical;
    }
  }

  // If not found, return null (caller can handle this)
  return null;
}

/**
 * Check if two document types match (considering aliases)
 *
 * @param type1 - First document type
 * @param type2 - Second document type
 * @returns True if types match (same canonical type)
 */
export function documentTypesMatch(type1: string, type2: string): boolean {
  const canonical1 = normalizeDocumentType(type1);
  const canonical2 = normalizeDocumentType(type2);

  if (!canonical1 || !canonical2) {
    // If either is null, fall back to case-insensitive string comparison
    return type1.toLowerCase() === type2.toLowerCase();
  }

  return canonical1 === canonical2;
}

/**
 * Get all aliases for a canonical document type
 *
 * @param canonical - Canonical document type
 * @returns Array of aliases (including the canonical type itself)
 */
export function getDocumentTypeAliases(canonical: CanonicalDocumentType): string[] {
  const mapping = DOCUMENT_TYPE_MAPPINGS.find((m) => m.canonical === canonical);
  return mapping ? [canonical, ...mapping.aliases] : [canonical];
}

/**
 * Normalized document type result
 * Provides both the canonical type and metadata about the normalization process
 */
export type NormalizedDocumentTypeResult = {
  canonicalType: CanonicalDocumentType | null;
  originalType: string;
  wasNormalized: boolean;
};

/**
 * Normalize any raw documentType (from API, DB, rules, etc.)
 * into a CanonicalDocumentType if possible.
 *
 * - Handles aliases and legacy strings.
 * - Returns { canonicalType, originalType, wasNormalized }.
 * - If canonicalType is null, caller can decide how to proceed.
 *
 * @param raw - Raw document type string (may be an alias or legacy value)
 * @returns NormalizedDocumentTypeResult with canonical type and normalization metadata
 */
export function toCanonicalDocumentType(raw: string): NormalizedDocumentTypeResult {
  if (!raw || typeof raw !== 'string') {
    return {
      canonicalType: null,
      originalType: raw || '',
      wasNormalized: false,
    };
  }

  // 1) Trim, lowercase, replace spaces/hyphens/underscores consistently
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/-/g, '_'); // Replace hyphens with underscores

  // 2) First check if it's already a canonical type
  for (const mapping of DOCUMENT_TYPE_MAPPINGS) {
    if (mapping.canonical === normalized) {
      return {
        canonicalType: mapping.canonical,
        originalType: raw,
        wasNormalized: false, // Already canonical
      };
    }
  }

  // 3) Check aliases
  for (const mapping of DOCUMENT_TYPE_MAPPINGS) {
    // Normalize aliases for comparison
    const aliasMatch = mapping.aliases.some((alias) => {
      const normalizedAlias = alias.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
      return normalizedAlias === normalized;
    });

    if (aliasMatch) {
      return {
        canonicalType: mapping.canonical,
        originalType: raw,
        wasNormalized: true,
      };
    }
  }

  // 4) If no match, return null (caller can handle this)
  return {
    canonicalType: null,
    originalType: raw,
    wasNormalized: false,
  };
}

/**
 * Log unknown document type for debugging and monitoring
 *
 * @param raw - Raw document type that could not be normalized
 * @param context - Optional context metadata (source, countryCode, visaType, etc.)
 */
export function logUnknownDocumentType(raw: string, context?: Record<string, any>): void {
  const { logWarn } = require('../middleware/logger');
  logWarn('[DocumentType] Unknown documentType, could not normalize', {
    raw,
    ...context,
  });
}
