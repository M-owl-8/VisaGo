import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';

/**
 * Middleware to track request performance
 */
export const performanceMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startTime = Date.now();
  const route = `${req.method} ${req.route?.path || req.path}`;

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    if (duration > 3000) {
      console.warn(`[Performance] Slow request: ${route} took ${duration}ms`);
      Sentry.captureMessage(`Slow request: ${route}`, {
        level: 'warning',
        extra: {
          duration,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
        },
        tags: {
          performance: 'slow',
          route,
        },
      });
    }
  });

  next();
};

/**
 * Middleware to add performance headers
 */
export const performanceHeadersMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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

