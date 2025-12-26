import { questionnaireV2Schema, getQuestionnaireV2Completeness, validateQuestionnaireV2 } from '../src/utils/questionnaire-validation';
import { buildSummaryFromQuestionnaireV2 } from '../src/services/questionnaire-v2-mapper';
import { QuestionnaireV2 } from '../src/types/questionnaire-v2';

const baseQuestionnaire: QuestionnaireV2 = {
  version: '2.0',
  targetCountry: 'US',
  visaType: 'tourist',
  personal: {
    ageRange: '26_35',
    maritalStatus: 'single',
    nationality: 'UZ',
    passportStatus: 'valid_6plus_months',
  },
  travel: {
    durationCategory: '31_90_days',
    plannedWhen: 'within_3_months',
    isExactDatesKnown: false,
  },
  status: {
    currentStatus: 'employed',
    highestEducation: 'bachelor',
    isMinor: false,
  },
  finance: {
    payer: 'self',
    approxMonthlyIncomeRange: '1000_3000',
    hasBankStatement: true,
    hasStableIncome: true,
  },
  invitation: {
    hasInvitation: false,
    touristInvitationType: 'no_invitation',
  },
  stay: {
    accommodationType: 'hotel',
    hasRoundTripTicket: false,
  },
  history: {
    hasTraveledBefore: false,
    regionsVisited: [],
    hasVisaRefusals: false,
  },
  ties: {
    hasProperty: false,
    hasCloseFamilyInUzbekistan: true,
  },
  documents: {
    hasEmploymentOrStudyProof: true,
    hasInsurance: false,
    hasPassport: true,
    hasBirthCertificate: true,
    hasPropertyDocs: false,
  },
  special: {
    travelingWithChildren: false,
    hasMedicalReasonForTrip: false,
    hasCriminalRecord: false,
  },
};

describe('Questionnaire V2 validation', () => {
  it('accepts a valid tourist questionnaire', () => {
    expect(() => questionnaireV2Schema.parse(baseQuestionnaire)).not.toThrow();
    expect(validateQuestionnaireV2(baseQuestionnaire)).toBe(true);
    const completeness = getQuestionnaireV2Completeness(baseQuestionnaire);
    expect(completeness.valid).toBe(true);
    expect(completeness.missingFields).toHaveLength(0);
  });

  it('flags missing student invitation type', () => {
    const studentQuestionnaire: QuestionnaireV2 = {
      ...baseQuestionnaire,
      visaType: 'student',
      invitation: {
        hasInvitation: true,
      } as any,
    };

    const completeness = getQuestionnaireV2Completeness(studentQuestionnaire);
    expect(completeness.valid).toBe(false);
    expect(completeness.missingFields).toContain('invitation.studentInvitationType');
  });

  it('throws when building summary for incomplete questionnaire', () => {
    const studentQuestionnaire: QuestionnaireV2 = {
      ...baseQuestionnaire,
      visaType: 'student',
      invitation: {
        hasInvitation: true,
      } as any,
    };

    expect(() => buildSummaryFromQuestionnaireV2(studentQuestionnaire)).toThrow(
      /QuestionnaireV2 incomplete/
    );
  });
});











