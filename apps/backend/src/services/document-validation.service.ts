/**
 * Document Validation Service
 * Uses GPT-4o-mini to validate uploaded documents
 */
// Change summary (2025-01-XX): Unified GPT-4 document validation using DocumentValidationResultAI type and centralized prompts.

import { PrismaClient } from '@prisma/client';
import { AIOpenAIService } from './ai-openai.service';
import { buildAIUserContext } from './ai-context.service';
import { VisaRulesService } from './visa-rules.service';
import { VisaDocCheckerService } from './visa-doc-checker.service';
import { DocumentClassifierService } from './document-classifier.service';
import { logError, logInfo, logWarn } from '../middleware/logger';
import type { DocumentValidationResultAI } from '../types/ai-responses';
import {
  DOCUMENT_VALIDATION_SYSTEM_PROMPT,
  buildDocumentValidationUserPrompt,
} from '../config/ai-prompts';

const prisma = new PrismaClient();

/**
 * Validate an uploaded document using GPT-4o-mini
 *
 * @param params - Validation parameters
 * @returns DocumentValidationResultAI
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
    documentType?: string;
    name?: string;
    nameUz?: string;
    description?: string;
    descriptionUz?: string;
    whereToObtain?: string;
    required?: boolean;
  };
  application: {
    id: string;
    country: { name: string; code: string };
    visaType: { name: string };
  };
  countryName: string;
  visaTypeName: string; // tourist / student
}): Promise<DocumentValidationResultAI> {
  try {
    const { document, checklistItem, application, countryName, visaTypeName } = params;

    // Try to use new VisaDocCheckerService if VisaRuleSet is available
    try {
      const ruleSet = await VisaRulesService.getActiveRuleSet(
        application.country.code.toUpperCase(),
        visaTypeName.toLowerCase()
      );

      if (ruleSet) {
        // Find matching required document from rule set
        const matchingRule = ruleSet.requiredDocuments?.find(
          (reqDoc: any) =>
            reqDoc.documentType?.toLowerCase() === document.documentType.toLowerCase() ||
            reqDoc.name?.toLowerCase().includes(document.documentType.toLowerCase())
        );

        if (matchingRule) {
          logInfo('[DocValidation] Using VisaDocCheckerService', {
            documentType: document.documentType,
            applicationId: application.id,
          });

          // Try to extract OCR text if document ID is available
          let ocrText = '';
          if (document.id) {
            try {
              const docRecord = await prisma.userDocument.findUnique({
                where: { id: document.id },
              });
              if (docRecord) {
                const extractedText = await DocumentClassifierService.extractTextForDocument({
                  id: docRecord.id,
                  fileName: docRecord.fileName,
                  fileUrl: docRecord.fileUrl,
                  mimeType: undefined, // Could be added if available
                });
                if (extractedText) {
                  ocrText = extractedText;
                }
              }
            } catch (ocrError) {
              logWarn('[DocValidation] OCR extraction failed, continuing without text', {
                documentId: document.id,
                error: ocrError instanceof Error ? ocrError.message : String(ocrError),
              });
            }
          }

          // Build user context for conditional requirements
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
            // Continue without user context
          }

          // Use new checker service
          const checkResult = await VisaDocCheckerService.checkDocument(
            matchingRule,
            ocrText || document.documentName || '', // Fallback to document name if no OCR
            userContext,
            {
              fileType: document.fileName.split('.').pop()?.toLowerCase(),
              expiryDate: document.expiryDate?.toISOString(),
            }
          );

          // Convert VisaDocChecker result to DocumentValidationResultAI format
          const status =
            checkResult.status === 'APPROVED'
              ? 'verified'
              : checkResult.status === 'REJECTED'
                ? 'rejected'
                : 'needs_review';
          const confidence =
            checkResult.status === 'APPROVED'
              ? checkResult.embassy_risk_level === 'LOW'
                ? 0.9
                : checkResult.embassy_risk_level === 'MEDIUM'
                  ? 0.7
                  : 0.5
              : checkResult.status === 'NEED_FIX'
                ? checkResult.embassy_risk_level === 'HIGH'
                  ? 0.3
                  : 0.5
                : 0.2;

          const result: DocumentValidationResultAI = {
            status,
            confidence,
            verifiedByAI: status === 'verified' && confidence >= 0.7,
            problems: [], // VisaDocChecker doesn't provide structured problems
            suggestions: [], // VisaDocChecker doesn't provide structured suggestions
            notes: {
              uz: checkResult.short_reason || 'Hujjat tekshirildi.',
              ru: checkResult.short_reason || 'Документ проверен.',
              en: checkResult.short_reason || 'Document checked.',
            },
          };

          logInfo('[DocValidation] VisaDocChecker result', {
            documentType: document.documentType,
            applicationId: application.id,
            status: result.status,
            verifiedByAI: result.verifiedByAI,
          });

          return result;
        }
      }
    } catch (checkerError) {
      logWarn('[DocValidation] VisaDocChecker failed, falling back to unified GPT-4 validation', {
        documentType: document.documentType,
        applicationId: application.id,
        error: checkerError instanceof Error ? checkerError.message : String(checkerError),
      });
      // Fall through to unified GPT-4 validation
    }

    // Unified GPT-4 validation using centralized prompts
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

    // Load VisaRuleSet and ApplicantProfile for enhanced validation
    let visaRuleSetData: any = null;
    let applicantProfileData: any = null;

    try {
      // Load approved VisaRuleSet
      const ruleSet = await VisaRulesService.getActiveRuleSet(
        application.country.code.toUpperCase(),
        visaTypeName.toLowerCase()
      );
      if (ruleSet) {
        visaRuleSetData = ruleSet;
        logInfo('[OpenAI][DocValidation] Loaded VisaRuleSet for validation', {
          documentType: document.documentType,
          applicationId: application.id,
          countryCode: application.country.code,
          visaType: visaTypeName,
        });
      }
    } catch (ruleSetError) {
      logWarn('[OpenAI][DocValidation] Failed to load VisaRuleSet (non-blocking)', {
        documentType: document.documentType,
        applicationId: application.id,
        error: ruleSetError instanceof Error ? ruleSetError.message : String(ruleSetError),
      });
    }

    try {
      // Load ApplicantProfile from User.bio (questionnaire data is stored there)
      const app = await prisma.visaApplication.findUnique({
        where: { id: application.id },
        include: {
          user: {
            select: {
              id: true,
              bio: true,
            },
          },
        },
      });
      if (app && app.user?.bio) {
        const { buildApplicantProfileFromQuestionnaire } = await import('./ai-context.service');
        let questionnaireData: any = null;
        try {
          questionnaireData = JSON.parse(app.user.bio);
        } catch (e) {
          // If parsing fails, skip ApplicantProfile
          logWarn('[OpenAI][DocValidation] Failed to parse user bio as JSON (non-blocking)', {
            documentType: document.documentType,
            applicationId: application.id,
          });
        }
        if (questionnaireData) {
          applicantProfileData = buildApplicantProfileFromQuestionnaire(questionnaireData, {
            country: { code: application.country.code },
            visaType: { name: application.visaType.name },
          });
          logInfo('[OpenAI][DocValidation] Loaded ApplicantProfile for validation', {
            documentType: document.documentType,
            applicationId: application.id,
          });
        }
      }
    } catch (profileError) {
      logWarn('[OpenAI][DocValidation] Failed to load ApplicantProfile (non-blocking)', {
        documentType: document.documentType,
        applicationId: application.id,
        error: profileError instanceof Error ? profileError.message : String(profileError),
      });
    }

    logInfo('[OpenAI][DocValidation] Validating document with unified GPT-4', {
      model: AIOpenAIService.MODEL,
      documentType: document.documentType,
      country: countryName,
      visaType: visaTypeName,
      applicationId: application.id,
      hasRuleSet: !!visaRuleSetData,
      hasApplicantProfile: !!applicantProfileData,
    });

    const startTime = Date.now();
    const openaiClient = AIOpenAIService.getOpenAIClient();

    // Build user prompt using centralized function (now with VisaRuleSet and ApplicantProfile)
    const userPrompt = buildDocumentValidationUserPrompt({
      document: {
        documentType: document.documentType,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        uploadedAt: document.uploadedAt,
        expiryDate: document.expiryDate || undefined,
      },
      checklistItem: checklistItem
        ? {
            documentType: checklistItem.documentType || document.documentType,
            name: checklistItem.name,
            description: checklistItem.description,
            whereToObtain: checklistItem.whereToObtain,
          }
        : undefined,
      application: {
        country: countryName,
        visaType: visaTypeName,
      },
      visaRuleSet: visaRuleSetData || undefined,
      applicantProfile: applicantProfileData || undefined,
    });

    let validationResult: DocumentValidationResultAI;

    try {
      const response = await openaiClient.chat.completions.create({
        model: AIOpenAIService.MODEL,
        messages: [
          { role: 'system', content: DOCUMENT_VALIDATION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1500, // Increased to accommodate problems/suggestions arrays
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
        logError(
          '[AI_DOC_VALIDATION_PARSE_ERROR] Failed to parse AI response',
          parseError as Error,
          {
            documentType: document.documentType,
            applicationId: application.id,
            rawContent: content.substring(0, 200),
          }
        );

        // Return fallback result
        validationResult = {
          status: 'needs_review',
          confidence: 0.0,
          verifiedByAI: false,
          problems: [],
          suggestions: [],
          notes: {
            uz: "AI bu hujjatni avtomatik baholay olmadi. Qo'lda tekshirish kerak.",
            ru: 'AI не смог автоматически оценить этот документ. Требуется ручная проверка.',
            en: 'AI could not automatically evaluate this document. Manual review required.',
          },
        };
        return validationResult;
      }

      // Validate and normalize the result to match DocumentValidationResultAI
      const status = ['verified', 'rejected', 'needs_review', 'uncertain'].includes(parsed.status)
        ? (parsed.status as 'verified' | 'rejected' | 'needs_review' | 'uncertain')
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

      // Normalize problems array
      const problems = Array.isArray(parsed.problems)
        ? parsed.problems.map((p: any) => ({
            code: p.code || 'UNKNOWN_PROBLEM',
            message: p.message || 'Unknown problem',
            userMessage: p.userMessage,
          }))
        : [];

      // Normalize suggestions array
      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions.map((s: any) => ({
            code: s.code || 'UNKNOWN_SUGGESTION',
            message: s.message || 'Unknown suggestion',
          }))
        : [];

      // Normalize notes (ensure uz is present)
      const notes = {
        uz: parsed.notes?.uz || parsed.notesUz || "Hujjat yuklangan. Qo'lda tekshirish kerak.",
        ru: parsed.notes?.ru || parsed.notesRu,
        en: parsed.notes?.en || parsed.notesEn,
      };

      validationResult = {
        status,
        confidence,
        verifiedByAI,
        problems,
        suggestions,
        notes,
        rawJson: content, // Store raw JSON for debugging
      };

      logInfo('[OpenAI][DocValidation] Validation result', {
        model: AIOpenAIService.MODEL,
        documentType: document.documentType,
        applicationId: application.id,
        status: validationResult.status,
        verifiedByAI: validationResult.verifiedByAI,
        confidence: validationResult.confidence,
        problemsCount: validationResult.problems.length,
        suggestionsCount: validationResult.suggestions.length,
        tokensUsed: totalTokens,
        inputTokens,
        outputTokens,
        responseTimeMs: responseTime,
      });

      return validationResult;
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
      const fallbackResult: DocumentValidationResultAI = {
        status: 'needs_review',
        confidence: 0.0,
        verifiedByAI: false,
        problems: [],
        suggestions: [],
        notes: {
          uz: "AI bu hujjatni avtomatik baholay olmadi. Qo'lda tekshirish kerak.",
          ru: 'AI не смог автоматически оценить этот документ. Требуется ручная проверка.',
          en: 'AI could not automatically evaluate this document. Manual review required.',
        },
      };

      return fallbackResult;
    }
  } catch (outerError: any) {
    // This catch handles any errors from the outer try block (e.g., initialization errors)
    logError(
      '[AI_DOC_VALIDATION_ERROR] Unexpected error in document validation',
      outerError instanceof Error ? outerError : new Error(String(outerError)),
      {
        documentType: params.document.documentType,
        applicationId: params.application.id,
      }
    );

    // Return safe fallback
    const fallbackResult: DocumentValidationResultAI = {
      status: 'needs_review',
      confidence: 0.0,
      verifiedByAI: false,
      problems: [],
      suggestions: [],
      notes: {
        uz: "AI bu hujjatni avtomatik baholay olmadi. Qo'lda tekshirish kerak.",
        ru: 'AI не смог автоматически оценить этот документ. Требуется ручная проверка.',
        en: 'AI could not automatically evaluate this document. Manual review required.',
      },
    };

    return fallbackResult;
  }
}

/**
 * Save validation result to UserDocument
 *
 * @param documentId - UserDocument ID
 * @param validationResult - DocumentValidationResultAI from GPT-4
 * @returns Updated UserDocument
 */
