"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const sharp_1 = __importDefault(require("sharp"));
class LocalStorageService {
    /**
     * Initialize storage directory
     */
    static async initialize() {
        try {
            await promises_1.default.mkdir(this.baseDir, { recursive: true });
            await promises_1.default.mkdir(path_1.default.join(this.baseDir, "uploads"), { recursive: true });
            await promises_1.default.mkdir(path_1.default.join(this.baseDir, "thumbnails"), { recursive: true });
        }
        catch (error) {
            console.error("Failed to initialize storage directory:", error);
            throw error;
        }
    }
    /**
     * Upload file to local storage
     */
    static async uploadFile(fileBuffer, fileName, fileType, userId, options = {}) {
        await this.initialize();
        const { maxFileSize = 50 * 1024 * 1024, // 50MB
        allowedFormats = ["pdf", "jpg", "jpeg", "png", "doc", "docx"], compress = true, generateThumbnail = false, } = options;
        // Validate file size
        if (fileBuffer.length > maxFileSize) {
            throw new Error(`File size exceeds limit. Max: ${maxFileSize / 1024 / 1024}MB`);
        }
        // Validate file format
        const fileExtension = fileName.split(".").pop()?.toLowerCase();
        if (fileExtension && !allowedFormats.includes(fileExtension)) {
            throw new Error(`File format not allowed. Allowed: ${allowedFormats.join(", ")}`);
        }
        // Create user directory structure
        const userDir = path_1.default.join(this.baseDir, "uploads", userId, fileType);
        await promises_1.default.mkdir(userDir, { recursive: true });
        // Generate unique file name
        const uniqueFileName = `${(0, uuid_1.v4)()}-${fileName}`;
        const filePath = path_1.default.join(userDir, uniqueFileName);
        let uploadBuffer = fileBuffer;
        let mimeType = fileType;
        let metadata = {};
        // Compress images if requested
        if (compress && ["jpg", "jpeg", "png"].includes(fileExtension)) {
            try {
                uploadBuffer = await (0, sharp_1.default)(fileBuffer)
                    .resize(2000, 2000, {
                    fit: "inside",
                    withoutEnlargement: true,
                })
                    .toBuffer();
            }
            catch (error) {
                console.error("Image compression failed:", error);
                // Continue with original buffer if compression fails
            }
        }
        // Save file
        await promises_1.default.writeFile(filePath, uploadBuffer);
        // Generate thumbnail if requested
        if (generateThumbnail && ["jpg", "jpeg", "png"].includes(fileExtension)) {
            try {
                const thumbnailBuffer = await (0, sharp_1.default)(fileBuffer)
                    .resize(200, 200, { fit: "cover" })
                    .toBuffer();
                const thumbDir = path_1.default.join(this.baseDir, "thumbnails", userId, fileType);
                await promises_1.default.mkdir(thumbDir, { recursive: true });
                const thumbnailFileName = `thumb-${uniqueFileName}`;
                const thumbnailPath = path_1.default.join(thumbDir, thumbnailFileName);
                await promises_1.default.writeFile(thumbnailPath, thumbnailBuffer);
                metadata.thumbnailUrl = `${this.serverUrl}/uploads/thumbnails/${userId}/${fileType}/${thumbnailFileName}`;
                // Extract image dimensions
                const imageMetadata = await (0, sharp_1.default)(fileBuffer).metadata();
                metadata.width = imageMetadata.width;
                metadata.height = imageMetadata.height;
            }
            catch (error) {
                console.error("Thumbnail generation failed:", error);
                // Continue without thumbnail if generation fails
            }
        }
        // Construct file URL
        const fileUrl = `${this.serverUrl}/uploads/files/${userId}/${fileType}/${uniqueFileName}`;
        return {
            fileUrl,
            fileName: `${userId}/${fileType}/${uniqueFileName}`,
            fileSize: uploadBuffer.length,
            mimeType,
            uploadedAt: new Date(),
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        };
    }
    /**
     * Delete file from local storage
     */
    static async deleteFile(fileName) {
        try {
            const filePath = path_1.default.join(this.baseDir, "uploads", fileName);
            await promises_1.default.unlink(filePath);
        }
        catch (error) {
            console.error("Failed to delete file:", error);
            throw error;
        }
    }
    /**
     * Get file metadata
     */
    static async getFileMetadata(fileName) {
        try {
            const filePath = path_1.default.join(this.baseDir, "uploads", fileName);
            const stat = await promises_1.default.stat(filePath);
            return {
                size: stat.size,
                contentType: "application/octet-stream",
                created: stat.birthtime,
                updated: stat.mtime,
            };
        }
        catch (error) {
            console.error("Failed to get file metadata:", error);
            throw error;
        }
    }
    /**
     * List files in a directory
     */
    static async listFiles(prefix) {
        try {
            const dirPath = path_1.default.join(this.baseDir, "uploads", prefix);
            const files = [];
            const walkDir = async (dir, rel = "") => {
                const entries = await promises_1.default.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path_1.default.join(dir, entry.name);
                    const relPath = path_1.default.join(rel, entry.name);
                    if (entry.isDirectory()) {
                        await walkDir(fullPath, relPath);
                    }
                    else {
                        files.push(relPath);
                    }
                }
            };
            await walkDir(dirPath);
            return files;
        }
        catch (error) {
            console.error("Failed to list files:", error);
            return [];
        }
    }
    /**
     * Copy file
     */
    static async copyFile(sourceName, destName) {
        try {
            const sourceFile = path_1.default.join(this.baseDir, "uploads", sourceName);
            const destFile = path_1.default.join(this.baseDir, "uploads", destName);
            // Ensure destination directory exists
            const destDir = path_1.default.dirname(destFile);
            await promises_1.default.mkdir(destDir, { recursive: true });
            // Copy file
            await promises_1.default.copyFile(sourceFile, destFile);
        }
        catch (error) {
            console.error("Failed to copy file:", error);
            throw error;
        }
    }
    /**
     * Get file URL (same as fileUrl from uploadFile)
     */
    static async getSignedUrl(fileName, _expiresInDays = 7) {
        // For local storage, we just return the file URL
        // In production, this would be a signed URL from cloud storage
        return `${this.serverUrl}/uploads/files/${fileName}`;
    }
    /**
     * Get file buffer (for local storage)
     */
    static async getFile(fileName) {
        try {
            const filePath = path_1.default.join(this.baseDir, "uploads", fileName);
            return await promises_1.default.readFile(filePath);
        }
        catch (error) {
            console.error("Failed to get file:", error);
            throw error;
        }
    }
}
exports.LocalStorageService = LocalStorageService;
LocalStorageService.baseDir = process.env.LOCAL_STORAGE_PATH || "uploads";
LocalStorageService.serverUrl = process.env.SERVER_URL || "http://localhost:3000";
exports.default = LocalStorageService;
//# sourceMappingURL=local-storage.service.js.map