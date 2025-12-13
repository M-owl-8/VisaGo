/**
 * OCR Service Tests
 * Unit tests for OCR text extraction functionality
 */

import { OCRService, OCRResult } from '../ocr.service';
import { logInfo, logError, logWarn } from '../../middleware/logger';

// Mock dependencies
jest.mock('../../middleware/logger');
jest.mock('tesseract.js');
jest.mock('@google-cloud/vision');
jest.mock('pdf-parse');
jest.mock('fs/promises');
jest.mock('axios');

describe('OCRService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset default provider
    process.env.OCR_PROVIDER = 'tesseract';
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('extractText', () => {
    it('should extract text from PDF using pdf-parse', async () => {
      const mockPdfParse = require('pdf-parse');
      mockPdfParse.default = jest.fn().resolves({
        text: 'Sample PDF text content',
        numpages: 1,
      });

      const mockFs = require('fs/promises');
      mockFs.readFile = jest.fn().resolves(Buffer.from('mock pdf content'));

      const result = await OCRService.extractText('/path/to/document.pdf', 'application/pdf', {
        provider: 'tesseract',
      });

      expect(result.text).toBe('Sample PDF text content');
      expect(result.confidence).toBe(0.9);
      expect(result.provider).toBe('tesseract');
      expect(mockPdfParse.default).toHaveBeenCalled();
    });

    it('should extract text from image using Tesseract', async () => {
      const mockTesseract = require('tesseract.js');
      const mockWorker = {
        recognize: jest.fn().resolves({
          data: {
            text: 'Extracted text from image',
            confidence: 85,
            words: [{ text: 'Extracted' }, { text: 'text' }],
          },
        }),
        terminate: jest.fn().resolvedValue(undefined),
      };

      mockTesseract.createWorker = jest.fn().resolvedValue(mockWorker);

      const mockFs = require('fs/promises');
      mockFs.readFile = jest.fn().resolves(Buffer.from('mock image content'));

      const result = await OCRService.extractText('/path/to/image.jpg', 'image/jpeg', {
        provider: 'tesseract',
        language: 'eng',
      });

      expect(result.text).toBe('Extracted text from image');
      expect(result.confidence).toBe(0.85);
      expect(result.provider).toBe('tesseract');
      expect(mockWorker.recognize).toHaveBeenCalled();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('should handle OCR errors gracefully', async () => {
      const mockFs = require('fs/promises');
      mockFs.readFile = jest.fn().rejects(new Error('File not found'));

      const result = await OCRService.extractText('/path/to/nonexistent.pdf', 'application/pdf', {
        provider: 'tesseract',
      });

      expect(result.text).toBe('');
      expect(result.confidence).toBe(0);
      expect(logError).toHaveBeenCalled();
    });

    it('should return empty result for unsupported file types', async () => {
      const result = await OCRService.extractText('/path/to/document.doc', 'application/msword', {
        provider: 'tesseract',
      });

      expect(result.text).toBe('');
      expect(result.confidence).toBe(0);
    });
  });

  describe('extractTextFromUrl', () => {
    it('should extract text from local file path', async () => {
      const mockPdfParse = require('pdf-parse');
      mockPdfParse.default = jest.fn().resolves({
        text: 'Local PDF text',
        numpages: 1,
      });

      const mockFs = require('fs/promises');
      mockFs.readFile = jest.fn().resolves(Buffer.from('mock pdf'));

      const result = await OCRService.extractTextFromUrl(
        '/local/path/document.pdf',
        'document.pdf',
        'application/pdf'
      );

      expect(result.text).toBe('Local PDF text');
    });

    it('should download and extract text from remote URL', async () => {
      const mockAxios = require('axios');
      mockAxios.default = {
        get: jest.fn().resolves({
          data: Buffer.from('remote pdf content'),
        }),
      };

      const mockPdfParse = require('pdf-parse');
      mockPdfParse.default = jest.fn().resolves({
        text: 'Remote PDF text',
        numpages: 1,
      });

      const mockFs = require('fs/promises');
      mockFs.mkdir = jest.fn().resolvedValue(undefined);
      mockFs.writeFile = jest.fn().resolvedValue(undefined);
      mockFs.readFile = jest.fn().resolves(Buffer.from('remote pdf content'));
      mockFs.unlink = jest.fn().resolvedValue(undefined);

      const result = await OCRService.extractTextFromUrl(
        'https://example.com/document.pdf',
        'document.pdf',
        'application/pdf'
      );

      expect(result.text).toBe('Remote PDF text');
      expect(mockAxios.default.get).toHaveBeenCalled();
      expect(mockFs.unlink).toHaveBeenCalled(); // Cleanup temp file
    });
  });

  describe('language mapping', () => {
    it('should map language codes correctly for Tesseract', async () => {
      const mockTesseract = require('tesseract.js');
      const mockWorker = {
        recognize: jest.fn().resolves({
          data: { text: 'test', confidence: 80, words: [] },
        }),
        terminate: jest.fn().resolvedValue(undefined),
      };

      mockTesseract.createWorker = jest.fn().resolvedValue(mockWorker);

      const mockFs = require('fs/promises');
      mockFs.readFile = jest.fn().resolves(Buffer.from('test'));

      await OCRService.extractText('/path/to/image.jpg', 'image/jpeg', {
        provider: 'tesseract',
        language: 'uzb+eng+rus',
      });

      // Verify worker was created with correct language
      expect(mockTesseract.createWorker).toHaveBeenCalledWith('uzb+eng+rus');
    });
  });

  describe('provider selection', () => {
    it('should use Tesseract as default provider', async () => {
      delete process.env.OCR_PROVIDER;

      const mockPdfParse = require('pdf-parse');
      mockPdfParse.default = jest.fn().resolves({
        text: 'test',
        numpages: 1,
      });

      const mockFs = require('fs/promises');
      mockFs.readFile = jest.fn().resolves(Buffer.from('test'));

      const result = await OCRService.extractText('/path/to/document.pdf', 'application/pdf');

      expect(result.provider).toBe('tesseract');
    });

    it('should use Google Vision when provider is set', async () => {
      process.env.OCR_PROVIDER = 'google_vision';
      process.env.GOOGLE_VISION_API_KEY = 'test-key';

      const mockVision = require('@google-cloud/vision');
      const mockClient = {
        textDetection: jest.fn().resolvedValue([
          {
            textAnnotations: [{ description: 'Google Vision text', confidence: 0.9 }],
          },
        ]),
      };

      mockVision.ImageAnnotatorClient = jest.fn().mockReturnValue(mockClient);

      const mockFs = require('fs/promises');
      mockFs.readFile = jest.fn().resolves(Buffer.from('test'));

      const result = await OCRService.extractText('/path/to/image.jpg', 'image/jpeg', {
        provider: 'google_vision',
      });

      expect(result.provider).toBe('google_vision');
    });
  });
});
