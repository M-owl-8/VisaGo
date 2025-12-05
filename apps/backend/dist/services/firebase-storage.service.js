"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseStorageService = void 0;
const admin = __importStar(require("firebase-admin"));
const uuid_1 = require("uuid");
const sharp_wrapper_1 = require("../utils/sharp-wrapper");
class FirebaseStorageService {
    /**
     * Check if Firebase Storage is enabled and properly configured
     */
    static isEnabled() {
        return FirebaseStorageService.firebaseEnabled;
    }
    /**
     * Get the configured bucket name
     */
    static getBucketName() {
        return FirebaseStorageService.bucketName;
    }
    /**
     * Initialize Firebase Admin SDK with full credential-based initialization
     * Requires all 4 environment variables:
     * - FIREBASE_PROJECT_ID
     * - FIREBASE_CLIENT_EMAIL
     * - FIREBASE_PRIVATE_KEY
     * - FIREBASE_STORAGE_BUCKET
     */
    static async initialize() {
        // Check if already initialized
        if (FirebaseStorageService.instance) {
            return;
        }
        // Check for all required environment variables
        const requiredVars = {
            FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
            FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
            FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
            FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
        };
        // Check which variables are missing
        const missingVars = [];
        for (const [key, value] of Object.entries(requiredVars)) {
            if (!value || value.trim() === '') {
                missingVars.push(key);
            }
        }
        // If any required vars are missing, do not initialize
        if (missingVars.length > 0) {
            FirebaseStorageService.firebaseEnabled = false;
            console.warn(`⚠️  Firebase Storage not configured - missing environment variables: ${missingVars.join(', ')}`);
            return;
        }
        try {
            // Initialize Firebase Admin with credentials
            // At this point, all required vars are confirmed to exist (checked above)
            const projectId = requiredVars.FIREBASE_PROJECT_ID;
            const clientEmail = requiredVars.FIREBASE_CLIENT_EMAIL;
            // Process private key from environment variable (replace escaped newlines)
            const privateKeyEnv = requiredVars.FIREBASE_PRIVATE_KEY;
            const privateKey = privateKeyEnv.replace(/\\n/g, '\n');
            const storageBucket = requiredVars.FIREBASE_STORAGE_BUCKET;
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        clientEmail,
                        privateKey,
                    }),
                    storageBucket,
                });
            }
            FirebaseStorageService.instance = admin.app();
            FirebaseStorageService.bucket = admin.storage().bucket(storageBucket);
            FirebaseStorageService.bucketName = storageBucket;
            FirebaseStorageService.firebaseEnabled = true;
            console.log(`✅ Firebase Storage configured (bucket: ${storageBucket})`);
        }
        catch (error) {
            FirebaseStorageService.firebaseEnabled = false;
            console.error('❌ Firebase Storage initialization failed:', error);
            throw error;
        }
    }
    /**
     * Ensure Firebase is enabled before performing operations
     */
    static ensureEnabled() {
        if (!FirebaseStorageService.firebaseEnabled) {
            throw new Error('Firebase Storage is disabled. Check environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET');
        }
        if (!FirebaseStorageService.bucket) {
            throw new Error('Firebase Storage bucket is not initialized');
        }
    }
    /**
     * Upload file to Firebase Storage
     */
    static async uploadFile(fileBuffer, fileName, fileType, userId, options = {}) {
        await this.initialize();
        this.ensureEnabled();
        const { maxFileSize = 50 * 1024 * 1024, // 50MB
        allowedFormats = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'], compress = true, generateThumbnail = false, } = options;
        // Validate file size
        if (fileBuffer.length > maxFileSize) {
            throw new Error(`File size exceeds limit. Max: ${maxFileSize / 1024 / 1024}MB`);
        }
        // Validate file format
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        if (fileExtension && !allowedFormats.includes(fileExtension)) {
            throw new Error(`File format not allowed. Allowed: ${allowedFormats.join(', ')}`);
        }
        // Generate unique file name
        const uniqueFileName = `${userId}/${fileType}/${(0, uuid_1.v4)()}-${fileName}`;
        let uploadBuffer = fileBuffer;
        let mimeType = fileType;
        let metadata = {};
        // Compress images if requested (only if sharp is available)
        if (compress && ['jpg', 'jpeg', 'png'].includes(fileExtension) && (0, sharp_wrapper_1.isSharpAvailable)()) {
            try {
                uploadBuffer = await (0, sharp_wrapper_1.compressImage)(fileBuffer, 2000, 2000);
            }
            catch (error) {
                console.error('Image compression failed:', error);
                // Continue with original buffer if compression fails
            }
        }
        // Generate thumbnail if requested (only if sharp is available)
        if (generateThumbnail &&
            ['jpg', 'jpeg', 'png'].includes(fileExtension) &&
            (0, sharp_wrapper_1.isSharpAvailable)()) {
            try {
                const thumbnailBuffer = await (0, sharp_wrapper_1.generateThumbnail)(fileBuffer, 200, 200);
                const thumbnailName = `${userId}/${fileType}/thumbnails/${(0, uuid_1.v4)()}-thumb-${fileName}`;
                const thumbnailFile = FirebaseStorageService.bucket.file(thumbnailName);
                await thumbnailFile.save(thumbnailBuffer, {
                    metadata: {
                        contentType: 'image/jpeg',
                    },
                });
                const [thumbnailUrl] = await thumbnailFile.getSignedUrl({
                    version: 'v4',
                    action: 'read',
                    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
                });
                metadata.thumbnailUrl = thumbnailUrl;
                // Extract image dimensions
                const imageMetadata = await (0, sharp_wrapper_1.getImageMetadata)(fileBuffer);
                metadata.width = imageMetadata.width;
                metadata.height = imageMetadata.height;
            }
            catch (error) {
                console.error('Thumbnail generation failed:', error);
                // Continue without thumbnail if generation fails
            }
        }
        // Upload file
        const file = FirebaseStorageService.bucket.file(uniqueFileName);
        await file.save(uploadBuffer, {
            metadata: {
                contentType: mimeType,
                metadata: {
                    userId,
                    uploadedAt: new Date().toISOString(),
                },
            },
        });
        // Get signed URL (valid for 1 year)
        const [fileUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
        return {
            fileUrl,
            fileName: uniqueFileName,
            fileSize: uploadBuffer.length,
            mimeType,
            uploadedAt: new Date(),
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        };
    }
    /**
     * Delete file from Firebase Storage
     */
    static async deleteFile(fileName) {
        await this.initialize();
        this.ensureEnabled();
        const file = FirebaseStorageService.bucket.file(fileName);
        await file.delete();
    }
    /**
     * Get file metadata
     */
    static async getFileMetadata(fileName) {
        await this.initialize();
        this.ensureEnabled();
        const file = FirebaseStorageService.bucket.file(fileName);
        const [metadata] = await file.getMetadata();
        return {
            size: metadata.size,
            contentType: metadata.contentType,
            created: metadata.timeCreated,
            updated: metadata.updated,
            generation: metadata.generation,
        };
    }
    /**
     * List files in a directory
     */
    static async listFiles(prefix) {
        await this.initialize();
        this.ensureEnabled();
        const [files] = await FirebaseStorageService.bucket.getFiles({
            prefix,
        });
        return files.map((file) => file.name);
    }
    /**
     * Copy file
     */
    static async copyFile(sourceName, destName) {
        await this.initialize();
        this.ensureEnabled();
        const sourceFile = FirebaseStorageService.bucket.file(sourceName);
        const destFile = FirebaseStorageService.bucket.file(destName);
        await sourceFile.copy(destFile);
    }
    /**
     * Get signed URL for a file (for temporary access)
     */
    static async getSignedUrl(fileName, expiresInDays = 7) {
        await this.initialize();
        this.ensureEnabled();
        const file = FirebaseStorageService.bucket.file(fileName);
        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
        });
        return url;
    }
}
exports.FirebaseStorageService = FirebaseStorageService;
FirebaseStorageService.instance = null;
FirebaseStorageService.bucket = null; // Firebase Storage Bucket type
FirebaseStorageService.firebaseEnabled = false;
FirebaseStorageService.bucketName = null;
exports.default = FirebaseStorageService;
//# sourceMappingURL=firebase-storage.service.js.map