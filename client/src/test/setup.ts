// Vitest setup file
import { vi } from 'vitest';
import 'fake-indexeddb/auto';

// Set JWT_SECRET for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || '613c46433666510dc5ccebfb6ec86efafb43f086272ae344b51a1caaed5323b4';

// fake-indexeddb provides real IndexedDB implementation for testing
// It's imported via 'fake-indexeddb/auto' which automatically sets up global indexedDB

// Mock navigator.onLine
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock window.addEventListener for online/offline events
global.addEventListener = vi.fn();
global.removeEventListener = vi.fn();
