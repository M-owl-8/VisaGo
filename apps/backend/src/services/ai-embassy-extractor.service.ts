/**
 * AI Embassy Extractor Service
 * Uses GPT-4 to extract structured visa rules from embassy page content
 */

import { AIOpenAIService } from './ai-openai.service';
import { VisaRuleSetData } from './visa-rules.service';
import { logInfo, logError, logWarn } from '../middleware/logger';
import { getAIConfig } from '../config/ai-models';
import { z } from 'zod';

/**
 * Tolerant helper types for nullable fields
 * These accept null and coerce to safe defaults
 */
const nullableString = z.union([z.string(), z.null()]).transform((v) => v ?? '');
const nullableNumber = z.union([z.number(), z.null()]).transform((v) => v ?? 0);
const nullableBool = z.union([z.boolean(), z.null()]).transform((v) => v ?? false);

/**
 * Required Document Schema
 * Version 2+ supports condition field for conditional logic
 */
const RequiredDocumentSchema = z.object({
  documentType: z.string(), // Still required - core identifier
  category: z.enum(['required', 'highly_recommended', 'optional']).optional().default('required'),
  description: nullableString.optional(),
  validityRequirements: nullableString.optional(),
  formatRequirements: nullableString.optional(),
  // Condition field (version 2+) - optional for backward compatibility
  condition: z.string().optional(),
});

/**
 * Financial Requirements Schema
 */
const FinancialRequirementsSchema = z.object({
  minimumBalance: nullableNumber.optional(),
  currency: nullableString.optional(),
  bankStatementMonths: nullableNumber.optional(),
  sponsorRequirements: z
    .object({
      allowed: nullableBool.optional(),
      requiredDocuments: z.array(z.string()).optional().default([]),
    })
    .optional(),
});

/**
 * Processing Info Schema
 */
const ProcessingInfoSchema = z.object({
  processingDays: nullableNumber.optional(),
  appointmentRequired: nullableBool.optional(),
  interviewRequired: nullableBool.optional(),
  biometricsRequired: nullableBool.optional(),
});

/**
 * Fees Schema
 */
const FeesSchema = z.object({
  visaFee: nullableNumber.optional(),
  serviceFee: nullableNumber.optional(),
  currency: nullableString.optional(),
  paymentMethods: z.array(z.string()).optional().default([]),
});

/**
 * Additional Requirements Schema
 */
const AdditionalRequirementsSchema = z.object({
  travelInsurance: z
    .object({
      required: nullableBool.optional(),
      minimumCoverage: nullableNumber.optional(),
      currency: nullableString.optional(),
    })
    .optional(),
  accommodationProof: z
    .object({
      required: nullableBool.optional(),
      types: z.array(z.string()).optional().default([]),
    })
    .optional(),
  returnTicket: z
    .object({
      required: nullableBool.optional(),
      refundable: nullableBool.optional(),
    })
    .optional(),
});

/**
 * JSON Schema for VisaRuleSetData (using Zod)
 * Tolerant to null/missing fields - coerces nulls to safe defaults
 */
const VisaRuleSetDataSchema = z
  .object({
    // Version field for feature flags (default: 1 for backward compatibility)
    version: z.number().int().min(1).optional(),
    requiredDocuments: z
      .union([z.array(RequiredDocumentSchema), z.null(), z.undefined()])
      .transform((v) => v ?? [])
      .optional()
      .default([]),
    financialRequirements: z
      .union([FinancialRequirementsSchema, z.null(), z.undefined()])
      .transform((v) => v ?? undefined)
      .optional(),
    processingInfo: z
      .union([ProcessingInfoSchema, z.null(), z.undefined()])
      .transform((v) => v ?? undefined)
      .optional(),
    fees: z
      .union([FeesSchema, z.null(), z.undefined()])
      .transform((v) => v ?? undefined)
      .optional(),
    additionalRequirements: z
      .union([AdditionalRequirementsSchema, z.null(), z.undefined()])
      .transform((v) => v ?? undefined)
      .optional(),
    sourceInfo: z
      .object({
        extractedFrom: z.string().optional(),
        extractedAt: z.string().optional(),
        confidence: z.number().min(0).max(1).optional(),
      })
      .optional(),
  })
  .passthrough(); // Allow unknown extra keys

