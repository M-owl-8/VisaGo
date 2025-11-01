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
     * Get storage implementation
     */
    static getStorage() {
        if (this.storageType === "firebase") {
            return firebase_storage_service_1.default;
        }
        return local_storage_service_1.default;
    }
    static async uploadFile(fileBuffer, fileName, fileType, userId, options = {}) {
        const storage = this.getStorage();
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
}
StorageAdapter.storageType = process.env.STORAGE_TYPE || "local";
exports.default = StorageAdapter;
//# sourceMappingURL=storage-adapter.js.map