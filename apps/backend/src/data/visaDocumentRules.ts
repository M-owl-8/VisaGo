/**
 * Visa Document Rules
 * Rule-based document checklist definitions for hybrid GPT-4 system
 *
 * This file defines which documents are required/recommended/optional for specific
 * country+visa type combinations. GPT-4 will only enrich these documents with
 * descriptions and translations, not decide which documents to include.
 */

export type DocumentRule = {
  id: string;
  category: 'required' | 'highly_recommended' | 'optional';
  required: boolean;
};

export type ConditionalRule = {
  when: {
    sponsorType?: 'self' | 'parent' | 'relative' | 'company' | 'other';
    hasTravelHistory?: boolean;
    previousVisaRejections?: boolean;
    isMinor?: boolean;
    hasPropertyInUzbekistan?: boolean;
    hasFamilyInUzbekistan?: boolean;
  };
  add: DocumentRule[];
};

export type RiskAdjustment = {
  whenRiskLevel: 'low' | 'medium' | 'high';
  add?: DocumentRule[];
  upgradeCategory?: {
    id: string;
    toCategory: 'highly_recommended' | 'required';
  }[];
};

export type VisaDocumentRuleSet = {
  countryCode: 'US' | 'CA' | 'ES' | 'DE' | 'JP' | 'AE' | 'PL' | 'NZ' | 'GB' | 'AU';
  visaType: 'student' | 'tourist';
  baseDocuments: DocumentRule[];
  conditionalDocuments?: ConditionalRule[];
  riskAdjustments?: RiskAdjustment[];
};

export type VisaDocumentRulesConfig = VisaDocumentRuleSet[];

/**
 * Visa document rules configuration
 * FULL HYBRID COVERAGE for 8 countries × visa types:
 * - USA: student, tourist
 * - Canada: student, tourist
 * - UK: student, tourist
 * - Australia: student, tourist
 * - Spain: tourist (Schengen)
 * - Germany: tourist (Schengen)
 * - Japan: tourist
 * - UAE: tourist
 *
 * All these visas use rule engine + GPT-4 enrichment (hybrid mode).
 * Legacy GPT-4 full generation only for unsupported future countries.
 */
