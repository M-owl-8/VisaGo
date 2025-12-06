/**
 * AI User Context Types
 * Structured context for AI service consumption
 */

/**
 * Visa Probability Result
 * Result of rule-based probability calculation
 */
export interface VisaProbabilityResult {
  score: number; // 10–90
  level: 'low' | 'medium' | 'high';
  riskFactors: string[];
  positiveFactors: string[];
}

/**
 * Visa Questionnaire Summary (matches frontend type)
 */
export interface VisaQuestionnaireSummary {
  version: string; // e.g. "2.0" (updated for new structure)
  visaType: 'student' | 'tourist';
  targetCountry: string; // "US" | "CA" | "NZ" | "AU" | "JP" | "KR" | "UK" | "ES" | "DE" | "PL"
  appLanguage: 'uz' | 'ru' | 'en';

  // Legacy fields (for backward compatibility)
  age?: number;
  citizenship?: string;
  currentCountry?: string;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  hasChildren?: 'no' | 'one' | 'two_or_more';
  ageRange?: 'under_18' | '18_25' | '26_35' | '36_45' | '46_plus';
  duration?: 'less_than_1_month' | '1_3_months' | '3_6_months' | '6_12_months' | 'more_than_1_year';
  englishLevel?: 'basic' | 'intermediate' | 'advanced';
  hasUniversityInvitation?: boolean;
  hasOtherInvitation?: boolean;
  invitationDetails?: string;
  monthlyIncomeUSD?: number;
  bankBalanceUSD?: number;
  sponsorType?: 'self' | 'parent' | 'relative' | 'company' | 'other';
  hasPropertyInUzbekistan?: boolean;
  hasFamilyInUzbekistan?: boolean;
  hasInternationalTravel?: boolean;
  previousVisaRejections?: boolean;
  previousRejectionDetails?: string;
  previousOverstay?: boolean;
  documents: {
    hasPassport?: boolean;
    hasBankStatement?: boolean;
    hasEmploymentOrStudyProof?: boolean;
    hasTravelInsurance?: boolean;
    hasInsurance?: boolean; // v2: explicit insurance field
    hasFlightBooking?: boolean;
    hasHotelBookingOrAccommodation?: boolean;
  };
  notes?: string;
  mainConcerns?: string;

  // NEW: Extended structure for better AI generation (v2)
  personalInfo?: {
    fullName?: string;
    dateOfBirth?: string;
    nationality?: string;
    passportStatus?: 'valid' | 'expired' | 'no_passport';
    currentResidenceCountry?: string; // v2: explicit residence country
  };
  travelInfo?: {
    purpose?: string;
    plannedDates?: string;
    funding?: 'self' | 'sponsor' | 'company' | 'scholarship' | 'mix'; // v2: added scholarship and mix
    monthlyCapacity?: number;
    accommodation?: 'reserved' | 'university_housing' | 'not_reserved';
    tuitionStatus?: 'fully_paid' | 'scholarship' | 'partial_scholarship';
    duration?:
      | 'less_than_15_days'
      | '15_30_days'
      | '1_3_months'
      | '3_6_months'
      | 'more_than_6_months'; // v2: explicit duration
  };
  employment?: {
    isEmployed?: boolean;
    employerName?: string;
    monthlySalaryUSD?: number;
    currentStatus?: 'student' | 'employed' | 'self_employed' | 'unemployed'; // v2: explicit status
  };
  education?: {
    isStudent?: boolean;
    university?: string;
    programType?: 'bachelor' | 'master' | 'phd' | 'exchange' | 'language';
    diplomaAvailable?: boolean;
    transcriptAvailable?: boolean;
    hasGraduated?: boolean;
  };
  financialInfo?: {
    selfFundsUSD?: number;
    sponsorDetails?: {
      relationship?: 'parent' | 'sibling' | 'relative' | 'friend' | 'other';
      employment?: 'employed' | 'business_owner' | 'retired' | 'other';
      annualIncomeUSD?: number;
    };
  };
  travelHistory?: {
    visitedCountries?: string[];
    hasRefusals?: boolean;
    refusalDetails?: string; // v2: explicit refusal details
    traveledBefore?: boolean; // v2: explicit travel history flag
  };
  ties?: {
    propertyDocs?: boolean;
    familyTies?: boolean;
  };
}

