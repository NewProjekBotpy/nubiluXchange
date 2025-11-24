import * as Sentry from "@sentry/react";
import { logger } from '@/lib/logger';

export function initSentry() {
  // Only initialize Sentry if DSN is provided
  if (!import.meta.env.VITE_SENTRY_DSN) {
    logger.info('Sentry DSN not found - error tracking disabled', { component: 'Sentry' });
    return;
  }

  const environment = import.meta.env.MODE || 'development';
  const isProduction = environment === 'production';

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Capture replay sessions on errors
        maskAllText: isProduction,
        blockAllMedia: true,
        // In production, be more selective about what to capture
        maskAllInputs: isProduction,
      }),
    ],
    // Performance Monitoring - optimized for production
    tracesSampleRate: isProduction ? 0.05 : 1.0,
    // Session Replay - more conservative in production
    replaysSessionSampleRate: isProduction ? 0.02 : 0.1,
    replaysOnErrorSampleRate: isProduction ? 0.5 : 1.0,
    // Release tracking with proper versioning
    release: import.meta.env.VITE_SENTRY_RELEASE || import.meta.env.VITE_APP_VERSION || `nxe-marketplace-client@${new Date().toISOString().split('T')[0]}`,
    // Maximum breadcrumbs to reduce memory usage
    maxBreadcrumbs: isProduction ? 50 : 100,
    // Debug mode for development
    debug: !isProduction,
    // Send default PII (disable for GDPR compliance)
    sendDefaultPii: false,
    // Normalize transaction names for better grouping
    normalizeDepth: 3,
    // Enhanced data scrubbing for client-side
    beforeSend(event) {
      // Don't send events in test environment
      if (import.meta.env.MODE === 'test') {
        return null;
      }

      // Filter out sensitive information from headers
      if (event.request?.headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token', 'x-csrf-token'];
        sensitiveHeaders.forEach(header => {
          if (event.request?.headers) {
            delete event.request.headers[header];
          }
        });
      }
      
      // Scrub sensitive data from URLs and query params
      const sensitiveKeys = ['token', 'password', 'secret', 'key', 'email', 'phone', 'credit_card', 'ssn', 'api_key'];
      
      if (event.request?.url) {
        event.request.url = event.request.url.replace(
          new RegExp(`(${sensitiveKeys.join('|')})=([^&]*)`, 'gi'),
          '$1=[REDACTED]'
        );
      }

      // Remove sensitive user data
      if (event.user) {
        // Keep user ID for debugging but remove email in production
        if (isProduction && event.user.email) {
          delete event.user.email;
        }
      }

      // Filter out common browser errors that aren't actionable
      if (event.exception?.values) {
        const firstException = event.exception.values[0];
        if (firstException?.value) {
          const ignoredErrors = [
            'ResizeObserver loop limit exceeded',
            'Non-Error promise rejection captured',
            'Network request failed',
            'Load failed',
            'Script error',
            'ChunkLoadError',
          ];
          
          if (ignoredErrors.some(ignored => firstException.value!.includes(ignored))) {
            return null;
          }
        }
      }

      // Scrub sensitive data from error messages
      if (event.exception?.values) {
        event.exception.values.forEach(exception => {
          if (exception.value) {
            sensitiveKeys.forEach(key => {
              exception.value = exception.value?.replace(
                new RegExp(`${key}[\"'\\s]*[:=][\"'\\s]*[^\\s,;)}&]*`, 'gi'),
                `${key}=[REDACTED]`
              );
            });
          }
        });
      }
      
      return event;
    },
    
    // Filter out noisy transactions
    beforeSendTransaction(event) {
      // Filter out very short transactions that aren't useful
      if (event.spans && event.spans.length === 0) {
        return null;
      }
      return event;
    },
  });

  logger.info('Sentry initialized', { component: 'Sentry', environment: import.meta.env.MODE });
}

// Helper functions for manual error reporting
export function captureError(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.withScope(scope => {
      Object.keys(context).forEach(key => {
        scope.setTag(key, context[key]);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
  if (context) {
    Sentry.withScope(scope => {
      Object.keys(context).forEach(key => {
        scope.setTag(key, context[key]);
      });
      Sentry.captureMessage(message, level);
    });
  } else {
    Sentry.captureMessage(message, level);
  }
}

export { Sentry };