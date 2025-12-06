/**
 * Rules Extraction Evaluation Scenarios
 * Hard-coded test cases for rules extraction subsystem
 */

import { RulesExtractionEvalScenario } from './types';

export const RULES_EXTRACTION_SCENARIOS: RulesExtractionEvalScenario[] = [
  {
    id: 'rules-001',
    name: 'US B1/B2 tourist visa page',
    description: 'Extract rules from artificial US B1/B2 embassy page text',
    subsystem: 'rules-extraction',
    countryCode: 'US',
    visaType: 'tourist',
    embassyPageText: `US EMBASSY - TOURIST VISA (B1/B2) REQUIREMENTS

Required Documents:
1. Valid passport with at least 6 months validity remaining after your intended departure date
2. Completed DS-160 application form confirmation page
3. One recent passport photograph (2x2 inches, white background)
4. Bank statements showing sufficient funds for your trip (minimum $3,000 recommended)
5. Proof of employment or income (employment letter, tax returns)
6. Travel itinerary or flight reservation
7. Hotel booking confirmation or invitation letter
8. Travel insurance (recommended)

Financial Requirements:
- Minimum balance: $3,000 USD
- Bank statements: Last 3 months required
- Sponsor documents allowed if sponsored

Processing Information:
- Processing time: 7-10 business days
- Interview required: Yes
- Biometrics required: Yes

Fees:
- Visa fee: $185 USD
- Payment methods: Bank transfer, credit card

Additional Requirements:
- Travel insurance: Recommended (minimum $50,000 coverage)
- Return ticket: Recommended but not required`,
    expectedConstraints: {
      allDocumentsInTextAppear: true,
      noExtraDocuments: true,
      financialRequirementsPresent: true,
      confidenceThreshold: 0.6,
      requiredDocumentsCount: { min: 6 },
    },
  },
  {
    id: 'rules-002',
    name: 'Schengen tourist visa page',
    description: 'Extract rules from artificial Schengen embassy page text',
    subsystem: 'rules-extraction',
    countryCode: 'DE',
    visaType: 'tourist',
    embassyPageText: `GERMAN EMBASSY - SCHENGEN TOURIST VISA REQUIREMENTS

Required Documents:
1. Valid passport (biometric, valid for at least 3 months after return)
2. Completed Schengen visa application form
3. Two recent biometric passport photographs (35x45mm)
4. Travel health insurance covering at least €30,000
5. Proof of accommodation (hotel booking, invitation letter, or Airbnb confirmation)
6. Round-trip flight reservation
7. Bank statements for last 3 months (minimum €2,000 or equivalent)
8. Proof of employment or income certificate

Financial Requirements:
- Minimum balance: €2,000 EUR
- Bank statements: Last 3 months required
- Currency: EUR or equivalent in local currency

Processing Information:
- Processing time: 10-15 business days
- Interview: Usually required for first-time applicants
- Biometrics: Required (Schengen VIS system)

Fees:
- Visa fee: €80 EUR
- Service fee: €20 EUR (if using visa center)

Additional Requirements:
- Travel insurance: MANDATORY (minimum €30,000 coverage)
- Accommodation proof: MANDATORY
- Return ticket: Highly recommended`,
    expectedConstraints: {
      allDocumentsInTextAppear: true,
      noExtraDocuments: true,
      financialRequirementsPresent: true,
      confidenceThreshold: 0.6,
      requiredDocumentsCount: { min: 8 },
    },
  },
  {
    id: 'rules-003',
    name: 'US F-1 student visa page',
    description: 'Extract rules from artificial US F-1 student visa page text',
    subsystem: 'rules-extraction',
    countryCode: 'US',
    visaType: 'student',
    embassyPageText: `US EMBASSY - F-1 STUDENT VISA REQUIREMENTS

Required Documents:
1. Valid passport with at least 6 months validity
2. Form I-20 (Certificate of Eligibility for Nonimmigrant Student Status)
3. SEVIS fee receipt (I-901 fee payment confirmation)
4. DS-160 application form confirmation page
5. One recent passport photograph
6. Bank statements showing sufficient funds for 1 year of tuition and living expenses
7. Sponsor financial documents (if sponsored)
8. Academic transcripts and diplomas
9. English proficiency test results (if required by institution)
10. University acceptance letter

Financial Requirements:
- Minimum funds: 1 year of tuition + living expenses (typically $25,000-$50,000 USD)
- Bank statements: Last 6 months required
- Sponsor documents: Allowed with sponsor letter and financial proof

Processing Information:
- Processing time: 2-4 weeks
- Interview: Required
- Biometrics: Required

Fees:
- Visa fee: $185 USD
- SEVIS fee: $350 USD (separate payment)
- Payment methods: Bank transfer, credit card

Additional Requirements:
- Health insurance: Required by most universities
- Return ticket: Recommended`,
    expectedConstraints: {
      allDocumentsInTextAppear: true,
      noExtraDocuments: true,
      financialRequirementsPresent: true,
      confidenceThreshold: 0.6,
      requiredDocumentsCount: { min: 8 },
    },
  },
  {
    id: 'rules-004',
    name: 'UK student visa page',
    description: 'Extract rules from artificial UK student visa page text',
    subsystem: 'rules-extraction',
    countryCode: 'UK',
    visaType: 'student',
    embassyPageText: `UK EMBASSY - STUDENT VISA REQUIREMENTS

Required Documents:
1. Valid passport
2. CAS (Confirmation of Acceptance for Studies) letter from UK institution
3. Completed UK visa application form
4. Two recent passport photographs
5. Bank statements showing funds for 28 consecutive days (28-day rule)
6. TB test certificate (if required based on country)
7. Academic qualifications (transcripts, diplomas)
8. English language test results (IELTS, TOEFL, etc.)
9. Sponsor documents (if sponsored)

Financial Requirements:
- Minimum funds: Tuition fees + living costs (typically £10,000-£15,000 per year)
- Bank statements: Must show funds for 28 consecutive days
- Currency: GBP or equivalent
- Sponsor requirements: Allowed with sponsor letter and financial documents

Processing Information:
- Processing time: 3-4 weeks
- Interview: May be required
- Biometrics: Required

Fees:
- Visa fee: £363 GBP
- Health surcharge: £470 GBP per year (separate payment)

Additional Requirements:
- TB test: Required for certain countries
- Health insurance: Included in health surcharge`,
    expectedConstraints: {
      allDocumentsInTextAppear: true,
      noExtraDocuments: true,
      financialRequirementsPresent: true,
      confidenceThreshold: 0.6,
      requiredDocumentsCount: { min: 7 },
    },
  },
];
