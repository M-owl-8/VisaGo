/**
 * Image optimization utilities for React Native
 * Handles image compression, caching, and lazy loading
 */

import { Image, ImageProps } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ImageCache {
  uri: string;
  timestamp: number;
  size: number;
}

interface OptimizedImageConfig {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

const CACHE_KEY_PREFIX = 'image_cache:';
const IMAGE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Optimize image dimensions
 */
export function getOptimizedDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const widthRatio = maxWidth / originalWidth;
  const heightRatio = maxHeight / originalHeight;
  const ratio = Math.min(widthRatio, heightRatio);

  return {
    width: Math.floor(originalWidth * ratio),
    height: Math.floor(originalHeight * ratio),
  };
}

/**
 * Generate cache key for image
 */
function getCacheKey(uri: string, config?: OptimizedImageConfig): string {
  const configStr = config
    ? `_${config.width}_${config.height}_${config.quality}`
    : '';
  return `${CACHE_KEY_PREFIX}${uri}${configStr}`;
}

/**
 * Cache image locally
 */
export async function cacheImage(
  uri: string,
  imageData: string,
  config?: OptimizedImageConfig
): Promise<void> {
  try {
    const cacheKey = getCacheKey(uri, config);
    const cacheEntry: ImageCache = {
      uri,
      timestamp: Date.now(),
      size: imageData.length,
    };

    // Save metadata and data
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
    await AsyncStorage.setItem(`${cacheKey}:data`, imageData);

    // Check cache size and cleanup if needed
    await cleanupImageCache();
  } catch (error) {
    console.warn('Failed to cache image:', error);
  }
}

/**
 * Get cached image
 */
export async function getCachedImage(
  uri: string,
  config?: OptimizedImageConfig
): Promise<string | null> {
  try {
    const cacheKey = getCacheKey(uri, config);
    const cacheEntry = await AsyncStorage.getItem(cacheKey);

    if (!cacheEntry) {
      return null;
    }

    const entry: ImageCache = JSON.parse(cacheEntry);

    // Check if cache expired
    if (Date.now() - entry.timestamp > IMAGE_CACHE_TTL) {
      await AsyncStorage.removeItem(cacheKey);
      await AsyncStorage.removeItem(`${cacheKey}:data`);
      return null;
    }

    // Return cached data
    return await AsyncStorage.getItem(`${cacheKey}:data`);
  } catch (error) {
    console.warn('Failed to get cached image:', error);
    return null;
  }
}

/**
 * Cleanup old/large cache entries
 */
export async function cleanupImageCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const imageKeys = allKeys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));

    let totalSize = 0;
    const entries: Array<{ key: string; size: number; timestamp: number }> =
      [];

    // Collect all cache entries
    for (const key of imageKeys) {
      if (!key.includes(':data')) {
        const entry = await AsyncStorage.getItem(key);
        if (entry) {
          const parsed: ImageCache = JSON.parse(entry);
          entries.push({
            key,
            size: parsed.size,
            timestamp: parsed.timestamp,
          });
          totalSize += parsed.size;
        }
      }
    }

    // Remove old entries if exceeding max size
    if (totalSize > MAX_CACHE_SIZE) {
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp);

      for (const entry of entries) {
        await AsyncStorage.removeItem(entry.key);
        await AsyncStorage.removeItem(`${entry.key}:data`);
        totalSize -= entry.size;

        if (totalSize <= MAX_CACHE_SIZE * 0.9) {
          break;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup image cache:', error);
  }
}

/**
 * Clear all image cache
 */
export async function clearImageCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const imageKeys = allKeys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
    await AsyncStorage.multiRemove(imageKeys);
  } catch (error) {
    console.warn('Failed to clear image cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getImageCacheStats(): Promise<{
  entries: number;
  size: number;
  files: number;
}> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const imageKeys = allKeys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));

    let totalSize = 0;
    const uniqueKeys = new Set<string>();

    for (const key of imageKeys) {
      if (!key.includes(':data')) {
        uniqueKeys.add(key);
        const entry = await AsyncStorage.getItem(key);
        if (entry) {
          const parsed: ImageCache = JSON.parse(entry);
          totalSize += parsed.size;
        }
      }
    }

    return {
      entries: uniqueKeys.size,
      size: totalSize,
      files: imageKeys.length,
    };
  } catch (error) {
    console.warn('Failed to get cache stats:', error);
    return { entries: 0, size: 0, files: 0 };
  }
}

/**
 * Image source optimization
 */
export function getOptimizedImageSource(
  uri: string,
  config?: OptimizedImageConfig
): ImageProps['source'] {
  return {
    uri,
    ...(config?.width && { width: config.width }),
    ...(config?.height && { height: config.height }),
    cache: 'force-cache',
  };
}

/**
 * Progressive image loading component helper
 */
export interface ProgressiveImageConfig {
  lowResUrl: string;
  highResUrl: string;
  placeholder?: string;
  width: number;
  height: number;
}

/**
 * Get progressive image URLs (low-res first, then high-res)
 */
export function getProgressiveImageUrls(
  imageUrl: string,
  width: number,
  height: number
): ProgressiveImageConfig {
  // Low-res placeholder (25% quality)
  const lowResUrl = optimizeImageUrl(imageUrl, width / 4, height / 4, 25);

  // High-res main image (80% quality for balance)
  const highResUrl = optimizeImageUrl(imageUrl, width, height, 80);

  return {
    lowResUrl,
    highResUrl,
    width,
    height,
  };
}

/**
 * Optimize image URL with parameters
 */
export function optimizeImageUrl(
  url: string,
  width: number,
  height: number,
  quality: number = 75
): string {
  // If URL is a data URI or local file, return as-is
  if (url.startsWith('data:') || url.startsWith('file:')) {
    return url;
  }

  // Add query parameters for image CDN optimization
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${Math.floor(width)}&h=${Math.floor(
    height
  )}&q=${quality}&fm=auto`;
}

/**
 * Image dimensions for common use cases
 */
export const IMAGE_SIZES = {
  AVATAR: {
    width: 48,
    height: 48,
  },
  AVATAR_LARGE: {
    width: 128,
    height: 128,
  },
  COUNTRY_FLAG: {
    width: 64,
    height: 40,
  },
  THUMBNAIL: {
    width: 120,
    height: 120,
  },
  MEDIUM: {
    width: 300,
    height: 300,
  },
  LARGE: {
    width: 600,
    height: 600,
  },
  FULLSCREEN: {
    width: 800,
    height: 1200,
  },
};

/**
 * Preload images for faster rendering
 */
export async function preloadImages(urls: string[]): Promise<void> {
  const promises = urls.map(
    (url) =>
      new Promise<void>((resolve) => {
        Image.prefetch(url).then(resolve).catch(() => resolve());
      })
  );

  await Promise.allSettled(promises);
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}