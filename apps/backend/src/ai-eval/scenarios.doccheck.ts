/**
 * Document Check Evaluation Scenarios
 * Hard-coded test cases for document verification subsystem
 */

import { DocCheckEvalScenario } from './types';

export const DOCCHECK_SCENARIOS: DocCheckEvalScenario[] = [
  {
    id: 'doccheck-001',
    name: 'Clean, perfect bank statement',
    description: 'Bank statement with sufficient balance, correct format, all required fields',
    subsystem: 'doccheck',
    requiredDocumentRule: {
      documentType: 'bank_statements_applicant',
      category: 'required',
      description: 'Bank statements showing sufficient funds for trip',
      validityRequirements: 'Last 3 months',
      formatRequirements: 'Original or certified copy',
    },
    userDocumentText: `BANK STATEMENT
Account Holder: John Doe
Account Number: 1234567890
Bank: UzSIB Bank
Period: January 2024 - March 2024

Date: 2024-01-15
Description: Salary
Amount: +$2,000.00
Balance: $8,500.00

Date: 2024-02-15
Description: Salary
Amount: +$2,000.00
Balance: $10,500.00

Date: 2024-03-15
Description: Salary
Amount: +$2,000.00
Balance: $12,500.00

Current Balance: $12,500.00 USD
Currency: USD
Account Type: Savings Account

Certified by: UzSIB Bank
Date: 2024-03-20
Signature: [Bank Officer Signature]
Stamp: [Bank Official Stamp]`,
    metadata: {
      fileType: 'pdf',
      amounts: [{ value: 12500, currency: 'USD' }],
      bankName: 'UzSIB Bank',
      accountHolder: 'John Doe',
    },
    expectedConstraints: {
      statusInSet: ['APPROVED'],
      shortReasonNonEmpty: true,
      notesUzPresent: true,
      ifInsufficientAmountThenRiskNotLow: true,
      validationDetailsPresent: true,
    },
  },
  {
    id: 'doccheck-002',
    name: 'Bank statement with too little money',
    description: 'Bank statement with balance below minimum requirement',
    subsystem: 'doccheck',
    requiredDocumentRule: {
      documentType: 'bank_statements_applicant',
      category: 'required',
      description: 'Bank statements showing minimum $3,000 for tourist visa',
      validityRequirements: 'Last 3 months',
    },
    userDocumentText: `BANK STATEMENT
Account Holder: Jane Smith
Account Number: 9876543210
Bank: Kapital Bank
Period: January 2024 - March 2024

Date: 2024-01-15
Description: Salary
Amount: +$500.00
Balance: $800.00

Date: 2024-02-15
Description: Withdrawal
Amount: -$200.00
Balance: $600.00

Date: 2024-03-15
Description: Salary
Amount: +$500.00
Balance: $1,100.00

Current Balance: $1,100.00 USD
Currency: USD`,
    metadata: {
      fileType: 'pdf',
      amounts: [{ value: 1100, currency: 'USD' }],
      bankName: 'Kapital Bank',
      accountHolder: 'Jane Smith',
    },
    expectedConstraints: {
      statusInSet: ['NEED_FIX', 'REJECTED'],
      shortReasonNonEmpty: true,
      notesUzPresent: true,
      ifInsufficientAmountThenRiskNotLow: true, // Should be MEDIUM or HIGH risk
      validationDetailsPresent: true,
    },
  },
  {
    id: 'doccheck-003',
    name: 'Expired passport',
    description: 'Passport document that has expired',
    subsystem: 'doccheck',
    requiredDocumentRule: {
      documentType: 'passport_international',
      category: 'required',
      description: 'Valid passport with 6 months validity remaining',
      validityRequirements: 'Valid for 6 months after return date',
    },
    userDocumentText: `PASSPORT
Issuing Country: Uzbekistan
Passport Number: AB1234567
Full Name: Test User
Date of Birth: 1990-01-15
Nationality: Uzbek
Issue Date: 2015-01-10
Expiry Date: 2020-01-10

[EXPIRED - Expired 4 years ago]`,
    metadata: {
      fileType: 'pdf',
      issueDate: '2015-01-10',
      expiryDate: '2020-01-10',
    },
    expectedConstraints: {
      statusInSet: ['REJECTED'],
      shortReasonNonEmpty: true,
      notesUzPresent: true,
      validationDetailsPresent: true,
    },
  },
  {
    id: 'doccheck-004',
    name: 'Missing signature/stamp',
    description: 'Document missing required signature or official stamp',
    subsystem: 'doccheck',
    requiredDocumentRule: {
      documentType: 'employment_letter',
      category: 'highly_recommended',
      description: 'Employment letter from employer with signature and stamp',
      formatRequirements: 'Must have employer signature and company stamp',
    },
    userDocumentText: `EMPLOYMENT LETTER

To: Embassy of United States
Date: 2024-03-15

This is to certify that John Doe has been employed at Test Company since January 2022.
Position: Software Engineer
Monthly Salary: $2,000 USD
Employment Status: Full-time, Permanent

We confirm that John Doe has been granted leave from March 20, 2024 to June 20, 2024 for travel purposes.
He is expected to return to work on June 21, 2024.

[Missing: Signature and Company Stamp]`,
    metadata: {
      fileType: 'pdf',
    },
    expectedConstraints: {
      statusInSet: ['NEED_FIX', 'REJECTED'],
      shortReasonNonEmpty: true,
      notesUzPresent: true,
      validationDetailsPresent: true,
    },
  },
  {
    id: 'doccheck-005',
    name: 'Wrong language (needs translation)',
    description: 'Document in Uzbek/Russian that needs English translation',
    subsystem: 'doccheck',
    requiredDocumentRule: {
      documentType: 'property_documents',
      category: 'highly_recommended',
      description: 'Property ownership documents',
      formatRequirements: 'Must be in English or translated with apostille',
    },
    userDocumentText: `ҚАДАСТР ДОКУМЕНТИ

Фойдаланувчи: Тест Фойдаланувчи
Манзил: Тошкент шаҳри, Чилонзор тумани
Ҳудуд: 45 м²
Мулк тури: Квартира
Сертификат рақами: 12345
Сана: 2020-05-15

[Document is in Uzbek - needs English translation]`,
    metadata: {
      fileType: 'pdf',
    },
    expectedConstraints: {
      statusInSet: ['NEED_FIX'],
      shortReasonNonEmpty: true,
      notesUzPresent: true,
      validationDetailsPresent: true,
    },
  },
  {
    id: 'doccheck-006',
    name: 'Sponsor bank statement with low balance',
    description: 'Sponsor bank statement that shows insufficient funds',
    subsystem: 'doccheck',
    requiredDocumentRule: {
      documentType: 'bank_statements_sponsor',
      category: 'required',
      description: 'Sponsor bank statements showing sufficient funds',
      validityRequirements: 'Last 3 months, minimum $5,000',
    },
    userDocumentText: `SPONSOR BANK STATEMENT
Account Holder: Parent Name (Sponsor)
Account Number: 5555555555
Bank: Trust Bank
Period: January 2024 - March 2024

Date: 2024-01-15
Description: Pension
Amount: +$300.00
Balance: $1,200.00

Date: 2024-02-15
Description: Pension
Amount: +$300.00
Balance: $1,500.00

Date: 2024-03-15
Description: Withdrawal
Amount: -$500.00
Balance: $1,000.00

Current Balance: $1,000.00 USD
[Balance is below $5,000 minimum requirement]`,
    metadata: {
      fileType: 'pdf',
      amounts: [{ value: 1000, currency: 'USD' }],
      bankName: 'Trust Bank',
      accountHolder: 'Parent Name',
    },
    canonicalAIUserContext: {
      applicantProfile: {
        sponsorType: 'parent',
        financial: {
          requiredFundsEstimate: 5000,
          financialSufficiencyRatio: 0.2, // 20% - very insufficient
        },
      },
    },
    expectedConstraints: {
      statusInSet: ['NEED_FIX', 'REJECTED'],
      shortReasonNonEmpty: true,
      notesUzPresent: true,
      ifInsufficientAmountThenRiskNotLow: true, // Should be MEDIUM or HIGH
      validationDetailsPresent: true,
    },
  },
];
