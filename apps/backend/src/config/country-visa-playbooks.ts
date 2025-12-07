/**
 * Country Visa Playbooks Configuration
 *
 * This file defines typical visa patterns, officer focus areas, and document hints
 * for 10 priority countries × 2 visa types (tourist + student).
 *
 * These playbooks are used to guide GPT-4 when official embassy rules are incomplete
 * or missing. They represent typical, non-exhaustive, non-legal knowledge based on
 * general visa practice and Uzbek applicant context.
 *
 * IMPORTANT: Embassy rules (VisaRuleSet) always take precedence over playbooks.
 * Playbooks are supplementary guidance, not authoritative requirements.
 *
 * @module country-visa-playbooks
 */

export type VisaCategory = 'tourist' | 'student';

export interface PlaybookDocumentHint {
  documentType: string; // e.g. "bank_statement", "property_document", "coe"
  importance: 'core' | 'finance' | 'ties' | 'travel' | 'legal' | 'special';
  typicalFor: (
    | 'self_funded'
    | 'sponsored'
    | 'minor'
    | 'employed'
    | 'self_employed'
    | 'unemployed'
    | 'short_trip'
    | 'long_trip'
  )[];
  // Short natural-language hints used in prompts (not user-facing directly)
  officerFocusHintEn: string;
}

export interface CountryVisaPlaybook {
  countryCode: string; // "US", "GB", "CA", "AU", "DE", "ES", "JP", "KR", "AE", "FR"
  visaCategory: VisaCategory; // "tourist" | "student"
  typicalRefusalReasonsEn: string[]; // high-level officer concerns
  keyOfficerFocusEn: string[]; // what officers care about the most
  uzbekContextHintsEn: string[]; // special notes for Uzbek applicants
  documentHints: PlaybookDocumentHint[];
}

/**
 * Country Visa Playbooks for 10 Priority Countries
 *
 * These playbooks provide typical patterns and officer focus areas for each
 * country+visaType combination. They are used in prompts when official rules
 * are incomplete or as supplementary guidance.
 */
