/**
 * Image Analysis Service
 * Analyzes document images for signatures, stamps, layout quality, and visual authenticity
 * Uses Google Cloud Vision API for advanced image analysis
 */

import { logInfo, logError, logWarn } from '../middleware/logger';
import { getEnvConfig } from '../config/env';
import fs from 'fs/promises';
import path from 'path';

export interface ImageAnalysisResult {
  hasSignature: boolean;
  hasStamp: boolean;
  imageQualityScore: number; // 0-1
  issues: string[];
  metadata?: {
    brightness?: number; // 0-1
    contrast?: number; // 0-1
    sharpness?: number; // 0-1
    blur?: number; // 0-1 (higher = more blur)
    processingTimeMs?: number;
  };
}

export interface ImageAnalysisOptions {
  detectSignatures?: boolean;
  detectStamps?: boolean;
  checkQuality?: boolean;
}

export class ImageAnalysisService {
  private static googleVisionClient: any = null;
  private static initialized = false;

  /**
   * Initialize image analysis service
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Try to initialize Google Vision API
      const apiKey = process.env.GOOGLE_VISION_API_KEY;
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

      if (apiKey || credentialsPath) {
        const { ImageAnnotatorClient } = await import('@google-cloud/vision');

        if (apiKey) {
          this.googleVisionClient = new ImageAnnotatorClient({
            apiKey: apiKey,
          });
        } else if (credentialsPath) {
          this.googleVisionClient = new ImageAnnotatorClient({
            keyFilename: credentialsPath,
          });
        }

        logInfo('[ImageAnalysis] Google Cloud Vision API initialized');
      } else {
        logWarn('[ImageAnalysis] Google Vision API not configured, image analysis will be limited');
      }

      this.initialized = true;
    } catch (error) {
      logError('[ImageAnalysis] Failed to initialize', error as Error);
      this.initialized = true; // Mark as initialized to avoid retry loops
    }
  }

  /**
   * Analyze document image for signatures, stamps, and quality
   *
   * @param filePath - Local file path or file URL
   * @param mimeType - MIME type (e.g., 'image/jpeg', 'application/pdf')
   * @param options - Analysis options
   * @returns Image analysis result
   */
  static async analyzeImage(
    filePath: string,
    mimeType: string,
    options: ImageAnalysisOptions = {}
  ): Promise<ImageAnalysisResult> {
    const startTime = Date.now();
    const { detectSignatures = true, detectStamps = true, checkQuality = true } = options;

    await this.initialize();

    try {
      // Only analyze image files (not PDFs)
      const isImage =
        mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/i.test(filePath);

      if (!isImage) {
        // For PDFs, return basic result (can be enhanced later with PDF page extraction)
        return {
          hasSignature: false,
          hasStamp: false,
          imageQualityScore: 0.5,
          issues: ['PDF format - image analysis limited'],
          metadata: {
            processingTimeMs: Date.now() - startTime,
          },
        };
      }

      // Read file buffer
      const fileBuffer = await this.readFileBuffer(filePath);

      if (this.googleVisionClient) {
        return await this.analyzeWithGoogleVision(fileBuffer, {
          detectSignatures,
          detectStamps,
          checkQuality,
          startTime,
        });
      } else {
        // Fallback to basic analysis without Google Vision
        return await this.analyzeBasic(fileBuffer, {
          detectSignatures,
          detectStamps,
          checkQuality,
          startTime,
        });
      }
    } catch (error) {
      logError('[ImageAnalysis] Image analysis failed', error as Error, {
        filePath,
        mimeType,
      });

      return {
        hasSignature: false,
        hasStamp: false,
        imageQualityScore: 0.0,
        issues: [`Analysis failed: ${error instanceof Error ? error.message : String(error)}`],
        metadata: {
          processingTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Analyze image using Google Cloud Vision API
   */
  private static async analyzeWithGoogleVision(
    fileBuffer: Buffer,
    options: ImageAnalysisOptions & { startTime: number }
  ): Promise<ImageAnalysisResult> {
    const { detectSignatures, detectStamps, checkQuality, startTime } = options;
    const issues: string[] = [];
    let hasSignature = false;
    let hasStamp = false;
    let qualityScore = 1.0;

    try {
      // Detect text (for signature/stamp detection)
      const [textResult] = await this.googleVisionClient.textDetection({
        image: { content: fileBuffer },
      });

      // Detect objects (for stamps/seals)
      const [objectResult] = await this.googleVisionClient.objectLocalization({
        image: { content: fileBuffer },
      });

      // Detect faces (for passport photos)
      const [faceResult] = await this.googleVisionClient.faceDetection({
        image: { content: fileBuffer },
      });

      // Analyze image properties (for quality checks)
      const [propertiesResult] = await this.googleVisionClient.imageProperties({
        image: { content: fileBuffer },
      });

      // Check for signatures (heuristic: look for handwritten text or signature-like patterns)
      if (detectSignatures) {
        const textAnnotations = textResult.textAnnotations || [];
        // Signatures often appear as single words or short phrases
        // This is a simplified heuristic - can be enhanced
        const signatureKeywords = ['signature', 'signed', 'подпись', 'imza'];
        const hasSignatureText = textAnnotations.some((annotation: any) => {
          const text = (annotation.description || '').toLowerCase();
          return signatureKeywords.some((keyword) => text.includes(keyword));
        });

        // Also check for objects that might be signatures (rectangular regions)
        const objects = objectResult.localizedObjectAnnotations || [];
        const signatureObjects = objects.filter((obj: any) => {
          const name = (obj.name || '').toLowerCase();
          return name.includes('signature') || name.includes('text');
        });

        hasSignature = hasSignatureText || signatureObjects.length > 0;
      }

      // Check for stamps/seals
      if (detectStamps) {
        const objects = objectResult.localizedObjectAnnotations || [];
        const stampObjects = objects.filter((obj: any) => {
          const name = (obj.name || '').toLowerCase();
          return (
            name.includes('stamp') ||
            name.includes('seal') ||
            name.includes('logo') ||
            name === 'circle' // Stamps are often circular
          );
        });

        hasStamp = stampObjects.length > 0;

        // Also check text annotations for stamp-like text (often in uppercase, centered)
        const textAnnotations = textResult.textAnnotations || [];
        const stampText = textAnnotations.filter((annotation: any) => {
          const text = annotation.description || '';
          // Stamps often have specific formatting
          return (
            text.length < 50 && // Short text
            (text === text.toUpperCase() || // Uppercase
              text.match(/^[A-Z0-9\s\-]+$/)) // Alphanumeric with dashes
          );
        });

        if (stampText.length > 0 && !hasStamp) {
          hasStamp = true;
        }
      }

      // Quality assessment
      if (checkQuality) {
        const imageProperties = propertiesResult.imagePropertiesAnnotation;
        const dominantColors = imageProperties?.dominantColors?.colors || [];

        // Calculate brightness (from dominant colors)
        const avgBrightness =
          dominantColors.reduce((sum: number, color: any) => {
            const rgb = color.color?.rgb || { r: 128, g: 128, b: 128 };
            return sum + (rgb.r + rgb.g + rgb.b) / 3;
          }, 0) / Math.max(dominantColors.length, 1);

        const brightness = avgBrightness / 255; // Normalize to 0-1

        // Check for blur (simplified - would need more sophisticated analysis)
        // Low contrast or very uniform colors might indicate blur
        const contrast = dominantColors.length > 1 ? 0.7 : 0.5; // Simplified

        // Face detection quality (for passport photos)
        const faces = faceResult.faceAnnotations || [];
        const faceQuality = faces.length > 0 ? 0.8 : 0.5; // Having a face is good quality

        // Overall quality score (weighted average)
        qualityScore = brightness * 0.3 + contrast * 0.3 + faceQuality * 0.4;

        // Add quality issues
        if (brightness < 0.3) {
          issues.push('Image is too dark');
        } else if (brightness > 0.9) {
          issues.push('Image is too bright (overexposed)');
        }

        if (contrast < 0.4) {
          issues.push('Low contrast - image may be blurry');
        }

        if (faces.length === 0 && detectSignatures) {
          // For documents that should have faces (passport photos), missing face is an issue
          // But we don't know document type here, so we'll be conservative
        }
      }

      return {
        hasSignature,
        hasStamp,
        imageQualityScore: Math.max(0, Math.min(1, qualityScore)),
        issues,
        metadata: {
          brightness: qualityScore, // Simplified
          contrast: 0.7, // Simplified
          sharpness: qualityScore,
          blur: 1 - qualityScore,
          processingTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      logError('[ImageAnalysis] Google Vision analysis failed', error as Error);
      // Fallback to basic analysis
      return this.analyzeBasic(fileBuffer, options);
    }
  }

  /**
   * Basic image analysis without Google Vision (fallback)
   */
  private static async analyzeBasic(
    fileBuffer: Buffer,
    options: ImageAnalysisOptions & { startTime: number }
  ): Promise<ImageAnalysisResult> {
    const { startTime } = options;

    // Basic analysis without external APIs
    // This is a placeholder - real implementation would use image processing libraries
    // For now, return conservative defaults

    return {
      hasSignature: false, // Cannot detect without API
      hasStamp: false, // Cannot detect without API
      imageQualityScore: 0.5, // Unknown quality
      issues: ['Image analysis limited - Google Vision API not configured'],
      metadata: {
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Read file buffer from local path or URL
   */
  private static async readFileBuffer(filePath: string): Promise<Buffer> {
    // Check if it's a URL
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      const axios = (await import('axios')).default;
      const response = await axios.get(filePath, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      return Buffer.from(response.data);
    }

    // Read from local file system
    return await fs.readFile(filePath);
  }

  /**
   * Analyze image from URL (handles both local and remote files)
   *
   * @param fileUrl - File URL (local path or remote URL)
   * @param fileName - File name (for MIME type detection)
   * @param mimeType - Optional MIME type
   * @param options - Analysis options
   * @returns Image analysis result
   */
  static async analyzeImageFromUrl(
    fileUrl: string,
    fileName: string,
    mimeType?: string,
    options: ImageAnalysisOptions = {}
  ): Promise<ImageAnalysisResult> {
    // Detect MIME type from file extension if not provided
    if (!mimeType) {
      mimeType = this.detectMimeType(fileName);
    }

    // If file is stored locally, use file path directly
    if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
      return this.analyzeImage(fileUrl, mimeType, options);
    }

    // For remote URLs, download temporarily and process
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      const tempPath = path.join(
        process.env.LOCAL_STORAGE_PATH || 'uploads',
        'temp',
        `${Date.now()}-${fileName}`
      );
      await fs.mkdir(path.dirname(tempPath), { recursive: true });
      await fs.writeFile(tempPath, response.data);

      try {
        return await this.analyzeImage(tempPath, mimeType, options);
      } finally {
        // Clean up temp file
        try {
          await fs.unlink(tempPath);
        } catch (cleanupError) {
          logWarn('[ImageAnalysis] Failed to cleanup temp file', {
            tempPath,
            error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
          });
        }
      }
    } catch (error) {
      logError('[ImageAnalysis] Failed to download and analyze remote file', error as Error, {
        fileUrl,
        fileName,
      });
      throw error;
    }
  }

  /**
   * Detect MIME type from file extension
   */
  private static detectMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
