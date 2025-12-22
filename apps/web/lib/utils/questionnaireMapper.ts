/**
 * Questionnaire V2 to Legacy Mapper
 * Converts QuestionnaireV2 format to legacy format for backend compatibility
 * Matches mobile app: frontend_new/src/utils/questionnaireV2ToLegacyMapper.ts
 */

import { QuestionnaireV2 } from '../types/questionnaire';

/**
 * Map QuestionnaireV2 to legacy format for backend route validation
 * Backend expects 'purpose' and 'country' fields, but V2 has 'visaType' and 'targetCountry'
 */
export function mapQuestionnaireV2ToLegacy(v2: QuestionnaireV2): {
  version: string;
  purpose: string;
  country: string;
  targetCountry: string;
  visaType: string;
  duration: string;
  traveledBefore: boolean;
  currentStatus: string;
  hasInvitation: boolean;
  financialSituation: string;
  maritalStatus: string;
  hasChildren: string;
  englishLevel: string;
  tripDurationDays?: number | null;
  travelHistoryLevel?: string;
  hasOverstay?: boolean;
  sponsorRelationship?: string;
  contact?: QuestionnaireV2['contact'];
  studentModule?: QuestionnaireV2['studentModule'];
  workModule?: QuestionnaireV2['workModule'];
  familyModule?: QuestionnaireV2['familyModule'];
  businessModule?: QuestionnaireV2['businessModule'];
  transitModule?: QuestionnaireV2['transitModule'];
} {
  // Map visaType to purpose
  const normalizedVisaType = (v2.visaType || '').toLowerCase();
  const purpose =
    normalizedVisaType === 'student'
      ? 'study'
      : normalizedVisaType === 'tourist'
        ? 'tourism'
        : normalizedVisaType || 'tourism';

  // Map targetCountry to country (use code directly, backend can handle it)
  const country = v2.targetCountry;

  // Map trip duration days to legacy duration format
  const mapDaysToLegacyDuration = (days: number | null | undefined, visaType: string): string => {
    if (!days || days <= 0) {
      return visaType === 'student' ? '6_12_months' : '3_6_months';
    }
    if (days <= 30) {
      return '1_3_months';
    } else if (days <= 90) {
      return '3_6_months';
    } else if (days <= 180) {
      return '3_6_months';
    } else if (days <= 365) {
      return '6_12_months';
    } else {
      return '6_12_months';
    }
  };
  const duration = mapDaysToLegacyDuration(v2.travel.tripDurationDays, v2.visaType);

  // Map current status
  const currentStatusMap: Record<string, string> = {
    student: 'student',
    employed: 'employee',
    self_employed: 'entrepreneur',
    unemployed: 'unemployed',
    business_owner: 'entrepreneur',
    school_child: 'student',
  };
  const currentStatus = currentStatusMap[v2.status.currentStatus] || 'unemployed';

  // Map invitation
  const hasInvitation = v2.invitation.hasInvitation;

  // Map financial situation
  const financialSituationMap: Record<string, string> = {
    self: 'stable_income',
    parents: 'sponsor',
    other_family: 'sponsor',
    employer: 'sponsor',
    scholarship: 'sponsor',
    other_sponsor: 'sponsor',
  };
  const financialSituation = financialSituationMap[v2.finance.payer] || 'stable_income';

  // Map marital status (already compatible)
  const maritalStatus = v2.personal.maritalStatus;

  // Map hasChildren (from special.travelingWithChildren or default to no)
  const hasChildren = v2.special.travelingWithChildren ? 'one' : 'no';

  // Map English level (default to intermediate if not available in v2)
  const englishLevel = 'intermediate';

  return {
    version: '2.0',
    purpose,
    country,
    targetCountry: v2.targetCountry,
    visaType: v2.visaType,
    duration,
    traveledBefore: v2.history.hasTraveledBefore,
    currentStatus,
    hasInvitation,
    financialSituation,
    maritalStatus,
    hasChildren,
    englishLevel,
    tripDurationDays: v2.travel.tripDurationDays,
    travelHistoryLevel: v2.history.travelHistoryLevel,
    hasOverstay: v2.history.hasOverstay,
    sponsorRelationship: v2.finance.sponsorRelationship,
    contact: v2.contact,
    studentModule: v2.studentModule,
    workModule: v2.workModule,
    familyModule: v2.familyModule,
    businessModule: v2.businessModule,
    transitModule: v2.transitModule,
  };
}
