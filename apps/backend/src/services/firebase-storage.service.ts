import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import {
  compressImage,
  generateThumbnail as generateThumbnailImage,
  getImageMetadata,
  isSharpAvailable,
} from '../utils/sharp-wrapper';

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
  private static instance: admin.app.App | null = null;
  private static bucket: any = null; // Firebase Storage Bucket type
  private static firebaseEnabled: boolean = false;
  private static bucketName: string | null = null;

  /**
   * Check if Firebase Storage is enabled and properly configured
   */
  static isEnabled(): boolean {
    return FirebaseStorageService.firebaseEnabled;
  }

  /**
   * Get the configured bucket name
   */
  static getBucketName(): string | null {
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
  static async initialize(): Promise<void> {
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
    const missingVars: string[] = [];
    for (const [key, value] of Object.entries(requiredVars)) {
      if (!value || value.trim() === '') {
        missingVars.push(key);
      }
    }

    // If any required vars are missing, do not initialize
    if (missingVars.length > 0) {
      FirebaseStorageService.firebaseEnabled = false;
      console.warn(
        `⚠️  Firebase Storage not configured - missing environment variables: ${missingVars.join(', ')}`
      );
      return;
    }

    try {
      // Initialize Firebase Admin with credentials
      // At this point, all required vars are confirmed to exist (checked above)
      const projectId = requiredVars.FIREBASE_PROJECT_ID!;
      const clientEmail = requiredVars.FIREBASE_CLIENT_EMAIL!;
      // Process private key from environment variable (replace escaped newlines)
      const privateKeyEnv = requiredVars.FIREBASE_PRIVATE_KEY!;
      const privateKey = privateKeyEnv.replace(/\\n/g, '\n');
      const storageBucket = requiredVars.FIREBASE_STORAGE_BUCKET!;

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
    } catch (error) {
      FirebaseStorageService.firebaseEnabled = false;
      console.error('❌ Firebase Storage initialization failed:', error);
      throw error;
    }
  }

  /**
   * Ensure Firebase is enabled before performing operations
   */
  private static ensureEnabled(): void {
    if (!FirebaseStorageService.firebaseEnabled) {
      throw new Error(
        'Firebase Storage is disabled. Check environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET'
      );
    }
    if (!FirebaseStorageService.bucket) {
      throw new Error('Firebase Storage bucket is not initialized');
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
    this.ensureEnabled();

    const {
      maxFileSize = 50 * 1024 * 1024, // 50MB
      allowedFormats = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
      compress = true,
      generateThumbnail = false,
    } = options;

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
    const uniqueFileName = `${userId}/${fileType}/${uuidv4()}-${fileName}`;

    let uploadBuffer = fileBuffer;
    let mimeType = fileType;
    let metadata: any = {};

    // Compress images if requested (only if sharp is available)
    if (compress && ['jpg', 'jpeg', 'png'].includes(fileExtension!) && isSharpAvailable()) {
      try {
        uploadBuffer = await compressImage(fileBuffer, 2000, 2000);
      } catch (error) {
        console.error('Image compression failed:', error);
        // Continue with original buffer if compression fails
      }
    }

    // Generate thumbnail if requested (only if sharp is available)
    if (
      generateThumbnail &&
      ['jpg', 'jpeg', 'png'].includes(fileExtension!) &&
      isSharpAvailable()
    ) {
      try {
        const thumbnailBuffer = await generateThumbnailImage(fileBuffer, 200, 200);

        const thumbnailName = `${userId}/${fileType}/thumbnails/${uuidv4()}-thumb-${fileName}`;
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
        const imageMetadata = await getImageMetadata(fileBuffer);
        metadata.width = imageMetadata.width;
        metadata.height = imageMetadata.height;
      } catch (error) {
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
  static async deleteFile(fileName: string): Promise<void> {
    await this.initialize();
    this.ensureEnabled();

    const file = FirebaseStorageService.bucket.file(fileName);
    await file.delete();
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(fileName: string): Promise<any> {
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
  static async listFiles(prefix: string): Promise<string[]> {
    await this.initialize();
    this.ensureEnabled();

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
    this.ensureEnabled();

    const sourceFile = FirebaseStorageService.bucket.file(sourceName);
    const destFile = FirebaseStorageService.bucket.file(destName);

    await sourceFile.copy(destFile);
  }

  /**
   * Get signed URL for a file (for temporary access)
   */
  static async getSignedUrl(fileName: string, expiresInDays: number = 7): Promise<string> {
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

export default FirebaseStorageService;
