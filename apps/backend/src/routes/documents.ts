import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import path from 'path';
import DocumentService from '../services/documents.service';
import StorageAdapter from '../services/storage-adapter';
import { authenticateToken } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { DocumentChecklist } from '../services/document-checklist.service';
import type { DocumentValidationResultAI } from '../types/ai-responses';
import {
  documentValidationRateLimitMiddleware,
  incrementDocumentValidationCount,
} from '../middleware/checklist-rate-limit';
import { DocumentSecurityService } from '../services/document-security.service';

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
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
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

// Apply rate limiting to document validation operations
router.use(documentValidationRateLimitMiddleware);

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

    // Security validation (size/type + optional SafeSearch)
    const validation = await DocumentSecurityService.validateUpload({
      buffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    if (!validation.ok) {
      return res.status(400).json({
        success: false,
        error: {
          message: validation.reason || 'File failed security checks',
        },
      });
    }

    // Ensure documentType is not defaulted to 'document' if a non-empty value is present
    if (!documentType || documentType.trim() === '') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'documentType is required and cannot be empty',
        },
      });
    }

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

    const signedDownloadUrl = await StorageAdapter.getSignedUrl(uploadResult.fileName, 1);

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

    // Note: Progress update and checklist generation moved to background queue
    // This allows the upload endpoint to return immediately (< 2s)

    // Normalize document type before storing
    const {
      toCanonicalDocumentType,
      logUnknownDocumentType,
    } = require('../config/document-types-map');
    const rawDocumentType = documentType.trim();
    const norm = toCanonicalDocumentType(rawDocumentType);

    if (!norm.canonicalType) {
      logUnknownDocumentType(rawDocumentType, {
        source: 'document-upload',
        userId,
        applicationId,
      });
    }

    // Use canonical type if available, otherwise fall back to original (backward compatible)
    const storedDocumentType = norm.canonicalType ?? rawDocumentType;

    // Check for existing document with same applicationId and documentType
    // Update existing record instead of creating duplicates
    const existingDocument = await prisma.userDocument.findFirst({
      where: {
        applicationId,
        documentType: storedDocumentType,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let document;
    if (existingDocument) {
      // Update existing document with new file
      document = await prisma.userDocument.update({
        where: { id: existingDocument.id },
        data: {
          documentName: req.file.originalname,
          fileUrl: signedDownloadUrl || uploadResult.fileUrl,
          fileName: uploadResult.fileName,
          fileSize: uploadResult.fileSize,
          status: 'pending', // Reset to pending for new validation
          verifiedByAI: false,
          aiConfidence: null,
          aiNotesUz: null,
          aiNotesEn: null,
          aiNotesRu: null,
          verificationNotes: null,
        },
      });
      console.log('[UPLOAD_DEBUG] Updated existing UserDocument', {
        documentId: document.id,
        documentType: document.documentType,
        status: document.status,
        applicationId: document.applicationId,
      });
    } else {
      // Create new document record
      document = await prisma.userDocument.create({
        data: {
          userId,
          applicationId,
          documentName: req.file.originalname,
          documentType: storedDocumentType,
          fileUrl: signedDownloadUrl || uploadResult.fileUrl,
          fileName: uploadResult.fileName,
          fileSize: uploadResult.fileSize,
          status: 'pending', // Will be updated after AI validation in background
        },
      });
      console.log('[UPLOAD_DEBUG] Created new UserDocument', {
        documentId: document.id,
        documentType: document.documentType,
        status: document.status,
        applicationId: document.applicationId,
      });
    }

    // Log document creation for debugging
    console.log('[UPLOAD_DEBUG] Created UserDocument', {
      documentId: document.id,
      documentType: document.documentType,
      status: document.status,
      applicationId: document.applicationId,
    });

    // Enqueue background processing job (AI validation, classification, progress update)
    // This allows the HTTP response to return immediately
    try {
      const { DocumentProcessingQueueService } = await import(
        '../services/document-processing-queue.service'
      );
      await DocumentProcessingQueueService.enqueueDocumentProcessing(
        document.id,
        applicationId,
        userId
      );
      console.log('[UPLOAD_DEBUG] Enqueued background processing job', {
        documentId: document.id,
        applicationId,
      });
    } catch (queueError: any) {
      // Log but don't fail the upload - processing can happen later
      console.error(
        '[UPLOAD_DEBUG] Failed to enqueue processing job (non-blocking):',
        queueError instanceof Error ? queueError.message : String(queueError)
      );
      // Fallback: trigger processing in background without queue (fire-and-forget)
      // This ensures processing still happens even if queue is unavailable
      setImmediate(async () => {
        try {
          const { DocumentProcessingQueueService } = await import(
            '../services/document-processing-queue.service'
          );
          await DocumentProcessingQueueService.enqueueDocumentProcessing(
            document.id,
            applicationId,
            userId
          );
        } catch (fallbackError) {
          console.error('[UPLOAD_DEBUG] Fallback processing enqueue also failed:', fallbackError);
        }
      });
    }

    // Return 202 Accepted immediately - processing happens in background
    res.status(202).json({
      success: true,
      data: {
        documentId: document.id,
        documentType: document.documentType,
        status: 'pending',
        fileUrl: document.fileUrl,
        fileName: document.fileName,
        uploadedAt: document.uploadedAt,
      },
      storage: {
        type: process.env.STORAGE_TYPE || 'local',
        fileUrl: signedDownloadUrl || uploadResult.fileUrl,
      },
      message: 'Document uploaded successfully. AI validation in progress.',
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
 * GET /api/documents/:documentId/status
 * Get the current status of a specific document
 */
router.get('/:documentId/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { documentId } = req.params;

    const document = await prisma.userDocument.findFirst({
      where: {
        id: documentId,
        userId,
      },
      select: {
        status: true,
        verifiedByAI: true,
        aiConfidence: true,
        aiNotesUz: true,
        aiNotesEn: true,
        aiNotesRu: true,
        verificationNotes: true,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Document not found or access denied',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to fetch document status',
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