/**
 * AI User Context
 * Complete structured context for AI service
 */
export interface AIUserContext {
  userProfile: {
    userId: string;
    appLanguage: 'uz' | 'ru' | 'en';
    citizenship?: string;
    age?: number;
  };
  application: {
    applicationId: string;
    visaType: 'student' | 'tourist';
    country: string;
    status: 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  };
  questionnaireSummary?: VisaQuestionnaireSummary;
  uploadedDocuments: {
    type: string;
    fileName: string;
    url?: string;
    status: 'uploaded' | 'approved' | 'rejected';
  }[];
  appActions: {
    timestamp: string;
    actionType: string;
    details?: any;
  }[];
  riskScore?: {
    probabilityPercent: number;
    riskFactors: string[];
    positiveFactors: string[];
    level: 'low' | 'medium' | 'high';
  };
}

/**
 * Canonical AI User Context
 * Rock-solid interface for GPT usage with no nullable core fields
 * All critical fields have explicit defaults
 */
export interface CanonicalAIUserContext {
  // ✅ REQUIRED - Always present
  userProfile: {
    userId: string;
    appLanguage: 'uz' | 'ru' | 'en';
    citizenship: string; // Default: 'UZ' (Uzbekistan)
    age: number | null; // null if unknown, but field always present
  };

  application: {
    applicationId: string;
    visaType: 'student' | 'tourist';
    country: string; // ISO country code
    status: 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  };

