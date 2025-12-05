/**
 * Questionnaire V2 Types
 * New 10-question, fully multiple-choice, branching questionnaire
 * Matches backend: apps/backend/src/types/questionnaire-v2.ts
 */

export type VisaType = 'tourist' | 'student';

export type TargetCountry =
  | 'US'
  | 'GB'
  | 'ES'
  | 'DE'
  | 'JP'
  | 'AE'
  | 'CA'
  | 'AU';

/**
 * Questionnaire V2 - New streamlined structure
 * All fields are selected from predefined options (no free text)
 */
export interface QuestionnaireV2 {
  version: '2.0';
  targetCountry: TargetCountry;
  visaType: VisaType;

  // Q1: Personal & passport
  personal: {
    ageRange: 'under_18' | '18_25' | '26_35' | '36_50' | '51_plus';
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
    nationality: 'UZ' | 'other';
    passportStatus:
      | 'valid_6plus_months'
      | 'valid_less_6_months'
      | 'no_passport';
  };

  // Q2: Travel purpose & duration
  travel: {
    durationCategory: 'up_to_30_days' | '31_90_days' | 'more_than_90_days';
    plannedWhen: 'within_3_months' | '3_to_12_months' | 'not_sure';
    isExactDatesKnown: boolean;
  };

  // Q3: Current status & education
  status: {
    currentStatus:
      | 'student'
      | 'employed'
      | 'self_employed'
      | 'unemployed'
      | 'business_owner'
      | 'school_child';
    highestEducation:
      | 'school'
      | 'college'
      | 'bachelor'
      | 'master'
      | 'phd'
      | 'other';
    isMinor: boolean;
  };

  // Q4: Financial situation / sponsor
  finance: {
    payer:
      | 'self'
      | 'parents'
      | 'other_family'
      | 'employer'
      | 'scholarship'
      | 'other_sponsor';
    approxMonthlyIncomeRange:
      | 'less_500'
      | '500_1000'
      | '1000_3000'
      | '3000_plus'
      | 'not_applicable';
    hasBankStatement: boolean;
    hasStableIncome: boolean;
  };

  // Q5: Invitation / admission (branch on visaType)
  invitation: {
    hasInvitation: boolean;
    // For student visas:
    studentInvitationType?:
      | 'university_acceptance'
      | 'language_course'
      | 'exchange_program';
    // For tourist visas:
    touristInvitationType?:
      | 'no_invitation'
      | 'hotel_booking'
      | 'family_or_friends'
      | 'tour_agency';
  };

  // Q6: Accommodation & tickets
  stay: {
    accommodationType:
      | 'hotel'
      | 'host_family'
      | 'relative'
      | 'rented_apartment'
      | 'dormitory'
      | 'not_decided';
    hasRoundTripTicket: boolean;
  };

  // Q7: Travel history
  history: {
    hasTraveledBefore: boolean;
    regionsVisited: (
      | 'schengen'
      | 'usa_canada'
      | 'uk'
      | 'asia'
      | 'middle_east'
    )[];
    hasVisaRefusals: boolean;
  };

  // Q8: Ties to Uzbekistan
  ties: {
    hasProperty: boolean;
    propertyType?: ('apartment' | 'house' | 'land' | 'business')[];
    hasCloseFamilyInUzbekistan: boolean;
  };

  // Q9: Documents the user already has
  documents: {
    hasEmploymentOrStudyProof: boolean;
    hasInsurance: boolean;
    hasPassport: boolean;
    hasBirthCertificate: boolean;
    hasPropertyDocs: boolean;
  };

  // Q10: Special conditions
  special: {
    travelingWithChildren: boolean;
    hasMedicalReasonForTrip: boolean;
    hasCriminalRecord: boolean;
  };
}







