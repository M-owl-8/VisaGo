/**
 * Document Validation Service
 * Uses GPT-4o-mini to validate uploaded documents
 */

import { PrismaClient } from '@prisma/client';
import { AIOpenAIService } from './ai-openai.service';
import { getVisaKnowledgeBase } from '../data/visaKnowledgeBase';
import { getRelevantDocumentGuides } from '../data/documentGuides';
import { buildAIUserContext } from './ai-context.service';
import { logError, logInfo } from '../middleware/logger';

const prisma = new PrismaClient();

/**
 * AI Document Validation Result
 * Structured result from GPT-4o-mini validation
 */
export interface AIDocumentValidationResult {
  status: 'verified' | 'rejected' | 'needs_review';
  verifiedByAI: boolean;
  confidence?: number;
  notesUz: string;
  notesRu?: string;
  notesEn?: string;
}

/**
 * Validate an uploaded document using GPT-4o-mini
 *
 * @param params - Validation parameters
 * @returns AIDocumentValidationResult
 */
export async function validateDocumentWithAI(params: {
  document: {
    id?: string;
    documentType: string;
    documentName: string;
    fileName: string;
    fileUrl: string;
    uploadedAt?: Date;
    expiryDate?: Date | null;
  };
  checklistItem?: {
    name?: string;
    nameUz?: string;
    description?: string;
    descriptionUz?: string;
    required?: boolean;
  };
  application: {
    id: string;
    country: { name: string; code: string };
    visaType: { name: string };
  };
  countryName: string;
  visaTypeName: string; // tourist / student
}): Promise<AIDocumentValidationResult> {
  try {
    const { document, checklistItem, application, countryName, visaTypeName } = params;

    // Normalize visa type
    const normalizedVisaType =
      visaTypeName.toLowerCase().includes('student') || visaTypeName.toLowerCase().includes('study')
        ? 'student'
        : 'tourist';

    // Get visa knowledge base
    const visaKb = getVisaKnowledgeBase(countryName, normalizedVisaType);

    // Get relevant document guides
    const documentGuides = getRelevantDocumentGuides(document.documentType, 2);

    // Build user context (optional, non-blocking)
    let userContext: any = {};
    try {
      const app = await prisma.visaApplication.findUnique({
        where: { id: application.id },
        include: { user: true },
      });
      if (app) {
        userContext = await buildAIUserContext(app.userId, application.id);
      }
    } catch (error) {
      logError('Failed to build user context for document validation', error as Error, {
        applicationId: application.id,
      });
      // Continue without user context
    }

    // Build document-specific validation instructions
    let documentSpecificInstructions = '';
    switch (document.documentType.toLowerCase()) {
      case 'passport':
        documentSpecificInstructions = `
- Check if passport is valid (not expired, at least 6 months validity remaining)
- Verify passport has blank pages for visa stamp
- Check if passport is biometric/electronic (preferred for most countries)
- Verify passport number format matches country standards
- Check if passport photo matches applicant (if available in metadata)`;
        break;
      case 'bank_statement':
      case 'bank_statement':
        documentSpecificInstructions = `
- Check if statement covers last 3-6 months (country-specific requirement)
- Verify account holder name matches applicant or sponsor
- Check if balance is sufficient for visa requirements
- Verify statement is from a recognized bank
- Check if statement is in required currency (USD, EUR, etc.)`;
        break;
      case 'insurance':
      case 'travel_insurance':
        documentSpecificInstructions = `
- Check if insurance coverage meets minimum requirements (usually 30,000 EUR/USD)
- Verify insurance covers entire travel period
- Check if insurance is valid for destination country
- Verify insurance company is recognized/approved`;
        break;
      case 'diploma':
      case 'degree':
      case 'transcript':
        documentSpecificInstructions = `
- Check if document is from recognized educational institution
- Verify document authenticity indicators
- Check if document matches visa type requirements (student visa)
- Verify document is properly translated if required`;
        break;
      default:
        documentSpecificInstructions = `
- Verify document type matches visa requirements
- Check if document appears complete and authentic
- Verify document meets country-specific standards`;
    }

    const systemPrompt = `You are a professional visa officer and consultant for Ketdik visa application system. Your task is to evaluate uploaded documents to ensure they meet visa requirements.

CRITICAL REQUIREMENTS:
1. You MUST return ONLY a JSON object with this EXACT structure (no markdown, no explanations, no <think> blocks):
{
  "status": "verified" | "rejected" | "needs_review",
  "verifiedByAI": true/false,
  "confidence": 0.0-1.0,
  "notesUz": "Uzbek explanation for the user",
  "notesRu": "Russian explanation (optional)",
  "notesEn": "English explanation (optional)"
}

2. Status classification rules:
   - "verified": Document clearly meets all requirements, no issues found, high confidence (>= 0.7)
   - "rejected": Document has critical issues that make it unacceptable (expired, wrong type, incomplete)
   - "needs_review": Document may be acceptable but needs manual review (unclear, partial, or low confidence)

3. verifiedByAI should be true ONLY if status === "verified" AND confidence >= 0.7

4. Confidence scoring:
   - 0.9-1.0: Very high confidence (document clearly meets all requirements)
   - 0.7-0.89: High confidence (document likely acceptable, minor concerns)
   - 0.5-0.69: Medium confidence (document may be acceptable but needs review)
   - 0.0-0.49: Low confidence (document likely has issues)

5. Notes must be in Uzbek (notesUz is required). Russian and English are optional but recommended.

6. Be conservative for unknown document types - prefer "needs_review" with low confidence.

VISA KNOWLEDGE BASE FOR ${countryName} ${normalizedVisaType.toUpperCase()} VISA:
${visaKb || 'No specific knowledge base available for this country/visa type.'}

DOCUMENT GUIDES (How documents should be obtained in Uzbekistan):
${documentGuides || 'No specific guides available.'}

DOCUMENT-SPECIFIC VALIDATION INSTRUCTIONS:
${documentSpecificInstructions}

CHECKLIST ITEM CONTEXT:
${checklistItem ? JSON.stringify(checklistItem, null, 2) : 'No checklist item context available.'}

USER CONTEXT:
${JSON.stringify(userContext, null, 2)}`;

    const userPrompt = `Evaluate the following uploaded document:

Document Type: ${document.documentType}
Document Name: ${document.documentName}
File Name: ${document.fileName}
File URL: ${document.fileUrl}
Upload Date: ${document.uploadedAt ? document.uploadedAt.toISOString() : 'Unknown'}
Expiry Date: ${document.expiryDate ? document.expiryDate.toISOString() : 'Not specified'}

Application Context:
- Country: ${countryName} (${application.country.code})
- Visa Type: ${visaTypeName}

Based on the visa knowledge base, document guides, and document-specific requirements, classify this document and provide a structured validation result.

IMPORTANT: Return ONLY the JSON object, no additional text.`;

    if (!AIOpenAIService.isInitialized()) {
      logError(
        '[OPENAI_CONFIG_ERROR] OpenAI service not initialized for document validation',
        new Error('Service not initialized'),
        {
          documentType: document.documentType,
          applicationId: application.id,
        }
      );
      throw new Error('OpenAI service not initialized');
    }

    logInfo('[OpenAI][DocValidation] Validating document', {
      model: AIOpenAIService.MODEL,
      documentType: document.documentType,
      country: countryName,
      visaType: visaTypeName,
      applicationId: application.id,
    });

    const startTime = Date.now();
    const openaiClient = AIOpenAIService.getOpenAIClient();
    const response = await openaiClient.chat.completions.create({
      model: AIOpenAIService.MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const responseTime = Date.now() - startTime;
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    const content = response.choices[0]?.message?.content || '{}';

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      logError('[AI_DOC_VALIDATION_PARSE_ERROR] Failed to parse AI response', parseError as Error, {
        documentType: document.documentType,
        applicationId: application.id,
        rawContent: content.substring(0, 200),
      });

      return {
        status: 'needs_review',
        verifiedByAI: false,
        confidence: 0.0,
        notesUz: "AI bu hujjatni avtomatik baholay olmadi. Qo'lda tekshirish kerak.",
        notesRu: 'AI не смог автоматически оценить этот документ. Требуется ручная проверка.',
        notesEn: 'AI could not automatically evaluate this document. Manual review required.',
      };
    }

    // Validate and normalize the result
    const status = ['verified', 'rejected', 'needs_review'].includes(parsed.status)
      ? (parsed.status as 'verified' | 'rejected' | 'needs_review')
      : 'needs_review';

    const confidence =
      typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : status === 'verified'
          ? 0.7
          : status === 'rejected'
            ? 0.5
            : 0.5;

    const verifiedByAI = status === 'verified' && confidence >= 0.7;

    const result: AIDocumentValidationResult = {
      status,
      verifiedByAI,
      confidence,
      notesUz: parsed.notesUz || "Hujjat yuklangan. Qo'lda tekshirish kerak.",
      notesRu: parsed.notesRu || parsed.notesUz || 'Документ загружен. Требуется ручная проверка.',
      notesEn: parsed.notesEn || parsed.notesUz || 'Document uploaded. Manual review required.',
    };

    logInfo('[OpenAI][DocValidation] Validation result', {
      model: AIOpenAIService.MODEL,
      documentType: document.documentType,
      applicationId: application.id,
      status: result.status,
      verifiedByAI: result.verifiedByAI,
      confidence: result.confidence,
      tokensUsed: totalTokens,
      inputTokens,
      outputTokens,
      responseTimeMs: responseTime,
    });

    return result;
  } catch (error: any) {
    const errorType = error?.type || 'unknown';
    const statusCode = error?.status || error?.response?.status;
    const errorMessage = error?.message || String(error);

    logError(
      '[AI_DOC_VALIDATION_ERROR] Document validation with AI failed',
      error instanceof Error ? error : new Error(errorMessage),
      {
        documentType: params.document.documentType,
        applicationId: params.application.id,
        model: AIOpenAIService.MODEL,
        errorType,
        statusCode,
        errorMessage,
      }
    );

    // Return safe fallback
    return {
      status: 'needs_review',
      verifiedByAI: false,
      confidence: 0.0,
      notesUz: "AI bu hujjatni avtomatik baholay olmadi. Qo'lda tekshirish kerak.",
      notesRu: 'AI не смог автоматически оценить этот документ. Требуется ручная проверка.',
      notesEn: 'AI could not automatically evaluate this document. Manual review required.',
    };
  }
}
