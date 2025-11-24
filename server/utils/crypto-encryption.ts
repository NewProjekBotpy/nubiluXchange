import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { logError, logInfo } from './logger';

/**
 * Crypto Encryption Utility
 * Provides AES-256-GCM encryption/decryption for sensitive data like TOTP secrets
 * 
 * Security Features:
 * - AES-256-GCM (Authenticated Encryption with Associated Data)
 * - Random IV (Initialization Vector) for each encryption
 * - Authentication tag for integrity verification
 * - Key derivation from environment variable
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;

/**
 * Derive encryption key from environment variable
 * Uses SHA-256 to ensure consistent 32-byte key
 */
function getEncryptionKey(): Buffer {
  const keySource = process.env.TOTP_ENCRYPTION_KEY;
  
  if (!keySource) {
    throw new Error('TOTP_ENCRYPTION_KEY environment variable not set. 2FA encryption requires this key.');
  }
  
  if (keySource.length < 32) {
    throw new Error('TOTP_ENCRYPTION_KEY must be at least 32 characters long for security');
  }
  
  // Derive 256-bit key using SHA-256
  return createHash('sha256').update(keySource).digest();
}

/**
 * Encrypt sensitive data (TOTP secret)
 * @param plaintext - Data to encrypt
 * @returns Encrypted data in format: iv:authTag:ciphertext (all hex encoded)
 */
export function encryptTOTPSecret(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:ciphertext (all hex encoded)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error: any) {
    logError(error, 'Failed to encrypt TOTP secret');
    throw new Error('Encryption failed: ' + error.message);
  }
}

/**
 * Decrypt TOTP secret
 * @param encryptedData - Encrypted data in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext
 */
export function decryptTOTPSecret(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [ivHex, authTagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    logError(error, 'Failed to decrypt TOTP secret');
    throw new Error('Decryption failed: ' + error.message);
  }
}

/**
 * Check if encryption is available
 * Returns true if TOTP_ENCRYPTION_KEY is configured
 */
export function isEncryptionAvailable(): boolean {
  return !!process.env.TOTP_ENCRYPTION_KEY && process.env.TOTP_ENCRYPTION_KEY.length >= 32;
}

/**
 * Encrypt data if encryption is available, otherwise return plaintext
 * This allows gradual migration to encrypted storage
 */
export function encryptIfAvailable(plaintext: string): string {
  if (isEncryptionAvailable()) {
    return encryptTOTPSecret(plaintext);
  }
  
  logInfo('TOTP encryption not available - storing in plaintext (NOT RECOMMENDED for production)');
  return plaintext;
}

/**
 * Decrypt data if it's encrypted, otherwise return as-is
 * Detects encryption by checking for iv:authTag:ciphertext format
 */
export function decryptIfEncrypted(data: string): string {
  // Check if data is in encrypted format (contains colons)
  if (data.includes(':') && data.split(':').length === 3) {
    try {
      return decryptTOTPSecret(data);
    } catch (error) {
      // If decryption fails, assume it's legacy plaintext with colons
      logInfo('Decryption failed, treating as plaintext: ' + (error as Error).message);
      return data;
    }
  }
  
  // Data is plaintext (legacy format)
  return data;
}

/**
 * Generate a secure random encryption key
 * Use this to generate TOTP_ENCRYPTION_KEY value
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex'); // 64 hex chars = 32 bytes
}

// Log encryption status on module load
if (isEncryptionAvailable()) {
  logInfo('✅ TOTP encryption enabled with AES-256-GCM');
} else {
  logInfo('⚠️ TOTP encryption disabled - TOTP_ENCRYPTION_KEY not configured');
  logInfo('🔐 For production security, set TOTP_ENCRYPTION_KEY (min 32 chars)');
}
