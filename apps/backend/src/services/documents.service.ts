import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Supported file formats and max sizes (in MB)
const SUPPORTED_FORMATS = {
  passport: ['pdf', 'jpg', 'png'],
  birth_certificate: ['pdf', 'jpg', 'png'],
  bank_statement: ['pdf', 'jpg', 'png'],
  proof_of_residence: ['pdf', 'jpg', 'png'],
  employment_letter: ['pdf', 'docx'],
  financial_proof: ['pdf', 'jpg', 'png'],
};

const MAX_FILE_SIZE = {
  passport: 10,
  birth_certificate: 10,
  bank_statement: 10,
  proof_of_residence: 10,
  employment_letter: 15,
  financial_proof: 10,
};

export class DocumentService {
  /**
   * Upload a document for a visa application
   */
  async uploadDocument(
    userId: string,
    applicationId: string,
    documentType: string,
    filePath: string,
    fileName: string
  ) {
    // Validate document type
    if (!SUPPORTED_FORMATS[documentType as keyof typeof SUPPORTED_FORMATS]) {
      throw new Error(`Unsupported document type: ${documentType}`);
    }

    // Validate file exists and get size
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    const fileSize = fs.statSync(filePath).size;
    const maxSizeBytes =
      (MAX_FILE_SIZE[documentType as keyof typeof MAX_FILE_SIZE] || 10) * 1024 * 1024;

    if (fileSize > maxSizeBytes) {
      throw new Error(
        `File size exceeds limit of ${MAX_FILE_SIZE[documentType as keyof typeof MAX_FILE_SIZE]} MB`
      );
    }

    // Validate file extension
    const fileExt = path.extname(fileName).toLowerCase().slice(1);
    const allowedFormats = SUPPORTED_FORMATS[documentType as keyof typeof SUPPORTED_FORMATS];

    if (!allowedFormats.includes(fileExt)) {
      throw new Error(`File format not supported. Allowed formats: ${allowedFormats.join(', ')}`);
    }

    // Verify user owns the application
    const application = await prisma.visaApplication.findFirst({
      where: { id: applicationId, userId },
    });

    if (!application) {
      throw new Error('Application not found or access denied');
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
        status: 'pending',
      },
    });

    return document;
  }

  /**
   * Get all documents for a user
   */
  async getUserDocuments(userId: string) {
    const documents = await prisma.userDocument.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
    });

    return documents;
  }

  /**
   * Get all documents for an application
   */
  async getApplicationDocuments(applicationId: string, userId: string) {
    // Verify user owns the application
    const application = await prisma.visaApplication.findFirst({
      where: { id: applicationId, userId },
    });

    if (!application) {
      throw new Error('Application not found or access denied');
    }

    const documents = await prisma.userDocument.findMany({
      where: { applicationId },
      orderBy: { uploadedAt: 'desc' },
    });

    return documents;
  }

  /**
   * Get a specific document
   */
  async getDocument(documentId: string, userId: string) {
    const document = await prisma.userDocument.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new Error('Document not found or access denied');
    }

    return document;
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string, userId: string) {
    const document = await prisma.userDocument.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new Error('Document not found or access denied');
    }

    // Delete file from storage (if using local files)
    // In production, delete from Firebase/S3

    await prisma.userDocument.delete({
      where: { id: documentId },
    });

    return { message: 'Document deleted successfully' };
  }

  /**
   * Update document status (for admin)
   */
  async updateDocumentStatus(
    documentId: string,
    status: 'pending' | 'verified' | 'rejected',
    verificationNotes?: string
  ) {
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
  async getDocumentStats(userId: string) {
    const documents = await prisma.userDocument.findMany({
      where: { userId },
    });

    const stats = {
      total: documents.length,
      byStatus: {
        pending: documents.filter((d: any): boolean => d.status === 'pending').length,
        verified: documents.filter((d: any): boolean => d.status === 'verified').length,
        rejected: documents.filter((d: any): boolean => d.status === 'rejected').length,
      },
      totalSize: documents.reduce((sum: number, d: any): number => sum + d.fileSize, 0),
    };

    return stats;
  }
}

export default new DocumentService();
