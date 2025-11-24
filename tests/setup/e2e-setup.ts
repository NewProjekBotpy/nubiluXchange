/**
 * E2E Test Setup for Playwright
 * 
 * IMPORTANT: This setup is EXCLUSIVELY for Playwright E2E tests.
 * - Does NOT import or use Vitest (to avoid expect() conflicts)
 * - Does NOT import from test-env.ts or global-setup.ts
 * - Uses ES modules (import.meta.url) for proper Node.js module resolution
 * - Playwright uses its own expect() from '@playwright/test'
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

export async function setup() {
  console.log('🚀 Setting up E2E test environment...');
  // Additional E2E-specific setup if needed
  console.log('✅ E2E test environment ready');
}

export async function teardown() {
  console.log('🧹 Cleaning up E2E test environment...');
  // Additional E2E-specific teardown if needed
  console.log('✅ E2E test environment cleaned up');
}

export default setup;
