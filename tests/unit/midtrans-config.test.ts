/**
 * Unit Tests: Midtrans Configuration
 * Tests for Midtrans configuration validation utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateMidtransConfig, logConfigStatus } from '../../server/utils/midtrans-config';

describe('Midtrans Configuration Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('validateMidtransConfig', () => {
    it('should return error when SERVER_KEY is missing', () => {
      delete process.env.MIDTRANS_SERVER_KEY;
      delete process.env.MIDTRANS_CLIENT_KEY;

      const result = validateMidtransConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MIDTRANS_SERVER_KEY environment variable is required');
    });

    it('should return error when CLIENT_KEY is missing', () => {
      process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-test';
      delete process.env.MIDTRANS_CLIENT_KEY;

      const result = validateMidtransConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MIDTRANS_CLIENT_KEY environment variable is required');
    });

    it('should validate successfully with correct sandbox keys', () => {
      process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-test123';
      process.env.MIDTRANS_CLIENT_KEY = 'SB-Mid-client-test123';
      process.env.NODE_ENV = 'development';

      const result = validateMidtransConfig();

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.config?.isProduction).toBe(false);
      expect(result.config?.serverKey).toBe('SB-Mid-server-test123');
      expect(result.config?.clientKey).toBe('SB-Mid-client-test123');
    });

    it('should validate successfully with production keys in production', () => {
      process.env.MIDTRANS_SERVER_KEY = 'Mid-server-prod123';
      process.env.MIDTRANS_CLIENT_KEY = 'Mid-client-prod123';
      process.env.NODE_ENV = 'production';

      const result = validateMidtransConfig();

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.config?.isProduction).toBe(true);
    });

    it('should error when using sandbox keys in production', () => {
      process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-test';
      process.env.MIDTRANS_CLIENT_KEY = 'SB-Mid-client-test';
      process.env.NODE_ENV = 'production';

      const result = validateMidtransConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes('sandbox key'))).toBe(true);
    });

    it('should warn about incorrect production key format', () => {
      process.env.MIDTRANS_SERVER_KEY = 'incorrect-format-server';
      process.env.MIDTRANS_CLIENT_KEY = 'incorrect-format-client';
      process.env.NODE_ENV = 'production';

      const result = validateMidtransConfig();

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should allow production keys in development for testing', () => {
      process.env.MIDTRANS_SERVER_KEY = 'Mid-server-prod123';
      process.env.MIDTRANS_CLIENT_KEY = 'Mid-client-prod123';
      process.env.NODE_ENV = 'development';

      const result = validateMidtransConfig();

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('production Midtrans keys'))).toBe(true);
    });

    it('should mark as configured when keys are present', () => {
      process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-test';
      process.env.MIDTRANS_CLIENT_KEY = 'SB-Mid-client-test';

      const result = validateMidtransConfig();

      expect(result.config?.isConfigured).toBe(true);
    });

    it('should handle empty string keys as missing', () => {
      process.env.MIDTRANS_SERVER_KEY = '';
      process.env.MIDTRANS_CLIENT_KEY = '';

      const result = validateMidtransConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('logConfigStatus', () => {
    it('should log configuration status without errors', () => {
      const validation = {
        isValid: true,
        errors: [],
        warnings: ['Test warning'],
        config: {
          serverKey: 'test-key',
          clientKey: 'test-client',
          isProduction: false,
          isConfigured: true
        }
      };

      expect(() => logConfigStatus(validation)).not.toThrow();
    });

    it('should handle invalid configuration logging', () => {
      const validation = {
        isValid: false,
        errors: ['Missing server key', 'Missing client key'],
        warnings: []
      };

      expect(() => logConfigStatus(validation)).not.toThrow();
    });

    it('should log multiple warnings', () => {
      const validation = {
        isValid: true,
        errors: [],
        warnings: [
          'Warning 1',
          'Warning 2',
          'Warning 3'
        ],
        config: {
          serverKey: 'test',
          clientKey: 'test',
          isProduction: false,
          isConfigured: true
        }
      };

      expect(() => logConfigStatus(validation)).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle whitespace in keys', () => {
      process.env.MIDTRANS_SERVER_KEY = '  SB-Mid-server-test  ';
      process.env.MIDTRANS_CLIENT_KEY = '  SB-Mid-client-test  ';

      const result = validateMidtransConfig();

      // Should still validate the keys even with whitespace
      expect(result).toBeDefined();
    });

    it('should handle very long key values', () => {
      process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-' + 'x'.repeat(1000);
      process.env.MIDTRANS_CLIENT_KEY = 'SB-Mid-client-' + 'x'.repeat(1000);

      const result = validateMidtransConfig();

      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
    });

    it('should handle special characters in keys', () => {
      process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-!@#$%^&*()';
      process.env.MIDTRANS_CLIENT_KEY = 'SB-Mid-client-!@#$%^&*()';

      const result = validateMidtransConfig();

      expect(result).toBeDefined();
    });
  });

  describe('Environment-specific behavior', () => {
    it('should behave differently in production vs development', () => {
      const testKey = 'SB-Mid-server-test';
      const clientKey = 'SB-Mid-client-test';

      // Test development
      process.env.NODE_ENV = 'development';
      process.env.MIDTRANS_SERVER_KEY = testKey;
      process.env.MIDTRANS_CLIENT_KEY = clientKey;
      
      const devResult = validateMidtransConfig();
      expect(devResult.config?.isProduction).toBe(false);

      // Test production
      process.env.NODE_ENV = 'production';
      const prodResult = validateMidtransConfig();
      expect(prodResult.isValid).toBe(false); // Sandbox keys not allowed in production
    });

    it('should default to development when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-test';
      process.env.MIDTRANS_CLIENT_KEY = 'SB-Mid-client-test';

      const result = validateMidtransConfig();

      expect(result.config?.isProduction).toBe(false);
    });
  });
});
