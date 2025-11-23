import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import path from 'path';
import DocumentService from '../services/documents.service';
import StorageAdapter from '../services/storage-adapter';
import { authenticateToken } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

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

    // Try to find matching checklist item (optional)
    let checklistItem: any = undefined;
    try {
      const { DocumentChecklistService } = await import('../services/document-checklist.service');
      const checklist = await DocumentChecklistService.generateChecklist(applicationId, userId);
      checklistItem = checklist.items.find(
        (item: any) =>
          item.documentType === documentType ||
          item.documentType?.toLowerCase() === documentType.toLowerCase()
      );
    } catch (error) {
      // Checklist lookup is optional, continue without it
    }

    // Perform AI validation for ALL document types (non-blocking)
    let aiResult: {
      status: 'verified' | 'rejected' | 'needs_review';
      verifiedByAI: boolean;
      confidence?: number;
      notesUz: string;
      notesRu?: string;
      notesEn?: string;
    } | null = null;

    try {
      const { validateDocumentWithAI } = await import('../services/document-validation.service');

      // Run AI validation with new interface
      aiResult = await validateDocumentWithAI({
        document: {
          documentType,
          documentName: req.file.originalname,
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.fileUrl,
          uploadedAt: new Date(),
        },
        checklistItem: checklistItem
          ? {
              name: checklistItem.name,
              nameUz: checklistItem.nameUz,
              description: checklistItem.description,
              descriptionUz: checklistItem.descriptionUz,
              required: checklistItem.required,
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
    } catch (validationError: any) {
      // Log error but don't fail the upload
      console.error(
        '[AI_DOC_VALIDATION_ERROR] AI validation failed (non-blocking):',
        validationError
      );
      aiResult = null;
    }

    // Map AI status to document status
    let initialStatus = 'pending';
    if (aiResult) {
      if (aiResult.status === 'verified') {
        initialStatus = 'verified';
      } else if (aiResult.status === 'rejected') {
        initialStatus = 'rejected';
      } else {
        initialStatus = 'pending'; // needs_review maps to pending
      }
    }

    // Create document record in database with AI results
    const document = await prisma.userDocument.create({
      data: {
        userId,
        applicationId,
        documentName: req.file.originalname,
        documentType,
        fileUrl: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        status: initialStatus,
        verificationNotes: aiResult?.notesUz || null, // Backward compatibility
        verifiedByAI: aiResult?.verifiedByAI || false,
        aiConfidence: aiResult?.confidence || null,
        aiNotesUz: aiResult?.notesUz || null,
        aiNotesRu: aiResult?.notesRu || null,
        aiNotesEn: aiResult?.notesEn || null,
      },
    });

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
