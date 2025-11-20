/**
 * Questionnaire Mapper
 * Maps existing questionnaire answers to standardized VisaQuestionnaireSummary
 */

import { QuestionnaireData, VisaQuestionnaireSummary } from '../types/questionnaire';

/**
 * Country code mapping from country names/IDs to ISO codes
 */
const COUNTRY_CODE_MAP: Record<string, string> = {
  'united states': 'US',
  'usa': 'US',
  'us': 'US',
  'canada': 'CA',
  'ca': 'CA',
  'new zealand': 'NZ',
  'nz': 'NZ',
  'australia': 'AU',
  'au': 'AU',
  'japan': 'JP',
  'jp': 'JP',
  'south korea': 'KR',
  'korea': 'KR',
  'kr': 'KR',
  'united kingdom': 'UK',
  'uk': 'UK',
  'great britain': 'UK',
  'gb': 'UK',
  'great britain': 'UK',
  'gb': 'UK',
  'spain': 'ES',
  'es': 'ES',
  'germany': 'DE',
  'de': 'DE',
  'united arab emirates': 'AE',
  'uae': 'AE',
  'ae': 'AE',
};

/**
 * Normalize country code from country ID, name, or code
 * Tries to look up country code from the countries store if country is an ID
 */
function normalizeCountryCode(
  country: string | undefined,
  countries?: Array<{ id: string; name: string; code: string }>
): string {
  if (!country) return 'US'; // Default fallback
  
  // First, try to find country by ID in the countries array
  if (countries && countries.length > 0) {
    const foundCountry = countries.find(c => c.id === country);
    if (foundCountry && foundCountry.code) {
      // Map GB to UK if needed (UK is the requested code)
      return foundCountry.code === 'GB' ? 'UK' : foundCountry.code.toUpperCase();
    }
  }
  
  const countryLower = country.toLowerCase().trim();
  
  // Check direct mapping
  if (COUNTRY_CODE_MAP[countryLower]) {
    return COUNTRY_CODE_MAP[countryLower];
  }
  
  // Check if it's already a valid code
  const validCodes = ['US', 'CA', 'NZ', 'AU', 'JP', 'KR', 'UK', 'ES', 'DE', 'AE', 'GB'];
  const upperCountry = country.toUpperCase();
  if (validCodes.includes(upperCountry)) {
    // Map GB to UK
    return upperCountry === 'GB' ? 'UK' : upperCountry;
  }
  
  // Try to find partial match in country names
  if (countries && countries.length > 0) {
    const foundCountry = countries.find(c => 
      c.name.toLowerCase().includes(countryLower) || 
      countryLower.includes(c.name.toLowerCase())
    );
    if (foundCountry && foundCountry.code) {
      return foundCountry.code === 'GB' ? 'UK' : foundCountry.code.toUpperCase();
    }
  }
  
  // Try to find partial match in mapping
  for (const [key, code] of Object.entries(COUNTRY_CODE_MAP)) {
    if (countryLower.includes(key) || key.includes(countryLower)) {
      return code;
    }
  }
  
  // Default fallback
  return 'US';
}

/**
 * Map existing questionnaire data to standardized VisaQuestionnaireSummary
 * 
 * @param existingAnswers - Current questionnaire answers (QuestionnaireData)
 * @param appLanguage - Current app language (uz, ru, en)
 * @param countries - Optional array of countries to help map country ID to code
 * @returns Standardized VisaQuestionnaireSummary
 */
