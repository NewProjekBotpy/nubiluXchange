/**
 * Global Test Setup
 * Runs once before all tests
 */

import './test-env';

export async function setup() {
  console.log('🚀 Setting up test environment...');
  
  // Additional global setup if needed
  // e.g., start test database, initialize services, etc.
  
  console.log('✅ Test environment ready');
}

export async function teardown() {
  console.log('🧹 Cleaning up test environment...');
  
  // Additional global teardown if needed
  // e.g., close database connections, cleanup resources
  
  console.log('✅ Test environment cleaned up');
}
