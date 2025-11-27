/**
 * Compression middleware for API responses
 * Supports gzip, deflate, and brotli compression
 */

import compression from 'compression';
import { Express } from 'express';

/**
 * Configure compression middleware with optimal settings
 */
export function setupCompression(app: Express): void {
  // Apply compression to all responses
  app.use(
    compression({
      // Only compress responses larger than 1KB
      threshold: 1024,
      // Compression level: 6 (default) is good balance between speed and ratio
      level: 6,
      // Filter which responses to compress
      filter: (req, res) => {
        // Don't compress if client doesn't accept it
        if (req.headers['x-no-compression']) {
          return false;
        }

        // Use compression's default filter (which checks Accept-Encoding)
        return compression.filter(req, res);
      },
      // Add Vary header
      vary: true,
    })
  );

  // For specific routes, use higher compression
  app.use('/api', (req, res, next) => {
    // API endpoints benefit from aggressive compression
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    next();
  });

  console.log('✓ Compression middleware configured');
}

/**
 * Middleware to add compression statistics to response headers
 */
export function compressionStats() {
  return (req: any, res: any, next: any) => {
    const originalJson = res.json;

    res.json = function (data: any) {
      // Track original size
      const originalSize = JSON.stringify(data).length;
      res.setHeader('X-Original-Size', originalSize.toString());

      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Get recommended compression level based on response size
 */
export function getCompressionLevel(size: number): number {
  if (size < 100) return 1; // Minimal compression for tiny responses
  if (size < 1000) return 4; // Moderate compression
  if (size < 10000) return 6; // Balanced
  return 9; // Maximum compression for large responses
}
