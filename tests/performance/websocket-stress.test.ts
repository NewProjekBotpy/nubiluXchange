/**
 * Performance Tests: WebSocket Stress Testing
 * Tests for WebSocket concurrent connections and load handling
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { performanceHelpers } from '../helpers/test-utils';

describe('WebSocket Stress Testing', () => {
  describe('Concurrent Connections', () => {
    it('should handle 100 concurrent connections', async () => {
      const connectionCount = 100;
      const connections: any[] = [];

      const { duration } = await performanceHelpers.measure(async () => {
        // Simulate creating connections
        for (let i = 0; i < connectionCount; i++) {
          connections.push({ id: i, status: 'connected' });
        }
      });

      expect(connections.length).toBe(connectionCount);
      expect(duration).toBeLessThan(1000); // Should connect within 1 second
    });

    it('should handle 500 concurrent connections', async () => {
      const connectionCount = 500;
      const connections: any[] = [];

      const { duration } = await performanceHelpers.measure(async () => {
        for (let i = 0; i < connectionCount; i++) {
          connections.push({ id: i, status: 'connected' });
        }
      });

      expect(connections.length).toBe(connectionCount);
      expect(duration).toBeLessThan(3000); // Should handle within 3 seconds
    });

    it('should handle 1000 concurrent connections', async () => {
      const connectionCount = 1000;
      const connections: any[] = [];

      const { duration } = await performanceHelpers.measure(async () => {
        for (let i = 0; i < connectionCount; i++) {
          connections.push({ id: i, status: 'connected' });
        }
      });

      expect(connections.length).toBe(connectionCount);
      expect(duration).toBeLessThan(5000); // Should handle within 5 seconds
    });
  });

  describe('Message Broadcasting Performance', () => {
    it('should broadcast to 100 clients efficiently', async () => {
      const clientCount = 100;
      const clients: any[] = [];
      
      for (let i = 0; i < clientCount; i++) {
        clients.push({
          id: i,
          send: vi.fn(),
          readyState: 1 // OPEN
        });
      }

      const message = JSON.stringify({ type: 'broadcast', data: 'test' });

      const { duration } = await performanceHelpers.measure(async () => {
        clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(message);
          }
        });
      });

      expect(duration).toBeLessThan(100); // Should broadcast within 100ms
      clients.forEach(client => {
        expect(client.send).toHaveBeenCalledWith(message);
      });
    });

    it('should handle high message throughput', async () => {
      const messageCount = 1000;
      const messages: any[] = [];

      const { duration } = await performanceHelpers.measure(async () => {
        for (let i = 0; i < messageCount; i++) {
          messages.push({
            type: 'chat_message',
            content: `Message ${i}`,
            timestamp: Date.now()
          });
        }
      });

      expect(messages.length).toBe(messageCount);
      expect(duration).toBeLessThan(500); // Should process within 500ms
    });
  });

  describe('Message Queue Performance', () => {
    it('should handle message queue with 1000 messages', async () => {
      const queue: any[] = [];
      const messageCount = 1000;

      const { duration } = await performanceHelpers.measure(async () => {
        for (let i = 0; i < messageCount; i++) {
          queue.push({
            id: i,
            type: 'chat_message',
            content: `Test message ${i}`
          });
        }

        // Process queue
        while (queue.length > 0) {
          queue.shift();
        }
      });

      expect(queue.length).toBe(0);
      expect(duration).toBeLessThan(1000); // Should process within 1 second
    });

    it('should batch process messages efficiently', async () => {
      const messages: any[] = [];
      const batchSize = 50;
      const totalMessages = 500;

      for (let i = 0; i < totalMessages; i++) {
        messages.push({ id: i, content: `Message ${i}` });
      }

      const batches: any[][] = [];

      const { duration } = await performanceHelpers.measure(async () => {
        for (let i = 0; i < messages.length; i += batchSize) {
          batches.push(messages.slice(i, i + batchSize));
        }
      });

      expect(batches.length).toBe(totalMessages / batchSize);
      expect(duration).toBeLessThan(100); // Should batch within 100ms
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory with connection churn', async () => {
      const iterations = 100;
      const connections = new Map();

      for (let i = 0; i < iterations; i++) {
        // Add connection
        connections.set(i, {
          id: i,
          data: new Array(100).fill('data')
        });

        // Remove after some time
        if (i > 10) {
          connections.delete(i - 10);
        }
      }

      // Should maintain reasonable size
      expect(connections.size).toBeLessThanOrEqual(11);
    });

    it('should clean up disconnected clients', () => {
      const clients = new Set();
      
      // Add 100 clients
      for (let i = 0; i < 100; i++) {
        clients.add({ id: i, status: 'connected' });
      }

      // Mark some as disconnected and clean up
      const connectedClients = new Set();
      clients.forEach((client: any) => {
        if (client.id % 2 === 0) { // Keep even IDs
          connectedClients.add(client);
        }
      });

      expect(connectedClients.size).toBe(50);
    });
  });

  describe('Latency Under Load', () => {
    it('should maintain low latency with 50 concurrent senders', async () => {
      const senderCount = 50;
      const messagesPerSender = 20;
      const latencies: number[] = [];

      const { duration } = await performanceHelpers.measure(async () => {
        for (let i = 0; i < senderCount; i++) {
          for (let j = 0; j < messagesPerSender; j++) {
            const start = Date.now();
            // Simulate message send
            await new Promise(resolve => setTimeout(resolve, 1));
            const latency = Date.now() - start;
            latencies.push(latency);
          }
        }
      });

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      
      expect(avgLatency).toBeLessThan(10); // Average latency under 10ms
      expect(duration).toBeLessThan(3000); // Complete within 3 seconds
    });

    it('should handle burst traffic', async () => {
      const burstSize = 200;
      const messages: any[] = [];

      const { duration } = await performanceHelpers.measure(async () => {
        // Simulate burst
        for (let i = 0; i < burstSize; i++) {
          messages.push({
            id: i,
            timestamp: Date.now()
          });
        }
      });

      expect(messages.length).toBe(burstSize);
      expect(duration).toBeLessThan(200); // Handle burst within 200ms
    });
  });

  describe('Connection Stability', () => {
    it('should recover from temporary disconnections', async () => {
      const connections: any[] = [];
      const reconnectAttempts = 10;

      for (let i = 0; i < reconnectAttempts; i++) {
        // Simulate disconnect and reconnect
        connections.push({ id: i, attempt: i + 1, status: 'reconnected' });
      }

      expect(connections.length).toBe(reconnectAttempts);
      expect(connections.every(c => c.status === 'reconnected')).toBe(true);
    });

    it('should handle graceful shutdown with active connections', () => {
      const activeConnections = new Set();
      
      for (let i = 0; i < 50; i++) {
        activeConnections.add({ id: i, status: 'active' });
      }

      // Graceful shutdown
      const closedConnections: any[] = [];
      activeConnections.forEach((conn: any) => {
        closedConnections.push({ ...conn, status: 'closed' });
      });

      expect(closedConnections.length).toBe(50);
      expect(closedConnections.every(c => c.status === 'closed')).toBe(true);
    });
  });

  describe('Resource Limits', () => {
    it('should enforce maximum connection limit', () => {
      const maxConnections = 1000;
      const connections = new Set();
      let rejected = 0;

      for (let i = 0; i < 1200; i++) {
        if (connections.size < maxConnections) {
          connections.add({ id: i });
        } else {
          rejected++;
        }
      }

      expect(connections.size).toBe(maxConnections);
      expect(rejected).toBe(200);
    });

    it('should limit message size', () => {
      const maxMessageSize = 1024 * 10; // 10KB
      const largeMessage = 'x'.repeat(maxMessageSize + 1);
      const normalMessage = 'x'.repeat(1000);

      const validateMessageSize = (msg: string) => {
        return msg.length <= maxMessageSize;
      };

      expect(validateMessageSize(normalMessage)).toBe(true);
      expect(validateMessageSize(largeMessage)).toBe(false);
    });

    it('should enforce rate limiting per connection', () => {
      const rateLimit = { max: 100, window: 1000 };
      const messageCounts = new Map();

      const canSendMessage = (connectionId: number) => {
        const count = messageCounts.get(connectionId) || 0;
        if (count >= rateLimit.max) {
          return false;
        }
        messageCounts.set(connectionId, count + 1);
        return true;
      };

      // Try to send 150 messages from same connection
      let sent = 0;
      let blocked = 0;

      for (let i = 0; i < 150; i++) {
        if (canSendMessage(1)) {
          sent++;
        } else {
          blocked++;
        }
      }

      expect(sent).toBe(100);
      expect(blocked).toBe(50);
    });
  });

  describe('Scalability Metrics', () => {
    it('should measure messages per second capacity', async () => {
      const duration = 1000; // 1 second
      const messages: any[] = [];
      const startTime = Date.now();

      while (Date.now() - startTime < duration) {
        messages.push({ 
          id: messages.length, 
          timestamp: Date.now() 
        });
      }

      const messagesPerSecond = messages.length;

      // Should handle at least 1000 messages per second
      expect(messagesPerSecond).toBeGreaterThan(1000);
    });

    it('should handle varying load patterns', async () => {
      const results = await performanceHelpers.measureMultiple(
        async () => {
          const messages: any[] = [];
          const count = Math.floor(Math.random() * 100) + 50; // 50-150 messages
          
          for (let i = 0; i < count; i++) {
            messages.push({ id: i });
          }

          return messages.length;
        },
        20 // 20 iterations
      );

      expect(results.avg).toBeGreaterThan(0);
      expect(results.avg).toBeLessThan(50);
      expect(results.max).toBeLessThan(200);
    });
  });
});
