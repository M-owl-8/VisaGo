/**
 * Questionnaire V2 to Legacy Mapper
 * Converts QuestionnaireV2 format to legacy QuestionnaireData format
 * for compatibility with backend /api/applications/ai-generate endpoint
 */

import {QuestionnaireV2} from '../types/questionnaire-v2';

/**
 * Map QuestionnaireV2 to legacy QuestionnaireData format
 * This ensures compatibility with the backend route validation
 * which expects 'purpose' and 'country' fields
 */
export function mapQuestionnaireV2ToLegacy(v2: QuestionnaireV2): {
  version: string;
  purpose: string;
  country: string;
  targetCountry: string;
  visaType: 'tourist' | 'student';
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
  const purpose = v2.visaType === 'student' ? 'study' : 'tourism';

  // Map targetCountry to country (use code directly, backend can handle it)
  const country = v2.targetCountry;

  // Map duration to legacy format: prefer exact tripDurationDays, fallback to durationCategory
  const mapDuration = (): string => {
    if (typeof v2.travel?.tripDurationDays === 'number') {
      const days = v2.travel.tripDurationDays;
      if (days <= 30) return '1_3_months';
      if (days <= 90) return '3_6_months';
      if (days <= 180) return '3_6_months';
      if (days <= 365) return '6_12_months';
      return '6_12_months';
    }
    const durationMap: Record<string, string> = {
      up_to_30_days: '1_3_months',
      '31_90_days': '3_6_months',
      more_than_90_days: '6_12_months',
    };
    return durationMap[v2.travel?.durationCategory || ''] || '3_6_months';
  };
  const duration = mapDuration();

  // Map current status
  const currentStatusMap: Record<string, string> = {
    student: 'student',
    employed: 'employee',
    self_employed: 'entrepreneur',
    unemployed: 'unemployed',
    business_owner: 'entrepreneur',
    school_child: 'student',
  };
  const currentStatus =
    currentStatusMap[v2.status.currentStatus] || 'unemployed';

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
  const financialSituation =
    financialSituationMap[v2.finance.payer] || 'stable_income';

  // Map marital status (already compatible)
  const maritalStatus = v2.personal.maritalStatus;

  // Map hasChildren
  const hasChildren = v2.special.travelingWithChildren ? 'one' : 'no';

  // Map English level (default to intermediate if not available)
  const englishLevel = 'intermediate'; // V2 doesn't have this field, use default

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
