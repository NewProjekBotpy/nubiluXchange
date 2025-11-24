import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import crypto from 'crypto';

/**
 * Response Compression Middleware
 * Implements gzip compression for API responses
 */
export const compressionMiddleware = compression({
  filter: (req: Request, res: Response) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Compress all responses except for specific content types
    const contentType = res.getHeader('Content-Type');
    if (contentType && typeof contentType === 'string') {
      // Don't compress images, videos, or already compressed content
      const skipTypes = ['image/', 'video/', 'audio/', 'application/zip', 'application/gzip'];
      if (skipTypes.some(type => contentType.includes(type))) {
        return false;
      }
    }

    // Default to compression
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6 // Compression level (0-9, 6 is default balance between speed and compression)
});

/**
 * ETag Middleware
 * Generates ETags for responses and handles conditional requests
 */
export function etagMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only apply ETags to GET and HEAD requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  // Store original send function
  const originalSend = res.send.bind(res);

  // Override send to add ETag
  res.send = function(body: any): Response {
    // Only generate ETag for successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Generate ETag from response body
      const etag = generateETag(body);
      res.setHeader('ETag', etag);

      // Check if client has a matching ETag (conditional request)
      const clientETag = req.headers['if-none-match'];
      if (clientETag === etag) {
        // Content hasn't changed, return 304 Not Modified
        res.status(304);
        return originalSend.call(res, '');
      }
    }

    return originalSend.call(res, body);
  };

  next();
}

/**
 * Generate ETag from response body
 */
function generateETag(body: any): string {
  const content = typeof body === 'string' ? body : JSON.stringify(body);
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return `"${hash}"`;
}

/**
 * Cache Control Headers Middleware
 * Sets appropriate cache-control headers based on route type
 */
export function cacheControlMiddleware(options: {
  public?: boolean;
  maxAge?: number;
  sMaxAge?: number;
  noCache?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
} = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const directives: string[] = [];

    if (options.noStore) {
      directives.push('no-store');
    } else if (options.noCache) {
      directives.push('no-cache');
    } else {
      if (options.public) {
        directives.push('public');
      } else {
        directives.push('private');
      }

      if (options.maxAge !== undefined) {
        directives.push(`max-age=${options.maxAge}`);
      }

      if (options.sMaxAge !== undefined) {
        directives.push(`s-maxage=${options.sMaxAge}`);
      }

      if (options.mustRevalidate) {
        directives.push('must-revalidate');
      }
    }

    res.setHeader('Cache-Control', directives.join(', '));
    next();
  };
}

/**
 * Dynamic cache control based on route patterns
 */
export function dynamicCacheControl(req: Request, res: Response, next: NextFunction) {
  const path = req.path;

  // No cache for authentication and user-specific data
  if (path.includes('/auth') || path.includes('/user/me') || path.includes('/notifications')) {
    res.setHeader('Cache-Control', 'private, no-cache, must-revalidate');
  }
  // Short cache for frequently changing data
  else if (path.includes('/products') || path.includes('/chats')) {
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes
  }
  // Longer cache for static data
  else if (path.includes('/categories') || path.includes('/news')) {
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
  }
  // Very long cache for public assets
  else if (path.includes('/uploads') || path.includes('/assets')) {
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable'); // 24 hours
  }
  // Default: short private cache
  else {
    res.setHeader('Cache-Control', 'private, max-age=60');
  }

  next();
}

/**
 * Vary header middleware
 * Ensures proper caching based on request headers
 */
export function varyHeaderMiddleware(req: Request, res: Response, next: NextFunction) {
  // Add Vary header to ensure caching respects encoding and authentication
  const varyHeaders = ['Accept-Encoding', 'Authorization'];
  
  // Add User-Agent for mobile-specific responses
  if (req.path.includes('/api/')) {
    varyHeaders.push('User-Agent');
  }

  res.setHeader('Vary', varyHeaders.join(', '));
  next();
}

/**
 * Response timing header
 * Adds X-Response-Time header for performance monitoring
 */
export function responseTimeMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    res.setHeader('X-Response-Time', `${duration}ms`);
  });

  next();
}
