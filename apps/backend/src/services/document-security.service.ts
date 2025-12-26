import { ImageAnnotatorClient } from '@google-cloud/vision';
import { logWarn } from '../middleware/logger';

export interface UploadSecurityInput {
  buffer: Buffer;
  mimeType: string;
  size: number;
  fileName: string;
}

export interface UploadSecurityResult {
  ok: boolean;
  reason?: string;
}

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_BYTES = parseInt(process.env.DOCUMENT_MAX_BYTES || `${10 * 1024 * 1024}`, 10); // 10MB default
const ENABLE_SAFESEARCH = process.env.ENABLE_SAFESEARCH === 'true';

export class DocumentSecurityService {
  static async validateUpload(input: UploadSecurityInput): Promise<UploadSecurityResult> {
    if (input.size > MAX_FILE_BYTES) {
      return {
        ok: false,
        reason: `File too large. Max ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(1)}MB.`,
      };
    }

    if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
      return {
        ok: false,
        reason: 'Unsupported file type. Allowed: PDF, JPEG, PNG.',
      };
    }

    if (ENABLE_SAFESEARCH && input.mimeType.startsWith('image/')) {
      const safe = await this.safeSearchCheck(input.buffer, input.fileName);
      if (!safe.ok) {
        return safe;
      }
    }

    return { ok: true };
  }

  private static async safeSearchCheck(
    buffer: Buffer,
    fileName: string
  ): Promise<UploadSecurityResult> {
    try {
      const client = new ImageAnnotatorClient();
      const [result] = await client.safeSearchDetection({ image: { content: buffer } });
      const safeSearch = result.safeSearchAnnotation;

      const likelihoods = ['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];
      const thresholds = ['LIKELY', 'VERY_LIKELY'];

      const flagged =
        safeSearch &&
        ['adult', 'violence', 'racy'].some((field) => {
          // @ts-expect-error dynamic field access
          const level = safeSearch[field];
          return level && thresholds.includes(likelihoods[level] || '');
        });

      if (flagged) {
        return {
          ok: false,
          reason: 'Image failed safety checks (adult/violence content detected).',
        };
      }

      return { ok: true };
    } catch (error: any) {
      logWarn('[DocumentSecurity] SafeSearch check failed, allowing upload (non-blocking)', {
        fileName,
        error: error instanceof Error ? error.message : String(error),
      });
      return { ok: true };
    }
  }
}

