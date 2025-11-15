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


