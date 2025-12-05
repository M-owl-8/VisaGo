"use strict";
/**
 * Storage Adapter
 * Abstracts storage implementation - can be local or Firebase
 * Switch implementation via STORAGE_TYPE environment variable
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_storage_service_1 = __importDefault(require("./firebase-storage.service"));
const local_storage_service_1 = __importDefault(require("./local-storage.service"));
class StorageAdapter {
    /**
     * Check if Firebase Storage is actually enabled and configured
     */
    static isFirebaseEnabled() {
        if (this.storageType !== 'firebase') {
            return false;
        }
        // Check if Firebase is actually initialized and enabled
        return firebase_storage_service_1.default.isEnabled();
    }
    /**
     * Get storage implementation
     */
    static getStorage() {
        if (this.isFirebaseEnabled()) {
            return firebase_storage_service_1.default;
        }
        return local_storage_service_1.default;
    }
    static async uploadFile(fileBuffer, fileName, fileType, userId, options = {}) {
        const storage = this.getStorage();
        // If Firebase is requested but not enabled, use local storage
        if (this.storageType === 'firebase' && !this.isFirebaseEnabled()) {
            console.warn('Firebase Storage not configured, using local storage. Check FIREBASE_* environment variables.');
            return local_storage_service_1.default.uploadFile(fileBuffer, fileName, fileType, userId, options);
        }
        // If using Firebase, try with fallback to local storage
        if (this.isFirebaseEnabled()) {
            try {
                return await storage.uploadFile(fileBuffer, fileName, fileType, userId, options);
            }
            catch (error) {
                console.warn(`Firebase storage upload failed, falling back to local storage:`, error instanceof Error ? error.message : 'Unknown error');
                // Fallback to local storage
                return local_storage_service_1.default.uploadFile(fileBuffer, fileName, fileType, userId, options);
            }
        }
        // Direct call for local storage
        return storage.uploadFile(fileBuffer, fileName, fileType, userId, options);
    }
    static async deleteFile(fileName) {
        const storage = this.getStorage();
        return storage.deleteFile(fileName);
    }
    static async getFileMetadata(fileName) {
        const storage = this.getStorage();
        return storage.getFileMetadata(fileName);
    }
    static async listFiles(prefix) {
        const storage = this.getStorage();
        return storage.listFiles(prefix);
    }
    static async copyFile(sourceName, destName) {
        const storage = this.getStorage();
        return storage.copyFile(sourceName, destName);
    }
    static async getSignedUrl(fileName, expiresInDays) {
        const storage = this.getStorage();
        return storage.getSignedUrl(fileName, expiresInDays);
    }
    /**
     * Switch storage type (useful for testing)
     */
    static setStorageType(type) {
        this.storageType = type;
        console.log(`[StorageAdapter] Storage type switched to: ${type}`);
    }
    /**
     * Get current storage type
     */
    static getStorageType() {
        return this.storageType;
    }
    /**
     * Get effective storage type (actual implementation being used)
     */
    static getEffectiveStorageType() {
        if (this.isFirebaseEnabled()) {
            return 'firebase';
        }
        return 'local';
    }
    /**
     * Get storage status info for logging
     */
    static getStorageInfo() {
        if (this.isFirebaseEnabled()) {
            return {
                type: 'firebase',
                bucket: firebase_storage_service_1.default.getBucketName(),
            };
        }
        return {
            type: 'local',
        };
    }
}
StorageAdapter.storageType = process.env.STORAGE_TYPE || 'local';
exports.default = StorageAdapter;
//# sourceMappingURL=storage-adapter.js.map