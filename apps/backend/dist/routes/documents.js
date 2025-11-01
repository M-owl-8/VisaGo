"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const documents_service_1 = __importDefault(require("../services/documents.service"));
const storage_adapter_1 = __importDefault(require("../services/storage-adapter"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024, // 20 MB
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("Invalid file type"));
        }
    },
});
// ============================================================================
// MIDDLEWARE
// ============================================================================
// Require authentication for all document routes
router.use(auth_1.authenticateToken);
// ============================================================================
// ROUTES
// ============================================================================
/**
 * POST /api/documents/upload
 * Upload a document for a visa application
 */
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        const userId = req.user.id;
        const { applicationId, documentType } = req.body;
        // Validate required fields
        if (!applicationId || !documentType || !req.file) {
            return res.status(400).json({
                success: false,
                error: {
                    message: "Missing required fields: applicationId, documentType, file",
                },
            });
        }
        // Verify user owns the application (for security)
        const prisma = new (require("@prisma/client").PrismaClient)();
        const application = await prisma.visaApplication.findFirst({
            where: { id: applicationId, userId },
        });
        if (!application) {
            return res.status(404).json({
                success: false,
                error: {
                    message: "Application not found or access denied",
                },
            });
        }
        // Upload file using storage adapter (local or Firebase)
        const uploadResult = await storage_adapter_1.default.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, userId, {
            compress: true,
            generateThumbnail: ["image/jpeg", "image/png"].includes(req.file.mimetype),
        });
        // Create document record in database
        const document = await prisma.userDocument.create({
            data: {
                userId,
                applicationId,
                documentName: req.file.originalname,
                documentType,
                fileUrl: uploadResult.fileUrl,
                fileName: uploadResult.fileName,
                fileSize: uploadResult.fileSize,
                status: "pending",
            },
        });
        await prisma.$disconnect();
        res.status(201).json({
            success: true,
            data: document,
            storage: {
                type: process.env.STORAGE_TYPE || "local",
                fileUrl: uploadResult.fileUrl,
            },
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
 * GET /api/documents
 * Get all documents for the authenticated user
 */
router.get("/", async (req, res) => {
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
 * GET /api/documents/application/:applicationId
 * Get all documents for a specific application
 */
router.get("/application/:applicationId", async (req, res) => {
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
router.get("/:documentId", async (req, res) => {
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
 * DELETE /api/documents/:documentId
 * Delete a document
 */
router.delete("/:documentId", async (req, res) => {
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
router.get("/stats/overview", async (req, res) => {
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