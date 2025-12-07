/**
 * AI Document Evaluation Fixtures (Phase 5)
 *
 * ⚠️ DEV-ONLY: These are SYNTHETIC document texts for AI evaluation only.
 *
 * These fixtures are NOT real user data and are used exclusively for:
 * - Testing document validation behavior
 * - Validating risk-driven document checking
 * - Ensuring embassy rules and playbooks are used correctly
 * - Testing invariant checks (e.g., low funds + bad bank statement = not APPROVED)
 *
 * DO NOT use these fixtures in production code or expose them via public APIs.
 */

/**
 * Synthetic document text fixtures
 */
export const DOC_FIXTURES = {
  // ============================================================================
  // US BANK STATEMENTS
  // ============================================================================

  GOOD_US_BANK_STATEMENT_STRONG_FUNDS: `BANK STATEMENT
Kapital Bank
Account Holder: John Doe
Account Number: 1234567890
Statement Period: January 1, 2024 - June 30, 2024

Opening Balance: $25,000.00 USD
Closing Balance: $28,500.00 USD

Transaction History:
- January 15, 2024: Salary Deposit: $3,000.00
- February 1, 2024: Salary Deposit: $3,000.00
- March 1, 2024: Salary Deposit: $3,000.00
- April 1, 2024: Salary Deposit: $3,000.00
- May 1, 2024: Salary Deposit: $3,000.00
- June 1, 2024: Salary Deposit: $3,000.00

Average Monthly Balance: $26,500.00 USD
Minimum Balance: $25,000.00 USD

This statement shows consistent income and sufficient funds for a 3-month US tourist visa.`,

  BAD_US_BANK_STATEMENT_LOW_FUNDS_SHORT_HISTORY: `BANK STATEMENT
Uzsanoatqurilishbank
Account Holder: Jane Smith
Account Number: 9876543210
Statement Period: May 1, 2024 - May 31, 2024

Opening Balance: $500.00 USD
Closing Balance: $1,200.00 USD

Transaction History:
- May 15, 2024: Deposit: $700.00

This statement shows only 1 month of history and very low balance. Insufficient for US tourist visa requirements.`,

  // ============================================================================
  // EMPLOYMENT LETTERS
  // ============================================================================

  UZB_EMPLOYMENT_LETTER_STRONG_TIES: `EMPLOYMENT LETTER
Company: Tashkent Software Solutions LLC
Date: June 15, 2024

To Whom It May Concern,

This letter confirms that Mr. Ahmad Karimov has been employed as a Senior Software Engineer at our company since January 1, 2020.

Current Position: Senior Software Engineer
Monthly Salary: 15,000,000 UZS (approximately $1,200 USD)
Employment Duration: 4 years and 6 months

Mr. Karimov is a valued employee and we have approved his leave for travel from July 15, 2024 to August 15, 2024. He is expected to return to work on August 16, 2024.

We confirm that his position will be held for him upon his return.

Signed,
HR Manager
Tashkent Software Solutions LLC
Company Stamp and Seal`,

  BAD_EMPLOYMENT_LETTER_NO_SALARY_NO_LEAVE: `EMPLOYMENT LETTER
Company: ABC Trading Company
Date: June 20, 2024

To Whom It May Concern,

This letter confirms that Mr. Bob Johnson works at our company.

Position: Sales Representative

Signed,
Manager
ABC Trading Company`,

  // ============================================================================
  // SCHENGEN TRAVEL INSURANCE
  // ============================================================================

  SCHENGEN_TRAVEL_INSURANCE_OK: `TRAVEL INSURANCE CERTIFICATE
Insurance Company: Global Travel Insurance
Policy Number: GT-2024-123456
Insured: Maria Petrov
Coverage Period: July 1, 2024 - July 30, 2024

Coverage Details:
- Medical Coverage: €50,000
- Emergency Evacuation: €100,000
- Repatriation: €50,000
Total Coverage: €200,000

Coverage Area: Schengen Area (all 27 countries)

This policy meets Schengen visa requirements with coverage exceeding €30,000 minimum.`,

  SCHENGEN_TRAVEL_INSURANCE_BAD_COVERAGE: `TRAVEL INSURANCE CERTIFICATE
Insurance Company: Basic Insurance Co
Policy Number: BI-2024-789
Insured: Ivan Ivanov
Coverage Period: July 1, 2024 - July 15, 2024

Coverage Details:
- Medical Coverage: €10,000
- Emergency Evacuation: €5,000
Total Coverage: €15,000

Coverage Area: Europe

This policy does NOT meet Schengen visa requirements. Minimum coverage is €30,000.`,

  // ============================================================================
  // PROPERTY DOCUMENTS
  // ============================================================================

  UZB_PROPERTY_DOCUMENT_KADASTR: `PROPERTY OWNERSHIP DOCUMENT
Kadastr Organlari (Cadastral Authority)
Document Number: KAD-2020-456789
Date Issued: March 10, 2020

Property Owner: Fatima Alimova
Property Address: Tashkent, Yunusabad District, Street 15, Building 25, Apartment 12
Property Type: Residential Apartment
Property Area: 85 square meters
Property Value: 120,000 USD (as of 2024)

This document confirms legal ownership of the property and serves as proof of ties to Uzbekistan.

Official Stamp and Seal
Kadastr Organlari`,

  // ============================================================================
  // STUDENT DOCUMENTS
  // ============================================================================

  US_I20_FORM_VALID: `FORM I-20
Certificate of Eligibility for Nonimmigrant Student Status

Student Name: Alisher Rakhimov
SEVIS ID: N1234567890
School: University of California, Los Angeles
Program: Master of Science in Computer Science
Program Start Date: September 1, 2024
Program End Date: May 31, 2026

Tuition and Fees: $45,000 per year
Living Expenses: $20,000 per year
Total Estimated Cost: $65,000 per year

This I-20 is valid for F-1 student visa application.`,

  UK_CAS_LETTER_VALID: `CONFIRMATION OF ACCEPTANCE FOR STUDIES (CAS)
CAS Number: CAS-2024-UK-123456
Student Name: Dilshod Toshmatov
Institution: University of Manchester
Course: Bachelor of Engineering
Course Start Date: September 23, 2024
Course End Date: June 30, 2027

Tuition Fee: £25,000 per year
Living Costs: £12,000 per year
Total: £37,000 per year

This CAS is valid for UK student visa (Tier 4) application.`,

  // ============================================================================
  // BAD DOCUMENTS (Wrong Type, Expired, etc.)
  // ============================================================================

  WRONG_DOCUMENT_TYPE_EMPLOYMENT_FOR_BANK_STATEMENT: `EMPLOYMENT LETTER
Company: XYZ Corporation
Date: June 1, 2024

This is an employment letter, not a bank statement.
This document was uploaded incorrectly.`,

  EXPIRED_PASSPORT: `INTERNATIONAL PASSPORT
Issued by: Ministry of Internal Affairs of Uzbekistan
Passport Number: AB1234567
Date of Issue: January 1, 2015
Date of Expiry: January 1, 2020

This passport has expired and is not valid for travel.`,
};

/**
 * Get a document fixture by key
 */
export function getDocFixture(key: keyof typeof DOC_FIXTURES): string {
  return DOC_FIXTURES[key];
}

/**
 * List all available fixture keys
 */
export function listDocFixtureKeys(): string[] {
  return Object.keys(DOC_FIXTURES) as Array<keyof typeof DOC_FIXTURES>;
}
