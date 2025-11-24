/**
 * Test Utilities and Helper Functions
 * Shared utilities for all test suites
 */

import { expect } from 'vitest';

// Type definitions for testing (simplified versions)
type User = {
  id?: number;
  username: string;
  email: string;
  password: string;
  displayName?: string;
  role?: string;
  walletBalance?: string;
  isVerified?: boolean;
};

type Product = {
  id?: number;
  sellerId: number;
  title: string;
  description: string;
  category: string;
  price: string;
  status?: string;
};

type Chat = {
  id?: number;
  buyerId: number;
  sellerId: number;
  productId: number;
  status?: string;
};

type Message = {
  id?: number;
  chatId: number;
  senderId: number;
  content: string;
  messageType?: string;
  status?: string;
};

/**
 * Test data generators
 */
export const testDataGenerators = {
  user: (overrides?: Partial<User>): Partial<User> => ({
    username: `testuser_${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    password: 'Test123!@#',
    displayName: 'Test User',
    role: 'user',
    walletBalance: '0',
    isVerified: false,
    ...overrides,
  }),

  product: (sellerId: number, overrides?: Partial<Product>): Partial<Product> => ({
    sellerId,
    title: `Test Product ${Date.now()}`,
    description: 'Test product description',
    category: 'mobile_legends',
    price: '100000',
    status: 'active',
    ...overrides,
  }),

  chat: (buyerId: number, sellerId: number, productId: number, overrides?: Partial<Chat>): Partial<Chat> => ({
    buyerId,
    sellerId,
    productId,
    status: 'active',
    ...overrides,
  }),

  message: (chatId: number, senderId: number, overrides?: Partial<Message>): Partial<Message> => ({
    chatId,
    senderId,
    content: `Test message ${Date.now()}`,
    messageType: 'text',
    status: 'sent',
    ...overrides,
  }),
};

/**
 * Mock data factories
 */
export const mockData = {
  validUser: {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Test123!@#',
  },
  
  validAdmin: {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
  },

  validProduct: {
    title: 'Mobile Legends Account',
    description: 'High tier ML account with skins',
    category: 'mobile_legends',
    price: '500000',
    gameData: {
      rank: 'Mythic',
      heroes: 50,
      skins: 30,
    },
  },

  validPayment: {
    amount: 100000,
    paymentMethod: 'qris',
    productId: 1,
  },

  midtransWebhook: {
    order_id: 'ORDER-123456',
    status_code: '200',
    gross_amount: '100000.00',
    signature_key: 'test_signature',
    transaction_status: 'settlement',
  },
};

/**
 * Wait utilities
 */
export const waitFor = {
  seconds: (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000)),
  ms: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  condition: async (condition: () => boolean | Promise<boolean>, timeout = 5000, interval = 100) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) return true;
      await waitFor.ms(interval);
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },
};

/**
 * Custom matchers for common assertions
 */
export const customMatchers = {
  toBeValidIDR: (received: string) => {
    const pass = /^Rp\s[\d.,]+$/.test(received);
    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be valid IDR format`
        : `Expected ${received} to be valid IDR format (Rp X,XXX)`,
    };
  },

  toBeValidEmail: (received: string) => {
    const pass = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(received);
    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be valid email`
        : `Expected ${received} to be valid email`,
    };
  },

  toBeValidJWT: (received: string) => {
    const pass = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(received);
    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be valid JWT`
        : `Expected ${received} to be valid JWT`,
    };
  },
};

/**
 * Error assertion helpers
 */
export const expectError = async (
  fn: () => Promise<any>,
  expectedMessage?: string | RegExp
) => {
  try {
    await fn();
    throw new Error('Expected function to throw an error');
  } catch (error: any) {
    if (expectedMessage) {
      if (typeof expectedMessage === 'string') {
        expect(error.message).toContain(expectedMessage);
      } else {
        expect(error.message).toMatch(expectedMessage);
      }
    }
    return error;
  }
};

/**
 * Database cleanup utilities
 */
export const dbCleanup = {
  deleteUser: async (userId: number) => {
    // Implementation depends on your test database setup
    // This is a placeholder
  },
  
  deleteProduct: async (productId: number) => {
    // Implementation depends on your test database setup
  },
  
  deleteChat: async (chatId: number) => {
    // Implementation depends on your test database setup
  },
  
  truncateAll: async () => {
    // Truncate all test tables
  },
};

/**
 * HTTP request helpers for integration tests
 */
export const httpHelpers = {
  get: async (url: string, headers?: Record<string, string>) => {
    const response = await fetch(url, { headers });
    return {
      status: response.status,
      data: await response.json().catch(() => ({})),
      headers: response.headers,
    };
  },

  post: async (url: string, body?: any, headers?: Record<string, string>) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      data: await response.json().catch(() => ({})),
      headers: response.headers,
    };
  },

  put: async (url: string, body?: any, headers?: Record<string, string>) => {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      data: await response.json().catch(() => ({})),
      headers: response.headers,
    };
  },

  delete: async (url: string, headers?: Record<string, string>) => {
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });
    return {
      status: response.status,
      data: await response.json().catch(() => ({})),
      headers: response.headers,
    };
  },
};

/**
 * WebSocket test helpers
 */
export class WebSocketTestHelper {
  private ws: WebSocket | null = null;
  private messages: any[] = [];

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (error) => reject(error);
      this.ws.onmessage = (event) => {
        this.messages.push(JSON.parse(event.data));
      };
    });
  }

  send(data: any): void {
    if (!this.ws) throw new Error('WebSocket not connected');
    this.ws.send(JSON.stringify(data));
  }

  async waitForMessage(predicate: (msg: any) => boolean, timeout = 5000): Promise<any> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const message = this.messages.find(predicate);
      if (message) return message;
      await waitFor.ms(100);
    }
    throw new Error('Message not received within timeout');
  }

  getMessages(): any[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Performance measurement helpers
 */
export const performanceHelpers = {
  measure: async (fn: () => Promise<any>) => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  },

  measureMultiple: async (fn: () => Promise<any>, iterations = 10) => {
    const durations: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const { duration } = await performanceHelpers.measure(fn);
      durations.push(duration);
    }
    return {
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      median: durations.sort()[Math.floor(durations.length / 2)],
      durations,
    };
  },
};

/**
 * Snapshot helpers
 */
export const snapshotHelpers = {
  sanitizeSnapshot: (data: any) => {
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Remove dynamic fields
    const removeDynamicFields = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(removeDynamicFields);
      }
      if (obj && typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (['createdAt', 'updatedAt', 'timestamp', 'id'].includes(key)) {
            cleaned[key] = '[DYNAMIC]';
          } else {
            cleaned[key] = removeDynamicFields(value);
          }
        }
        return cleaned;
      }
      return obj;
    };
    
    return removeDynamicFields(sanitized);
  },
};
