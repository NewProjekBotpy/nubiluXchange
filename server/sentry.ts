import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { logInfo } from "./utils/logger";

// Helper function to scrub sensitive data from objects
function scrubSensitiveData(data: any, sensitiveKeys: string[]): any {
  if (!data || typeof data !== 'object') return data;
  
  const scrubbed = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in scrubbed) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      scrubbed[key] = '[REDACTED]';
    } else if (typeof scrubbed[key] === 'object') {
      scrubbed[key] = scrubSensitiveData(scrubbed[key], sensitiveKeys);
    }
  }
  
  return scrubbed;
}

export function initSentry() {
  // Only initialize Sentry if DSN is provided and not a placeholder
  const sentryDsn = process.env.SENTRY_DSN;
  
  if (!sentryDsn || sentryDsn.includes('placeholder')) {
    logInfo('🔧 Sentry DSN not configured or is placeholder - error tracking disabled', { context: 'initSentry' });
    logInfo('💡 To enable Sentry: Set SENTRY_DSN environment variable to a valid Sentry DSN', { context: 'initSentry' });
    return;
  }

  const environment = process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment,
    integrations: [
      // Profiling integration
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring - optimized for production
    tracesSampleRate: isProduction ? 0.05 : 1.0,
    // Profiling - reduced rate for production
    profilesSampleRate: isProduction ? 0.02 : 0.1,
    // Release tracking with proper versioning
    release: process.env.SENTRY_RELEASE || process.env.npm_package_version || `nxe-marketplace@${new Date().toISOString().split('T')[0]}`,
    // Server name for identification
    serverName: process.env.SENTRY_SERVER_NAME || process.env.RAILWAY_REPLICA_ID || process.env.RENDER_INSTANCE_ID || 'unknown',
    // Maximum breadcrumbs to reduce memory usage
    maxBreadcrumbs: isProduction ? 50 : 100,
    // Debug mode for development
    debug: !isProduction,
    // Attach stack trace for captured messages
    attachStacktrace: true,
    // Send default PII (disable for GDPR compliance)
    sendDefaultPii: false,
    // Enhanced data scrubbing for production
    beforeSend(event) {
      // Don't send events in test environment
      if (process.env.NODE_ENV === 'test') {
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
      
      // Scrub sensitive data from query params and form data
      const sensitiveKeys = ['token', 'password', 'secret', 'key', 'email', 'phone', 'credit_card', 'ssn', 'api_key'];
      
      if (event.request?.query_string && typeof event.request.query_string === 'string') {
        event.request.query_string = event.request.query_string.replace(
          new RegExp(`(${sensitiveKeys.join('|')})=[^&]*`, 'gi'),
          '$1=[REDACTED]'
        );
      }

      // Scrub POST data
      if (event.request?.data) {
        if (typeof event.request.data === 'string') {
          try {
            const parsed = JSON.parse(event.request.data);
            event.request.data = JSON.stringify(scrubSensitiveData(parsed, sensitiveKeys));
          } catch {
            // If not JSON, treat as form data
            sensitiveKeys.forEach(key => {
              if (event.request?.data && typeof event.request.data === 'string') {
                event.request.data = event.request.data.replace(
                  new RegExp(`${key}=[^&]*`, 'gi'),
                  `${key}=[REDACTED]`
                );
              }
            });
          }
        } else if (typeof event.request.data === 'object') {
          event.request.data = scrubSensitiveData(event.request.data, sensitiveKeys);
        }
      }
      
      // Remove sensitive user data
      if (event.user) {
        delete event.user.ip_address;
        // Keep user ID for debugging but remove email in production
        if (isProduction && event.user.email) {
          delete event.user.email;
        }
      }

      // Scrub exception values
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
      // Don't send transaction events for health checks
      if (event.transaction?.includes('/health') || 
          event.transaction?.includes('/ping') ||
          event.transaction?.includes('/favicon.ico')) {
        return null;
      }
      return event;
    },
  });

  logInfo(`Sentry initialized for ${process.env.NODE_ENV} environment`, { context: 'initSentry' });
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