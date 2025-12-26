"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const documents_service_1 = __importDefault(require("../services/documents.service"));
const storage_adapter_1 = __importDefault(require("../services/storage-adapter"));
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const checklist_rate_limit_1 = require("../middleware/checklist-rate-limit");
/**
 * Type guard to check if a value is a DocumentChecklist (not a status object)
 */
function isDocumentChecklist(value) {
    return 'items' in value && Array.isArray(value.items);
}
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
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
        }
        else {
            cb(new Error('Invalid file type'));
        }
    },
});
// ============================================================================
// MIDDLEWARE
// ============================================================================
// Require authentication for all document routes
router.use(auth_1.authenticateToken);
// Apply rate limiting to document validation operations
router.use(checklist_rate_limit_1.documentValidationRateLimitMiddleware);
// ============================================================================
// ROUTES
// ============================================================================
/**
 * POST /api/documents/upload
 * Upload a document for a visa application
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const userId = req.user.id;
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
        const uploadResult = await storage_adapter_1.default.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, userId, {
            compress: true,
            generateThumbnail: ['image/jpeg', 'image/png'].includes(req.file.mimetype),
        });
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
        const { toCanonicalDocumentType, logUnknownDocumentType, } = require('../config/document-types-map');
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
                    fileUrl: uploadResult.fileUrl,
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
        }
        else {
            // Create new document record
            document = await prisma.userDocument.create({
                data: {
                    userId,
                    applicationId,
                    documentName: req.file.originalname,
                    documentType: storedDocumentType,
                    fileUrl: uploadResult.fileUrl,
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
            const { DocumentProcessingQueueService } = await Promise.resolve().then(() => __importStar(require('../services/document-processing-queue.service')));
            await DocumentProcessingQueueService.enqueueDocumentProcessing(document.id, applicationId, userId);
            console.log('[UPLOAD_DEBUG] Enqueued background processing job', {
                documentId: document.id,
                applicationId,
            });
        }
        catch (queueError) {
            // Log but don't fail the upload - processing can happen later
            console.error('[UPLOAD_DEBUG] Failed to enqueue processing job (non-blocking):', queueError instanceof Error ? queueError.message : String(queueError));
            // Fallback: trigger processing in background without queue (fire-and-forget)
            // This ensures processing still happens even if queue is unavailable
            setImmediate(async () => {
                try {
                    const { DocumentProcessingQueueService } = await Promise.resolve().then(() => __importStar(require('../services/document-processing-queue.service')));
                    await DocumentProcessingQueueService.enqueueDocumentProcessing(document.id, applicationId, userId);
                }
                catch (fallbackError) {
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
                fileUrl: uploadResult.fileUrl,
            },
            message: 'Document uploaded successfully. AI validation in progress.',
        });
    }
    catch (error) {
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
router.get('/:documentId/status', async (req, res) => {
    try {
        const userId = req.user.id;
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
    }
    catch (error) {
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
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const documents = await documents_service_1.default.getUserDocuments(userId);
        res.json({
            success: true,
            data: documents,
        });
    }
    catch (error) {
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
router.get('/application/:applicationId/required', async (req, res) => {
    try {
        const userId = req.user.id;
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
    }
    catch (error) {
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
router.get('/application/:applicationId', async (req, res) => {
    try {
        const userId = req.user.id;
        const { applicationId } = req.params;
        const documents = await documents_service_1.default.getApplicationDocuments(applicationId, userId);
        res.json({
            success: true,
            data: documents,
        });
    }
    catch (error) {
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
router.get('/:documentId', async (req, res) => {
    try {
        const userId = req.user.id;
        const { documentId } = req.params;
        const document = await documents_service_1.default.getDocument(documentId, userId);
        res.json({
            success: true,
            data: document,
        });
    }
    catch (error) {
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
router.patch('/:documentId/status', async (req, res) => {
    try {
        const userId = req.user.id;
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
    }
    catch (error) {
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
router.delete('/:documentId', async (req, res) => {
    try {
        const userId = req.user.id;
        const { documentId } = req.params;
        const result = await documents_service_1.default.deleteDocument(documentId, userId);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
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
router.get('/stats/overview', async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await documents_service_1.default.getDocumentStats(userId);
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
            },
        });
    }
});
exports.default = router;
//# sourceMappingURL=documents.js.map