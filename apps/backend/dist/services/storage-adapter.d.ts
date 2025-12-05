/**
 * Storage Adapter
 * Abstracts storage implementation - can be local or Firebase
 * Switch implementation via STORAGE_TYPE environment variable
 */
import { UploadOptions as FirebaseUploadOptions, UploadResult as FirebaseUploadResult } from './firebase-storage.service';
import { UploadOptions as LocalUploadOptions, UploadResult as LocalUploadResult } from './local-storage.service';
export type UploadOptions = FirebaseUploadOptions & LocalUploadOptions;
export type UploadResult = FirebaseUploadResult & LocalUploadResult;
type StorageType = 'firebase' | 'local';
declare class StorageAdapter {
    private static storageType;
    /**
     * Check if Firebase Storage is actually enabled and configured
     */
    private static isFirebaseEnabled;
    /**
     * Get storage implementation
     */
    private static getStorage;
    static uploadFile(fileBuffer: Buffer, fileName: string, fileType: string, userId: string, options?: UploadOptions): Promise<UploadResult>;
    static deleteFile(fileName: string): Promise<void>;
    static getFileMetadata(fileName: string): Promise<any>;
    static listFiles(prefix: string): Promise<string[]>;
    static copyFile(sourceName: string, destName: string): Promise<void>;
    static getSignedUrl(fileName: string, expiresInDays?: number): Promise<string>;
    /**
     * Switch storage type (useful for testing)
     */
    static setStorageType(type: StorageType): void;
    /**
     * Get current storage type
     */
    static getStorageType(): StorageType;
    /**
     * Get effective storage type (actual implementation being used)
     */
    static getEffectiveStorageType(): StorageType;
    /**
     * Get storage status info for logging
     */
    static getStorageInfo(): {
        type: StorageType;
        bucket?: string | null;
    };
}
export default StorageAdapter;
//# sourceMappingURL=storage-adapter.d.ts.map