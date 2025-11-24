/**
 * k6 WebSocket Stress Test
 * Tests WebSocket connection handling and real-time messaging performance
 * 
 * Run: k6 run tests/performance/k6/websocket-stress-test.js
 */

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const wsConnections = new Counter('ws_connections');
const wsMessages = new Counter('ws_messages_sent');
const wsErrors = new Rate('ws_errors');
const wsLatency = new Trend('ws_message_latency');

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 connections
    { duration: '1m', target: 100 },   // Ramp up to 100 connections
    { duration: '2m', target: 100 },   // Maintain 100 connections
    { duration: '30s', target: 200 },  // Spike to 200 connections
    { duration: '1m', target: 200 },   // Maintain spike
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    ws_connections: ['count>100'],
    ws_errors: ['rate<0.05'],
    ws_message_latency: ['p(95)<100', 'p(99)<200'],
  },
};

const WS_URL = __ENV.WS_URL || 'ws://localhost:5000';

export default function () {
  const url = WS_URL;
  const params = { tags: { name: 'WebSocketStress' } };
  
  const res = ws.connect(url, params, function (socket) {
    wsConnections.add(1);
    
    socket.on('open', () => {
      console.log('WebSocket connection established');
      
      // Send initial connection message
      const connectMsg = JSON.stringify({
        type: 'ping',
        timestamp: Date.now(),
      });
      
      socket.send(connectMsg);
      wsMessages.add(1);
      
      // Simulate chat room joining
      socket.send(JSON.stringify({
        type: 'join_chat',
        chatId: Math.floor(Math.random() * 100) + 1,
      }));
      
      // Send periodic messages
      socket.setInterval(() => {
        const sendTime = Date.now();
        socket.send(JSON.stringify({
          type: 'message',
          chatId: 1,
          content: `Load test message ${sendTime}`,
          timestamp: sendTime,
        }));
        wsMessages.add(1);
      }, 5000);
      
      // Send typing indicators
      socket.setInterval(() => {
        socket.send(JSON.stringify({
          type: 'typing',
          chatId: 1,
        }));
      }, 3000);
    });
    
    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        if (message.timestamp) {
          const latency = Date.now() - message.timestamp;
          wsLatency.add(latency);
        }
        
        check(message, {
          'message has type': (m) => m.type !== undefined,
        });
      } catch (e) {
        wsErrors.add(1);
      }
    });
    
    socket.on('error', (e) => {
      console.error('WebSocket error:', e);
      wsErrors.add(1);
    });
    
    socket.on('close', () => {
      console.log('WebSocket connection closed');
    });
    
    // Keep connection alive for test duration
    socket.setTimeout(() => {
      socket.close();
    }, 30000); // Close after 30 seconds
  });
  
  check(res, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  });
  
  sleep(1);
}
