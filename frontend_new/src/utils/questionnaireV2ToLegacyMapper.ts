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
} {
  // Map visaType to purpose
  const purpose = v2.visaType === 'student' ? 'study' : 'tourism';

  // Map targetCountry to country (use code directly, backend can handle it)
  const country = v2.targetCountry;

  // Map duration category to legacy duration format
  const durationMap: Record<string, string> = {
    up_to_30_days: '1_3_months', // Approximate mapping
    '31_90_days': '3_6_months',
    more_than_90_days: '6_12_months',
  };
  const duration = durationMap[v2.travel.durationCategory] || '3_6_months';

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
  };
}