  // ✅ REQUIRED - Always present (with defaults if missing)
  applicantProfile: {
    // Core identity
    citizenship: string; // Default: 'UZ'
    age: number | null; // null if unknown

    // Visa details
    visaType: 'student' | 'tourist';
    targetCountry: string;
    duration:
      | 'less_than_1_month'
      | '1_3_months'
      | '3_6_months'
      | '6_12_months'
      | 'more_than_1_year'
      | 'unknown';

    // Financial (basic - kept for backward compatibility)
    sponsorType: 'self' | 'parent' | 'relative' | 'company' | 'other'; // Default: 'self'
    bankBalanceUSD: number | null; // null if unknown
    monthlyIncomeUSD: number | null; // null if unknown

    // Financial (expert fields - Phase 3)
    financial?: {
      incomeHistory?: number[]; // Last 6 months of income
      savingsGrowth?: 'increasing' | 'stable' | 'decreasing';
      accountAgeMonths?: number | null;
      sourceOfFunds?: 'employment' | 'business' | 'sponsor' | 'inheritance' | 'savings' | 'unknown';
      sponsor?: {
        income?: number | null;
        savings?: number | null;
        dependents?: number | null;
        relationship?: 'parent' | 'sibling' | 'relative' | 'friend' | 'other';
      };
      requiredFundsEstimate?: number | null; // Estimated funds needed for trip
      financialSufficiencyRatio?: number | null; // availableFunds / requiredFunds (0.0-1.0+)
    };

    // Employment/Education (basic - kept for backward compatibility)
    currentStatus: 'student' | 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'unknown'; // Default: 'unknown'
    isStudent: boolean; // Default: false
    isEmployed: boolean; // Default: false

    // Employment (expert fields - Phase 3)
    employment?: {
      employerName?: string | null;
      industry?: string | null;
      employmentDurationMonths?: number | null;
      salaryHistory?: number[]; // Last 6 months of salary
      contractType?: 'permanent' | 'contract' | 'freelance' | 'part_time' | 'unknown';
      employerStability?:
        | 'established_company'
        | 'startup'
        | 'government'
        | 'self_employed'
        | 'unknown';
    };

    // Education (expert fields - Phase 3)
    education?: {
      degreeLevel?: 'bachelor' | 'master' | 'phd' | 'diploma' | 'certificate' | 'none' | 'unknown';
      institution?: string | null;
      graduationDate?: string | null; // ISO date string
      fieldOfStudy?: string | null;
      gpa?: number | null;
    };

    // Travel history (basic - kept for backward compatibility)
    hasInternationalTravel: boolean; // Default: false
    previousVisaRejections: boolean; // Default: false
    previousOverstay: boolean; // Default: false

    // Travel history (expert fields - Phase 3)
    travelHistory?: {
      countries?: Array<{
        country: string; // ISO country code
        dates?: string; // Date range or single date
        visaType?: 'tourist' | 'student' | 'work' | 'transit' | 'other';
        outcome?: 'approved' | 'rejected' | 'unknown';
      }>;
      previousVisaTypes?: string[]; // List of visa types obtained
      previousVisaResults?: Array<{
        country: string;
        visaType: string;
        outcome: 'approved' | 'rejected';
        date?: string;
      }>;
    };

    // Family (expert fields - Phase 3)
    family?: {
      spouse?: {
        citizenship?: string | null;
        employed?: boolean | null;
        income?: number | null;
      } | null;
      children?: Array<{
        age?: number | null;
        citizenship?: string | null;
        dependent?: boolean;
      }>;
      dependentFamily?: Array<{
        relationship?: string;
        dependent?: boolean;
      }>;
      familyAbroad?: Array<{
        country?: string;
        relationship?: string;
        status?: string; // e.g., "citizen", "permanent_resident"
      }>;
    };

    // Ties to home country (basic - kept for backward compatibility)
    hasPropertyInUzbekistan: boolean; // Default: false
    hasFamilyInUzbekistan: boolean; // Default: false
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | 'unknown'; // Default: 'unknown'
    hasChildren: boolean; // Default: false

    // Property (expert fields - Phase 3)
    property?: {
      valueUSD?: number | null;
      type?: 'apartment' | 'house' | 'land' | 'commercial' | 'unknown';
      ownershipDurationMonths?: number | null;
      location?: string | null;
    };

    // Ties (expert fields - Phase 3)
    ties?: {
      tiesStrengthScore?: number; // 0.0-1.0, calculated from property, employment, family
      tiesFactors?: {
        property?: number; // 0.0-1.0 contribution
        employment?: number; // 0.0-1.0 contribution
        family?: number; // 0.0-1.0 contribution
        children?: number; // 0.0-1.0 contribution
      };
    };

    // Invitations
    hasUniversityInvitation: boolean; // Default: false
    hasOtherInvitation: boolean; // Default: false

    // Documents already obtained
    documents: {
      hasPassport: boolean;
      hasBankStatement: boolean;
      hasEmploymentOrStudyProof: boolean;
      hasInsurance: boolean;
      hasFlightBooking: boolean;
      hasHotelBookingOrAccommodation: boolean;
    };
  };

  // ✅ REQUIRED - Always present
  riskScore: {
    probabilityPercent: number; // Default: 70 (baseline)
    level: 'low' | 'medium' | 'high'; // Default: 'medium'
    riskFactors: string[]; // Default: []
    positiveFactors: string[]; // Default: []
  };

  uploadedDocuments: {
    type: string;
    fileName: string;
    url?: string;
    status: 'uploaded' | 'approved' | 'rejected';
  }[];

  appActions: {
    timestamp: string;
    actionType: string;
    details?: any;
  }[];

  // Optional metadata (for debugging/logging)
  metadata?: {
    sourceFormat: 'v2' | 'legacy' | 'hybrid' | 'unknown';
    extractionWarnings?: string[]; // Warnings about missing/incomplete data
    fallbackFieldsUsed?: string[]; // Fields that used defaults
  };

  // Embassy context (expert fields - Phase 3)
  embassyContext?: {
    minimumFundsRequired?: number | null; // From VisaRuleSet.financialRequirements.minimumBalance
    minimumStatementMonths?: number | null; // From VisaRuleSet.financialRequirements.bankStatementMonths
    currency?: string | null; // From VisaRuleSet.financialRequirements.currency
    commonRefusalReasons?: string[]; // Country-specific common refusal reasons
    officerEvaluationCriteria?: string[]; // What officers check for this country/visa type
  };
}
