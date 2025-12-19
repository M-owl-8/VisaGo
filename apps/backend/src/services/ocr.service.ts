/**
 * OCR Service
 * Extracts text from uploaded documents (PDFs, images)
 * Supports multiple OCR providers: Tesseract.js (free) and Google Cloud Vision API (paid)
 */

import { logInfo, logError, logWarn } from '../middleware/logger';
import { LocalStorageService } from './local-storage.service';
import { FirebaseStorageService } from './firebase-storage.service';
import { getEnvConfig } from '../config/env';
import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

export type OCRProvider = 'tesseract' | 'google_vision' | 'aws_textract' | 'azure';

export interface OCROptions {
  language?: string; // Language code: 'uzb', 'eng', 'rus', 'uzb+eng', etc.
  provider?: OCRProvider; // Override default provider
}

export interface OCRResult {
  text: string;
  confidence: number; // 0-1
  language?: string;
  provider: OCRProvider;
  metadata?: {
    pageCount?: number;
    processingTimeMs?: number;
    wordCount?: number;
  };
}

export class OCRService {
  private static defaultProvider: OCRProvider = 'tesseract';
  private static tesseractInitialized = false;
  private static googleVisionClient: any = null;

  /**
   * Initialize OCR service
   * Sets up default provider and initializes clients
   */
  static async initialize(): Promise<void> {
    const env = getEnvConfig();
    const provider = (process.env.OCR_PROVIDER as OCRProvider) || 'tesseract';
    this.defaultProvider = provider;

    logInfo('[OCR] Initializing OCR service', {
      provider: this.defaultProvider,
      ocrProviderEnv: process.env.OCR_PROVIDER,
      hasGoogleVisionKey: !!process.env.GOOGLE_VISION_API_KEY,
      googleVisionKeyLength: process.env.GOOGLE_VISION_API_KEY?.length || 0,
      hasGoogleVisionKey: !!process.env.GOOGLE_VISION_API_KEY,
      googleVisionKeyLength: process.env.GOOGLE_VISION_API_KEY?.length || 0,
    });

    if (provider === 'google_vision') {
      await this.initializeGoogleVision();
    } else if (provider === 'tesseract') {
      await this.initializeTesseract();
    }
  }

