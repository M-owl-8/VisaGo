/**
 * Questionnaire V2 Types
 * Matches mobile app structure: frontend_new/src/types/questionnaire-v2.ts
 * Compatible with backend: apps/backend/src/types/questionnaire-v2.ts
 */

// Visa type and country are now free-form strings to support all destinations.
export type VisaType = string;

export type TargetCountry = string;

/**
 * Questionnaire V2 - Streamlined structure
 * All fields are selected from predefined options (no free text)
 */
export interface QuestionnaireV2 {
  version: '2.0';
  targetCountry: TargetCountry;
  visaType: VisaType;
  contact?: {
    email?: string;
    phone?: string;
  };

  // Q1: Personal & passport
  personal: {
    ageRange: 'under_18' | '18_25' | '26_35' | '36_50' | '51_plus';
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
    nationality: 'UZ' | 'other';
    passportStatus: 'valid_6plus_months' | 'valid_less_6_months' | 'no_passport';
  };

  // Q2: Travel purpose & duration
  travel: {
    durationCategory: 'up_to_30_days' | '31_90_days' | 'more_than_90_days';
    plannedWhen: 'within_3_months' | '3_to_12_months' | 'not_sure';
    isExactDatesKnown: boolean;
    tripDurationDays?: number | null;
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
    highestEducation: 'school' | 'college' | 'bachelor' | 'master' | 'phd' | 'other';
    isMinor: boolean;
  };

  // Q4: Financial situation / sponsor
  finance: {
    payer: 'self' | 'parents' | 'other_family' | 'employer' | 'scholarship' | 'other_sponsor';
    approxMonthlyIncomeRange:
      | 'less_500'
      | '500_1000'
      | '1000_3000'
      | '3000_plus'
      | 'not_applicable';
    hasBankStatement: boolean;
    hasStableIncome: boolean;
    sponsorRelationship?: 'parent' | 'relative' | 'company' | 'other';
  };

  // Q5: Invitation / admission (branch on visaType)
  invitation: {
    hasInvitation: boolean;
    // For student visas:
    studentInvitationType?: 'university_acceptance' | 'language_course' | 'exchange_program';
    // For tourist visas:
    touristInvitationType?: 'no_invitation' | 'hotel_booking' | 'family_or_friends' | 'tour_agency';
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
    regionsVisited: ('schengen' | 'usa_canada' | 'uk' | 'asia' | 'middle_east')[];
    hasVisaRefusals: boolean;
    hasOverstay?: boolean;
    travelHistoryLevel?: 'none' | 'limited' | 'moderate' | 'strong';
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

  studentModule?: {
    schoolName?: string;
    acceptanceStatus?: 'accepted' | 'applied' | 'not_applied';
    programStartDate?: string;
    tuitionAmountUSD?: number | null;
    tuitionPaidStatus?: 'paid' | 'partial' | 'unpaid';
    scholarship?: boolean;
    accommodationType?: 'dorm' | 'private' | 'host';
    hasAdmissionLetter?: boolean;
    previousEducationDocs?: boolean;
  };

  workModule?: {
    employerName?: string;
    position?: string;
    contractType?: 'permanent' | 'contract' | 'probation';
    salaryMonthlyUSD?: number | null;
    sponsorshipStatus?: 'employer_sponsored' | 'not_sponsored';
    hasWorkPermit?: boolean;
    yearsOfExperience?: number | null;
    professionalLicenses?: boolean;
  };

  familyModule?: {
    inviterRelationship?: 'spouse' | 'parent' | 'sibling' | 'relative' | 'friend';
    inviterResidencyStatus?: 'citizen' | 'pr' | 'work_permit' | 'student' | 'other';
    hasInvitationLetter?: boolean;
    willHost?: boolean;
    willSponsor?: boolean;
  };

  businessModule?: {
    companyName?: string;
    invitationFromCompany?: boolean;
    eventType?: string;
    eventDatesKnown?: boolean;
    funding?: 'company' | 'self';
  };

  transitModule?: {
    onwardTicket?: boolean;
    layoverHours?: number | null;
    finalDestinationVisa?: 'yes' | 'no' | 'not_required';
  };
}

/**
 * Country options for dropdown
 */
// Country list is now provided dynamically by the backend meta endpoint; keep a small
// suggestion list as fallback for UI components. These are suggestions only, not enforced.
export const COUNTRY_OPTIONS: Array<{ code: TargetCountry; name: string }> = [];
