export declare class DocumentService {
    /**
     * Upload a document for a visa application
     */
    uploadDocument(userId: string, applicationId: string, documentType: string, filePath: string, fileName: string): Promise<{
        fileUrl: string;
        fileName: string;
        fileSize: number;
        uploadedAt: Date;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        expiryDate: Date | null;
        applicationId: string;
        documentName: string;
        documentType: string;
        verificationNotes: string | null;
    }>;
    /**
     * Get all documents for a user
     */
    getUserDocuments(userId: string): Promise<{
        fileUrl: string;
        fileName: string;
        fileSize: number;
        uploadedAt: Date;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        expiryDate: Date | null;
        applicationId: string;
        documentName: string;
        documentType: string;
        verificationNotes: string | null;
    }[]>;
    /**
     * Get all documents for an application
     */
    getApplicationDocuments(applicationId: string, userId: string): Promise<{
        fileUrl: string;
        fileName: string;
        fileSize: number;
        uploadedAt: Date;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        expiryDate: Date | null;
        applicationId: string;
        documentName: string;
        documentType: string;
        verificationNotes: string | null;
    }[]>;
    /**
     * Get a specific document
     */
    getDocument(documentId: string, userId: string): Promise<{
        fileUrl: string;
        fileName: string;
        fileSize: number;
        uploadedAt: Date;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        expiryDate: Date | null;
        applicationId: string;
        documentName: string;
        documentType: string;
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
        fileUrl: string;
        fileName: string;
        fileSize: number;
        uploadedAt: Date;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: string;
        expiryDate: Date | null;
        applicationId: string;
        documentName: string;
        documentType: string;
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