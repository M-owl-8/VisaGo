export declare class DocumentService {
    /**
     * Upload a document for a visa application
     */
    uploadDocument(userId: string, applicationId: string, documentType: string, filePath: string, fileName: string): Promise<{
        documentType: string;
        userId: string;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        uploadedAt: Date;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiryDate: Date | null;
        applicationId: string;
        documentName: string;
        verificationNotes: string | null;
    }>;
    /**
     * Get all documents for a user
     */
    getUserDocuments(userId: string): Promise<{
        documentType: string;
        userId: string;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        uploadedAt: Date;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiryDate: Date | null;
        applicationId: string;
        documentName: string;
        verificationNotes: string | null;
    }[]>;
    /**
     * Get all documents for an application
     */
    getApplicationDocuments(applicationId: string, userId: string): Promise<{
        documentType: string;
        userId: string;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        uploadedAt: Date;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiryDate: Date | null;
        applicationId: string;
        documentName: string;
        verificationNotes: string | null;
    }[]>;
    /**
     * Get a specific document
     */
    getDocument(documentId: string, userId: string): Promise<{
        documentType: string;
        userId: string;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        uploadedAt: Date;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiryDate: Date | null;
        applicationId: string;
        documentName: string;
        verificationNotes: string | null;
    }>;
    /**
     * Delete a document
     */
    deleteDocument(documentId: string, userId: string): Promise<{
        message: string;
    }>;
    /**
     * Update document status (for admin)
     */
    updateDocumentStatus(documentId: string, status: "pending" | "verified" | "rejected", verificationNotes?: string): Promise<{
        documentType: string;
        userId: string;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        uploadedAt: Date;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiryDate: Date | null;
        applicationId: string;
        documentName: string;
        verificationNotes: string | null;
    }>;
    /**
     * Get document statistics for a user
     */
    getDocumentStats(userId: string): Promise<{
        total: number;
        byStatus: {
            pending: number;
            verified: number;
            rejected: number;
        };
        totalSize: number;
    }>;
}
declare const _default: DocumentService;
export default _default;
//# sourceMappingURL=documents.service.d.ts.map