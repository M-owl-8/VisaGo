/**
 * Questionnaire Types
 * Types for the onboarding questionnaire flow
 */

export interface QuestionnaireAnswer {
  questionId: string;
  answer: string | string[] | boolean;
}

export interface QuestionnaireData {
  // Group A: Destination & Basic
  country?: string;
  purpose?: 'tourism' | 'study';
  duration?:
    | 'less_than_1_month'
    | '1_3_months'
    | '3_6_months'
    | '6_12_months'
    | 'more_than_1_year';
  plannedTravelDates?: string;
  currentResidenceCountry?: string;

  // Group B: Personal / Family / Ties
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  hasChildren?: 'no' | 'one' | 'two_or_more';
  ageRange?: 'under_18' | '18_25' | '26_35' | '36_45' | '46_plus';
  hasFamilyTiesUzbekistan?: boolean;
  hasPropertyDocuments?: boolean;

  // Group C: Education / Work
  currentStatus?: 'student' | 'employed' | 'self_employed' | 'unemployed';
  employerDetails?: string;
  monthlySalary?: string;
  hasUniversityAcceptance?: boolean;
  programType?: 'bachelor' | 'master' | 'phd' | 'exchange' | 'language';
  diplomaAvailable?: boolean;
  transcriptAvailable?: boolean;
  hasGraduated?: boolean;

  // Group D: Finances & Sponsor
  tripFunding?: 'self' | 'sponsor' | 'company' | 'scholarship' | 'mix';
  monthlyFinancialCapacity?: string;
  sponsorRelationship?: 'parent' | 'sibling' | 'relative' | 'friend' | 'other';
  sponsorEmployment?: 'employed' | 'business_owner' | 'retired' | 'other';
  sponsorAnnualIncome?: string;
  tuitionStructure?: 'fully_paid' | 'scholarship' | 'partial_scholarship';
  livingExpensesPayer?: 'self' | 'parents' | 'sponsor' | 'scholarship';
  accommodationStatus?: 'reserved' | 'university_housing' | 'not_reserved';

  // Group E: Travel History
  traveledBefore?: boolean;
  visitedCountries?: string;
  hasVisaRefusals?: boolean;
  visaRefusalDetails?: string;

  // Group F: English & Documents
  englishLevel?:
    | 'basic'
    | 'pre_intermediate'
    | 'intermediate'
    | 'upper_intermediate'
    | 'advanced';
  hasBankStatements?: boolean;
  hasInsurance?: boolean;

  // Legacy fields (for backward compatibility)
  hasInvitation?: boolean;
  financialSituation?: 'stable_income' | 'sponsor' | 'savings' | 'preparing';
  // Legacy duration options
  duration_legacy?:
    | 'less_than_1'
    | '1_3_months'
    | '3_6_months'
    | '6_12_months'
    | 'more_than_1_year';
  // Legacy status options
  currentStatus_legacy?:
    | 'student'
    | 'employee'
    | 'entrepreneur'
    | 'unemployed'
    | 'other';
  // Legacy children options
  hasChildren_legacy?: 'no' | 'one' | 'two_plus';
  // Legacy marital status
  maritalStatus_legacy?: 'single' | 'married' | 'divorced';
  // Legacy English level
  englishLevel_legacy?: 'beginner' | 'intermediate' | 'advanced' | 'native';
}

/**
 * Standardized Visa Questionnaire Summary
 * This is the clean, structured format sent to AI and stored in the database
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
  type: 'single' | 'multiple' | 'boolean' | 'dropdown' | 'text';
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
