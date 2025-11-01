/**
 * Local Storage Service
 * Handles file uploads, deletions, and management locally
 * Compatible interface with FirebaseStorageService for easy migration
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
export declare class LocalStorageService {
    private static baseDir;
    private static serverUrl;
    /**
     * Initialize storage directory
     */
    static initialize(): Promise<void>;
    /**
     * Upload file to local storage
     */
    static uploadFile(fileBuffer: Buffer, fileName: string, fileType: string, userId: string, options?: UploadOptions): Promise<UploadResult>;
    /**
     * Delete file from local storage
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
     * Get file URL (same as fileUrl from uploadFile)
     */
    static getSignedUrl(fileName: string, _expiresInDays?: number): Promise<string>;
    /**
     * Get file buffer (for local storage)
     */
    static getFile(fileName: string): Promise<Buffer>;
}
export default LocalStorageService;
//# sourceMappingURL=local-storage.service.d.ts.map