export const COUNTRY_VISA_PLAYBOOKS: CountryVisaPlaybook[] = [
  // ============================================================================
  // UNITED STATES
  // ============================================================================
  {
    countryCode: 'US',
    visaCategory: 'tourist',
    typicalRefusalReasonsEn: [
      'Insufficient funds to cover trip expenses',
      'Weak ties to home country (risk of overstay)',
      'Unclear travel purpose or unrealistic itinerary',
      'Previous visa refusals or immigration violations',
      'Incomplete or inconsistent documentation',
    ],
    keyOfficerFocusEn: [
      'Strong ties to Uzbekistan (employment, property, family)',
      'Financial capacity sufficient for trip duration',
      'Clear travel purpose and realistic itinerary',
      'Return intention evidence (no immigration intent)',
      'Travel history and visa compliance',
    ],
    uzbekContextHintsEn: [
      'Uzbek applicants often provide kadastr property documents to show ties to home country',
      'Bank statements are usually from Uzbek banks (Kapital Bank, Uzsanoatqurilishbank, Ipak Yuli, etc.); translations may be required',
      "Employment letters (ish joyidan ma'lumotnoma) should be in English or with official translation",
      'US embassy officers are particularly strict about ties and financial sufficiency for B1/B2 visas',
      'Previous travel history to other countries (especially Schengen, UK) can strengthen the application',
    ],
    documentHints: [
      {
        documentType: 'bank_statement',
        importance: 'finance',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Officers check if funds match trip length, are consistent with income, and show stable history (not sudden large deposits)',
      },
      {
        documentType: 'employment_letter',
        importance: 'ties',
        typicalFor: ['employed'],
        officerFocusHintEn:
          'Officers verify employment stability, salary consistency, and return intention. Long-term employment strengthens ties',
      },
      {
        documentType: 'property_document',
        importance: 'ties',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Property ownership (kadastr documents) demonstrates strong ties to Uzbekistan and return intention',
      },
      {
        documentType: 'travel_itinerary',
        importance: 'travel',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn:
          'Detailed itinerary with dates, cities, and activities helps demonstrate genuine travel purpose',
      },
      {
        documentType: 'previous_visa_stamps',
        importance: 'travel',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Previous visa stamps from other countries (especially Schengen, UK) show travel compliance and reduce risk',
      },
      {
        documentType: 'cover_letter',
        importance: 'legal',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Cover letter explaining travel purpose, ties to Uzbekistan, and return plans helps address officer concerns',
      },
    ],
  },
  {
    countryCode: 'US',
    visaCategory: 'student',
    typicalRefusalReasonsEn: [
      'Insufficient funds for tuition and living expenses',
      'Weak ties to home country (immigration intent concerns)',
      'Unclear study plans or weak academic background',
      'Previous visa refusals or immigration violations',
      'Incomplete documentation (I-20, SEVIS, financial proof)',
    ],
    keyOfficerFocusEn: [
      'Financial capacity for 1 year of tuition + living expenses',
      'Academic background and study plans (genuine student intent)',
      'Ties to home country (return intention after studies)',
      'I-20 validity and SEVIS compliance',
      'Immigration intent assessment',
    ],
    uzbekContextHintsEn: [
      'US student visas require Form I-20 from SEVIS-approved school',
      'SEVIS fee (I-901) must be paid before visa interview',
      'Sponsor financial documents (if sponsored) must show sufficient funds for 1 year minimum',
      'Academic transcripts and diplomas should be translated and possibly evaluated',
      'Uzbek students often need to demonstrate strong ties to return after studies',
    ],
    documentHints: [
      {
        documentType: 'coe',
        importance: 'core',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Form I-20 is mandatory and must be valid. Officers verify SEVIS status and school accreditation',
      },
      {
        documentType: 'tuition_payment_proof',
        importance: 'finance',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Proof of tuition payment or scholarship demonstrates financial commitment and genuine student intent',
      },
      {
        documentType: 'sponsor_financial_documents',
        importance: 'finance',
        typicalFor: ['sponsored'],
        officerFocusHintEn:
          'Sponsor bank statements, income certificates, and support letters must show sufficient funds for 1 year minimum',
      },
      {
        documentType: 'academic_transcript',
        importance: 'special',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Academic transcripts help demonstrate genuine student intent and academic preparedness',
      },
      {
        documentType: 'sevis_fee_receipt',
        importance: 'core',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'SEVIS fee (I-901) receipt is mandatory and must be paid before visa interview',
      },
    ],
  },
  // ============================================================================
  // UNITED KINGDOM
  // ============================================================================
  {
    countryCode: 'GB',
    visaCategory: 'tourist',
    typicalRefusalReasonsEn: [
      'Insufficient funds (28-day rule not met)',
      'Weak ties to home country',
      'Unclear travel purpose',
      'Previous refusals or overstays',
      'Incomplete documentation',
    ],
    keyOfficerFocusEn: [
      'Financial capacity (28-day rule: funds must be available for 28 consecutive days before application)',
      'Ties to home country (employment, property, family)',
      'Travel purpose clarity',
      'Accommodation and itinerary',
      'Previous travel history',
    ],
    uzbekContextHintsEn: [
      'UK embassy strictly enforces 28-day bank statement rule - funds must be available for 28 consecutive days',
      'Borderline funds and "too long stay" are big risks for UK tourist visas',
      'Uzbek applicants should provide property documents (kadastr) to strengthen ties',
      'Employment letters must show stable income and long-term employment',
      'Travel insurance is not mandatory but recommended for UK tourist visas',
    ],
    documentHints: [
      {
        documentType: 'bank_statement',
        importance: 'finance',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'UK officers strictly check 28-day rule: funds must be available for 28 consecutive days before application date',
      },
      {
        documentType: 'accommodation_proof',
        importance: 'travel',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn:
          'Hotel bookings or invitation letters help demonstrate clear travel plans and purpose',
      },
      {
        documentType: 'travel_itinerary',
        importance: 'travel',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn:
          'Detailed itinerary with dates and locations helps demonstrate genuine tourist intent',
      },
      {
        documentType: 'employment_letter',
        importance: 'ties',
        typicalFor: ['employed'],
        officerFocusHintEn:
          'Employment letter showing stable income and return to work strengthens ties to home country',
      },
    ],
  },
  {
    countryCode: 'GB',
    visaCategory: 'student',
    typicalRefusalReasonsEn: [
      'Insufficient funds (CAS requirements not met)',
      'Weak academic background or unclear study plans',
      'Immigration intent concerns',
      'Previous refusals',
      'Missing CAS or financial documentation',
    ],
    keyOfficerFocusEn: [
      'Financial capacity (CAS requirements: tuition + living costs)',
      'Academic qualifications and study plans',
      'CAS validity and enrollment',
      'Ties to home country',
      'Immigration intent',
    ],
    uzbekContextHintsEn: [
      'UK student visas require CAS (Confirmation of Acceptance for Studies) from licensed sponsor',
      'Bank statements must show funds for 28+ consecutive days (28-day rule)',
      'TB test certificate required if stay > 6 months',
      'Sponsor financial documents must meet CAS-specified requirements',
      'Academic qualifications may need UK NARIC evaluation',
    ],
    documentHints: [
      {
        documentType: 'coe',
        importance: 'core',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'CAS letter is mandatory and must be valid. Officers verify sponsor license and enrollment',
      },
      {
        documentType: 'bank_statement',
        importance: 'finance',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Bank statements must show funds for 28+ consecutive days and meet CAS-specified amount',
      },
      {
        documentType: 'tuition_payment_proof',
        importance: 'finance',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn: 'Proof of tuition payment or deposit demonstrates financial commitment',
      },
      {
        documentType: 'tb_test_certificate',
        importance: 'legal',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'TB test certificate required if stay > 6 months. Must be from approved clinic',
      },
    ],
  },
  // ============================================================================
  // CANADA
  // ============================================================================
  {
    countryCode: 'CA',
    visaCategory: 'tourist',
    typicalRefusalReasonsEn: [
      'Insufficient funds to cover trip expenses',
      'Weak ties to home country',
      'Unclear travel purpose',
      'Previous refusals or overstays',
      'Incomplete documentation',
    ],
    keyOfficerFocusEn: [
      'Ties to home country (employment, property, family)',
      'Financial capacity for trip duration',
      'Travel history and visa compliance',
      'Purpose of visit clarity',
      'Return intention evidence',
    ],
    uzbekContextHintsEn: [
      'Canadian embassy emphasizes ties to home country and return intention',
      'Bank statements should show sufficient funds for trip duration',
      'Property documents (kadastr) help demonstrate ties to Uzbekistan',
      'Employment letters must show stable income and return to work',
      'Travel history to other countries (especially US, UK, Schengen) strengthens application',
    ],
    documentHints: [
      {
        documentType: 'bank_statement',
        importance: 'finance',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Officers check if funds are sufficient for trip duration and consistent with income',
      },
      {
        documentType: 'travel_itinerary',
        importance: 'travel',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn:
          'Detailed itinerary helps demonstrate genuine travel purpose and return plans',
      },
      {
        documentType: 'property_document',
        importance: 'ties',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Property ownership demonstrates strong ties to Uzbekistan and return intention',
      },
      {
        documentType: 'employment_letter',
        importance: 'ties',
        typicalFor: ['employed'],
        officerFocusHintEn:
          'Employment letter showing stable income and return to work strengthens ties',
      },
    ],
  },
  {
    countryCode: 'CA',
    visaCategory: 'student',
    typicalRefusalReasonsEn: [
      'Insufficient funds for tuition and living expenses',
      'Weak academic background or unclear study plans',
      'Immigration intent concerns',
      'Previous refusals',
      'Missing LOA or financial documentation',
    ],
    keyOfficerFocusEn: [
      'Financial capacity (full tuition + 1 year living cost)',
      'Academic background and study plans (genuine student)',
      'LOA validity from DLI (Designated Learning Institution)',
      'Ties to home country',
      'Immigration intent assessment',
    ],
    uzbekContextHintsEn: [
      'Canadian student visas require LOA (Letter of Acceptance) from DLI',
      'GIC (Guaranteed Investment Certificate) required for SDS (Student Direct Stream)',
      'Bank statements must show funds for full tuition + 1 year living expenses',
      'Sponsor financial documents must meet DLI-specified requirements',
      'Academic qualifications may need WES evaluation',
    ],
    documentHints: [
      {
        documentType: 'coe',
        importance: 'core',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn: 'LOA from DLI is mandatory. Officers verify DLI status and enrollment',
      },
      {
        documentType: 'gic_certificate',
        importance: 'finance',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'GIC required for SDS stream. Shows financial commitment and reduces risk',
      },
      {
        documentType: 'sponsor_financial_documents',
        importance: 'finance',
        typicalFor: ['sponsored'],
        officerFocusHintEn:
          'Sponsor documents must show sufficient funds for full tuition + 1 year living expenses',
      },
      {
        documentType: 'academic_transcript',
        importance: 'special',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Academic transcripts help demonstrate genuine student intent and academic preparedness',
      },
    ],
  },
  // ============================================================================
  // AUSTRALIA
  // ============================================================================
  {
    countryCode: 'AU',
    visaCategory: 'tourist',
    typicalRefusalReasonsEn: [
      'Insufficient funds to cover trip expenses',
      'Weak ties to home country',
      'Unclear travel purpose',
      'Previous refusals or overstays',
      'Incomplete documentation',
    ],
    keyOfficerFocusEn: [
      'Ties to home country (employment, property, family)',
      'Financial capacity for trip duration',
      'Travel history and visa compliance',
      'Purpose of visit clarity',
      'Return intention evidence',
    ],
    uzbekContextHintsEn: [
      'Australian embassy emphasizes ties to home country and return intention',
      'Self-funded vs sponsored applications have different document requirements',
      'Bank statements should show sufficient funds for trip duration',
      'Property documents (kadastr) help demonstrate ties to Uzbekistan',
      'Travel history to other countries strengthens application',
    ],
    documentHints: [
      {
        documentType: 'bank_statement',
        importance: 'finance',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Officers check if funds are sufficient for trip duration and consistent with income',
      },
      {
        documentType: 'travel_itinerary',
        importance: 'travel',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn: 'Detailed itinerary helps demonstrate genuine travel purpose',
      },
      {
        documentType: 'property_document',
        importance: 'ties',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn: 'Property ownership demonstrates strong ties to Uzbekistan',
      },
    ],
  },
  {
    countryCode: 'AU',
    visaCategory: 'student',
    typicalRefusalReasonsEn: [
      'Insufficient funds for tuition and living expenses',
      'Weak academic background or unclear study plans',
      'Immigration intent concerns (GTE failure)',
      'Previous refusals',
      'Missing COE or financial documentation',
    ],
    keyOfficerFocusEn: [
      'Financial capacity (tuition + living expenses)',
      'Academic background and study plans',
      'COE validity and enrollment',
      'GTE (Genuine Temporary Entrant) assessment',
      'Ties to home country',
    ],
    uzbekContextHintsEn: [
      'Australian student visas require COE (Confirmation of Enrolment)',
      'OSHC (Overseas Student Health Cover) insurance is mandatory',
      'GTE statement may be required to demonstrate genuine temporary entrant status',
      'Bank statements must show funds for tuition + living expenses',
      'Sponsor financial documents must meet COE-specified requirements',
    ],
    documentHints: [
      {
        documentType: 'coe',
        importance: 'core',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'COE is mandatory and must be valid. Officers verify enrollment and course details',
      },
      {
        documentType: 'oshc_insurance',
        importance: 'legal',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn: 'OSHC insurance is mandatory and must cover entire study period',
      },
      {
        documentType: 'gte_statement',
        importance: 'special',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'GTE statement demonstrates genuine temporary entrant status and return intention',
      },
      {
        documentType: 'sponsor_financial_documents',
        importance: 'finance',
        typicalFor: ['sponsored'],
        officerFocusHintEn:
          'Sponsor documents must show sufficient funds for tuition + living expenses',
      },
    ],
  },
  // ============================================================================
  // GERMANY (Schengen)
  // ============================================================================
  {
    countryCode: 'DE',
    visaCategory: 'tourist',
    typicalRefusalReasonsEn: [
      'Insufficient financial means',
      'Weak ties to home country',
      'Missing travel insurance (€30,000 coverage)',
      'Incomplete accommodation proof',
      'Previous Schengen violations',
    ],
    keyOfficerFocusEn: [
      'Financial means (sufficient for trip)',
      'Travel insurance (€30,000 minimum coverage)',
      'Accommodation proof',
      'Ties to home country',
      'Schengen compliance history',
    ],
    uzbekContextHintsEn: [
      'Schengen embassies require travel insurance covering at least €30,000',
      'Accommodation proof (hotel booking or invitation) is mandatory',
      'Round-trip flight reservation helps demonstrate return intention',
      'Bank statements should show sufficient funds per day (typically €50-100/day)',
      'Previous Schengen travel history strengthens application',
    ],
    documentHints: [
      {
        documentType: 'travel_insurance',
        importance: 'core',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn:
          'Travel insurance must cover at least €30,000 and be valid for entire stay',
      },
      {
        documentType: 'accommodation_proof',
        importance: 'travel',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn:
          'Hotel booking or invitation letter is mandatory and must cover entire stay',
      },
      {
        documentType: 'bank_statement',
        importance: 'finance',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Bank statements should show sufficient funds per day (typically €50-100/day)',
      },
      {
        documentType: 'flight_reservation',
        importance: 'travel',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn: 'Round-trip flight reservation helps demonstrate return intention',
      },
    ],
  },
  {
    countryCode: 'DE',
    visaCategory: 'student',
    typicalRefusalReasonsEn: [
      'Insufficient funds for study and living',
      'Weak academic background',
      'Missing acceptance letter or enrollment proof',
      'Immigration intent concerns',
      'Incomplete documentation',
    ],
    keyOfficerFocusEn: [
      'Financial capacity for study period',
      'Acceptance letter and enrollment',
      'Academic background',
      'Ties to home country',
      'Study purpose clarity',
    ],
    uzbekContextHintsEn: [
      'German student visas require acceptance letter from university',
      'Blocked account (Sperrkonto) or sponsor financial proof is mandatory',
      'Health insurance is required for long-term residence',
      'Academic qualifications may need recognition (Anabin)',
      'Language proficiency proof may be required',
    ],
    documentHints: [
      {
        documentType: 'coe',
        importance: 'core',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Acceptance letter from university is mandatory. Officers verify enrollment',
      },
      {
        documentType: 'blocked_account',
        importance: 'finance',
        typicalFor: ['self_funded'],
        officerFocusHintEn: 'Blocked account (Sperrkonto) shows sufficient funds for study period',
      },
      {
        documentType: 'sponsor_financial_documents',
        importance: 'finance',
        typicalFor: ['sponsored'],
        officerFocusHintEn: 'Sponsor documents must show sufficient funds for study period',
      },
      {
        documentType: 'health_insurance',
        importance: 'legal',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn: 'Health insurance is required for long-term residence in Germany',
      },
    ],
  },
  // ============================================================================
  // SPAIN (Schengen)
  // ============================================================================
  {
    countryCode: 'ES',
    visaCategory: 'tourist',
    typicalRefusalReasonsEn: [
      'Insufficient financial means',
      'Weak ties to home country',
      'Missing travel insurance (€30,000 coverage)',
      'Incomplete accommodation proof',
      'Previous Schengen violations',
    ],
    keyOfficerFocusEn: [
      'Financial means (sufficient for trip)',
      'Travel insurance (€30,000 minimum coverage)',
      'Accommodation proof',
      'Ties to home country',
      'Schengen compliance history',
    ],
    uzbekContextHintsEn: [
      'Schengen embassies require travel insurance covering at least €30,000',
      'Accommodation proof (hotel booking or invitation) is mandatory',
      'Round-trip flight reservation helps demonstrate return intention',
      'Bank statements should show sufficient funds per day (typically €50-100/day)',
      'Previous Schengen travel history strengthens application',
    ],
    documentHints: [
      {
        documentType: 'travel_insurance',
        importance: 'core',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn:
          'Travel insurance must cover at least €30,000 and be valid for entire stay',
      },
      {
        documentType: 'accommodation_proof',
        importance: 'travel',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn:
          'Hotel booking or invitation letter is mandatory and must cover entire stay',
      },
      {
        documentType: 'bank_statement',
        importance: 'finance',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Bank statements should show sufficient funds per day (typically €50-100/day)',
      },
    ],
  },
  {
    countryCode: 'ES',
    visaCategory: 'student',
    typicalRefusalReasonsEn: [
      'Insufficient funds for study and living',
      'Weak academic background',
      'Missing acceptance letter or enrollment proof',
      'Immigration intent concerns',
      'Incomplete documentation',
    ],
    keyOfficerFocusEn: [
      'Financial capacity for study period',
      'Acceptance letter and enrollment',
      'Academic background',
      'Ties to home country',
      'Study purpose clarity',
    ],
    uzbekContextHintsEn: [
      'Spanish student visas require acceptance letter from university',
      'Financial proof (blocked account or sponsor) is mandatory',
      'Health insurance is required for long-term residence',
      'Academic qualifications may need recognition',
      'Language proficiency proof may be required',
    ],
    documentHints: [
      {
        documentType: 'coe',
        importance: 'core',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Acceptance letter from university is mandatory. Officers verify enrollment',
      },
      {
        documentType: 'sponsor_financial_documents',
        importance: 'finance',
        typicalFor: ['sponsored'],
        officerFocusHintEn: 'Sponsor documents must show sufficient funds for study period',
      },
      {
        documentType: 'health_insurance',
        importance: 'legal',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn: 'Health insurance is required for long-term residence in Spain',
      },
    ],
  },
  // ============================================================================
  // FRANCE (Schengen)
  // ============================================================================
  {
    countryCode: 'FR',
    visaCategory: 'tourist',
    typicalRefusalReasonsEn: [
      'Insufficient financial means',
      'Weak ties to home country',
      'Missing travel insurance (€30,000 coverage)',
      'Incomplete accommodation proof',
      'Previous Schengen violations',
    ],
    keyOfficerFocusEn: [
      'Financial means (sufficient for trip)',
      'Travel insurance (€30,000 minimum coverage)',
      'Accommodation proof',
      'Ties to home country',
      'Schengen compliance history',
    ],
    uzbekContextHintsEn: [
      'Schengen embassies require travel insurance covering at least €30,000',
      'Accommodation proof (hotel booking or invitation) is mandatory',
      'Round-trip flight reservation helps demonstrate return intention',
      'Bank statements should show sufficient funds per day (typically €50-100/day)',
      'Previous Schengen travel history strengthens application',
    ],
    documentHints: [
      {
        documentType: 'travel_insurance',
        importance: 'core',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn:
          'Travel insurance must cover at least €30,000 and be valid for entire stay',
      },
      {
        documentType: 'accommodation_proof',
        importance: 'travel',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn:
          'Hotel booking or invitation letter is mandatory and must cover entire stay',
      },
      {
        documentType: 'bank_statement',
        importance: 'finance',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Bank statements should show sufficient funds per day (typically €50-100/day)',
      },
    ],
  },
  {
    countryCode: 'FR',
    visaCategory: 'student',
    typicalRefusalReasonsEn: [
      'Insufficient funds for study and living',
      'Weak academic background',
      'Missing acceptance letter or enrollment proof',
      'Immigration intent concerns',
      'Incomplete documentation',
    ],
    keyOfficerFocusEn: [
      'Financial capacity for study period',
      'Acceptance letter and enrollment',
      'Academic background',
      'Ties to home country',
      'Study purpose clarity',
    ],
    uzbekContextHintsEn: [
      'French student visas require acceptance letter from university',
      'Financial proof (blocked account or sponsor) is mandatory',
      'Health insurance is required for long-term residence',
      'Academic qualifications may need recognition',
      'Language proficiency proof may be required',
    ],
    documentHints: [
      {
        documentType: 'coe',
        importance: 'core',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Acceptance letter from university is mandatory. Officers verify enrollment',
      },
      {
        documentType: 'sponsor_financial_documents',
        importance: 'finance',
        typicalFor: ['sponsored'],
        officerFocusHintEn: 'Sponsor documents must show sufficient funds for study period',
      },
      {
        documentType: 'health_insurance',
        importance: 'legal',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn: 'Health insurance is required for long-term residence in France',
      },
    ],
  },
  // ============================================================================
  // JAPAN
  // ============================================================================
  {
    countryCode: 'JP',
    visaCategory: 'tourist',
    typicalRefusalReasonsEn: [
      'Insufficient funds to cover trip expenses',
      'Weak ties to home country',
      'Unclear travel purpose',
      'Previous refusals or overstays',
      'Incomplete documentation',
    ],
    keyOfficerFocusEn: [
      'Clear sponsor and financial capacity',
      'Strong ties to home country',
      'Clear itinerary with specific dates and locations',
      'Accommodation proof',
      'Return intention evidence',
    ],
    uzbekContextHintsEn: [
      'Japanese embassy emphasizes clear itinerary with specific dates and locations',
      'Sponsor proof (if sponsored) must be clear and well-documented',
      'Hotel reservations or invitation letters help demonstrate travel purpose',
      'Bank statements should show sufficient funds for trip duration',
      'Property documents (kadastr) help demonstrate ties to Uzbekistan',
    ],
    documentHints: [
      {
        documentType: 'travel_itinerary',
        importance: 'travel',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn:
          'Detailed itinerary with specific dates and locations is critical for Japanese visas',
      },
      {
        documentType: 'accommodation_proof',
        importance: 'travel',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn:
          'Hotel reservations or invitation letters help demonstrate travel purpose',
      },
      {
        documentType: 'sponsor_letter',
        importance: 'finance',
        typicalFor: ['sponsored'],
        officerFocusHintEn:
          'Sponsor letter must clearly explain relationship and financial support',
      },
      {
        documentType: 'bank_statement',
        importance: 'finance',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn: 'Bank statements should show sufficient funds for trip duration',
      },
    ],
  },
  {
    countryCode: 'JP',
    visaCategory: 'student',
    typicalRefusalReasonsEn: [
      'Insufficient funds for tuition and living expenses',
      'Weak academic background',
      'Missing Certificate of Eligibility or enrollment proof',
      'Immigration intent concerns',
      'Incomplete documentation',
    ],
    keyOfficerFocusEn: [
      'Financial capacity for study period',
      'Certificate of Eligibility (COE) validity',
      'Academic background',
      'Ties to home country',
      'Study purpose clarity',
    ],
    uzbekContextHintsEn: [
      'Japanese student visas require Certificate of Eligibility (COE)',
      'Sponsor financial documents must show sufficient funds for study period',
      'Academic qualifications may need evaluation',
      'Language proficiency proof may be required',
      'Health insurance is recommended',
    ],
    documentHints: [
      {
        documentType: 'coe',
        importance: 'core',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Certificate of Eligibility (COE) is mandatory. Officers verify validity',
      },
      {
        documentType: 'sponsor_financial_documents',
        importance: 'finance',
        typicalFor: ['sponsored'],
        officerFocusHintEn: 'Sponsor documents must show sufficient funds for study period',
      },
      {
        documentType: 'academic_transcript',
        importance: 'special',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn: 'Academic transcripts help demonstrate genuine student intent',
      },
    ],
  },
  // ============================================================================
  // SOUTH KOREA
  // ============================================================================
  {
    countryCode: 'KR',
    visaCategory: 'tourist',
    typicalRefusalReasonsEn: [
      'Insufficient funds to cover trip expenses',
      'Weak ties to home country',
      'Unclear travel purpose',
      'Previous refusals or overstays',
      'Incomplete documentation',
    ],
    keyOfficerFocusEn: [
      'Clear sponsor and financial capacity',
      'Strong ties to home country',
      'Clear itinerary',
      'Accommodation proof',
      'Return intention evidence',
    ],
    uzbekContextHintsEn: [
      'Korean embassy emphasizes clear itinerary and accommodation proof',
      'Sponsor proof (if sponsored) must be clear and well-documented',
      'Bank statements should show sufficient funds for trip duration',
      'Property documents (kadastr) help demonstrate ties to Uzbekistan',
      'Travel history to other countries strengthens application',
    ],
    documentHints: [
      {
        documentType: 'travel_itinerary',
        importance: 'travel',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn: 'Detailed itinerary helps demonstrate genuine travel purpose',
      },
      {
        documentType: 'accommodation_proof',
        importance: 'travel',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn:
          'Hotel reservations or invitation letters help demonstrate travel purpose',
      },
      {
        documentType: 'bank_statement',
        importance: 'finance',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn: 'Bank statements should show sufficient funds for trip duration',
      },
    ],
  },
  {
    countryCode: 'KR',
    visaCategory: 'student',
    typicalRefusalReasonsEn: [
      'Insufficient funds for tuition and living expenses',
      'Weak academic background',
      'Missing acceptance letter or enrollment proof',
      'Immigration intent concerns',
      'Incomplete documentation',
    ],
    keyOfficerFocusEn: [
      'Financial capacity for study period',
      'Acceptance letter and enrollment',
      'Academic background',
      'Ties to home country',
      'Study purpose clarity',
    ],
    uzbekContextHintsEn: [
      'Korean student visas require acceptance letter from university',
      'Sponsor financial documents must show sufficient funds for study period',
      'Academic qualifications may need evaluation',
      'Language proficiency proof may be required',
      'Health insurance is recommended',
    ],
    documentHints: [
      {
        documentType: 'coe',
        importance: 'core',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Acceptance letter from university is mandatory. Officers verify enrollment',
      },
      {
        documentType: 'sponsor_financial_documents',
        importance: 'finance',
        typicalFor: ['sponsored'],
        officerFocusHintEn: 'Sponsor documents must show sufficient funds for study period',
      },
    ],
  },
  // ============================================================================
  // UNITED ARAB EMIRATES
  // ============================================================================
  {
    countryCode: 'AE',
    visaCategory: 'tourist',
    typicalRefusalReasonsEn: [
      'Insufficient funds to cover trip expenses',
      'Weak ties to home country',
      'Unclear travel purpose',
      'Previous refusals or overstays',
      'Incomplete documentation',
    ],
    keyOfficerFocusEn: [
      'Financial capacity for trip duration',
      'Accommodation proof (hotel booking)',
      'Travel insurance (if required)',
      'Clear travel purpose',
      'Return intention evidence',
    ],
    uzbekContextHintsEn: [
      'UAE embassy emphasizes hotel booking confirmation',
      'Sponsor letter (if invited) must be clear and well-documented',
      'Bank statements should show sufficient funds for trip duration',
      'Travel insurance may be required depending on visa type',
      'Property documents (kadastr) help demonstrate ties to Uzbekistan',
    ],
    documentHints: [
      {
        documentType: 'hotel_booking',
        importance: 'travel',
        typicalFor: ['short_trip', 'long_trip'],
        officerFocusHintEn:
          'Hotel booking confirmation is typically required for UAE tourist visas',
      },
      {
        documentType: 'sponsor_letter',
        importance: 'finance',
        typicalFor: ['sponsored'],
        officerFocusHintEn:
          'Sponsor letter must clearly explain relationship and invitation purpose',
      },
      {
        documentType: 'bank_statement',
        importance: 'finance',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn: 'Bank statements should show sufficient funds for trip duration',
      },
    ],
  },
  {
    countryCode: 'AE',
    visaCategory: 'student',
    typicalRefusalReasonsEn: [
      'Insufficient funds for tuition and living expenses',
      'Weak academic background',
      'Missing acceptance letter or enrollment proof',
      'Immigration intent concerns',
      'Incomplete documentation',
    ],
    keyOfficerFocusEn: [
      'Financial capacity for study period',
      'Acceptance letter and enrollment',
      'Academic background',
      'Ties to home country',
      'Study purpose clarity',
    ],
    uzbekContextHintsEn: [
      'UAE student visas require acceptance letter from university',
      'Sponsor financial documents must show sufficient funds for study period',
      'Academic qualifications may need evaluation',
      'Health insurance is typically required',
      'Language proficiency proof may be required',
    ],
    documentHints: [
      {
        documentType: 'coe',
        importance: 'core',
        typicalFor: ['self_funded', 'sponsored'],
        officerFocusHintEn:
          'Acceptance letter from university is mandatory. Officers verify enrollment',
      },
      {
        documentType: 'sponsor_financial_documents',
        importance: 'finance',
        typicalFor: ['sponsored'],
        officerFocusHintEn: 'Sponsor documents must show sufficient funds for study period',
      },
    ],
  },
];

