"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentService = void 0;
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
// Supported file formats and max sizes (in MB)
const SUPPORTED_FORMATS = {
    passport: ["pdf", "jpg", "png"],
    birth_certificate: ["pdf", "jpg", "png"],
    bank_statement: ["pdf", "jpg", "png"],
    proof_of_residence: ["pdf", "jpg", "png"],
    employment_letter: ["pdf", "docx"],
    financial_proof: ["pdf", "jpg", "png"],
};
const MAX_FILE_SIZE = {
    passport: 10,
    birth_certificate: 10,
    bank_statement: 10,
    proof_of_residence: 10,
    employment_letter: 15,
    financial_proof: 10,
};
class DocumentService {
    /**
     * Upload a document for a visa application
     */
    async uploadDocument(userId, applicationId, documentType, filePath, fileName) {
        // Validate document type
        if (!SUPPORTED_FORMATS[documentType]) {
            throw new Error(`Unsupported document type: ${documentType}`);
        }
        // Validate file exists and get size
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error("File not found");
        }
        const fileSize = fs_1.default.statSync(filePath).size;
        const maxSizeBytes = (MAX_FILE_SIZE[documentType] || 10) *
            1024 *
            1024;
        if (fileSize > maxSizeBytes) {
            throw new Error(`File size exceeds limit of ${MAX_FILE_SIZE[documentType]} MB`);
        }
        // Validate file extension
        const fileExt = path_1.default.extname(fileName).toLowerCase().slice(1);
        const allowedFormats = SUPPORTED_FORMATS[documentType];
        if (!allowedFormats.includes(fileExt)) {
            throw new Error(`File format not supported. Allowed formats: ${allowedFormats.join(", ")}`);
        }
        // Verify user owns the application
        const application = await prisma.visaApplication.findFirst({
            where: { id: applicationId, userId },
        });
        if (!application) {
            throw new Error("Application not found or access denied");
        }
        // Generate file URL (in production, upload to Firebase/S3)
        const fileUrl = `/uploads/${userId}/${applicationId}/${fileName}`;
        // Create document record
        const document = await prisma.userDocument.create({
            data: {
                userId,
                applicationId,
                documentName: fileName,
                documentType,
                fileUrl,
                fileName,
                fileSize,
                status: "pending",
            },
        });
        return document;
    }
    /**
     * Get all documents for a user
     */
    async getUserDocuments(userId) {
        const documents = await prisma.userDocument.findMany({
            where: { userId },
            orderBy: { uploadedAt: "desc" },
        });
        return documents;
    }
    /**
     * Get all documents for an application
     */
    async getApplicationDocuments(applicationId, userId) {
        // Verify user owns the application
        const application = await prisma.visaApplication.findFirst({
            where: { id: applicationId, userId },
        });
        if (!application) {
            throw new Error("Application not found or access denied");
        }
        const documents = await prisma.userDocument.findMany({
            where: { applicationId },
            orderBy: { uploadedAt: "desc" },
        });
        return documents;
    }
    /**
     * Get a specific document
     */
    async getDocument(documentId, userId) {
        const document = await prisma.userDocument.findFirst({
            where: { id: documentId, userId },
        });
        if (!document) {
            throw new Error("Document not found or access denied");
        }
        return document;
    }
    /**
     * Delete a document
     */
    async deleteDocument(documentId, userId) {
        const document = await prisma.userDocument.findFirst({
            where: { id: documentId, userId },
        });
        if (!document) {
            throw new Error("Document not found or access denied");
        }
        // Delete file from storage (if using local files)
        // In production, delete from Firebase/S3
        await prisma.userDocument.delete({
            where: { id: documentId },
        });
        return { message: "Document deleted successfully" };
    }
    /**
     * Update document status (for admin)
     */
    async updateDocumentStatus(documentId, status, verificationNotes) {
        const document = await prisma.userDocument.update({
            where: { id: documentId },
            data: {
                status,
                verificationNotes,
            },
        });
        return document;
    }
    /**
     * Get document statistics for a user
     */
    async getDocumentStats(userId) {
        const documents = await prisma.userDocument.findMany({
            where: { userId },
        });
        const stats = {
            total: documents.length,
            byStatus: {
                pending: documents.filter((d) => d.status === "pending").length,
                verified: documents.filter((d) => d.status === "verified").length,
                rejected: documents.filter((d) => d.status === "rejected").length,
            },
            totalSize: documents.reduce((sum, d) => sum + d.fileSize, 0),
        };
        return stats;
    }
}
exports.DocumentService = DocumentService;
exports.default = new DocumentService();
//# sourceMappingURL=documents.service.js.map