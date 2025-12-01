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
   * Extract text from a document.
   *
   * For now, this is a placeholder. Real OCR/PDF extraction should be integrated later.
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
    // TODO: Integrate real OCR/PDF text extraction
    // For now, return null with a clear TODO comment

    // Potential integrations:
    // - PDF.js for PDF text extraction
    // - Tesseract.js for image OCR
    // - Cloud OCR services (Google Vision, AWS Textract, etc.)

    logInfo('[DocumentClassifier] Text extraction not yet implemented', {
      documentId: doc.id,
      fileName: doc.fileName,
    });

    return null;
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
      });

      if (!document) {
        logWarn('[DocumentClassifier] Document not found', { documentId });
        return;
      }

      // 2) Extract text (or null for now)
      const extractedText = await this.extractTextForDocument({
        id: document.id,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
      });

      // 3) Classify document type
      const classification = await this.classifyDocumentType(
        {
          fileName: document.fileName,
          mimeType: 'application/pdf', // TODO: Store mimeType in UserDocument if needed
        },
        extractedText || undefined
      );

      // 4) Update document row with classification results
      // Note: classifiedType doesn't exist in schema, using documentType instead
      await prisma.userDocument.update({
        where: { id: documentId },
        data: {
          documentType: classification.type, // classifiedType field doesn't exist
          // classificationSource: 'ai', // Field doesn't exist
          // classificationScore: classification.confidence, // Field doesn't exist
          // extractedText: extractedText, // Field doesn't exist
        },
      });

      logInfo('[DocumentClassifier] Document analyzed and updated', {
        documentId,
        classifiedType: classification.type,
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