/**
 * Get country visa playbook for a specific country and visa category
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., "US", "GB")
 * @param visaCategory - "tourist" | "student"
 * @returns CountryVisaPlaybook or null if not found
 */
export function getCountryVisaPlaybook(
  countryCode: string,
  visaCategory: VisaCategory
): CountryVisaPlaybook | null {
  const normalizedCountryCode = countryCode.toUpperCase();
  const normalizedVisaCategory = visaCategory.toLowerCase() as VisaCategory;

  return (
    COUNTRY_VISA_PLAYBOOKS.find(
      (playbook) =>
        playbook.countryCode.toUpperCase() === normalizedCountryCode &&
        playbook.visaCategory === normalizedVisaCategory
    ) || null
  );
}

/**
 * Get playbook document hint for a specific document type
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @param visaCategory - "tourist" | "student"
 * @param documentType - Document type (e.g., "bank_statement")
 * @returns PlaybookDocumentHint or null if not found
 */
export function getPlaybookDocumentHint(
  countryCode: string,
  visaCategory: VisaCategory,
  documentType: string
): PlaybookDocumentHint | null {
  const playbook = getCountryVisaPlaybook(countryCode, visaCategory);
  if (!playbook) {
    return null;
  }

  return playbook.documentHints.find((hint) => hint.documentType === documentType) || null;
}
