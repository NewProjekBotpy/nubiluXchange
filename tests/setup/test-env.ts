/**
 * Test Environment Configuration
 * Sets up environment variables and configurations for testing
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment variables
config({ path: path.resolve(__dirname, '../../.env.test') });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/testdb';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.JWT_SECRET = process.env.JWT_SECRET || '613c46433666510dc5ccebfb6ec86efafb43f086272ae344b51a1caaed5323b4';

// Mock external services in test environment
if (!process.env.MIDTRANS_SERVER_KEY) {
  process.env.MIDTRANS_SERVER_KEY = 'test-midtrans-key';
}

if (!process.env.MIDTRANS_CLIENT_KEY) {
  process.env.MIDTRANS_CLIENT_KEY = 'test-midtrans-client-key';
}

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-api-key';
  process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
}

if (!process.env.TWILIO_ACCOUNT_SID) {
  process.env.TWILIO_ACCOUNT_SID = 'test-account-sid';
  process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
  process.env.TWILIO_PHONE_NUMBER = '+1234567890';
}

if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'test-openai-key';
}

// Disable logging during tests
process.env.LOG_LEVEL = 'error';

// Export test configuration
export const testConfig = {
  database: {
    url: process.env.DATABASE_URL,
    poolMin: 0,
    poolMax: 1
  },
  redis: {
    url: process.env.REDIS_URL,
    enabled: false // Disable Redis in tests by default
  },
  services: {
    midtrans: {
      enabled: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    },
    cloudinary: {
      enabled: false,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET
    },
    twilio: {
      enabled: false,
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER
    },
    openai: {
      enabled: false,
      apiKey: process.env.OPENAI_API_KEY
    }
  },
  testing: {
    timeout: 10000,
    retries: 2,
    slowTestThreshold: 1000
  }
};

export default testConfig;
