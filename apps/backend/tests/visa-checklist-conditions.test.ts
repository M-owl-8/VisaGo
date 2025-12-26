import { buildBaseChecklistFromRules } from '../src/services/checklist-rules.service';
import { VisaRuleSetData } from '../src/services/visa-rules.service';
import { buildSummaryFromQuestionnaireV2 } from '../src/services/questionnaire-v2-mapper';
import { AIUserContext } from '../src/types/ai-context';
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

function buildContextFromQuestionnaire(q: QuestionnaireV2): AIUserContext {
  const summary = buildSummaryFromQuestionnaireV2(q, 'en');
  return {
    userProfile: {
      userId: 'user-1',
      appLanguage: 'en',
      citizenship: summary.citizenship,
      age: summary.age,
    },
    application: {
      applicationId: 'app-1',
      visaType: summary.visaType,
      country: summary.targetCountry,
      status: 'draft',
    },
    questionnaireSummary: summary,
    uploadedDocuments: [],
    appActions: [],
  };
}

describe('Checklist conditional filtering', () => {
  const ruleSet: VisaRuleSetData = {
    version: 2,
    requiredDocuments: [
      {
        documentType: 'bank_statement',
        category: 'required',
      },
      {
        documentType: 'sponsor_letter',
        category: 'required',
        condition: "sponsorType !== 'self'",
      },
    ],
  };

  it('excludes conditional document when condition is false', async () => {
    const ctx = buildContextFromQuestionnaire(baseQuestionnaire); // payer self -> sponsorType self
    const checklist = await buildBaseChecklistFromRules(ctx, ruleSet);
    const types = checklist.map((c) => c.documentType);
    expect(types).toContain('bank_statement');
    expect(types).not.toContain('sponsor_letter');
  });

  it('includes conditional document when condition is true', async () => {
    const sponsoredQuestionnaire: QuestionnaireV2 = {
      ...baseQuestionnaire,
      finance: { ...baseQuestionnaire.finance, payer: 'parents' },
    };
    const ctx = buildContextFromQuestionnaire(sponsoredQuestionnaire);
    const checklist = await buildBaseChecklistFromRules(ctx, ruleSet);
    const types = checklist.map((c) => c.documentType);
    expect(types).toContain('bank_statement');
    expect(types).toContain('sponsor_letter');
  });
});