export function mapExistingQuestionnaireToSummary(
  existingAnswers: Partial<QuestionnaireData>,
  appLanguage: "uz" | "ru" | "en" = "en",
  countries?: Array<{ id: string; name: string; code: string }>
): VisaQuestionnaireSummary {
  // Determine visa type from purpose
  const purpose = existingAnswers.purpose || 'tourism';
  const visaType: "student" | "tourist" = purpose === 'study' ? 'student' : 'tourist';
  
  // Map country (try to get code from countries array if country is an ID)
  const targetCountry = normalizeCountryCode(existingAnswers.country, countries);
  
  // Map invitation information
  const hasInvitation = existingAnswers.hasInvitation === true || 
                       String(existingAnswers.hasInvitation) === 'true';
  
  // Determine invitation types based on purpose and hasInvitation
  const hasUniversityInvitation = hasInvitation && purpose === 'study';
  const hasOtherInvitation = hasInvitation && purpose !== 'study';
  
  // Map financial situation to sponsor type
  const financialSituation = existingAnswers.financialSituation || 'stable_income';
  let sponsorType: "self" | "parent" | "relative" | "company" | "other" | undefined;
  
  if (financialSituation === 'sponsor') {
    // Default to parent for sponsor (can be refined later)
    sponsorType = 'parent';
  } else if (financialSituation === 'stable_income' || financialSituation === 'savings') {
    sponsorType = 'self';
  }
  
  // Map travel history
  const hasInternationalTravel = existingAnswers.traveledBefore === true || 
                                 String(existingAnswers.traveledBefore) === 'true';
  
  // Map family ties (infer from marital status and children)
  const maritalStatus = existingAnswers.maritalStatus || 'single';
  const hasChildren = existingAnswers.hasChildren || 'no';
  const hasFamilyInUzbekistan = maritalStatus === 'married' || hasChildren !== 'no';
  
  // Map documents availability (infer from current status and purpose)
  const currentStatus = existingAnswers.currentStatus || 'employee';
  const hasEmploymentOrStudyProof = 
    currentStatus === 'employee' || 
    currentStatus === 'student' || 
    currentStatus === 'entrepreneur';
  
  // Build the summary
  const summary: VisaQuestionnaireSummary = {
    version: "1.0",
    visaType,
    targetCountry,
    appLanguage,
    
    // Invitation details
    hasUniversityInvitation,
    hasOtherInvitation,
    
    // Financial information
    sponsorType,
    
    // Travel history
    hasInternationalTravel,
    
    // Family ties
    hasFamilyInUzbekistan,
    
    // Documents
    documents: {
      hasEmploymentOrStudyProof,
      // Other document fields are optional and can be filled in later
      // or inferred from other questionnaire answers if available
    },
    
    // Optional fields that can be populated from additional questions or user input
    // These are left undefined for now but can be added later
  };
  
  // Add duration-based notes if relevant
  const duration = existingAnswers.duration;
  if (duration) {
    const durationMap: Record<string, string> = {
      'less_than_1': 'Short-term stay (less than 1 month)',
      '1_3_months': 'Short-term stay (1-3 months)',
      '3_6_months': 'Medium-term stay (3-6 months)',
      '6_12_months': 'Long-term stay (6-12 months)',
      'more_than_1_year': 'Long-term stay (more than 1 year)',
    };
    
    if (!summary.notes) {
      summary.notes = durationMap[duration] || '';
    } else {
      summary.notes += `; ${durationMap[duration]}`;
    }
  }
  
  // Add current status to notes
  if (currentStatus) {
    const statusMap: Record<string, string> = {
      'student': 'Currently a student',
      'employee': 'Currently employed',
      'entrepreneur': 'Currently an entrepreneur',
      'unemployed': 'Currently unemployed',
      'other': 'Other status',
    };
    
    if (!summary.notes) {
      summary.notes = statusMap[currentStatus] || '';
    } else {
      summary.notes += `; ${statusMap[currentStatus]}`;
    }
  }
  
  // Add English level to notes if relevant
  const englishLevel = existingAnswers.englishLevel;
  if (englishLevel) {
    const levelMap: Record<string, string> = {
      'beginner': 'English level: Beginner',
      'intermediate': 'English level: Intermediate',
      'advanced': 'English level: Advanced',
      'native': 'English level: Native',
    };
    
    if (!summary.notes) {
      summary.notes = levelMap[englishLevel] || '';
    } else {
      summary.notes += `; ${levelMap[englishLevel]}`;
    }
  }
  
  return summary;
}

/**
 * Check if a questionnaire summary is valid
 */
export function isValidQuestionnaireSummary(
  summary: any
): summary is VisaQuestionnaireSummary {
  return (
    summary &&
    typeof summary === 'object' &&
    typeof summary.version === 'string' &&
    (summary.visaType === 'student' || summary.visaType === 'tourist') &&
    typeof summary.targetCountry === 'string' &&
    ['uz', 'ru', 'en'].includes(summary.appLanguage) &&
    summary.documents &&
    typeof summary.documents === 'object'
  );
}

/**
 * Convert old questionnaire format to new summary format
 * For backwards compatibility
 */
export function convertLegacyQuestionnaireToSummary(
  legacyData: any,
  appLanguage: "uz" | "ru" | "en" = "en"
): VisaQuestionnaireSummary | null {
  // If it's already a summary, return it
  if (isValidQuestionnaireSummary(legacyData)) {
    return legacyData;
  }
  
  // If it's the old QuestionnaireData format, map it
  if (legacyData.purpose || legacyData.country || legacyData.duration) {
    return mapExistingQuestionnaireToSummary(legacyData, appLanguage);
  }
  
  // If we can't convert it, return null
  return null;
}

