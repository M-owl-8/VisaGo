/**
 * Storage Adapter
 * Abstracts storage implementation - can be local or Firebase
 * Switch implementation via STORAGE_TYPE environment variable
 */

import FirebaseStorageService, { 
  UploadOptions as FirebaseUploadOptions,
  UploadResult as FirebaseUploadResult 
} from "./firebase-storage.service";
import LocalStorageService, { 
  UploadOptions as LocalUploadOptions,
  UploadResult as LocalUploadResult 
} from "./local-storage.service";

export type UploadOptions = FirebaseUploadOptions & LocalUploadOptions;
export type UploadResult = FirebaseUploadResult & LocalUploadResult;

type StorageType = "firebase" | "local";

class StorageAdapter {
  private static storageType: StorageType = (process.env.STORAGE_TYPE as StorageType) || "local";

  /**
   * Get storage implementation
   */
  private static getStorage() {
    if (this.storageType === "firebase") {
      return FirebaseStorageService;
    }
    return LocalStorageService;
  }

  static async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    fileType: string,
    userId: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const storage = this.getStorage();
    return storage.uploadFile(fileBuffer, fileName, fileType, userId, options);
  }

  static async deleteFile(fileName: string): Promise<void> {
    const storage = this.getStorage();
    return storage.deleteFile(fileName);
  }

  static async getFileMetadata(fileName: string): Promise<any> {
    const storage = this.getStorage();
    return storage.getFileMetadata(fileName);
  }

  static async listFiles(prefix: string): Promise<string[]> {
    const storage = this.getStorage();
    return storage.listFiles(prefix);
  }

  static async copyFile(sourceName: string, destName: string): Promise<void> {
    const storage = this.getStorage();
    return storage.copyFile(sourceName, destName);
  }

  static async getSignedUrl(fileName: string, expiresInDays?: number): Promise<string> {
    const storage = this.getStorage();
    return storage.getSignedUrl(fileName, expiresInDays);
  }

  /**
   * Switch storage type (useful for testing)
   */
  static setStorageType(type: StorageType): void {
    this.storageType = type;
    console.log(`[StorageAdapter] Storage type switched to: ${type}`);
  }

  /**
   * Get current storage type
   */
  static getStorageType(): StorageType {
    return this.storageType;
  }
}

export default StorageAdapter;