export const visaDocumentRules: VisaDocumentRulesConfig = [
  // ============================================================================
  // USA - STUDENT VISA (F-1)
  // ============================================================================
  {
    countryCode: 'US',
    visaType: 'student',
    baseDocuments: [
      { id: 'passport', category: 'required', required: true },
      { id: 'passport_photo', category: 'required', required: true },
      { id: 'i20_form', category: 'required', required: true },
      { id: 'sevis_fee_receipt', category: 'required', required: true },
      { id: 'ds160_confirmation', category: 'required', required: true },
      { id: 'bank_statement_main', category: 'required', required: true },
      { id: 'tuition_payment_proof', category: 'required', required: true },
      { id: 'english_test_proof', category: 'optional', required: false },
      { id: 'academic_records', category: 'highly_recommended', required: false },
      { id: 'travel_itinerary', category: 'optional', required: false },
    ],
    conditionalDocuments: [
      // If sponsored by parent/relative, add sponsor documents
      {
        when: { sponsorType: 'parent' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { sponsorType: 'relative' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_relationship_proof', category: 'highly_recommended', required: false },
        ],
      },
      // If no travel history, add stronger ties documents
      {
        when: { hasTravelHistory: false },
        add: [
          { id: 'employment_letter', category: 'highly_recommended', required: false },
          { id: 'property_documents', category: 'highly_recommended', required: false },
        ],
      },
      // If previous refusals, add explanation letter
      {
        when: { previousVisaRejections: true },
        add: [
          { id: 'refusal_explanation_letter', category: 'highly_recommended', required: false },
        ],
      },
      // If has property, add property documents
      {
        when: { hasPropertyInUzbekistan: true },
        add: [{ id: 'property_documents', category: 'highly_recommended', required: false }],
      },
      // If has family, add family ties documents
      {
        when: { hasFamilyInUzbekistan: true },
        add: [{ id: 'family_ties_proof', category: 'highly_recommended', required: false }],
      },
    ],
    riskAdjustments: [
      {
        whenRiskLevel: 'high',
        add: [
          { id: 'employment_letter', category: 'highly_recommended', required: false },
          { id: 'property_documents', category: 'highly_recommended', required: false },
          { id: 'family_ties_proof', category: 'highly_recommended', required: false },
        ],
      },
      {
        whenRiskLevel: 'low',
        // No additional documents for low risk
        add: [],
      },
    ],
  },

  // ============================================================================
  // CANADA - STUDENT VISA
  // ============================================================================
  {
    countryCode: 'CA',
    visaType: 'student',
    baseDocuments: [
      { id: 'passport', category: 'required', required: true },
      { id: 'passport_photo', category: 'required', required: true },
      { id: 'loa_letter', category: 'required', required: true }, // LOA from DLI (NOT I-20)
      { id: 'visa_application_form', category: 'required', required: true },
      { id: 'bank_statement_main', category: 'required', required: true },
      { id: 'gic_certificate', category: 'highly_recommended', required: false }, // GIC for Canada
      { id: 'tuition_payment_receipt', category: 'highly_recommended', required: false },
      { id: 'academic_records', category: 'highly_recommended', required: false },
      { id: 'language_certificate', category: 'highly_recommended', required: false },
      { id: 'study_plan', category: 'highly_recommended', required: false },
      { id: 'travel_itinerary', category: 'optional', required: false },
    ],
    conditionalDocuments: [
      // If sponsored by parent, add sponsor documents
      {
        when: { sponsorType: 'parent' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { sponsorType: 'relative' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_relationship_proof', category: 'highly_recommended', required: false },
        ],
      },
      // If no travel history, add stronger ties
      {
        when: { hasTravelHistory: false },
        add: [
          { id: 'employment_letter', category: 'highly_recommended', required: false },
          { id: 'property_documents', category: 'highly_recommended', required: false },
        ],
      },
      // If previous refusals
      {
        when: { previousVisaRejections: true },
        add: [
          { id: 'refusal_explanation_letter', category: 'highly_recommended', required: false },
        ],
      },
      // Property and family ties
      {
        when: { hasPropertyInUzbekistan: true },
        add: [{ id: 'property_documents', category: 'highly_recommended', required: false }],
      },
      {
        when: { hasFamilyInUzbekistan: true },
        add: [{ id: 'family_ties_proof', category: 'highly_recommended', required: false }],
      },
    ],
    riskAdjustments: [
      {
        whenRiskLevel: 'high',
        add: [
          { id: 'employment_letter', category: 'highly_recommended', required: false },
          { id: 'property_documents', category: 'highly_recommended', required: false },
          { id: 'family_ties_proof', category: 'highly_recommended', required: false },
        ],
      },
      {
        whenRiskLevel: 'low',
        add: [],
      },
    ],
  },

  // ============================================================================
  // SPAIN - TOURIST VISA (Schengen)
  // ============================================================================
  {
    countryCode: 'ES',
    visaType: 'tourist',
    baseDocuments: [
      { id: 'passport', category: 'required', required: true },
      { id: 'passport_photo', category: 'required', required: true },
      { id: 'schengen_visa_form', category: 'required', required: true },
      { id: 'travel_insurance', category: 'required', required: true }, // Must cover 30,000 EUR
      { id: 'accommodation_proof', category: 'required', required: true },
      { id: 'round_trip_ticket', category: 'required', required: true },
      { id: 'bank_statement_main', category: 'required', required: true },
      { id: 'employment_letter', category: 'highly_recommended', required: false },
      { id: 'travel_itinerary', category: 'highly_recommended', required: false },
      { id: 'property_documents', category: 'optional', required: false },
    ],
    conditionalDocuments: [
      // If sponsored
      {
        when: { sponsorType: 'parent' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { sponsorType: 'relative' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_relationship_proof', category: 'highly_recommended', required: false },
        ],
      },
      // If no travel history
      {
        when: { hasTravelHistory: false },
        add: [
          { id: 'employment_letter', category: 'highly_recommended', required: false },
          { id: 'property_documents', category: 'highly_recommended', required: false },
          { id: 'family_ties_proof', category: 'highly_recommended', required: false },
        ],
      },
      // If previous refusals
      {
        when: { previousVisaRejections: true },
        add: [
          { id: 'refusal_explanation_letter', category: 'highly_recommended', required: false },
        ],
      },
      // Property and family ties
      {
        when: { hasPropertyInUzbekistan: true },
        add: [{ id: 'property_documents', category: 'highly_recommended', required: false }],
      },
      {
        when: { hasFamilyInUzbekistan: true },
        add: [{ id: 'family_ties_proof', category: 'highly_recommended', required: false }],
      },
    ],
    riskAdjustments: [
      {
        whenRiskLevel: 'high',
        add: [
          { id: 'employment_letter', category: 'highly_recommended', required: false },
          { id: 'property_documents', category: 'highly_recommended', required: false },
          { id: 'family_ties_proof', category: 'highly_recommended', required: false },
        ],
      },
      {
        whenRiskLevel: 'low',
        add: [],
      },
    ],
  },

  // ============================================================================
  // GERMANY - TOURIST VISA (Schengen)
  // ============================================================================
  {
    countryCode: 'DE',
    visaType: 'tourist',
    baseDocuments: [
      { id: 'passport', category: 'required', required: true },
      { id: 'passport_photo', category: 'required', required: true },
      { id: 'schengen_visa_form', category: 'required', required: true },
      { id: 'travel_insurance', category: 'required', required: true }, // Must cover 30,000 EUR
      { id: 'accommodation_proof', category: 'required', required: true },
      { id: 'round_trip_ticket', category: 'required', required: true },
      { id: 'bank_statement_main', category: 'required', required: true },
      { id: 'employment_letter', category: 'highly_recommended', required: false },
      { id: 'travel_itinerary', category: 'highly_recommended', required: false },
      { id: 'property_documents', category: 'optional', required: false },
    ],
    conditionalDocuments: [
      // If sponsored
      {
        when: { sponsorType: 'parent' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { sponsorType: 'relative' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_relationship_proof', category: 'highly_recommended', required: false },
        ],
      },
      // If no travel history
      {
        when: { hasTravelHistory: false },
        add: [
          { id: 'employment_letter', category: 'highly_recommended', required: false },
          { id: 'property_documents', category: 'highly_recommended', required: false },
          { id: 'family_ties_proof', category: 'highly_recommended', required: false },
        ],
      },
      // If previous refusals
      {
        when: { previousVisaRejections: true },
        add: [
          { id: 'refusal_explanation_letter', category: 'highly_recommended', required: false },
        ],
      },
      // Property and family ties
      {
        when: { hasPropertyInUzbekistan: true },
        add: [{ id: 'property_documents', category: 'highly_recommended', required: false }],
      },
      {
        when: { hasFamilyInUzbekistan: true },
        add: [{ id: 'family_ties_proof', category: 'highly_recommended', required: false }],
      },
    ],
    riskAdjustments: [
      {
        whenRiskLevel: 'high',
        add: [
          { id: 'employment_letter', category: 'highly_recommended', required: false },
          { id: 'property_documents', category: 'highly_recommended', required: false },
          { id: 'family_ties_proof', category: 'highly_recommended', required: false },
        ],
      },
      {
        whenRiskLevel: 'low',
        add: [],
      },
    ],
  },

  // ============================================================================
  // USA - TOURIST VISA (B1/B2)
  // ============================================================================
  {
    countryCode: 'US',
    visaType: 'tourist',
    baseDocuments: [
      { id: 'passport', category: 'required', required: true },
      { id: 'passport_photo', category: 'required', required: true },
      { id: 'ds160_confirmation', category: 'required', required: true },
      { id: 'bank_statement_main', category: 'required', required: true },
      { id: 'travel_itinerary', category: 'required', required: true },
      { id: 'accommodation_proof', category: 'required', required: true },
      { id: 'employment_letter', category: 'highly_recommended', required: false },
      { id: 'travel_history_proof', category: 'highly_recommended', required: false },
    ],
    conditionalDocuments: [
      {
        when: { sponsorType: 'parent' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { sponsorType: 'relative' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_relationship_proof', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { previousVisaRejections: true },
        add: [
          { id: 'refusal_explanation_letter', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { hasPropertyInUzbekistan: true },
        add: [{ id: 'property_documents', category: 'highly_recommended', required: false }],
      },
      {
        when: { hasFamilyInUzbekistan: true },
        add: [{ id: 'family_ties_proof', category: 'highly_recommended', required: false }],
      },
    ],
    riskAdjustments: [
      {
        whenRiskLevel: 'high',
        add: [
          { id: 'employment_letter', category: 'highly_recommended', required: false },
          { id: 'property_documents', category: 'highly_recommended', required: false },
          { id: 'family_ties_proof', category: 'highly_recommended', required: false },
        ],
      },
      {
        whenRiskLevel: 'low',
        add: [],
      },
    ],
  },

  // ============================================================================
  // CANADA - TOURIST VISA
  // ============================================================================
  {
    countryCode: 'CA',
    visaType: 'tourist',
    baseDocuments: [
      { id: 'passport', category: 'required', required: true },
      { id: 'passport_photo', category: 'required', required: true },
      { id: 'visa_application_form', category: 'required', required: true },
      { id: 'travel_history_proof', category: 'required', required: true },
      { id: 'accommodation_proof', category: 'required', required: true },
      { id: 'travel_itinerary', category: 'required', required: true },
      { id: 'bank_statement_main', category: 'required', required: true },
      { id: 'employment_letter', category: 'highly_recommended', required: false },
    ],
    conditionalDocuments: [
      {
        when: { sponsorType: 'parent' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { sponsorType: 'relative' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_relationship_proof', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { previousVisaRejections: true },
        add: [
          { id: 'refusal_explanation_letter', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { hasPropertyInUzbekistan: true },
        add: [{ id: 'property_documents', category: 'highly_recommended', required: false }],
      },
    ],
    riskAdjustments: [
      {
        whenRiskLevel: 'high',
        add: [
          { id: 'property_documents', category: 'highly_recommended', required: false },
          { id: 'family_ties_proof', category: 'highly_recommended', required: false },
        ],
      },
      {
        whenRiskLevel: 'low',
        add: [],
      },
    ],
  },

  // ============================================================================
  // UK - STUDENT VISA (CAS based)
  // ============================================================================
  {
    countryCode: 'GB',
    visaType: 'student',
    baseDocuments: [
      { id: 'passport', category: 'required', required: true },
      { id: 'passport_photo', category: 'required', required: true },
      { id: 'cas_letter', category: 'required', required: true },
      { id: 'bank_statement_main', category: 'required', required: true }, // 28-day rule
      { id: 'tuition_payment_receipt', category: 'highly_recommended', required: false },
      { id: 'academic_records', category: 'highly_recommended', required: false },
      { id: 'language_certificate', category: 'highly_recommended', required: false },
      { id: 'tuberculosis_test', category: 'optional', required: false }, // If applies
    ],
    conditionalDocuments: [
      {
        when: { sponsorType: 'parent' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { sponsorType: 'relative' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_relationship_proof', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { previousVisaRejections: true },
        add: [
          { id: 'refusal_explanation_letter', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { hasPropertyInUzbekistan: true },
        add: [{ id: 'property_documents', category: 'highly_recommended', required: false }],
      },
    ],
    riskAdjustments: [
      {
        whenRiskLevel: 'high',
        add: [
          { id: 'property_documents', category: 'highly_recommended', required: false },
          { id: 'family_ties_proof', category: 'highly_recommended', required: false },
        ],
      },
      {
        whenRiskLevel: 'low',
        add: [],
      },
    ],
  },

  // ============================================================================
  // UK - TOURIST VISA
  // ============================================================================
  {
    countryCode: 'GB',
    visaType: 'tourist',
    baseDocuments: [
      { id: 'passport', category: 'required', required: true },
      { id: 'passport_photo', category: 'required', required: true },
      { id: 'visa_application_form', category: 'required', required: true },
      { id: 'bank_statement_main', category: 'required', required: true },
      { id: 'accommodation_proof', category: 'required', required: true },
      { id: 'travel_itinerary', category: 'required', required: true },
      { id: 'employment_letter', category: 'highly_recommended', required: false },
      { id: 'travel_history_proof', category: 'highly_recommended', required: false },
    ],
    conditionalDocuments: [
      {
        when: { sponsorType: 'parent' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { sponsorType: 'relative' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_relationship_proof', category: 'highly_recommended', required: false },
        ],
      },
    ],
    riskAdjustments: [
      {
        whenRiskLevel: 'high',
        add: [
          { id: 'employment_letter', category: 'highly_recommended', required: false },
          { id: 'property_documents', category: 'highly_recommended', required: false },
        ],
      },
      {
        whenRiskLevel: 'low',
        add: [],
      },
    ],
  },

  // ============================================================================
  // AUSTRALIA - STUDENT VISA
  // ============================================================================
  {
    countryCode: 'AU',
    visaType: 'student',
    baseDocuments: [
      { id: 'passport', category: 'required', required: true },
      { id: 'passport_photo', category: 'required', required: true },
      { id: 'coe_letter', category: 'required', required: true }, // Confirmation of Enrolment
      { id: 'health_insurance', category: 'required', required: true }, // OSHC
      { id: 'bank_statement_main', category: 'required', required: true },
      { id: 'sop', category: 'highly_recommended', required: false }, // GTE statement
      { id: 'tuition_payment_receipt', category: 'highly_recommended', required: false },
      { id: 'academic_records', category: 'highly_recommended', required: false },
      { id: 'language_certificate', category: 'highly_recommended', required: false },
    ],
    conditionalDocuments: [
      {
        when: { sponsorType: 'parent' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { sponsorType: 'relative' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_relationship_proof', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { previousVisaRejections: true },
        add: [
          { id: 'refusal_explanation_letter', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { hasPropertyInUzbekistan: true },
        add: [{ id: 'property_documents', category: 'highly_recommended', required: false }],
      },
    ],
    riskAdjustments: [
      {
        whenRiskLevel: 'high',
        add: [
          { id: 'extra_financial_proof', category: 'highly_recommended', required: false },
          { id: 'property_documents', category: 'highly_recommended', required: false },
        ],
      },
      {
        whenRiskLevel: 'low',
        add: [],
      },
    ],
  },

  // ============================================================================
  // AUSTRALIA - TOURIST VISA
  // ============================================================================
  {
    countryCode: 'AU',
    visaType: 'tourist',
    baseDocuments: [
      { id: 'passport', category: 'required', required: true },
      { id: 'passport_photo', category: 'required', required: true },
      { id: 'visa_application_form', category: 'required', required: true },
      { id: 'bank_statement_main', category: 'required', required: true },
      { id: 'accommodation_proof', category: 'required', required: true },
      { id: 'travel_itinerary', category: 'required', required: true },
      { id: 'employment_letter', category: 'highly_recommended', required: false },
      { id: 'travel_history_proof', category: 'highly_recommended', required: false },
    ],
    conditionalDocuments: [
      {
        when: { sponsorType: 'parent' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { sponsorType: 'relative' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_relationship_proof', category: 'highly_recommended', required: false },
        ],
      },
    ],
    riskAdjustments: [
      {
        whenRiskLevel: 'high',
        add: [{ id: 'property_documents', category: 'highly_recommended', required: false }],
      },
      {
        whenRiskLevel: 'low',
        add: [],
      },
    ],
  },

  // ============================================================================
  // JAPAN - TOURIST VISA
  // ============================================================================
  {
    countryCode: 'JP',
    visaType: 'tourist',
    baseDocuments: [
      { id: 'passport', category: 'required', required: true },
      { id: 'passport_photo', category: 'required', required: true },
      { id: 'visa_application_form', category: 'required', required: true },
      { id: 'daily_itinerary', category: 'required', required: true },
      { id: 'accommodation_proof', category: 'required', required: true },
      { id: 'travel_history_proof', category: 'required', required: true },
      { id: 'bank_statement_main', category: 'required', required: true },
      { id: 'employment_letter', category: 'highly_recommended', required: false },
      { id: 'round_trip_ticket', category: 'highly_recommended', required: false },
    ],
    conditionalDocuments: [
      {
        when: { sponsorType: 'parent' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { sponsorType: 'relative' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_relationship_proof', category: 'highly_recommended', required: false },
        ],
      },
    ],
    riskAdjustments: [
      {
        whenRiskLevel: 'high',
        add: [
          { id: 'property_documents', category: 'highly_recommended', required: false },
          { id: 'family_ties_proof', category: 'highly_recommended', required: false },
        ],
      },
      {
        whenRiskLevel: 'low',
        add: [],
      },
    ],
  },

  // ============================================================================
  // UAE - TOURIST VISA
  // ============================================================================
  {
    countryCode: 'AE',
    visaType: 'tourist',
    baseDocuments: [
      { id: 'passport', category: 'required', required: true },
      { id: 'passport_photo', category: 'required', required: true },
      { id: 'visa_application_form', category: 'required', required: true },
      { id: 'accommodation_proof', category: 'required', required: true },
      { id: 'round_trip_ticket', category: 'required', required: true },
      { id: 'bank_statement_main', category: 'required', required: true },
      { id: 'employment_letter', category: 'highly_recommended', required: false },
      { id: 'travel_itinerary', category: 'highly_recommended', required: false },
    ],
    conditionalDocuments: [
      {
        when: { sponsorType: 'parent' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
        ],
      },
      {
        when: { sponsorType: 'relative' },
        add: [
          { id: 'sponsor_bank_statement', category: 'required', required: true },
          { id: 'sponsor_employment_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_support_letter', category: 'highly_recommended', required: false },
          { id: 'sponsor_relationship_proof', category: 'highly_recommended', required: false },
        ],
      },
    ],
    riskAdjustments: [
      {
        whenRiskLevel: 'high',
        add: [
          { id: 'employment_letter', category: 'highly_recommended', required: false },
          { id: 'property_documents', category: 'highly_recommended', required: false },
        ],
      },
      {
        whenRiskLevel: 'low',
        add: [],
      },
    ],
  },
];

/**
 * Find visa document rule set for a given country and visa type
 * Normalizes country names consistent with visaKnowledgeBase.ts
 *
 * @param countryCode - Country code or name (e.g., "US", "United States", "USA")
 * @param visaType - Visa type ("student" or "tourist")
 * @returns Matching rule set or undefined if not found
 */
export function findVisaDocumentRuleSet(
  countryCode: string,
  visaType: string
): VisaDocumentRuleSet | undefined {
  if (!countryCode || !visaType) {
    return undefined;
  }

  // Normalize country code (consistent with visaKnowledgeBase.ts)
  const normalizedCountry = countryCode.trim().toLowerCase();
  let countryKey: string | null = null;

  if (
    normalizedCountry === 'usa' ||
    normalizedCountry === 'united states' ||
    normalizedCountry === 'america' ||
    normalizedCountry === 'amerika' ||
    normalizedCountry === 'us'
  ) {
    countryKey = 'US';
  } else if (
    normalizedCountry === 'canada' ||
    normalizedCountry === 'kanada' ||
    normalizedCountry === 'ca'
  ) {
    countryKey = 'CA';
  } else if (
    normalizedCountry === 'spain' ||
    normalizedCountry === 'ispaniya' ||
    normalizedCountry === 'es'
  ) {
    countryKey = 'ES';
  } else if (
    normalizedCountry === 'germany' ||
    normalizedCountry === 'germaniya' ||
    normalizedCountry === 'de'
  ) {
    countryKey = 'DE';
  } else if (
    normalizedCountry === 'japan' ||
    normalizedCountry === 'yaponiya' ||
    normalizedCountry === 'jp'
  ) {
    countryKey = 'JP';
  } else if (
    normalizedCountry === 'united kingdom' ||
    normalizedCountry === 'uk' ||
    normalizedCountry === 'great britain' ||
    normalizedCountry === 'buyuk britaniya' ||
    normalizedCountry === 'gb'
  ) {
    countryKey = 'GB';
  } else if (
    normalizedCountry === 'australia' ||
    normalizedCountry === 'avstraliya' ||
    normalizedCountry === 'au'
  ) {
    countryKey = 'AU';
  } else if (
    normalizedCountry === 'uae' ||
    normalizedCountry === 'united arab emirates' ||
    normalizedCountry === 'ae'
  ) {
    countryKey = 'AE';
  } else if (
    normalizedCountry === 'poland' ||
    normalizedCountry === 'polsha' ||
    normalizedCountry === 'pl'
  ) {
    countryKey = 'PL';
  } else if (
    normalizedCountry === 'new zealand' ||
    normalizedCountry === 'yangi zelandiya' ||
    normalizedCountry === 'nz'
  ) {
    countryKey = 'NZ';
  }

  if (!countryKey) {
    return undefined;
  }

  // Normalize visa type
  const normalizedVisaType = visaType.trim().toLowerCase();
  if (normalizedVisaType !== 'student' && normalizedVisaType !== 'tourist') {
    return undefined;
  }

  // Find matching rule set
  return visaDocumentRules.find(
    (rule) => rule.countryCode === countryKey && rule.visaType === normalizedVisaType
  );
}
