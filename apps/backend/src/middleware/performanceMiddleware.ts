import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';

/**
 * Middleware to track request performance
 */
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const route = `${req.method} ${req.route?.path || req.path}`;

  // Determine if this is an LLM endpoint that typically takes longer
  const isLlmEndpoint = [
    '/api/chat',
    '/api/applications/ai-generate',
    '/api/document-checklist',
  ].some((path) => req.path.startsWith(path));

  // Use higher threshold for LLM endpoints, lower for general endpoints
  const thresholdMs = isLlmEndpoint ? 15000 : 2000;
  const hardCeilingMs = 30000; // Always log as error if exceeds this

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Only log if duration exceeds threshold
    if (duration > thresholdMs) {
      const logLevel = duration > hardCeilingMs ? 'error' : isLlmEndpoint ? 'warn' : 'warn';
      const message = `[Performance] Slow request: ${route} took ${duration}ms`;

      if (logLevel === 'error') {
        console.error(message);
        Sentry.captureMessage(`Slow request: ${route}`, {
          level: 'error',
          extra: {
            duration,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            isLlmEndpoint,
          },
          tags: {
            performance: 'slow',
            route,
          },
        });
      } else {
        console.warn(message);
        // Only send to Sentry for non-LLM endpoints or if it's really slow
        if (!isLlmEndpoint || duration > hardCeilingMs) {
          Sentry.captureMessage(`Slow request: ${route}`, {
            level: 'warning',
            extra: {
              duration,
              method: req.method,
              url: req.originalUrl,
              statusCode: res.statusCode,
              isLlmEndpoint,
            },
            tags: {
              performance: 'slow',
              route,
            },
          });
        }
      }
    }
  });

  next();
};

/**
 * Middleware to add performance headers
 */
export const performanceHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Capture writeHead so we can inject the header before the response is sent
  const originalWriteHead = res.writeHead;
  let headerSet = false;

  res.writeHead = function writeHeadOverride(this: Response, ...args: any[]) {
    if (!headerSet) {
      const duration = Date.now() - startTime;
      res.setHeader('X-Response-Time', `${duration}ms`);
      headerSet = true;
    }
    return originalWriteHead.apply(this, args as any);
  };

  next();
};
