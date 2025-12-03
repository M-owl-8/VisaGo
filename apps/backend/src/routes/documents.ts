import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import path from 'path';
import DocumentService from '../services/documents.service';
import StorageAdapter from '../services/storage-adapter';
import { authenticateToken } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { DocumentChecklist } from '../services/document-checklist.service';
import type { DocumentValidationResultAI } from '../types/ai-responses';

/**
 * Type guard to check if a value is a DocumentChecklist (not a status object)
 */
function isDocumentChecklist(
  value: DocumentChecklist | { status: 'processing' | 'failed'; errorMessage?: string }
): value is DocumentChecklist {
  return 'items' in value && Array.isArray(value.items);
}

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Require authentication for all document routes
router.use(authenticateToken);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/documents/upload
 * Upload a document for a visa application
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { applicationId, documentType } = req.body;

    // Validate required fields
    if (!applicationId || !documentType || !req.file) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields: applicationId, documentType, file',
        },
      });
    }

    // Log upload request for debugging
    console.log('[UPLOAD_DEBUG] Received upload request', {
      applicationId,
      documentType,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });

    // Upload file using storage adapter (local or Firebase)
    const uploadResult = await StorageAdapter.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      userId,
      {
        compress: true,
        generateThumbnail: ['image/jpeg', 'image/png'].includes(req.file.mimetype),
      }
    );

    // Get application details for AI validation context (with relations)
    const application = await prisma.visaApplication.findFirst({
      where: { id: applicationId, userId },
      include: {
        country: true,
        visaType: true,
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Application not found or access denied',
        },
      });
    }

    // HIGH PRIORITY FIX: Update application progress after document upload
    // This ensures progress percentage reflects document completion status
    try {
      const { ApplicationsService } = await import('../services/applications.service');
      await ApplicationsService.updateProgressFromDocuments(applicationId);
      console.log('[Documents] Updated application progress after upload', { applicationId });
    } catch (progressError) {
      // Log but don't fail document upload if progress update fails
      console.warn('[Documents] Failed to update application progress:', progressError);
    }

    // Try to find matching checklist item (optional)
    let checklistItem: any = undefined;
    try {
      const { DocumentChecklistService } = await import('../services/document-checklist.service');
      const checklist = await DocumentChecklistService.generateChecklist(applicationId, userId);
      // Handle both checklist object and status object with proper type narrowing
      if (isDocumentChecklist(checklist)) {
        checklistItem = checklist.items.find(
          (item) =>
            item.documentType === documentType ||
            item.documentType?.toLowerCase() === documentType.toLowerCase()
        );

        // Log checklist item lookup for debugging
        console.log('[UPLOAD_DEBUG] Checklist item lookup', {
          documentType,
          checklistItemFound: !!checklistItem,
          checklistItemDocumentType: checklistItem?.documentType,
          allChecklistItemTypes: checklist.items.map((i: any) => i.documentType),
        });
      }
      // If checklist is a status object (processing/failed), we skip the lookup
      // This is expected and not an error - checklist lookup is optional
    } catch (error) {
      // Checklist lookup is optional, continue without it
      console.log('[UPLOAD_DEBUG] Checklist lookup failed (non-blocking)', {
        documentType,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Create document record in database first (before AI validation)
    const document = await prisma.userDocument.create({
      data: {
        userId,
        applicationId,
        documentName: req.file.originalname,
        documentType,
        fileUrl: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        status: 'pending', // Will be updated after AI validation
      },
    });

    // Log document creation for debugging
    console.log('[UPLOAD_DEBUG] Created UserDocument', {
      documentId: document.id,
      documentType: document.documentType,
      status: document.status,
      applicationId: document.applicationId,
    });

    // Perform AI validation for ALL document types (non-blocking)
    let aiResult: DocumentValidationResultAI | null = null;

    try {
      const { validateDocumentWithAI, saveValidationResultToDocument } = await import(
        '../services/document-validation.service'
      );

      // Run AI validation with unified interface
      aiResult = await validateDocumentWithAI({
        document: {
          id: document.id,
          documentType,
          documentName: req.file.originalname,
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.fileUrl,
          uploadedAt: document.uploadedAt,
          expiryDate: null, // Could be extracted if available
        },
        checklistItem: checklistItem
          ? {
              documentType: checklistItem.documentType || documentType,
              name: checklistItem.name,
              description: checklistItem.description,
              whereToObtain: checklistItem.whereToObtain,
            }
          : undefined,
        application: {
          id: application.id,
          country: {
            name: application.country.name,
            code: application.country.code,
          },
          visaType: {
            name: application.visaType.name,
          },
        },
        countryName: application.country.name,
        visaTypeName: application.visaType.name,
      });

      // Save validation result to UserDocument
      await saveValidationResultToDocument(document.id, aiResult);

      // Reload document to get updated fields
      const updatedDocument = await prisma.userDocument.findUnique({
        where: { id: document.id },
      });

      if (updatedDocument) {
        // Update document reference for response
        Object.assign(document, updatedDocument);
      }
    } catch (validationError: any) {
      // Log error but don't fail the upload
      console.error(
        '[AI_DOC_VALIDATION_ERROR] AI validation failed (non-blocking):',
        validationError
      );
      aiResult = null;

      // Set fallback status
      await prisma.userDocument.update({
        where: { id: document.id },
        data: {
          status: 'pending',
          verifiedByAI: false,
          aiConfidence: 0.0,
          aiNotesUz: "Hujjatni tekshirishning imkoni bo'lmadi. Iltimos yana yuklang.",
          aiNotesRu: 'Не удалось проверить документ. Пожалуйста, загрузите снова.',
          aiNotesEn: 'Could not validate document. Please upload again.',
        },
      });
    }

    // Update application progress based on documents (non-blocking)
    try {
      const { ApplicationsService } = await import('../services/applications.service');
      await ApplicationsService.updateProgressFromDocuments(applicationId);
    } catch (progressError: any) {
      // Log but do NOT fail the upload
      console.error(
        '[DocumentProgress] Failed to update progress from documents (non-blocking):',
        progressError
      );
    }

    // Phase 3.1: Trigger document classification (fire-and-forget)
    try {
      const { DocumentClassifierService } = await import('../services/document-classifier.service');
      // Run asynchronously - don't block the response
      DocumentClassifierService.analyzeAndUpdateDocument(document.id).catch((err) => {
        console.error('[DocumentClassifier] Background classification failed:', err);
      });
    } catch (classificationError: any) {
      // Log but do NOT fail the upload
      console.error(
        '[DocumentClassifier] Failed to trigger classification (non-blocking):',
        classificationError
      );
    }

    res.status(201).json({
      success: true,
      data: document, // Includes all new AI fields
      storage: {
        type: process.env.STORAGE_TYPE || 'local',
        fileUrl: uploadResult.fileUrl,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/documents
 * Get all documents for the authenticated user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const documents = await DocumentService.getUserDocuments(userId);

    res.json({
      success: true,
      data: documents,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/documents/application/:applicationId/required
 * Get required documents for a specific application (from VisaType)
 */
router.get('/application/:applicationId/required', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { applicationId } = req.params;

    // Verify user owns the application
    const application = await prisma.visaApplication.findFirst({
      where: { id: applicationId, userId },
      include: { visaType: true },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Application not found or access denied',
        },
      });
    }

    // Extract required documents from visa type
    const requiredDocTypes = application.visaType.documentTypes || [];

    res.json({
      success: true,
      data: {
        applicationId,
        visaTypeName: application.visaType.name,
        requiredDocuments: requiredDocTypes,
        totalRequired: requiredDocTypes.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/documents/application/:applicationId
 * Get all documents for a specific application
 */
router.get('/application/:applicationId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { applicationId } = req.params;

    const documents = await DocumentService.getApplicationDocuments(applicationId, userId);

    res.json({
      success: true,
      data: documents,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: {
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/documents/:documentId
 * Get a specific document
 */
router.get('/:documentId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { documentId } = req.params;

    const document = await DocumentService.getDocument(documentId, userId);

    res.json({
      success: true,
      data: document,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: {
        message: error.message,
      },
    });
  }
});

/**
 * PATCH /api/documents/:documentId/status
 * Update document status (pending, verified, rejected)
 */
router.patch('/:documentId/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { documentId } = req.params;
    const { status, verificationNotes } = req.body;

    // Validate status
    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid status. Must be one of: pending, verified, rejected',
        },
      });
    }

    // Verify user owns the document
    const document = await prisma.userDocument.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Document not found or access denied',
        },
      });
    }

    // Update status
    const updatedDocument = await prisma.userDocument.update({
      where: { id: documentId },
      data: {
        status,
        verificationNotes: verificationNotes || null,
      },
    });

    res.json({
      success: true,
      data: updatedDocument,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
      },
    });
  }
});

/**
 * DELETE /api/documents/:documentId
 * Delete a document
 */
router.delete('/:documentId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { documentId } = req.params;

    const result = await DocumentService.deleteDocument(documentId, userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: {
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/documents/stats/overview
 * Get document statistics
 */
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const stats = await DocumentService.getDocumentStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
      },
    });
  }
});

export default router;
