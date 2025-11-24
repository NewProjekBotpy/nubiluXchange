/**
 * Unit Tests: Crypto Encryption
 * Tests for TOTP encryption/decryption utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  encryptTOTPSecret,
  decryptTOTPSecret,
  isEncryptionAvailable,
  encryptIfAvailable,
  decryptIfEncrypted,
  generateEncryptionKey
} from '../../server/utils/crypto-encryption';

describe('Crypto Encryption', () => {
  const originalEnv = process.env.TOTP_ENCRYPTION_KEY;

  afterEach(() => {
    if (originalEnv) {
      process.env.TOTP_ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.TOTP_ENCRYPTION_KEY;
    }
  });

  describe('isEncryptionAvailable', () => {
    it('should return true when encryption key is set and valid', () => {
      process.env.TOTP_ENCRYPTION_KEY = 'a'.repeat(32);
      expect(isEncryptionAvailable()).toBe(true);
    });

    it('should return false when encryption key is not set', () => {
      delete process.env.TOTP_ENCRYPTION_KEY;
      expect(isEncryptionAvailable()).toBe(false);
    });

    it('should return false when encryption key is too short', () => {
      process.env.TOTP_ENCRYPTION_KEY = 'short';
      expect(isEncryptionAvailable()).toBe(false);
    });

    it('should return false when encryption key is exactly 31 chars', () => {
      process.env.TOTP_ENCRYPTION_KEY = 'a'.repeat(31);
      expect(isEncryptionAvailable()).toBe(false);
    });

    it('should return true when encryption key is exactly 32 chars', () => {
      process.env.TOTP_ENCRYPTION_KEY = 'a'.repeat(32);
      expect(isEncryptionAvailable()).toBe(true);
    });
  });

  describe('encryptTOTPSecret', () => {
    beforeEach(() => {
      process.env.TOTP_ENCRYPTION_KEY = 'a'.repeat(32);
    });

    it('should encrypt plaintext successfully', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const encrypted = encryptTOTPSecret(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('should produce different ciphertext each time (due to IV)', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const encrypted1 = encryptTOTPSecret(plaintext);
      const encrypted2 = encryptTOTPSecret(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = encryptTOTPSecret(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('should throw error when encryption key is not set', () => {
      delete process.env.TOTP_ENCRYPTION_KEY;
      
      expect(() => encryptTOTPSecret('secret')).toThrow(/TOTP_ENCRYPTION_KEY/);
    });

    it('should throw error when encryption key is too short', () => {
      process.env.TOTP_ENCRYPTION_KEY = 'short';
      
      expect(() => encryptTOTPSecret('secret')).toThrow(/at least 32 characters/);
    });

    it('should encrypt special characters', () => {
      const plaintext = 'secret!@#$%^&*()';
      const encrypted = encryptTOTPSecret(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('should encrypt long strings', () => {
      const plaintext = 'a'.repeat(1000);
      const encrypted = encryptTOTPSecret(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted.split(':')).toHaveLength(3);
    });
  });

  describe('decryptTOTPSecret', () => {
    beforeEach(() => {
      process.env.TOTP_ENCRYPTION_KEY = 'a'.repeat(32);
    });

    it('should decrypt encrypted data successfully', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const encrypted = encryptTOTPSecret(plaintext);
      const decrypted = decryptTOTPSecret(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string decryption', () => {
      const plaintext = '';
      const encrypted = encryptTOTPSecret(plaintext);
      const decrypted = decryptTOTPSecret(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid encrypted data format', () => {
      const invalid = 'not:valid:format:extra';
      
      expect(() => decryptTOTPSecret(invalid)).toThrow(/Invalid encrypted data format/);
    });

    it('should throw error for malformed encrypted data', () => {
      const invalid = 'only-two:parts';
      
      expect(() => decryptTOTPSecret(invalid)).toThrow(/Invalid encrypted data format/);
    });

    it('should throw error when encryption key is not set', () => {
      const encrypted = encryptTOTPSecret('secret');
      delete process.env.TOTP_ENCRYPTION_KEY;
      
      expect(() => decryptTOTPSecret(encrypted)).toThrow(/TOTP_ENCRYPTION_KEY/);
    });

    it('should throw error when decrypting with wrong key', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const encrypted = encryptTOTPSecret(plaintext);
      
      process.env.TOTP_ENCRYPTION_KEY = 'b'.repeat(32);
      
      expect(() => decryptTOTPSecret(encrypted)).toThrow(/Decryption failed/);
    });

    it('should decrypt special characters correctly', () => {
      const plaintext = 'secret!@#$%^&*()';
      const encrypted = encryptTOTPSecret(plaintext);
      const decrypted = decryptTOTPSecret(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt long strings correctly', () => {
      const plaintext = 'a'.repeat(1000);
      const encrypted = encryptTOTPSecret(plaintext);
      const decrypted = decryptTOTPSecret(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryptIfAvailable', () => {
    it('should encrypt when encryption is available', () => {
      process.env.TOTP_ENCRYPTION_KEY = 'a'.repeat(32);
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const result = encryptIfAvailable(plaintext);

      expect(result).not.toBe(plaintext);
      expect(result.split(':')).toHaveLength(3);
    });

    it('should return plaintext when encryption is not available', () => {
      delete process.env.TOTP_ENCRYPTION_KEY;
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const result = encryptIfAvailable(plaintext);

      expect(result).toBe(plaintext);
    });

    it('should return plaintext when key is too short', () => {
      process.env.TOTP_ENCRYPTION_KEY = 'short';
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const result = encryptIfAvailable(plaintext);

      expect(result).toBe(plaintext);
    });
  });

  describe('decryptIfEncrypted', () => {
    beforeEach(() => {
      process.env.TOTP_ENCRYPTION_KEY = 'a'.repeat(32);
    });

    it('should decrypt encrypted data', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const encrypted = encryptTOTPSecret(plaintext);
      const result = decryptIfEncrypted(encrypted);

      expect(result).toBe(plaintext);
    });

    it('should return plaintext data as-is', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const result = decryptIfEncrypted(plaintext);

      expect(result).toBe(plaintext);
    });

    it('should detect encrypted format by colons', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const encrypted = encryptTOTPSecret(plaintext);
      
      expect(encrypted).toContain(':');
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('should handle legacy plaintext with single colon', () => {
      const legacy = 'some:value';
      const result = decryptIfEncrypted(legacy);

      expect(result).toBe(legacy);
    });

    it('should handle legacy plaintext with two colons', () => {
      const legacy = 'some:other:value';
      const result = decryptIfEncrypted(legacy);

      // Will try to decrypt but should handle error
      expect(result).toBeDefined();
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a key', () => {
      const key = generateEncryptionKey();

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    });

    it('should generate 64 hex characters (32 bytes)', () => {
      const key = generateEncryptionKey();

      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate different keys each time', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });

    it('should generate valid encryption keys', () => {
      const key = generateEncryptionKey();
      process.env.TOTP_ENCRYPTION_KEY = key;

      const plaintext = 'test-secret';
      const encrypted = encryptTOTPSecret(plaintext);
      const decrypted = decryptTOTPSecret(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryption integration', () => {
    it('should handle full encrypt/decrypt cycle', () => {
      process.env.TOTP_ENCRYPTION_KEY = generateEncryptionKey();
      const secret = 'JBSWY3DPEHPK3PXP';

      const encrypted = encryptTOTPSecret(secret);
      expect(encrypted).not.toBe(secret);

      const decrypted = decryptTOTPSecret(encrypted);
      expect(decrypted).toBe(secret);
    });

    it('should maintain data integrity across encryption', () => {
      process.env.TOTP_ENCRYPTION_KEY = generateEncryptionKey();
      const secrets = [
        'JBSWY3DPEHPK3PXP',
        'ABCD1234EFGH5678',
        'ZYXW9876VUTSRQPO'
      ];

      for (const secret of secrets) {
        const encrypted = encryptTOTPSecret(secret);
        const decrypted = decryptTOTPSecret(encrypted);
        expect(decrypted).toBe(secret);
      }
    });

    it('should handle unicode characters', () => {
      process.env.TOTP_ENCRYPTION_KEY = generateEncryptionKey();
      const secret = '你好世界🔐🔑';

      const encrypted = encryptTOTPSecret(secret);
      const decrypted = decryptTOTPSecret(encrypted);

      expect(decrypted).toBe(secret);
    });
  });
});
