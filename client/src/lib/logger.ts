/**
 * Client-side Logger Utility
 * Environment-aware logging for browser with production safety
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
  component?: string;
  operation?: string;
  userId?: number;
  [key: string]: any;
}

class ClientLogger {
  private isDevelopment: boolean;
  private logLevel: LogLevel;
  private enableSentry: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.MODE === 'development';
    this.logLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || (this.isDevelopment ? 'debug' : 'warn');
    this.enableSentry = import.meta.env.VITE_LOG_SENTRY_FORWARD === 'true';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Redact sensitive data from logs
   */
  private redact(data: any): any {
    if (!data) return data;
    
    if (typeof data === 'string') {
      return data
        .replace(/token[:\s]*[^\s,}]*/gi, 'token: [REDACTED]')
        .replace(/password[:\s]*[^\s,}]*/gi, 'password: [REDACTED]')
        .replace(/secret[:\s]*[^\s,}]*/gi, 'secret: [REDACTED]')
        .replace(/authorization[:\s]*[^\s,}]*/gi, 'authorization: [REDACTED]')
        .replace(/api[_-]?key[:\s]*[^\s,}]*/gi, 'api_key: [REDACTED]');
    }

    if (typeof data === 'object') {
      const redacted = { ...data };
      const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization', 'sessionId', 'cookie'];
      
      for (const key of Object.keys(redacted)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          redacted[key] = '[REDACTED]';
        } else if (typeof redacted[key] === 'object') {
          redacted[key] = this.redact(redacted[key]);
        }
      }
      return redacted;
    }

    return data;
  }

  /**
   * Format log message with metadata
   */
  private formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (meta?.component) {
      return `${prefix} [${meta.component}] ${message}`;
    }
    
    return `${prefix} ${message}`;
  }

  debug(message: string, meta?: LogMeta): void {
    if (!this.shouldLog('debug')) return;
    
    const formatted = this.formatMessage('debug', message, meta);
    if (this.isDevelopment) {
      console.debug(formatted, meta ? this.redact(meta) : '');
    }
  }

  info(message: string, meta?: LogMeta): void {
    if (!this.shouldLog('info')) return;
    
    const formatted = this.formatMessage('info', message, meta);
    if (this.isDevelopment) {
      console.info(formatted, meta ? this.redact(meta) : '');
    }
  }

  warn(message: string, meta?: LogMeta): void {
    if (!this.shouldLog('warn')) return;
    
    const formatted = this.formatMessage('warn', message, meta);
    console.warn(formatted, meta ? this.redact(meta) : '');
  }

  error(message: string, error?: Error | unknown, meta?: LogMeta): void {
    if (!this.shouldLog('error')) return;
    
    const formatted = this.formatMessage('error', message, meta);
    console.error(formatted, error, meta ? this.redact(meta) : '');

    // Forward to Sentry if enabled
    if (this.enableSentry && typeof window !== 'undefined' && (window as any).Sentry) {
      try {
        (window as any).Sentry.captureException(error || new Error(message), {
          extra: this.redact(meta)
        });
      } catch (e) {
        // Fail silently
      }
    }
  }

  /**
   * Log HTTP request/response
   */
  http(method: string, url: string, status?: number, meta?: LogMeta): void {
    if (!this.shouldLog('debug')) return;
    
    const message = `${method} ${url} ${status ? `[${status}]` : ''}`;
    this.debug(message, { ...meta, type: 'http' });
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, meta?: LogMeta): void {
    if (!this.shouldLog('debug')) return;
    
    this.debug(`Performance: ${operation} took ${duration}ms`, { ...meta, duration });
  }
}

// Export singleton instance
export const logger = new ClientLogger();

// Export individual functions for convenience
export const logDebug = (message: string, meta?: LogMeta) => logger.debug(message, meta);
export const logInfo = (message: string, meta?: LogMeta) => logger.info(message, meta);
export const logWarning = (message: string, meta?: LogMeta) => logger.warn(message, meta);
export const logError = (message: string, error?: Error | unknown, meta?: LogMeta) => logger.error(message, error, meta);
export const logHttp = (method: string, url: string, status?: number, meta?: LogMeta) => logger.http(method, url, status, meta);
export const logPerformance = (operation: string, duration: number, meta?: LogMeta) => logger.performance(operation, duration, meta);

export default logger;
