import { Request, Response, NextFunction } from 'express';
import { captureError, captureMessage, Sentry } from '../sentry';
import { logError as logErrorStructured } from '../utils/logger';

// Sentry error handling middleware - should be the last middleware
export function sentryErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error with structured logging
  logErrorStructured(error, 'EXPRESS_ERROR_HANDLER');

  // Add request context to Sentry
  Sentry.withScope((scope) => {
    // Add user information if available
    if (req.user?.id) {
      scope.setUser({
        id: req.user.id.toString(),
        username: req.user.username,
        email: req.user.email,
      });
    }

    // Add request information (excluding IP for privacy)
    scope.setTag('url', req.url);
    scope.setTag('method', req.method);
    scope.setTag('user_agent', req.get('User-Agent'));

    // Add additional context with sensitive data scrubbed
    const scrubbedQuery = { ...req.query };
    const sensitiveKeys = ['token', 'password', 'secret', 'key', 'email', 'phone'];
    Object.keys(scrubbedQuery).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        scrubbedQuery[key] = '[REDACTED]';
      }
    });
    
    scope.setContext('request', {
      url: req.url,
      method: req.method,
      headers: {
        'user-agent': req.get('User-Agent'),
        'accept': req.get('Accept'),
        'content-type': req.get('Content-Type'),
      },
      query: scrubbedQuery,
      params: req.params,
    });

    // Capture the error
    Sentry.captureException(error);
  });

  // If response is not already sent, send error response
  if (!res.headersSent) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: isDevelopment ? error.message : 'Something went wrong',
      ...(isDevelopment && { stack: error.stack }),
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
    });
  }
}

// Request tracking middleware
export function sentryRequestHandler(req: Request, res: Response, next: NextFunction): void {
  // Add request ID for tracking
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId as string;

  // Set response header
  res.setHeader('X-Request-ID', requestId);

  // Add breadcrumb for request
  Sentry.addBreadcrumb({
    message: `${req.method} ${req.url}`,
    category: 'http',
    level: 'info',
    data: {
      url: req.url,
      method: req.method,
      query: req.query,
    },
  });

  next();
}

// Performance tracking middleware
export function sentryPerformanceHandler(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Add performance tracking
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log slow requests
    if (duration > 5000) { // 5 seconds
      captureMessage(
        `Slow request: ${req.method} ${req.url} took ${duration}ms`,
        'warning',
        {
          url: req.url,
          method: req.method,
          duration,
          statusCode: res.statusCode,
        }
      );
    }

    // Add performance breadcrumb
    Sentry.addBreadcrumb({
      message: `Request completed: ${req.method} ${req.url}`,
      category: 'http',
      level: res.statusCode >= 400 ? 'error' : 'info',
      data: {
        url: req.url,
        method: req.method,
        statusCode: res.statusCode,
        duration,
      },
    });
  });

  next();
}

// Helper to capture business logic errors
export function captureBusinessError(
  error: Error,
  context: string,
  userId?: number,
  additionalData?: Record<string, any>
): void {
  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'business_logic');
    scope.setTag('context', context);
    
    if (userId) {
      scope.setUser({ id: userId.toString() });
    }

    if (additionalData) {
      scope.setContext('business_data', additionalData);
    }

    Sentry.captureException(error);
  });
}