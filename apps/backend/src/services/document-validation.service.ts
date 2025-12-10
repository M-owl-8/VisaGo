/**
 * Document Validation Service
 * Uses GPT-4o-mini to validate uploaded documents
 */
// Change summary (2025-01-XX): Unified GPT-4 document validation using DocumentValidationResultAI type and centralized prompts.

import { PrismaClient } from '@prisma/client';
import { AIOpenAIService } from './ai-openai.service';
import { getAIConfig } from '../config/ai-models';
import { buildAIUserContext, buildCanonicalAIUserContext } from './ai-context.service';
import { VisaRulesService } from './visa-rules.service';
import { VisaDocCheckerService } from './visa-doc-checker.service';
import { DocumentClassifierService } from './document-classifier.service';
import { getCountryVisaPlaybook, type VisaCategory } from '../config/country-visa-playbooks';
import {
  normalizeCountryCode,
  getCountryNameFromCode,
  buildCanonicalCountryContext,
  assertCountryConsistency,
} from '../config/country-registry';
import { logError, logInfo, logWarn } from '../middleware/logger';
import type { DocumentValidationResultAI, ValidationProblemAI } from '../types/ai-responses';
import {
  DOCUMENT_VALIDATION_SYSTEM_PROMPT,
  buildDocumentValidationUserPrompt,
} from '../config/ai-prompts';
import { toCanonicalDocumentType, logUnknownDocumentType } from '../config/document-types-map';

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

    // Normalize document type
    const norm = toCanonicalDocumentType(document.documentType);
    if (!norm.canonicalType) {
      logUnknownDocumentType(document.documentType, {
        source: 'doc-validation',
        documentId: document.id,
        applicationId: application.id,
      });
    }
    const effectiveDocumentType = norm.canonicalType ?? document.documentType;

    // Phase 8: Normalize country code using CountryRegistry
    const normalizedCountryCode =
      normalizeCountryCode(application.country.code) || application.country.code.toUpperCase();
    const countryContext = buildCanonicalCountryContext(normalizedCountryCode);
    const canonicalCountryName = countryContext?.countryName || countryName;

    // Assert consistency
    const consistency = assertCountryConsistency(normalizedCountryCode, application.country.code);
    if (!consistency.consistent) {
      logWarn('[DocumentValidation] Country consistency check failed', {
        mismatches: consistency.mismatches,
        normalizedCountryCode,
        originalCountryCode: application.country.code,
      });
    }

    // Try to use new VisaDocCheckerService if VisaRuleSet is available
    try {
      const ruleSet = await VisaRulesService.getActiveRuleSet(
        normalizedCountryCode,
        visaTypeName.toLowerCase()
      );

      if (ruleSet) {
        // Find matching required document from rule set
        // Normalize both sides for matching
        const { documentTypesMatch } = require('../config/document-types-map');
        const matchingRule = ruleSet.requiredDocuments?.find((reqDoc: any) => {
          // Try exact match first
          if (documentTypesMatch(reqDoc.documentType, effectiveDocumentType)) {
            return true;
          }
          // Fallback: name-based matching
          return reqDoc.name?.toLowerCase().includes(effectiveDocumentType.toLowerCase());
        });

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

          // Map tri-language notes if available
          // Ensure notes.uz and notes.en are always filled with user-friendly explanations
          const primaryExplanationUz =
            checkResult.notes?.uz ||
            checkResult.short_reason ||
            'Hujjat bilan muammo bor. Iltimos, hujjatni yangilab qayta yuklang.';
          const primaryExplanationEn =
            checkResult.notes?.en ||
            checkResult.short_reason ||
            'Document has issues. Please upload an updated version.';

          const notes = {
            uz: primaryExplanationUz,
            en: primaryExplanationEn,
            ru: checkResult.notes?.ru || checkResult.short_reason || 'Документ проверен.',
          };

          // Construct problems array for non-APPROVED statuses
          // This ensures buildVerificationNotes() generates a clear explanation
          const problems: ValidationProblemAI[] =
            checkResult.status === 'APPROVED'
              ? []
              : [
                  {
                    code: 'ai_generic_issue',
                    message: checkResult.short_reason || primaryExplanationEn,
                    userMessage: primaryExplanationUz,
                  },
                ];

          const result: DocumentValidationResultAI = {
            status,
            confidence,
            verifiedByAI: status === 'verified' && confidence >= 0.7,
            problems,
            suggestions: [], // VisaDocChecker doesn't provide structured suggestions
            notes,
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

    // Phase 5: Load comprehensive context (VisaRuleSet, CountryPlaybook, CanonicalAIUserContext, extracted text)
    let visaRuleSetData: any = null;
    let countryPlaybookData: any = null;
    let canonicalAIUserContextData: any = null;
    let extractedText = '';

    // Derive visaCategory from visaType
    const visaCategory: VisaCategory =
      visaTypeName.toLowerCase().includes('student') ||
      visaTypeName.toLowerCase().includes('study') ||
      visaTypeName.toLowerCase() === 'f-1' ||
      visaTypeName.toLowerCase() === 'j-1'
        ? 'student'
        : 'tourist';

    try {
      // Load approved VisaRuleSet (Phase 8: Use normalized country code)
      const ruleSet = await VisaRulesService.getActiveRuleSet(
        normalizedCountryCode,
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
      // Load CountryVisaPlaybook (Phase 8: Use normalized country code)
      const playbook = getCountryVisaPlaybook(normalizedCountryCode, visaCategory);
      if (playbook) {
        countryPlaybookData = playbook;
        logInfo('[OpenAI][DocValidation] Loaded CountryVisaPlaybook for validation', {
          documentType: document.documentType,
          applicationId: application.id,
          countryCode: application.country.code,
          visaCategory,
        });
      }
    } catch (playbookError) {
      logWarn('[OpenAI][DocValidation] Failed to load CountryVisaPlaybook (non-blocking)', {
        documentType: document.documentType,
        applicationId: application.id,
        error: playbookError instanceof Error ? playbookError.message : String(playbookError),
      });
    }

    try {
      // Build CanonicalAIUserContext (includes riskDrivers and expert fields)
      const app = await prisma.visaApplication.findUnique({
        where: { id: application.id },
        include: {
          user: true,
        },
      });
      if (app) {
        const aiUserContext = await buildAIUserContext(app.userId, application.id);
        canonicalAIUserContextData = await buildCanonicalAIUserContext(aiUserContext);
        logInfo('[OpenAI][DocValidation] Loaded CanonicalAIUserContext for validation', {
          documentType: document.documentType,
          applicationId: application.id,
          hasRiskDrivers: !!canonicalAIUserContextData?.riskDrivers?.length,
        });
      }
    } catch (contextError) {
      logWarn('[OpenAI][DocValidation] Failed to load CanonicalAIUserContext (non-blocking)', {
        documentType: document.documentType,
        applicationId: application.id,
        error: contextError instanceof Error ? contextError.message : String(contextError),
      });
    }

    try {
      // Extract document text (OCR) if document ID is available
      if (document.id) {
        const docRecord = await prisma.userDocument.findUnique({
          where: { id: document.id },
        });
        if (docRecord) {
          const text = await DocumentClassifierService.extractTextForDocument({
            id: docRecord.id,
            fileName: docRecord.fileName,
            fileUrl: docRecord.fileUrl,
            mimeType: undefined,
          });
          if (text) {
            extractedText = text;
            logInfo('[OpenAI][DocValidation] Extracted document text', {
              documentType: document.documentType,
              applicationId: application.id,
              textLength: extractedText.length,
            });
          }
        }
      }
    } catch (ocrError) {
      logWarn('[OpenAI][DocValidation] Failed to extract document text (non-blocking)', {
        documentType: document.documentType,
        applicationId: application.id,
        error: ocrError instanceof Error ? ocrError.message : String(ocrError),
      });
    }

    logInfo('[OpenAI][DocValidation] Validating document with unified GPT-4 (Phase 5)', {
      model: AIOpenAIService.MODEL,
      documentType: document.documentType,
      country: canonicalCountryName,
      countryCode: normalizedCountryCode,
      countryCodeCanonical: normalizedCountryCode,
      countryNameCanonical: canonicalCountryName,
      countryConsistencyStatus: consistency.consistent ? 'consistent' : 'mismatch_detected',
      visaType: visaTypeName,
      visaCategory,
      applicationId: application.id,
      hasRuleSet: !!visaRuleSetData,
      hasCountryPlaybook: !!countryPlaybookData,
      hasCanonicalContext: !!canonicalAIUserContextData,
      hasExtractedText: extractedText.length > 0,
      riskDrivers: canonicalAIUserContextData?.riskDrivers || [],
    });

    const startTime = Date.now();
    const openaiClient = AIOpenAIService.getOpenAIClient();

    // Phase 5: Build user prompt with comprehensive context
    const userPrompt = buildDocumentValidationUserPrompt({
      document: {
        documentType: effectiveDocumentType,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        uploadedAt: document.uploadedAt,
        expiryDate: document.expiryDate || undefined,
        extractedText: extractedText || undefined, // Phase 5: Include extracted text
      },
      checklistItem: checklistItem
        ? {
            documentType: checklistItem.documentType || document.documentType,
            name: checklistItem.name,
            nameUz: checklistItem.nameUz,
            nameRu: checklistItem.nameUz, // Fallback if nameRu not available
            description: checklistItem.description,
            descriptionUz: checklistItem.descriptionUz,
            whereToObtain: checklistItem.whereToObtain,
            required: checklistItem.required,
          }
        : undefined,
      application: {
        country: countryName,
        countryCode: application.country.code, // Phase 5
        visaType: visaTypeName,
        visaCategory, // Phase 5
      },
      visaRuleSet: visaRuleSetData || undefined, // Phase 5: Official rules
      countryPlaybook: countryPlaybookData || undefined, // Phase 5: Country playbook
      canonicalAIUserContext: canonicalAIUserContextData || undefined, // Phase 5: Full canonical context with riskDrivers
    });

    let validationResult: DocumentValidationResultAI;

    try {
      // Use centralized config for document verification
      const aiConfig = getAIConfig('docVerification');

      logInfo('[DocumentValidation] Calling GPT-4 for document validation', {
        task: 'docVerification',
        applicationId: application.id,
        model: aiConfig.model,
        documentType: effectiveDocumentType,
        originalDocumentType: document.documentType,
        countryCode: application.country.code,
        visaType: application.visaType.name,
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
      });

      const response = await openaiClient.chat.completions.create({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: DOCUMENT_VALIDATION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: aiConfig.maxTokens,
        temperature: aiConfig.temperature,
        response_format: aiConfig.responseFormat || undefined,
      });

      const responseTime = Date.now() - startTime;
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const totalTokens = inputTokens + outputTokens;

      const content = response.choices[0]?.message?.content || '{}';

      logInfo('[DocumentValidation] GPT-4 response received', {
        task: 'docVerification',
        applicationId: application.id,
        model: aiConfig.model,
        documentType: effectiveDocumentType,
        originalDocumentType: document.documentType,
        tokensUsed: totalTokens,
        responseTimeMs: responseTime,
      });

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        logError(
          '[AI_DOC_VALIDATION_PARSE_ERROR] Failed to parse AI response',
          parseError as Error,
          {
            task: 'docVerification',
            applicationId: application.id,
            model: aiConfig.model,
            documentType: document.documentType,
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
 * Map AI validation status to database status
 *
 * From user's perspective:
 * - verified → correct document
 * - rejected → wrong document / needs fix
 * - pending → not yet processed by AI
 *
 * @param aiStatus - Status from DocumentValidationResultAI (may be undefined)
 * @returns Database status for UserDocument
 */
export function mapAIStatusToDbStatus(
  aiStatus: DocumentValidationResultAI['status'] | undefined
): 'pending' | 'verified' | 'rejected' {
  if (aiStatus === 'verified') {
    return 'verified';
  }
  if (aiStatus === 'rejected' || aiStatus === 'needs_review') {
    return 'rejected';
  }
  // 'uncertain' or any unexpected / missing value → 'pending' (not yet processed)
  return 'pending';
}

/**
 * Build user-facing verification notes from AI validation result
 *
 * If problems exist, creates a numbered list using userMessage (fallback to message).
 * Otherwise, falls back to English notes.
 *
 * @param result - DocumentValidationResultAI from GPT-4
 * @returns Human-readable explanation string or null
 */
export function buildVerificationNotes(result: DocumentValidationResultAI): string | null {
  const problems = result.problems ?? [];

  if (problems.length > 0) {
    const problemList = problems.map((problem, index) => {
      const message = problem.userMessage || problem.message || '';
      return `${index + 1}) ${message}`.trim();
    });

    const joined = problemList.join(' ');
    return joined.length > 0 ? joined : null;
  }

  const englishNote = result.notes?.en?.trim();
  if (englishNote) {
    return englishNote;
  }

  return null;
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
    // Map AI status to database status (null-safe)
    const documentStatus = mapAIStatusToDbStatus(validationResult.status);

    // Determine if AI has made a decision (verified or rejected)
    // 'pending' means AI hasn't processed yet, so verifiedByAI should be false
    const aiHasDecided = documentStatus === 'verified' || documentStatus === 'rejected';

    // Build user-facing verification notes
    const verificationNotes = buildVerificationNotes(validationResult);

    // Safely extract notes with null fallbacks
    const notes = validationResult.notes ?? {};

    await prisma.userDocument.update({
      where: { id: documentId },
      data: {
        status: documentStatus,
        verifiedByAI: aiHasDecided,
        aiConfidence:
          typeof validationResult.confidence === 'number' ? validationResult.confidence : null,
        aiNotesUz: notes.uz ?? null,
        aiNotesRu: notes.ru ?? null,
        aiNotesEn: notes.en ?? null,
        verificationNotes: verificationNotes,
      },
    });

    logInfo('[DocValidation] Saved validation result to UserDocument', {
      documentId,
      status: documentStatus,
      aiStatus: validationResult.status,
      verifiedByAI: aiHasDecided,
      confidence: validationResult.confidence,
      hasProblems: (validationResult.problems ?? []).length > 0,
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
