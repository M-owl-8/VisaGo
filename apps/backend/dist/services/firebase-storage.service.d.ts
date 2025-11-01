/**
 * Firebase Storage Service
 * Handles file uploads, deletions, and management
 */
export interface UploadOptions {
    maxFileSize?: number;
    allowedFormats?: string[];
    compress?: boolean;
    generateThumbnail?: boolean;
}
export interface UploadResult {
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
    metadata?: {
        thumbnailUrl?: string;
        width?: number;
        height?: number;
    };
}
export declare class FirebaseStorageService {
    private static instance;
    private static bucket;
    /**
     * Initialize Firebase Admin SDK
     */
    static initialize(): Promise<void>;
    /**
     * Upload file to Firebase Storage
     */
    static uploadFile(fileBuffer: Buffer, fileName: string, fileType: string, userId: string, options?: UploadOptions): Promise<UploadResult>;
    /**
     * Delete file from Firebase Storage
     */
    static deleteFile(fileName: string): Promise<void>;
    /**
     * Get file metadata
     */
    static getFileMetadata(fileName: string): Promise<any>;
    /**
     * List files in a directory
     */
    static listFiles(prefix: string): Promise<string[]>;
    /**
     * Copy file
     */
    static copyFile(sourceName: string, destName: string): Promise<void>;
    /**
     * Get signed URL for a file (for temporary access)
     */
    static getSignedUrl(fileName: string, expiresInDays?: number): Promise<string>;
}
export default FirebaseStorageService;
//# sourceMappingURL=firebase-storage.service.d.ts.map