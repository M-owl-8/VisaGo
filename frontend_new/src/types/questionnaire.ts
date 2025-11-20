/**
 * Questionnaire Types
 * Types for the onboarding questionnaire flow
 */

export interface QuestionnaireAnswer {
  questionId: string;
  answer: string | string[] | boolean;
}

export interface QuestionnaireData {
  purpose: 'study' | 'work' | 'tourism' | 'business' | 'immigration' | 'other';
  country?: string;
  duration: 'less_than_1' | '1_3_months' | '3_6_months' | '6_12_months' | 'more_than_1_year';
  traveledBefore: boolean;
  currentStatus: 'student' | 'employee' | 'entrepreneur' | 'unemployed' | 'other';
  hasInvitation: boolean;
  financialSituation: 'stable_income' | 'sponsor' | 'savings' | 'preparing';
  maritalStatus: 'single' | 'married' | 'divorced';
  hasChildren: 'no' | 'one' | 'two_plus';
  englishLevel: 'beginner' | 'intermediate' | 'advanced' | 'native';
}

/**
 * Standardized Visa Questionnaire Summary
 * This is the clean, structured format sent to AI and stored in the database
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

export interface QuestionOption {
  value: string;
  labelEn: string;
  labelUz: string;
  labelRu: string;
  icon?: string;
}

export interface Question {
  id: string;
  titleEn: string;
  titleUz: string;
  titleRu: string;
  descriptionEn?: string;
  descriptionUz?: string;
  descriptionRu?: string;
  type: 'single' | 'multiple' | 'boolean' | 'dropdown';
  required: boolean;
  options: QuestionOption[];
}

export interface AIGeneratedApplication {
  application: any;
  suggestedCountry: any;
  suggestedVisaType: any;
  checklistItems: any[];
  aiRecommendations: string;
  estimatedProcessingTime?: string;
  tips?: string[];
}
