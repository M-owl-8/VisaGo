import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  compressImage,
  generateThumbnail as generateThumbnailImage,
  getImageMetadata,
  isSharpAvailable,
} from '../utils/sharp-wrapper';

/**
 * Local Storage Service
 * Handles file uploads, deletions, and management locally
 * Compatible interface with FirebaseStorageService for easy migration
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

export class LocalStorageService {
  private static baseDir = process.env.LOCAL_STORAGE_PATH || 'uploads';
  private static serverUrl =
    process.env.SERVER_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    (process.env.NODE_ENV === 'production' ? null : 'http://localhost:3000');

  /**
   * Initialize and validate configuration
   * Throws error in production if SERVER_URL is not set
   */
  static async initialize(): Promise<void> {
    // Fail fast in production if base URL is not configured
    if (process.env.NODE_ENV === 'production' && !this.serverUrl) {
      throw new Error(
        'SERVER_URL or BACKEND_PUBLIC_URL must be set in production for LocalStorageService. ' +
          'This is required to generate correct file URLs.'
      );
    }

    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.mkdir(path.join(this.baseDir, 'uploads'), { recursive: true });
      await fs.mkdir(path.join(this.baseDir, 'thumbnails'), { recursive: true });
    } catch (error) {
      console.error('Failed to initialize storage directory:', error);
      throw error;
    }
  }

  /**
   * Upload file to local storage
   */
  static async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    fileType: string,
    userId: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    // Ensure serverUrl is set (will throw in production if not configured)
    if (!this.serverUrl) {
      throw new Error(
        'SERVER_URL or BACKEND_PUBLIC_URL must be set for LocalStorageService. ' +
          'Cannot generate file URLs without a base URL.'
      );
    }

    await this.initialize();

    const {
      maxFileSize = 10 * 1024 * 1024, // 10MB
      allowedFormats = ['pdf', 'jpg', 'jpeg', 'png'],
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

    // Create user directory structure
    const userDir = path.join(this.baseDir, 'uploads', userId, fileType);
    await fs.mkdir(userDir, { recursive: true });

    // Generate unique file name
    const uniqueFileName = `${uuidv4()}-${fileName}`;
    const filePath = path.join(userDir, uniqueFileName);

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

    // Save file
    await fs.writeFile(filePath, uploadBuffer);

    // Generate thumbnail if requested (only if sharp is available)
    if (
      generateThumbnail &&
      ['jpg', 'jpeg', 'png'].includes(fileExtension!) &&
      isSharpAvailable()
    ) {
      try {
        const thumbnailBuffer = await generateThumbnailImage(fileBuffer, 200, 200);

        const thumbDir = path.join(this.baseDir, 'thumbnails', userId, fileType);
        await fs.mkdir(thumbDir, { recursive: true });

        const thumbnailFileName = `thumb-${uniqueFileName}`;
        const thumbnailPath = path.join(thumbDir, thumbnailFileName);

        await fs.writeFile(thumbnailPath, thumbnailBuffer);

        metadata.thumbnailUrl = `${this.serverUrl}/uploads/thumbnails/${userId}/${fileType}/${thumbnailFileName}`;

        // Extract image dimensions
        const imageMetadata = await getImageMetadata(fileBuffer);
        metadata.width = imageMetadata.width;
        metadata.height = imageMetadata.height;
      } catch (error) {
        console.error('Thumbnail generation failed:', error);
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
  static async deleteFile(fileName: string): Promise<void> {
    try {
      const filePath = path.join(this.baseDir, 'uploads', fileName);
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(fileName: string): Promise<any> {
    try {
      const filePath = path.join(this.baseDir, 'uploads', fileName);
      const stat = await fs.stat(filePath);

      return {
        size: stat.size,
        contentType: 'application/octet-stream',
        created: stat.birthtime,
        updated: stat.mtime,
      };
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      throw error;
    }
  }

  /**
   * List files in a directory
   */
  static async listFiles(prefix: string): Promise<string[]> {
    try {
      const dirPath = path.join(this.baseDir, 'uploads', prefix);
      const files: string[] = [];

      const walkDir = async (dir: string, rel: string = '') => {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = path.join(rel, entry.name);

          if (entry.isDirectory()) {
            await walkDir(fullPath, relPath);
          } else {
            files.push(relPath);
          }
        }
      };

      await walkDir(dirPath);
      return files;
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }

  /**
   * Copy file
   */
  static async copyFile(sourceName: string, destName: string): Promise<void> {
    try {
      const sourceFile = path.join(this.baseDir, 'uploads', sourceName);
      const destFile = path.join(this.baseDir, 'uploads', destName);

      // Ensure destination directory exists
      const destDir = path.dirname(destFile);
      await fs.mkdir(destDir, { recursive: true });

      // Copy file
      await fs.copyFile(sourceFile, destFile);
    } catch (error) {
      console.error('Failed to copy file:', error);
      throw error;
    }
  }

  /**
   * Get file URL (same as fileUrl from uploadFile)
   */
  static async getSignedUrl(fileName: string, _expiresInDays: number = 7): Promise<string> {
    // For local storage, we just return the file URL
    // In production, this would be a signed URL from cloud storage
    return `${this.serverUrl}/uploads/files/${fileName}`;
  }

  /**
   * Get file buffer (for local storage)
   */
  static async getFile(fileName: string): Promise<Buffer> {
    try {
      const filePath = path.join(this.baseDir, 'uploads', fileName);
      return await fs.readFile(filePath);
    } catch (error) {
      console.error('Failed to get file:', error);
      throw error;
    }
  }
}

export default LocalStorageService;
