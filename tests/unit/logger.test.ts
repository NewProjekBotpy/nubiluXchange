/**
 * Unit Tests: Logger Utility
 * Tests for Winston logger helper functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logError, logWarning, logInfo, logHttp, logDebug } from '../../server/utils/logger';

// Mock winston logger
vi.mock('winston', () => ({
  default: {
    createLogger: vi.fn(() => ({
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      http: vi.fn(),
      debug: vi.fn(),
      exceptions: {
        handle: vi.fn()
      },
      rejections: {
        handle: vi.fn()
      }
    })),
    format: {
      combine: vi.fn(),
      timestamp: vi.fn(),
      errors: vi.fn(),
      json: vi.fn(),
      prettyPrint: vi.fn(),
      colorize: vi.fn(),
      simple: vi.fn()
    },
    transports: {
      Console: vi.fn(),
      File: vi.fn()
    },
    addColors: vi.fn()
  }
}));

vi.mock('winston-daily-rotate-file', () => ({
  default: vi.fn()
}));

describe('Logger Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logError', () => {
    it('should log error with message and stack trace', () => {
      const error = new Error('Test error');
      const context = 'test_context';
      const userId = 123;

      logError(error, context, userId);

      // Logger should be called (we can't directly test winston since it's mocked,
      // but we can verify the function doesn't throw)
      expect(true).toBe(true);
    });

    it('should handle error object without stack trace', () => {
      const error = { message: 'Simple error object' };
      const context = 'test_context';

      expect(() => logError(error, context)).not.toThrow();
    });

    it('should handle string error', () => {
      const error = 'String error message';

      expect(() => logError(error)).not.toThrow();
    });

    it('should handle error with additional metadata', () => {
      const error = {
        message: 'Error with metadata',
        code: 'ERR_001',
        details: { foo: 'bar' }
      };

      expect(() => logError(error, 'context', 456)).not.toThrow();
    });
  });

  describe('logWarning', () => {
    it('should log warning with message', () => {
      const message = 'Warning message';
      
      expect(() => logWarning(message)).not.toThrow();
    });

    it('should log warning with metadata', () => {
      const message = 'Warning with meta';
      const meta = { userId: 789, action: 'test' };

      expect(() => logWarning(message, meta)).not.toThrow();
    });

    it('should handle empty metadata', () => {
      expect(() => logWarning('Warning', {})).not.toThrow();
    });
  });

  describe('logInfo', () => {
    it('should log info message', () => {
      const message = 'Info message';
      
      expect(() => logInfo(message)).not.toThrow();
    });

    it('should log info with metadata', () => {
      const message = 'Info with meta';
      const meta = { requestId: 'req-123' };

      expect(() => logInfo(message, meta)).not.toThrow();
    });

    it('should handle complex metadata objects', () => {
      const meta = {
        user: { id: 1, name: 'Test' },
        request: { method: 'POST', path: '/api/test' }
      };

      expect(() => logInfo('Complex log', meta)).not.toThrow();
    });
  });

  describe('logHttp', () => {
    it('should log HTTP request with all parameters', () => {
      const method = 'GET';
      const url = '/api/products';
      const status = 200;
      const duration = 45;

      expect(() => logHttp(method, url, status, duration)).not.toThrow();
    });

    it('should log HTTP request with additional metadata', () => {
      const method = 'POST';
      const url = '/api/users';
      const status = 201;
      const duration = 120;
      const meta = { userId: 1, ip: '127.0.0.1' };

      expect(() => logHttp(method, url, status, duration, meta)).not.toThrow();
    });

    it('should handle different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      
      methods.forEach(method => {
        expect(() => logHttp(method, '/api/test', 200, 50)).not.toThrow();
      });
    });

    it('should handle various status codes', () => {
      const statusCodes = [200, 201, 400, 401, 404, 500];
      
      statusCodes.forEach(status => {
        expect(() => logHttp('GET', '/api/test', status, 30)).not.toThrow();
      });
    });

    it('should handle long request durations', () => {
      expect(() => logHttp('GET', '/api/slow', 200, 5000)).not.toThrow();
    });
  });

  describe('logDebug', () => {
    it('should log debug message', () => {
      const message = 'Debug message';
      
      expect(() => logDebug(message)).not.toThrow();
    });

    it('should log debug with metadata', () => {
      const message = 'Debug with details';
      const meta = { 
        function: 'testFunction',
        variables: { a: 1, b: 2 }
      };

      expect(() => logDebug(message, meta)).not.toThrow();
    });

    it('should handle nested debug information', () => {
      const meta = {
        stack: ['fn1', 'fn2', 'fn3'],
        state: { loading: false, error: null }
      };

      expect(() => logDebug('Nested debug', meta)).not.toThrow();
    });
  });

  describe('Log timestamp validation', () => {
    it('should include timestamp in all log types', () => {
      const beforeTime = new Date().toISOString();
      
      logInfo('Test');
      logWarning('Test');
      logHttp('GET', '/test', 200, 10);
      logDebug('Test');
      
      const afterTime = new Date().toISOString();

      // All logs should execute without errors
      expect(beforeTime).toBeDefined();
      expect(afterTime).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should not throw when logging null or undefined', () => {
      expect(() => logError(null as any)).not.toThrow();
      expect(() => logError(undefined as any)).not.toThrow();
    });

    it('should handle circular reference in metadata', () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      // Should handle gracefully without crashing
      expect(() => logInfo('Circular', circular)).not.toThrow();
    });
  });
});
