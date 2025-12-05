/**
 * AI Embassy Extractor Service
 * Uses GPT-4 to extract structured visa rules from embassy page content
 */

import { AIOpenAIService } from './ai-openai.service';
import { VisaRuleSetData } from './visa-rules.service';
import { logInfo, logError, logWarn } from '../middleware/logger';
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
 */
const RequiredDocumentSchema = z.object({
  documentType: z.string(), // Still required - core identifier
  category: z.enum(['required', 'highly_recommended', 'optional']).optional().default('required'),
  description: nullableString.optional(),
  validityRequirements: nullableString.optional(),
  formatRequirements: nullableString.optional(),
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
    requiredDocuments: z.array(RequiredDocumentSchema).optional().default([]),
    financialRequirements: FinancialRequirementsSchema.optional(),
    processingInfo: ProcessingInfoSchema.optional(),
    fees: FeesSchema.optional(),
    additionalRequirements: AdditionalRequirementsSchema.optional(),
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

      logInfo('[AIEmbassyExtractor] Starting extraction', {
        countryCode,
        visaType,
        sourceUrl,
        pageTextLength: pageText.length,
        hasPreviousRules: !!previousRules,
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

      // Call GPT-4 with structured output
      const response = await AIOpenAIService.getOpenAIClient().chat.completions.create({
        model: AIOpenAIService.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent extraction
        max_tokens: 3000, // Allow for detailed rule sets
        response_format: { type: 'json_object' }, // Force JSON output
      });

      const rawContent = response.choices[0]?.message?.content || '{}';
      const tokensUsed = response.usage?.total_tokens || 0;
      const extractionTime = Date.now() - startTime;

      logInfo('[AIEmbassyExtractor] GPT-4 response received', {
        countryCode,
        visaType,
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
        logError(
          '[AIEmbassyExtractor] Schema validation failed',
          new Error('Invalid rule set structure'),
          {
            countryCode,
            visaType,
            errors: validationResult.error.errors,
            parsedKeys: Object.keys(parsed),
          }
        );

        // Try to fix common issues
        const fixed = this.fixCommonIssues(parsed);
        const fixedValidation = VisaRuleSetDataSchema.safeParse(fixed);

        if (!fixedValidation.success) {
          throw new Error(
            `Schema validation failed: ${validationResult.error.errors.map((e) => e.message).join(', ')}`
          );
        }

        parsed = fixedValidation.data;
      } else {
        parsed = validationResult.data;
      }

      // Add source info
      parsed.sourceInfo = {
        extractedFrom: sourceUrl,
        extractedAt: new Date().toISOString(),
        confidence: this.calculateConfidence(parsed, pageText),
      };

      const ruleSet = parsed as VisaRuleSetData;

      logInfo('[AIEmbassyExtractor] Extraction successful', {
        countryCode,
        visaType,
        documentsCount: ruleSet.requiredDocuments?.length || 0,
        confidence: ruleSet.sourceInfo?.confidence,
      });

      return {
        ruleSet,
        metadata: {
          tokensUsed,
          confidence: ruleSet.sourceInfo?.confidence || 0.7,
          extractionTime,
          model: AIOpenAIService.MODEL,
        },
      };
    } catch (error) {
      logError('[AIEmbassyExtractor] Extraction failed', error as Error, params);
      throw error;
    }
  }

  /**
   * Build system prompt for GPT-4
   */
  private static buildSystemPrompt(
    countryCode: string,
    visaType: string,
    previousRules?: VisaRuleSetData
  ): string {
    return `You are an expert visa rules extraction engine for VisaBuddy. Your task is to extract structured visa requirements from official embassy/consulate web pages.

CRITICAL REQUIREMENTS:
1. You MUST return ONLY valid JSON matching the exact schema below (no markdown, no explanations, no extra text).
2. Extract ONLY information that is explicitly stated on the page. Do NOT infer or assume requirements.
3. If information is not available, use null or omit the field (do NOT make up values).
4. Be precise with document types - use standard slugs like "passport", "bank_statement", "i20_form", "loa_letter", etc.
5. Categorize documents correctly:
   - "required": Mandatory documents that must be submitted
   - "highly_recommended": Documents that significantly improve approval chances
   - "optional": Supporting documents that may help but are not required

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
   * Build user prompt with page content
   */
  private static buildUserPrompt(
    countryCode: string,
    visaType: string,
    sourceUrl: string,
    pageText: string,
    pageTitle?: string
  ): string {
    return `Extract visa requirements from the following official embassy/consulate page:

URL: ${sourceUrl}
${pageTitle ? `Title: ${pageTitle}` : ''}

Page Content:
${pageText.substring(0, 40000)}${pageText.length > 40000 ? '\n\n[Content truncated for length]' : ''}

Extract all visa requirements and return them in the exact JSON schema format specified. Focus on:
- Required documents
- Financial requirements
- Processing times and procedures
- Fees
- Additional requirements (insurance, accommodation, tickets, etc.)

Return ONLY valid JSON, no markdown, no explanations.`;
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
   * Calculate confidence score based on extracted data quality
   */
  private static calculateConfidence(ruleSet: VisaRuleSetData, pageText: string): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence if we have required documents
    if (ruleSet.requiredDocuments && ruleSet.requiredDocuments.length > 0) {
      confidence += 0.2;
    }

    // Increase confidence if we have financial requirements
    if (ruleSet.financialRequirements) {
      confidence += 0.1;
    }

    // Increase confidence if we have processing info
    if (ruleSet.processingInfo) {
      confidence += 0.1;
    }

    // Increase confidence if page text is substantial
    if (pageText.length > 1000) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }
}
