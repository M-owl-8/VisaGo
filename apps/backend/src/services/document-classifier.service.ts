/**
 * Document Classifier Service
 *
 * Phase 3.1: Classifies uploaded documents by type using AI.
 *
 * This service:
 * - Classifies document types using DeepSeek or existing AI service
 * - Extracts text from documents (placeholder for now)
 * - Updates document records with classification results
 */

import { PrismaClient } from '@prisma/client';
import { logInfo, logWarn, logError } from '../middleware/logger';
import { AIOpenAIService } from './ai-openai.service';

const prisma = new PrismaClient();

export class DocumentClassifierService {
  /**
   * Classify a document type using AI (DeepSeek or existing model).
   *
   * @param fileMeta - Info about the uploaded file
   * @param sampleText - Optional extracted text
   * @returns Classification result with type and confidence
   */
  static async classifyDocumentType(
    fileMeta: { fileName: string; mimeType: string },
    sampleText?: string
  ): Promise<{
    type: string;
    confidence: number;
  }> {
    try {
      // Use existing AI service (gpt-4o-mini) for classification
      // TODO: Consider using DeepSeek or a cheaper model for classification if available

      const fileName = fileMeta.fileName.toLowerCase();
      const mimeType = fileMeta.mimeType.toLowerCase();

      // Build classification prompt
      const classificationPrompt = `You are a document classifier for visa applications.

Given a file with:
- File name: ${fileMeta.fileName}
- MIME type: ${fileMeta.mimeType}
${sampleText ? `- Sample text: ${sampleText.substring(0, 500)}` : ''}

Classify this document into ONE of these types:
- passport
- bank_statement
- employment_letter
- income_certificate
- sponsor_letter
- acceptance_letter (for students)
- i20_form (US student visa)
- loa (Canada student visa)
- cas (UK student visa)
- travel_insurance
- hotel_booking
- flight_reservation
- property_document
- family_relationship_document
- police_clearance
- medical_certificate
- visa_application_form
- passport_photo
- other

Return ONLY a JSON object with this structure:
{
  "type": "passport" | "bank_statement" | ...,
  "confidence": 0.0-1.0
}

Be strict: if you're not confident, use "other" with lower confidence.`;

      // Use AI service to classify
      // For now, use the existing chat completion method
      // TODO: Create a dedicated classification method if needed
      const openaiClient = AIOpenAIService.getOpenAIClient();
      const response = await openaiClient.chat.completions.create({
        model: AIOpenAIService.MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a document classifier. Return ONLY valid JSON, no other text.',
          },
          {
            role: 'user',
            content: classificationPrompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent classification
        max_tokens: 100,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI classifier');
      }

      const parsed = JSON.parse(content);
      const type = parsed.type || 'other';
      const confidence = Math.max(0, Math.min(1, parsed.confidence || 0.5));

      // Validate type is from allowed list
      const allowedTypes = [
        'passport',
        'bank_statement',
        'employment_letter',
        'income_certificate',
        'sponsor_letter',
        'acceptance_letter',
        'i20_form',
        'loa',
        'cas',
        'travel_insurance',
        'hotel_booking',
        'flight_reservation',
        'property_document',
        'family_relationship_document',
        'police_clearance',
        'medical_certificate',
        'visa_application_form',
        'passport_photo',
        'other',
      ];

      const finalType = allowedTypes.includes(type) ? type : 'other';
      const finalConfidence = finalType === 'other' ? Math.min(confidence, 0.7) : confidence;

      logInfo('[DocumentClassifier] Classified document', {
        fileName: fileMeta.fileName,
        type: finalType,
        confidence: finalConfidence,
      });

      return {
        type: finalType,
        confidence: finalConfidence,
      };
    } catch (error: any) {
      logError('[DocumentClassifier] Classification failed', error as Error, {
        fileName: fileMeta.fileName,
      });

      // Fallback: simple heuristic-based classification
      return this.fallbackClassification(fileMeta);
    }
  }

  /**
   * Fallback classification using simple heuristics.
   */
  private static fallbackClassification(fileMeta: { fileName: string; mimeType: string }): {
    type: string;
    confidence: number;
  } {
    const fileName = fileMeta.fileName.toLowerCase();

    // Simple keyword matching
    if (fileName.includes('passport') || fileName.includes('pasport')) {
      return { type: 'passport', confidence: 0.7 };
    }
    if (fileName.includes('bank') || fileName.includes('statement') || fileName.includes('hisob')) {
      return { type: 'bank_statement', confidence: 0.7 };
    }
    if (fileName.includes('employment') || fileName.includes('ish') || fileName.includes('work')) {
      return { type: 'employment_letter', confidence: 0.6 };
    }
    if (
      fileName.includes('income') ||
      fileName.includes('salary') ||
      fileName.includes('daromad')
    ) {
      return { type: 'income_certificate', confidence: 0.6 };
    }
    if (fileName.includes('i20') || fileName.includes('i-20')) {
      return { type: 'i20_form', confidence: 0.8 };
    }
    if (fileName.includes('loa') || fileName.includes('letter of acceptance')) {
      return { type: 'loa', confidence: 0.8 };
    }
    if (fileName.includes('insurance') || fileName.includes('sugurta')) {
      return { type: 'travel_insurance', confidence: 0.7 };
    }
    if (fileName.includes('photo') || fileName.includes('foto') || fileName.includes('rasm')) {
      return { type: 'passport_photo', confidence: 0.7 };
    }

    return { type: 'other', confidence: 0.5 };
  }

  /**
   * Extract text from a document using OCR service.
   *
   * Phase 1: Integrated OCR service with Tesseract.js and Google Vision API support.
   * Results are cached in the database (extractedText field).
   *
   * @param doc - Document record from Prisma
   * @returns Extracted text or null
   */
  static async extractTextForDocument(doc: {
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType?: string;
  }): Promise<string | null> {
    try {
      // Check if text already extracted and cached in database
      const document = await prisma.userDocument.findUnique({
        where: { id: doc.id },
        select: {
          extractedText: true,
          ocrStatus: true,
          ocrConfidence: true,
          ocrLanguage: true,
        },
      });

      // Return cached text if available and OCR was successful
      if (document?.extractedText && document.ocrStatus === 'complete') {
        logInfo('[DocumentClassifier] Using cached extracted text', {
          documentId: doc.id,
          textLength: document.extractedText.length,
          confidence: document.ocrConfidence,
        });
        return document.extractedText;
      }

      // Retry if OCR previously failed but we have a valid file URL (might be a transient error)
      if (document?.ocrStatus === 'failed' && doc.fileUrl) {
        logInfo('[DocumentClassifier] Retrying OCR after previous failure', {
          documentId: doc.id,
          previousConfidence: document.ocrConfidence,
        });
        // Continue to extraction below
      } else if (document?.ocrStatus === 'failed' && !doc.fileUrl) {
        logWarn('[DocumentClassifier] OCR previously failed and no file URL, skipping retry', {
          documentId: doc.id,
        });
        return null;
      }

      // Update status to processing
      await prisma.userDocument
        .update({
          where: { id: doc.id },
          data: {
            ocrStatus: 'processing',
          },
        })
        .catch((error) => {
          // Non-fatal if update fails
          logWarn('[DocumentClassifier] Failed to update OCR status', {
            documentId: doc.id,
            error: error instanceof Error ? error.message : String(error),
          });
        });

      // Import OCR service dynamically to avoid initialization issues
      const { OCRService } = await import('./ocr.service');

      // Extract text using OCR service
      const ocrResult = await OCRService.extractTextFromUrl(
        doc.fileUrl,
        doc.fileName,
        doc.mimeType,
        {
          language: 'uzb+eng+rus', // Support Uzbek, English, and Russian
        }
      );

      // Update database with OCR results
      if (ocrResult.text && ocrResult.text.length > 0) {
        await prisma.userDocument.update({
          where: { id: doc.id },
          data: {
            extractedText: ocrResult.text,
            ocrStatus: 'complete',
            ocrConfidence: ocrResult.confidence,
            ocrLanguage: ocrResult.language || undefined,
          },
        });

        logInfo('[DocumentClassifier] Text extraction completed', {
          documentId: doc.id,
          textLength: ocrResult.text.length,
          confidence: ocrResult.confidence,
          provider: ocrResult.provider,
          language: ocrResult.language,
        });

        return ocrResult.text;
      } else {
        // OCR returned empty text - mark as failed
        await prisma.userDocument
          .update({
            where: { id: doc.id },
            data: {
              ocrStatus: 'failed',
              ocrConfidence: ocrResult.confidence,
            },
          })
          .catch(() => {
            // Non-fatal
          });

        logWarn('[DocumentClassifier] OCR returned empty text', {
          documentId: doc.id,
          provider: ocrResult.provider,
          confidence: ocrResult.confidence,
        });

        return null;
      }
    } catch (error) {
      // Update status to failed
      await prisma.userDocument
        .update({
          where: { id: doc.id },
          data: {
            ocrStatus: 'failed',
          },
        })
        .catch(() => {
          // Non-fatal if update fails
        });

      logError('[DocumentClassifier] Text extraction failed', error as Error, {
        documentId: doc.id,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
      });

      return null;
    }
  }

  /**
   * High-level: classify & update a document record.
   *
   * This is the main entry point called after document upload.
   *
   * @param documentId - Document ID to analyze
   */
  static async analyzeAndUpdateDocument(documentId: string): Promise<void> {
    try {
      // 1) Load document from DB
      const document = await prisma.userDocument.findUnique({
        where: { id: documentId },
        include: {
          application: true,
        },
      });

      if (!document) {
        logWarn('[DocumentClassifier] Document not found', { documentId });
        return;
      }

      // 2) Check if document already has a specific type that should NOT be overwritten
      const currentType = document.documentType;

      // Generic types that can be replaced by classification
      const GENERIC_TYPES = ['document', 'other', null, undefined, ''];

      // Check if current type is generic (can be replaced)
      const isGenericType = !currentType || GENERIC_TYPES.includes(currentType);

      if (!isGenericType) {
        // Document already has a specific type - don't override it
        logInfo('[DocumentClassifier] Skipping classification - explicit type', {
          documentId,
          documentType: currentType,
        });
        return;
      }

      // 3) Additional check: If documentType matches any checklist item type for this application,
      // treat it as explicit and skip classification
      try {
        const { DocumentChecklistService } = await import('./document-checklist.service');
        const checklist = await DocumentChecklistService.generateChecklist(
          document.applicationId,
          document.userId
        );

        if (checklist && 'items' in checklist && Array.isArray(checklist.items)) {
          const checklistItemTypes = checklist.items.map((item: any) =>
            (item.documentType || '').trim().toLowerCase()
          );
          const normalizedCurrentType = (currentType || '').trim().toLowerCase();

          if (checklistItemTypes.includes(normalizedCurrentType)) {
            logInfo('[DocumentClassifier] Skipping classification - type matches checklist item', {
              documentId,
              documentType: currentType,
              applicationId: document.applicationId,
            });
            return;
          }
        }
      } catch (checklistError) {
        // Checklist lookup is optional - continue with classification if it fails
        logWarn('[DocumentClassifier] Checklist lookup failed, continuing with classification', {
          documentId,
          error: checklistError instanceof Error ? checklistError.message : String(checklistError),
        });
      }

      // 4) Extract text (or null for now)
      const extractedText = await this.extractTextForDocument({
        id: document.id,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
      });

      // 5) Classify document type
      const classification = await this.classifyDocumentType(
        {
          fileName: document.fileName,
          mimeType: 'application/pdf', // TODO: Store mimeType in UserDocument if needed
        },
        extractedText || undefined
      );

      // 6) Only update if confidence is reasonably high (>= 0.6)
      if (classification.confidence < 0.6) {
        logInfo('[DocumentClassifier] Classification confidence too low, skipping update', {
          documentId,
          currentType,
          classifiedType: classification.type,
          confidence: classification.confidence,
          threshold: 0.6,
        });
        return;
      }

      // 7) Never change back to "document" (that's pointless)
      if (classification.type === 'document') {
        logInfo(
          '[DocumentClassifier] Classifier returned generic "document" type, skipping update',
          {
            documentId,
            currentType,
            classifiedType: classification.type,
            confidence: classification.confidence,
          }
        );
        return;
      }

      // 8) Final check: Ensure we don't overwrite an explicit checklist type
      // Even if classifier suggests a type, if it matches a checklist item, preserve it
      try {
        const { DocumentChecklistService } = await import('./document-checklist.service');
        const checklist = await DocumentChecklistService.generateChecklist(
          document.applicationId,
          document.userId
        );

        if (checklist && 'items' in checklist && Array.isArray(checklist.items)) {
          const checklistItemTypes = checklist.items.map((item: any) =>
            (item.documentType || '').trim().toLowerCase()
          );
          const normalizedClassifiedType = (classification.type || '').trim().toLowerCase();

          // If classified type matches a checklist item, but current type is generic,
          // it's safe to update. But if current type already matches a checklist item, don't change.
          const currentMatchesChecklist = checklistItemTypes.includes(
            (currentType || '').trim().toLowerCase()
          );
          if (currentMatchesChecklist) {
            logInfo('[DocumentClassifier] Skipping update - current type matches checklist item', {
              documentId,
              currentType,
              classifiedType: classification.type,
            });
            return;
          }
        }
      } catch (checklistError) {
        // Continue with update if checklist lookup fails
        logWarn('[DocumentClassifier] Checklist lookup failed during final check, proceeding', {
          documentId,
        });
      }

      // 9) Update document row with classification results
      const previousType = currentType;
      await prisma.userDocument.update({
        where: { id: documentId },
        data: {
          documentType: classification.type,
        },
      });

      logInfo('[DocumentClassifier] Updated documentType from generic to classified', {
        documentId,
        from: previousType,
        to: classification.type,
        confidence: classification.confidence,
      });
    } catch (error: any) {
      logError('[DocumentClassifier] Failed to analyze document', error as Error, {
        documentId,
      });
      // Don't throw - this is fire-and-forget, shouldn't block upload
    }
  }
}