export async function saveValidationResultToDocument(
  documentId: string,
  validationResult: DocumentValidationResultAI
): Promise<void> {
  try {
    // Map DocumentValidationResultAI status to UserDocument status
    let documentStatus: 'pending' | 'verified' | 'rejected' = 'pending';
    if (validationResult.status === 'verified') {
      documentStatus = 'verified';
    } else if (validationResult.status === 'rejected') {
      documentStatus = 'rejected';
    } else {
      documentStatus = 'pending'; // needs_review or uncertain -> pending
    }

    await prisma.userDocument.update({
      where: { id: documentId },
      data: {
        status: documentStatus,
        verifiedByAI: validationResult.verifiedByAI,
        aiConfidence: validationResult.confidence,
        aiNotesUz: validationResult.notes.uz,
        aiNotesRu: validationResult.notes.ru || null,
        aiNotesEn: validationResult.notes.en || null,
        verificationNotes:
          validationResult.problems.length > 0
            ? validationResult.problems.map((p) => p.message).join('; ')
            : null,
      },
    });

    logInfo('[DocValidation] Saved validation result to UserDocument', {
      documentId,
      status: documentStatus,
      verifiedByAI: validationResult.verifiedByAI,
      confidence: validationResult.confidence,
    });
  } catch (error) {
    logError(
      '[DocValidation] Failed to save validation result',
      error instanceof Error ? error : new Error(String(error)),
      { documentId }
    );
    throw error;
  }
}
