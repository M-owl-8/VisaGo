import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";

/**
 * Firebase Storage Service
 * Handles file uploads, deletions, and management
 */

export interface UploadOptions {
  maxFileSize?: number; // in bytes, default 50MB
  allowedFormats?: string[]; // e.g., ['pdf', 'jpg', 'png']
  compress?: boolean; // compress images
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

export class FirebaseStorageService {
  private static instance: admin.app.App;
  private static bucket: any = null;

  /**
   * Initialize Firebase Admin SDK
   */
  static async initialize(): Promise<void> {
    if (!FirebaseStorageService.instance) {
      // Firebase Admin SDK initialization
      // Credentials are automatically loaded from FIREBASE_PRIVATE_KEY environment variable
      // or via gcloud authentication
      if (!admin.apps.length) {
        admin.initializeApp({
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
      }
      FirebaseStorageService.instance = admin.app();
      FirebaseStorageService.bucket = admin.storage().bucket();
    }
  }

  /**
   * Upload file to Firebase Storage
   */
  static async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    fileType: string,
    userId: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    await this.initialize();

    const {
      maxFileSize = 50 * 1024 * 1024, // 50MB
      allowedFormats = ["pdf", "jpg", "jpeg", "png", "doc", "docx"],
      compress = true,
      generateThumbnail = false,
    } = options;

    // Validate file size
    if (fileBuffer.length > maxFileSize) {
      throw new Error(
        `File size exceeds limit. Max: ${maxFileSize / 1024 / 1024}MB`
      );
    }

    // Validate file format
    const fileExtension = fileName.split(".").pop()?.toLowerCase();
    if (fileExtension && !allowedFormats.includes(fileExtension)) {
      throw new Error(`File format not allowed. Allowed: ${allowedFormats.join(", ")}`);
    }

    // Generate unique file name
    const uniqueFileName = `${userId}/${fileType}/${uuidv4()}-${fileName}`;

    let uploadBuffer = fileBuffer;
    let mimeType = fileType;
    let metadata: any = {};

    // Compress images if requested
    if (compress && ["jpg", "jpeg", "png"].includes(fileExtension!)) {
      try {
        uploadBuffer = await sharp(fileBuffer)
          .resize(2000, 2000, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .toBuffer();
      } catch (error) {
        console.error("Image compression failed:", error);
        // Continue with original buffer if compression fails
      }
    }

    // Generate thumbnail if requested
    if (generateThumbnail && ["jpg", "jpeg", "png"].includes(fileExtension!)) {
      try {
        const thumbnailBuffer = await sharp(fileBuffer)
          .resize(200, 200, { fit: "cover" })
          .toBuffer();

        const thumbnailName = `${userId}/${fileType}/thumbnails/${uuidv4()}-thumb-${fileName}`;
        const thumbnailFile = FirebaseStorageService.bucket.file(thumbnailName);

        await thumbnailFile.save(thumbnailBuffer, {
          metadata: {
            contentType: "image/jpeg",
          },
        });

        const [thumbnailUrl] = await thumbnailFile.getSignedUrl({
          version: "v4",
          action: "read",
          expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        });

        metadata.thumbnailUrl = thumbnailUrl;

        // Extract image dimensions
        const imageMetadata = await sharp(fileBuffer).metadata();
        metadata.width = imageMetadata.width;
        metadata.height = imageMetadata.height;
      } catch (error) {
        console.error("Thumbnail generation failed:", error);
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
      version: "v4",
      action: "read",
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
  static async deleteFile(fileName: string): Promise<void> {
    await this.initialize();

    const file = FirebaseStorageService.bucket.file(fileName);
    await file.delete();
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(fileName: string): Promise<any> {
    await this.initialize();

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
  static async listFiles(prefix: string): Promise<string[]> {
    await this.initialize();

    if (!FirebaseStorageService.bucket) {
      throw new Error("Firebase Storage bucket is not initialized");
    }

    const [files] = await FirebaseStorageService.bucket.getFiles({
      prefix,
    });

    return files.map((file: any) => file.name);
  }

  /**
   * Copy file
   */
  static async copyFile(sourceName: string, destName: string): Promise<void> {
    await this.initialize();

    const sourceFile = FirebaseStorageService.bucket.file(sourceName);
    const destFile = FirebaseStorageService.bucket.file(destName);

    await sourceFile.copy(destFile);
  }

  /**
   * Get signed URL for a file (for temporary access)
   */
  static async getSignedUrl(
    fileName: string,
    expiresInDays: number = 7
  ): Promise<string> {
    await this.initialize();

    const file = FirebaseStorageService.bucket.file(fileName);
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    });

    return url;
  }
}

export default FirebaseStorageService;