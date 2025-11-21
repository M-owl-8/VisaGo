/**
 * Sharp Wrapper - Makes sharp optional
 * If sharp fails to load, the app will still start but image processing will be disabled
 */

let sharpInstance: any = null;
let sharpAvailable = false;

// Try to load sharp dynamically
try {
  sharpInstance = require('sharp');
  sharpAvailable = true;
  console.log('✅ Sharp image processing library loaded successfully');
} catch (error: any) {
  // Sharp is optional - image processing will be disabled but app continues normally
  console.log('ℹ️  Sharp image processing library not available (optional feature)');
  if (process.env.NODE_ENV === 'development') {
    console.log('   Image compression and thumbnails will be disabled');
    console.log('   To enable: npm install --platform=linux --arch=x64 sharp');
  }
  sharpAvailable = false;
}

export interface SharpResizeOptions {
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  withoutEnlargement?: boolean;
}

export interface SharpMetadata {
  width?: number;
  height?: number;
  format?: string;
  size?: number;
}

/**
 * Check if sharp is available
 */
export const isSharpAvailable = (): boolean => {
  return sharpAvailable;
};

/**
 * Resize image buffer
 */
export async function resizeImage(
  buffer: Buffer,
  width: number,
  height: number,
  options: SharpResizeOptions = {}
): Promise<Buffer> {
  if (!sharpAvailable || !sharpInstance) {
    throw new Error('Sharp is not available - image processing disabled');
  }
  return sharpInstance(buffer).resize(width, height, options).toBuffer();
}

/**
 * Get image metadata
 */
export async function getImageMetadata(buffer: Buffer): Promise<SharpMetadata> {
  if (!sharpAvailable || !sharpInstance) {
    // Return minimal metadata if sharp is not available
    return {};
  }
  return sharpInstance(buffer).metadata();
}

/**
 * Compress image
 */
export async function compressImage(
  buffer: Buffer,
  maxWidth: number = 2000,
  maxHeight: number = 2000
): Promise<Buffer> {
  if (!sharpAvailable || !sharpInstance) {
    // Return original buffer if sharp is not available
    return buffer;
  }
  try {
    return sharpInstance(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();
  } catch (error) {
    console.error('Image compression failed:', error);
    return buffer; // Return original buffer on error
  }
}

/**
 * Generate thumbnail
 */
export async function generateThumbnail(
  buffer: Buffer,
  width: number = 200,
  height: number = 200
): Promise<Buffer> {
  if (!sharpAvailable || !sharpInstance) {
    throw new Error('Sharp is not available - thumbnail generation disabled');
  }
  try {
    return sharpInstance(buffer).resize(width, height, { fit: 'cover' }).toBuffer();
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    throw error;
  }
}
