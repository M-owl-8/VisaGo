/**
 * Document Explanation Evaluation Scenarios
 * Hard-coded test cases for document explanation subsystem
 */

import { DocExplanationEvalScenario } from './types';

export const DOC_EXPLANATION_SCENARIOS: DocExplanationEvalScenario[] = [
  {
    id: 'docexpl-001',
    name: 'Bank statement explanation',
    description: 'Explain why bank statement is needed for US tourist visa',
    subsystem: 'doc-explanation',
    documentType: 'bank_statements_applicant',
    countryCode: 'US',
    visaType: 'tourist',
    canonicalAIUserContext: {
      applicantProfile: {
        sponsorType: 'self',
        bankBalanceUSD: 5000,
        financial: {
          requiredFundsEstimate: 3000,
          financialSufficiencyRatio: 1.67,
        },
      },
    },
    expectedConstraints: {
      whyMentionsVisaType: true,
      whyMentionsCountry: true,
      tipsLength: { min: 2 },
      mentionsCommonMistake: true,
      mentionsOfficerChecks: true,
    },
  },
  {
    id: 'docexpl-002',
    name: 'Employment letter explanation',
    description: 'Explain why employment letter is needed for Schengen visa',
    subsystem: 'doc-explanation',
    documentType: 'employment_letter',
    countryCode: 'DE',
    visaType: 'tourist',
    canonicalAIUserContext: {
      applicantProfile: {
        currentStatus: 'employed',
        isEmployed: true,
        employment: {
          employerName: 'Test Company',
          employmentDurationMonths: 24,
        },
      },
    },
    expectedConstraints: {
      whyMentionsVisaType: true,
      whyMentionsCountry: true,
      tipsLength: { min: 2 },
      mentionsCommonMistake: true,
      mentionsOfficerChecks: true,
    },
  },
  {
    id: 'docexpl-003',
    name: 'Property document explanation',
    description: 'Explain why property documents strengthen ties for UK visa',
    subsystem: 'doc-explanation',
    documentType: 'property_documents',
    countryCode: 'UK',
    visaType: 'tourist',
    canonicalAIUserContext: {
      applicantProfile: {
        hasPropertyInUzbekistan: true,
        ties: {
          tiesStrengthScore: 0.6,
        },
      },
    },
    expectedConstraints: {
      whyMentionsVisaType: true,
      whyMentionsCountry: true,
      tipsLength: { min: 2 },
      mentionsCommonMistake: true,
      mentionsOfficerChecks: true,
    },
  },
  {
    id: 'docexpl-004',
    name: 'Travel insurance explanation',
    description: 'Explain why travel insurance is required for Schengen visa',
    subsystem: 'doc-explanation',
    documentType: 'travel_insurance',
    countryCode: 'ES',
    visaType: 'tourist',
    expectedConstraints: {
      whyMentionsVisaType: true,
      whyMentionsCountry: true,
      tipsLength: { min: 2 },
      mentionsCommonMistake: true,
      mentionsOfficerChecks: true,
    },
  },
  {
    id: 'docexpl-005',
    name: 'Invitation letter explanation',
    description: 'Explain why invitation letter helps for tourist visa',
    subsystem: 'doc-explanation',
    documentType: 'invitation_letter',
    countryCode: 'US',
    visaType: 'tourist',
    canonicalAIUserContext: {
      applicantProfile: {
        hasOtherInvitation: true,
      },
    },
    expectedConstraints: {
      whyMentionsVisaType: true,
      whyMentionsCountry: true,
      tipsLength: { min: 2 },
      mentionsCommonMistake: true,
      mentionsOfficerChecks: true,
    },
  },
  {
    id: 'docexpl-006',
    name: 'I-20 form explanation for student visa',
    description: 'Explain why I-20 form is critical for US student visa',
    subsystem: 'doc-explanation',
    documentType: 'i20_form',
    countryCode: 'US',
    visaType: 'student',
    canonicalAIUserContext: {
      applicantProfile: {
        visaType: 'student',
        hasUniversityInvitation: true,
        education: {
          degreeLevel: 'bachelor',
          institution: 'Test University',
        },
      },
    },
    expectedConstraints: {
      whyMentionsVisaType: true,
      whyMentionsCountry: true,
      tipsLength: { min: 2 },
      mentionsCommonMistake: true,
      mentionsOfficerChecks: true,
    },
  },
];
