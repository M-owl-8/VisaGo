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
  level: "low" | "medium" | "high";
  riskFactors: string[];
  positiveFactors: string[];
}

/**
 * Visa Questionnaire Summary (matches frontend type)
 */
export interface VisaQuestionnaireSummary {
  version: string;            // e.g. "1.0"
  visaType: "student" | "tourist";
  targetCountry: string;      // "US" | "CA" | "NZ" | "AU" | "JP" | "KR" | "UK" | "ES" | "DE" | "AE"
  appLanguage: "uz" | "ru" | "en";
  age?: number;
  citizenship?: string;
  currentCountry?: string;
  hasUniversityInvitation?: boolean;
  hasOtherInvitation?: boolean;  // family/company/hotel etc.
  invitationDetails?: string;
  monthlyIncomeUSD?: number;
  bankBalanceUSD?: number;
  sponsorType?: "self" | "parent" | "relative" | "company" | "other";
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
  notes?: string;          // anything important user mentioned
  mainConcerns?: string;   // what user is worried about
}

/**
 * AI User Context
 * Complete structured context for AI service
 */
export interface AIUserContext {
  userProfile: {
    userId: string;
    appLanguage: "uz" | "ru" | "en";
    citizenship?: string;
    age?: number;
  };
  application: {
    applicationId: string;
    visaType: "student" | "tourist";
    country: string;
    status: "draft" | "in_progress" | "submitted" | "approved" | "rejected";
  };
  questionnaireSummary?: VisaQuestionnaireSummary;
  uploadedDocuments: {
    type: string;
    fileName: string;
    url?: string;
    status: "uploaded" | "approved" | "rejected";
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
    level: "low" | "medium" | "high";
  };
}

