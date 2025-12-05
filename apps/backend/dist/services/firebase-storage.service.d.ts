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
    private static firebaseEnabled;
    private static bucketName;
    /**
     * Check if Firebase Storage is enabled and properly configured
     */
    static isEnabled(): boolean;
    /**
     * Get the configured bucket name
     */
    static getBucketName(): string | null;
    /**
     * Initialize Firebase Admin SDK with full credential-based initialization
     * Requires all 4 environment variables:
     * - FIREBASE_PROJECT_ID
     * - FIREBASE_CLIENT_EMAIL
     * - FIREBASE_PRIVATE_KEY
     * - FIREBASE_STORAGE_BUCKET
     */
    static initialize(): Promise<void>;
    /**
     * Ensure Firebase is enabled before performing operations
     */
    private static ensureEnabled;
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