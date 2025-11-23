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
    hasFlightBooking?: boolean;
    hasHotelBookingOrAccommodation?: boolean;
  };
  notes?: string;
  mainConcerns?: string;

  // NEW: Extended structure for better AI generation
  personalInfo?: {
    fullName?: string;
    dateOfBirth?: string;
    nationality?: string;
    passportStatus?: 'valid' | 'expired' | 'no_passport';
  };
  travelInfo?: {
    purpose?: string;
    plannedDates?: string;
    funding?: 'self' | 'sponsor' | 'company';
    monthlyCapacity?: number;
    accommodation?: 'reserved' | 'university_housing' | 'not_reserved';
    tuitionStatus?: 'fully_paid' | 'scholarship' | 'partial_scholarship';
  };
  employment?: {
    isEmployed?: boolean;
    employerName?: string;
    monthlySalaryUSD?: number;
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
    refusalDetails?: string;
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