  /**
   * Initialize Tesseract.js OCR
   */
  private static async initializeTesseract(): Promise<void> {
    try {
      // Dynamic import to avoid loading Tesseract if not used
      const Tesseract = await import('tesseract.js');
      this.tesseractInitialized = true;
      logInfo('[OCR] Tesseract.js initialized');
    } catch (error) {
      logWarn('[OCR] Tesseract.js not available, will use fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Initialize Google Cloud Vision API client
   */
  private static async initializeGoogleVision(): Promise<void> {
    try {
      const { ImageAnnotatorClient } = await import('@google-cloud/vision');
      const apiKey = process.env.GOOGLE_VISION_API_KEY;
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

      if (!apiKey && !credentialsPath) {
        logWarn('[OCR] Google Vision API key or credentials not found, falling back to Tesseract');
        this.defaultProvider = 'tesseract';
        await this.initializeTesseract();
        return;
      }

      // Initialize with API key or credentials file
      if (apiKey) {
        // Use API key (for simpler setup)
        this.googleVisionClient = new ImageAnnotatorClient({
          apiKey: apiKey,
        });
      } else if (credentialsPath) {
        // Use service account credentials file
        this.googleVisionClient = new ImageAnnotatorClient({
          keyFilename: credentialsPath,
        });
      }

      logInfo('[OCR] Google Cloud Vision API initialized', {
        usingApiKey: !!apiKey,
        usingCredentialsFile: !!credentialsPath,
      });
    } catch (error) {
      logError(
        '[OCR] Failed to initialize Google Vision, falling back to Tesseract',
        error as Error
      );
      this.defaultProvider = 'tesseract';
      await this.initializeTesseract();
    }
  }

  /**
   * Extract text from a document file
   *
   * @param filePath - Local file path or file URL
   * @param mimeType - MIME type (e.g., 'application/pdf', 'image/jpeg')
   * @param options - OCR options
   * @returns OCR result with extracted text
   */
  static async extractText(
    filePath: string,
    mimeType: string,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    const provider = options.provider || this.defaultProvider;
    const startTime = Date.now();

    logInfo('[OCR] Starting text extraction', {
      provider,
      defaultProvider: this.defaultProvider,
      filePath: filePath.substring(0, 100), // Log first 100 chars to avoid huge URLs
      mimeType,
    });

    try {
      // Determine if file is PDF or image
      const isPDF = mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf');
      const isImage =
        mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/i.test(filePath);

      if (!isPDF && !isImage) {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      let result: OCRResult;

      if (provider === 'google_vision') {
        result = await this.extractWithGoogleVision(filePath, mimeType, options);
      } else if (provider === 'tesseract') {
        result = await this.extractWithTesseract(filePath, mimeType, options);
      } else {
        throw new Error(`Unsupported OCR provider: ${provider}`);
      }

      const processingTime = Date.now() - startTime;
      result.metadata = {
        ...result.metadata,
        processingTimeMs: processingTime,
        wordCount: result.text.split(/\s+/).filter((w) => w.length > 0).length,
      };

      logInfo('[OCR] Text extraction completed', {
        provider: result.provider,
        textLength: result.text.length,
        confidence: result.confidence,
        processingTimeMs: processingTime,
        language: result.language,
      });

      return result;
    } catch (error) {
      logError('[OCR] Text extraction failed', error as Error, {
        filePath,
        mimeType,
        provider,
      });

      // Return empty result on error
      return {
        text: '',
        confidence: 0,
        provider,
        metadata: {
          processingTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Extract text using Tesseract.js
   */
  private static async extractWithTesseract(
    filePath: string,
    mimeType: string,
    options: OCROptions
  ): Promise<OCRResult> {
    if (!this.tesseractInitialized) {
      await this.initializeTesseract();
    }

    try {
      const isPDF = mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf');

      // For PDFs, try pdf-parse first (faster and more accurate for text-based PDFs)
      if (isPDF) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const pdfParse = require('pdf-parse');
          const fileBuffer = await this.readFileBuffer(filePath);
          const pdfData = await pdfParse(fileBuffer);

          if (pdfData.text && pdfData.text.trim().length > 0) {
            logInfo('[OCR] PDF text extracted using pdf-parse', {
              filePath,
              textLength: pdfData.text.length,
              pageCount: pdfData.numpages,
            });

            return {
              text: pdfData.text,
              confidence: 0.9, // High confidence for text-based PDFs
              language: options.language,
              provider: 'tesseract', // Using pdf-parse but via Tesseract provider path
              metadata: {
                pageCount: pdfData.numpages,
              },
            };
          }
        } catch (pdfError) {
          // If pdf-parse fails (e.g., scanned PDF), fall through to OCR
          logWarn('[OCR] pdf-parse failed, falling back to OCR', {
            filePath,
            error: pdfError instanceof Error ? pdfError.message : String(pdfError),
          });
        }
      }

      // For images or scanned PDFs, use Tesseract OCR
      const Tesseract = await import('tesseract.js');
      const { createWorker } = Tesseract.default || Tesseract;

      // Determine language
      const lang = options.language || this.detectLanguageFromMimeType(mimeType);
      const tesseractLang = this.mapLanguageToTesseract(lang);

      // Read file buffer
      const fileBuffer = await this.readFileBuffer(filePath);

      // Create worker and perform OCR
      const worker = await createWorker(tesseractLang);

      try {
        const { data } = await worker.recognize(fileBuffer);
        await worker.terminate();

        return {
          text: data.text || '',
          confidence: data.confidence ? data.confidence / 100 : 0.5, // Tesseract returns 0-100
          language: lang,
          provider: 'tesseract',
          metadata: {
            wordCount: data.words?.length || 0,
          },
        };
      } finally {
        await worker.terminate();
      }
    } catch (error) {
      logError('[OCR] Tesseract extraction failed', error as Error, {
        filePath,
        mimeType,
      });
      throw error;
    }
  }

  /**
   * Extract text using Google Cloud Vision API
   */
  private static async extractWithGoogleVision(
    filePath: string,
    mimeType: string,
    options: OCROptions
  ): Promise<OCRResult> {
    if (!this.googleVisionClient) {
      await this.initializeGoogleVision();
    }

    if (!this.googleVisionClient) {
      // Fallback to Tesseract if Google Vision not available
      logWarn('[OCR] Google Vision not available, falling back to Tesseract');
      return this.extractWithTesseract(filePath, mimeType, options);
    }

    try {
      // Read file buffer
      const fileBuffer = await this.readFileBuffer(filePath);

      // Determine if PDF or image
      const isPDF = mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf');

      let text = '';
      let confidence = 0;
      const languageHints = options.language ? [options.language] : ['uz', 'en', 'ru'];

      if (isPDF) {
        // For PDFs, try pdf-parse first (faster for text-based PDFs)
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(fileBuffer);

          if (pdfData.text && pdfData.text.trim().length > 0) {
            logInfo('[OCR] PDF text extracted using pdf-parse (Google Vision path)', {
              filePath,
              textLength: pdfData.text.length,
            });

            return {
              text: pdfData.text,
              confidence: 0.9,
              language: options.language,
              provider: 'google_vision',
              metadata: {
                pageCount: pdfData.numpages,
              },
            };
          }
        } catch (pdfError) {
          // If pdf-parse fails, use Google Vision OCR for scanned PDFs
          logWarn('[OCR] pdf-parse failed for PDF, using Google Vision OCR', {
            error: pdfError instanceof Error ? pdfError.message : String(pdfError),
          });
        }

        // For scanned PDFs, use Google Vision Document AI (simplified - would need proper async handling in production)
        // For now, fall back to Tesseract for PDFs
        logWarn('[OCR] Google Vision PDF OCR not fully implemented, falling back to Tesseract');
        return this.extractWithTesseract(filePath, mimeType, options);
      } else {
        // For images, use direct text detection
        const [result] = await this.googleVisionClient.textDetection({
          image: { content: fileBuffer },
          imageContext: {
            languageHints: languageHints,
          },
        });

        const detections = result.textAnnotations || [];
        if (detections.length > 0) {
          // First detection is the full text
          text = detections[0].description || '';
          // Calculate average confidence from individual detections
          const confidences = detections
            .slice(1)
            .map((d: any) => d.confidence || 0)
            .filter((c: number) => c > 0);
          confidence =
            confidences.length > 0
              ? confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length
              : 0.8;
        }

        return {
          text: text.trim(),
          confidence: confidence,
          language: options.language,
          provider: 'google_vision',
        };
      }
    } catch (error) {
      logError('[OCR] Google Vision extraction failed', error as Error, {
        filePath,
        mimeType,
      });
      // Fallback to Tesseract
      return this.extractWithTesseract(filePath, mimeType, options);
    }
  }

  /**
   * Read file buffer from local path or URL
   */
  private static async readFileBuffer(filePath: string): Promise<Buffer> {
    // Check if it's a URL (Firebase Storage URL or local server URL)
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      // Download from URL
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
   * Detect language from MIME type or file path
   */
  private static detectLanguageFromMimeType(mimeType: string): string {
    // Default to multi-language (Uzbek + English + Russian)
    return 'uzb+eng+rus';
  }

  /**
   * Map language code to Tesseract language code
   */
  private static mapLanguageToTesseract(lang: string): string {
    const langMap: Record<string, string> = {
      uzb: 'uzb',
      eng: 'eng',
      rus: 'rus',
      'uzb+eng': 'uzb+eng',
      'uzb+eng+rus': 'uzb+eng+rus',
      'eng+rus': 'eng+rus',
    };

    return langMap[lang.toLowerCase()] || 'eng';
  }

  /**
   * Extract text from a document using file URL (handles both local and Firebase storage)
   *
   * @param fileUrl - File URL (local path or Firebase Storage URL)
   * @param fileName - File name (for MIME type detection)
   * @param mimeType - Optional MIME type
   * @param options - OCR options
   * @returns OCR result
   */
  static async extractTextFromUrl(
    fileUrl: string,
    fileName: string,
    mimeType?: string,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    // Detect MIME type from file extension if not provided
    if (!mimeType) {
      mimeType = this.detectMimeType(fileName);
    }

    // If file is stored locally, use file path directly
    if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
      return this.extractText(fileUrl, mimeType, options);
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
        return await this.extractText(tempPath, mimeType, options);
      } finally {
        // Clean up temp file
        try {
          await fs.unlink(tempPath);
        } catch (cleanupError) {
          logWarn('[OCR] Failed to cleanup temp file', {
            tempPath,
            error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
          });
        }
      }
    } catch (error) {
      logError('[OCR] Failed to download and process remote file', error as Error, {
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
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
      '.webp': 'image/webp',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