/**
 * AI Embassy Extractor Service
 */
export class AIEmbassyExtractorService {
  /**
   * Extract visa rules from embassy page content using GPT-4
   */
  static async extractVisaRulesFromPage(params: {
    countryCode: string;
    visaType: string;
    sourceUrl: string;
    pageText: string;
    pageTitle?: string;
    previousRules?: VisaRuleSetData;
  }): Promise<{
    ruleSet: VisaRuleSetData;
    metadata: {
      tokensUsed: number;
      confidence: number;
      extractionTime: number;
      model: string;
    };
  }> {
    const startTime = Date.now();

    try {
      const { countryCode, visaType, sourceUrl, pageText, pageTitle, previousRules } = params;

      // Phase 4: Enhanced logging
      logInfo('[AIEmbassyExtractor] Starting extraction', {
        countryCode,
        visaType,
        sourceUrl,
        pageTextLength: pageText.length,
        hasPreviousRules: !!previousRules,
        pageTitle: pageTitle || 'N/A',
      });

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(countryCode, visaType, previousRules);

      // Build user prompt
      const userPrompt = this.buildUserPrompt(
        countryCode,
        visaType,
        sourceUrl,
        pageText,
        pageTitle
      );

      // Call GPT-4 with structured output using centralized config
      const aiConfig = getAIConfig('rulesExtraction');

      logInfo('[AIEmbassyExtractor] Calling GPT-4 for rules extraction', {
        task: 'rulesExtraction',
        model: aiConfig.model,
        countryCode,
        visaType,
        sourceUrl,
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
      });

      const response = await AIOpenAIService.getOpenAIClient().chat.completions.create({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
        response_format: aiConfig.responseFormat || undefined,
      });

      const rawContent = response.choices[0]?.message?.content || '{}';
      const tokensUsed = response.usage?.total_tokens || 0;
      const extractionTime = Date.now() - startTime;

      logInfo('[AIEmbassyExtractor] GPT-4 response received', {
        task: 'rulesExtraction',
        model: aiConfig.model,
        countryCode,
        visaType,
        sourceUrl,
        tokensUsed,
        extractionTime,
        responseLength: rawContent.length,
      });

      // Parse JSON
      let parsed: any;
      try {
        parsed = JSON.parse(rawContent);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/i);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          // Try to find JSON object boundaries
          const objectMatch = rawContent.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            parsed = JSON.parse(objectMatch[0]);
          } else {
            throw new Error('No valid JSON found in response');
          }
        }
      }

      // Validate against schema
      const validationResult = VisaRuleSetDataSchema.safeParse(parsed);

      if (!validationResult.success) {
        // Phase 4: Enhanced error logging
        logError(
          '[AIEmbassyExtractor] Schema validation failed',
          new Error('Invalid rule set structure'),
          {
            countryCode,
            visaType,
            sourceUrl,
            errors: validationResult.error.errors,
            parsedKeys: Object.keys(parsed),
            truncatedTextLength: Math.min(500, pageText.length), // For debugging
          }
        );

        // Try to fix common issues
        const fixed = this.fixCommonIssues(parsed);
        const fixedValidation = VisaRuleSetDataSchema.safeParse(fixed);

        if (!fixedValidation.success) {
          // Phase 4: Enhanced error message
          const errorDetails = validationResult.error.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join('; ');
          throw new Error(`Schema validation failed after fix attempts: ${errorDetails}`);
        }

        parsed = fixedValidation.data;
      } else {
        parsed = validationResult.data;
      }

      // Phase 4: Enhanced confidence calculation and source info
      let confidence = this.calculateConfidence(parsed, pageText);

      // Phase 4: Check if page has explicit documents section
      const hasExplicitDocumentsSection = this.hasExplicitDocumentsSection(pageText);

      // Phase 4: If page has documents section but no documents extracted, this is a problem
      if (
        hasExplicitDocumentsSection &&
        (!parsed.requiredDocuments || parsed.requiredDocuments.length === 0)
      ) {
        logWarn('[AIEmbassyExtractor] Page has documents section but no documents extracted', {
          countryCode,
          visaType,
          sourceUrl,
          confidence,
        });
        // Reduce confidence
        confidence = Math.max(0.0, confidence - 0.2);
      }

      // Add source info (confidence may have been adjusted above)
      parsed.sourceInfo = {
        extractedFrom: sourceUrl,
        extractedAt: new Date().toISOString(),
        confidence, // Use potentially adjusted confidence
        // Phase 4: Add metadata about extraction quality
        hasExplicitDocumentsSection,
      };

      const ruleSet = parsed as VisaRuleSetData;

      logInfo('[AIEmbassyExtractor] Extraction successful', {
        task: 'rulesExtraction',
        model: aiConfig.model,
        countryCode,
        visaType,
        documentsCount: ruleSet.requiredDocuments?.length || 0,
        confidence: ruleSet.sourceInfo?.confidence,
        tokensUsed,
        extractionTime,
      });

      return {
        ruleSet,
        metadata: {
          tokensUsed,
          confidence: ruleSet.sourceInfo?.confidence || 0.7,
          extractionTime,
          model: aiConfig.model,
        },
      };
    } catch (error) {
      logError('[AIEmbassyExtractor] Extraction failed', error as Error, params);
      throw error;
    }
  }

  /**
   * Build system prompt for GPT-4 (EXPERT EXTRACTION ENGINE VERSION - Phase 6)
   *
   * Phase 6 Upgrade:
   * - Expert visa rules extraction engine role specialized for 10 countries × 2 visa types
   * - Explicit extraction rules with confidence scoring
   * - No hallucination policy - extract only what's explicitly stated
   * - Standard documentType slugs and categorization
   */
  private static buildSystemPrompt(
    countryCode: string,
    visaType: string,
    previousRules?: VisaRuleSetData
  ): string {
    return `You are an EXPERT VISA RULES EXTRACTION ENGINE with 10+ years experience extracting visa requirements from official embassy websites for US, UK, Schengen (Germany/Spain), Canada, Australia, Japan, Korea, UAE, especially for applications from Uzbekistan.

================================================================================
YOUR ROLE
================================================================================

Your task is to extract structured visa requirements from official embassy/consulate web pages with high accuracy and confidence.

================================================================================
INPUTS YOU WILL RECEIVE
================================================================================

- URL (sourceUrl): The embassy/consulate page URL
- pageTitle: Title of the page (if available)
- pageText: Truncated HTML/text content from the page
- countryCode: ISO country code (US, UK, DE, ES, CA, AU, JP, KR, AE, etc.)
- visaType: 'tourist' or 'student'

================================================================================
EXTRACTION RULES
================================================================================

1. EXTRACT ONLY EXPLICITLY STATED INFORMATION:
   - Extract ONLY information that is explicitly stated on the page
   - Do NOT infer, assume, or guess requirements
   - If information is not available, use null or omit the field (do NOT make up values)
   - If information is contradictory, pick the most recent/explicit version and reduce confidence

2. USE STANDARD DOCUMENT TYPE SLUGS:
   Use these standard documentType slugs where possible:
   - Core: passport, passport_photos, passport_biometric
   - Financial: bank_statements_applicant, sponsor_bank_statements, financial_guarantee, proof_of_funds
   - Employment: employment_letter, employment_contract, salary_certificate
   - Property: property_documents, property_ownership, kadastr_document
   - Family: family_ties_documents, marriage_certificate, birth_certificate
   - Travel: travel_insurance, travel_itinerary, accommodation_proof, flight_reservation, return_ticket
   - Invitation: invitation_letter, sponsor_letter, host_letter
   - Student-specific: i20_form, ds2019_form, cas_letter, loa_letter, gic_proof, sevis_fee_receipt, tuition_payment_receipt, coe_letter, dli_letter
   - Medical: tb_test_certificate, medical_exam, health_insurance
   - Other: visa_application_form, biometric_data, police_clearance

3. CATEGORIZE DOCUMENTS CORRECTLY:
   - "required": Mandatory documents that must be submitted (explicitly stated as required)
   - "highly_recommended": Documents that significantly improve approval chances (stated as recommended/strongly advised)
   - "optional": Supporting documents that may help but are not required (stated as optional/may be helpful)

4. EXTRACT CONDITIONS WHEN DOCUMENTS ARE CONDITIONAL:
   - Extract condition field when documents are conditional:
     * e.g., "if sponsorType !== 'self'", "if sponsored", "if minor", "if staying with family", "if student"
   - Examples:
     * "sponsor_bank_statements" → condition: "if sponsored or sponsorType !== 'self'"
     * "parental_consent" → condition: "if minor or age < 18"
     * "accommodation_proof" → condition: "if staying with family or host"

5. EXTRACT FINANCIAL REQUIREMENTS:
   - minimumBalance: Extract if given (convert to USD if needed)
   - currency: Extract currency code (USD, EUR, GBP, CAD, AUD, JPY, KRW, AED)
   - bankStatementMonths: Extract how many months of statements required (e.g., 3, 6, 12)
   - sponsorRequirements: Extract if described:
     * allowed: boolean (is sponsorship allowed?)
     * requiredDocuments: array of sponsor document types

6. EXTRACT PROCESSING INFO:
   - typical processing time: Extract as processingDays (number)
   - interview required?: Extract as interviewRequired (yes/no/unknown)
   - biometrics required?: Extract as biometricsRequired (yes/no/unknown)
   - appointment required?: Extract as appointmentRequired (yes/no/unknown)

7. EXTRACT FEES:
   - application fee: Extract as visaFee (amount, currency)
   - any extra fees mentioned: Extract as serviceFee or additional fees (SEVIS, GIC, etc.)
   - payment methods: Extract if mentioned (cash, card, bank_transfer, online)

8. EXTRACT ADDITIONAL REQUIREMENTS:
   - insurance minimums: Extract travelInsurance.minimumCoverage (e.g., €30,000 for Schengen)
   - COE/CAS/I-20 references: Extract if mentioned
   - TB test, medical exam: Extract if required
   - language requirements: Extract if mentioned
   - accommodation proof: Extract types (hotel_booking, invitation_letter, etc.)
   - return ticket: Extract if required, refundable status

================================================================================
CONFIDENCE & COMPLETENESS
================================================================================

You MUST set sourceInfo.confidence between 0.0-1.0 based on:

- How clear and structured the page is:
  * Well-structured, official embassy page with clear sections → 0.8-1.0
  * Unclear or mixed content → 0.5-0.7
  * Poor quality or incomplete → 0.3-0.5

- How many required sections were found:
  * All sections found (docs, financial, processing, fees) → +0.2
  * Most sections found → +0.1
  * Few sections found → +0.0

- Information quality:
  * Clear, explicit requirements → +0.1
  * Vague or ambiguous → -0.1
  * Contradictory information → -0.2

- If something is clearly missing (e.g., fees not on page):
  * Leave that section null/empty
  * DO NOT invent values
  * Reduce confidence accordingly

- If information is contradictory:
  * Pick the most recent/explicit version
  * Reduce confidence by 0.1-0.2
  * Note in description if needed

================================================================================
OUTPUT REQUIREMENTS
================================================================================

You MUST return ONLY valid JSON matching the VisaRuleSetData schema exactly:

{
  "requiredDocuments": [
    {
      "documentType": "string (standard slug)",
      "category": "required" | "highly_recommended" | "optional",
      "description": "string (what the document is and why it's needed)",
      "validityRequirements": "string (e.g., '6 months validity remaining')",
      "formatRequirements": "string (e.g., 'Original + 2 copies')",
      "condition": "string (optional, e.g., 'if sponsored')"
    }
  ],
  "financialRequirements": {
    "minimumBalance": number (in specified currency, null if not stated),
    "currency": "string (e.g., 'USD', 'EUR')",
    "bankStatementMonths": number (how many months, null if not stated),
    "sponsorRequirements": {
      "allowed": boolean (null if not stated),
      "requiredDocuments": ["string"] (list of sponsor document types)
    }
  },
  "processingInfo": {
    "processingDays": number (null if not stated),
    "appointmentRequired": boolean (null if not stated),
    "interviewRequired": boolean (null if not stated),
    "biometricsRequired": boolean (null if not stated)
  },
  "fees": {
    "visaFee": number (null if not stated),
    "serviceFee": number (null if not stated),
    "currency": "string",
    "paymentMethods": ["string"]
  },
  "additionalRequirements": {
    "travelInsurance": {
      "required": boolean (null if not stated),
      "minimumCoverage": number (null if not stated),
      "currency": "string"
    },
    "accommodationProof": {
      "required": boolean (null if not stated),
      "types": ["string"]
    },
    "returnTicket": {
      "required": boolean (null if not stated),
      "refundable": boolean (null if not stated)
    }
  },
  "sourceInfo": {
    "extractedFrom": "string (URL)",
    "extractedAt": "string (ISO timestamp)",
    "confidence": number (0.0-1.0, REQUIRED)
  }
}

CRITICAL OUTPUT RULES:
- sourceInfo.extractedFrom = URL (from input)
- sourceInfo.extractedAt = ISO timestamp string (use current timestamp)
- sourceInfo.confidence MUST be present (0.0-1.0)
- No markdown, no prose outside JSON
- Return ONLY valid JSON, no code blocks, no explanations

OUTPUT SCHEMA (JSON):
{
  "requiredDocuments": [
    {
      "documentType": "string (slug, e.g., 'passport', 'bank_statement')",
      "category": "required" | "highly_recommended" | "optional",
      "description": "string (what the document is and why it's needed)",
      "validityRequirements": "string (e.g., '6 months validity remaining')",
      "formatRequirements": "string (e.g., 'Original + 2 copies')"
    }
  ],
  "financialRequirements": {
    "minimumBalance": number (in specified currency),
    "currency": "string (e.g., 'USD', 'EUR')",
    "bankStatementMonths": number (how many months of statements required),
    "sponsorRequirements": {
      "allowed": boolean,
      "requiredDocuments": ["string"] (list of sponsor document types)
    }
  },
  "processingInfo": {
    "processingDays": number (average processing time),
    "appointmentRequired": boolean,
    "interviewRequired": boolean,
    "biometricsRequired": boolean
  },
  "fees": {
    "visaFee": number,
    "serviceFee": number,
    "currency": "string",
    "paymentMethods": ["string"] (e.g., ["cash", "card", "bank_transfer"])
  },
  "additionalRequirements": {
    "travelInsurance": {
      "required": boolean,
      "minimumCoverage": number,
      "currency": "string"
    },
    "accommodationProof": {
      "required": boolean,
      "types": ["string"] (e.g., ["hotel_booking", "invitation_letter"])
    },
    "returnTicket": {
      "required": boolean,
      "refundable": boolean
    }
  }
}

${previousRules ? `\nPREVIOUS RULES (for reference - extract NEW rules from the page, not from here):\n${JSON.stringify(previousRules, null, 2)}` : ''}

Country: ${countryCode}
Visa Type: ${visaType}

Return ONLY the JSON object, no markdown, no code blocks, no explanations.`;
  }

  /**
   * Build user prompt with page content (EXPERT EXTRACTION VERSION - Phase 6)
   *
   * Phase 6 Upgrade:
   * - Explicit extraction checklist
   * - Clear instructions on what to extract
   * - Emphasis on no hallucination
   */
  private static buildUserPrompt(
    countryCode: string,
    visaType: string,
    sourceUrl: string,
    pageText: string,
    pageTitle?: string
  ): string {
    return `Extract visa rules for this specific country + visaType only.

================================================================================
EXTRACTION TARGET
================================================================================

- Country Code: ${countryCode}
- Visa Type: ${visaType}
- Source URL: ${sourceUrl}
${pageTitle ? `- Page Title: ${pageTitle}` : ''}

================================================================================
PAGE CONTENT
================================================================================

${pageText.substring(0, 40000)}${pageText.length > 40000 ? '\n\n[Content truncated for length]' : ''}

================================================================================
EXTRACTION CHECKLIST
================================================================================

Make sure to:

1. List all required documents:
   - Extract document types using standard slugs (passport, bank_statements_applicant, i20_form, etc.)
   - Categorize correctly (required/highly_recommended/optional)
   - Extract conditions if documents are conditional (e.g., "if sponsored", "if minor")

2. Extract any financial thresholds (if present):
   - Minimum balance requirements
   - Currency
   - Bank statement months (e.g., 3, 6, 12 months)
   - Sponsor requirements (if allowed, what documents needed)

3. Extract statement month requirements:
   - How many months of bank statements are required?
   - Any specific period (e.g., "last 3 months", "last 6 months")?

4. Mention insurance requirements (if present):
   - Is travel insurance required?
   - Minimum coverage amount and currency (e.g., €30,000 for Schengen)
   - Any specific insurance providers mentioned?

5. Mention interviews/biometrics (if present):
   - Is interview required? (yes/no/unknown)
   - Is biometrics required? (yes/no/unknown)
   - Is appointment required? (yes/no/unknown)
   - Typical processing time in days

6. Extract fees (if present):
   - Application fee amount and currency
   - Service fees
   - Payment methods

7. Extract additional requirements:
   - Accommodation proof (hotel booking, invitation, etc.)
   - Return ticket requirements
   - Medical exams, TB tests
   - Language requirements
   - Student-specific (I-20, CAS, LOA, GIC, SEVIS, COE, DLI, etc.)

8. Keep all unexplained/unknown fields as null:
   - Do NOT invent values
   - Do NOT infer requirements not explicitly stated
   - If not found, set to null or omit the field

================================================================================

Extract all visa requirements and return them in the exact JSON schema format specified in the system prompt.

Return ONLY valid JSON matching the VisaRuleSetData schema, no markdown, no explanations, no code blocks.`;
  }

  /**
   * Fix common issues in GPT-4 responses
   */
  private static fixCommonIssues(parsed: any): any {
    const fixed = { ...parsed };

    // Ensure requiredDocuments is an array
    if (!Array.isArray(fixed.requiredDocuments)) {
      fixed.requiredDocuments = [];
    }

    // Ensure all documents have required fields
    fixed.requiredDocuments = fixed.requiredDocuments.map((doc: any) => ({
      documentType: doc.documentType || doc.document || 'unknown',
      category: doc.category || 'optional',
      description: doc.description || '',
      validityRequirements: doc.validityRequirements || undefined,
      formatRequirements: doc.formatRequirements || undefined,
    }));

    // Ensure category is valid enum
    fixed.requiredDocuments = fixed.requiredDocuments.map((doc: any) => ({
      ...doc,
      category: ['required', 'highly_recommended', 'optional'].includes(doc.category)
        ? doc.category
        : 'optional',
    }));

    return fixed;
  }

  /**
   * Calculate confidence score based on extracted data quality (Phase 4: Enhanced)
   */
  private static calculateConfidence(ruleSet: VisaRuleSetData, pageText: string): number {
    let confidence = 0.5; // Base confidence

    // Phase 4: Check if page has explicit documents section
    const hasExplicitDocumentsSection = this.hasExplicitDocumentsSection(pageText);

    // Increase confidence if we have required documents
    if (ruleSet.requiredDocuments && ruleSet.requiredDocuments.length > 0) {
      confidence += 0.2;
      // Phase 4: Extra boost if documents section was found
      if (hasExplicitDocumentsSection) {
        confidence += 0.1;
      }
    } else if (hasExplicitDocumentsSection) {
      // Phase 4: Reduce confidence if documents section exists but no documents extracted
      confidence -= 0.2;
    }

    // Increase confidence if we have financial requirements
    if (ruleSet.financialRequirements) {
      confidence += 0.1;
    }

    // Increase confidence if we have processing info
    if (ruleSet.processingInfo) {
      confidence += 0.1;
    }

    // Phase 4: Increase confidence if we have fees
    if (ruleSet.fees) {
      confidence += 0.05;
    }

    // Increase confidence if page text is substantial
    if (pageText.length > 1000) {
      confidence += 0.1;
    }

    // Phase 4: Check for visa-related keywords in page text
    const visaKeywords = [
      'required documents',
      'visa application',
      'financial requirements',
      'supporting documents',
    ];
    const keywordMatches = visaKeywords.filter((keyword) =>
      pageText.toLowerCase().includes(keyword)
    );
    if (keywordMatches.length >= 2) {
      confidence += 0.05;
    }

    return Math.max(0.0, Math.min(confidence, 1.0));
  }

  /**
   * Phase 4: Check if page has explicit documents section
   */
  private static hasExplicitDocumentsSection(pageText: string): boolean {
    const documentSectionKeywords = [
      'required documents',
      'documents to submit',
      'supporting documents',
      'application documents',
      'checklist',
      'document checklist',
    ];

    const textLower = pageText.toLowerCase();
    return documentSectionKeywords.some((keyword) => textLower.includes(keyword));
  }
}
