/**
 * k6 Spike Test
 * Tests system behavior under sudden traffic spikes
 * 
 * Run: k6 run tests/performance/k6/spike-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const spikeResponseTime = new Trend('spike_response_time');

export const options = {
  stages: [
    { duration: '30s', target: 10 },    // Baseline: 10 users
    { duration: '10s', target: 200 },   // Spike to 200 users in 10 seconds!
    { duration: '1m', target: 200 },    // Maintain spike
    { duration: '10s', target: 10 },    // Drop back to baseline
    { duration: '30s', target: 10 },    // Maintain baseline
    { duration: '10s', target: 300 },   // Second spike to 300 users
    { duration: '1m', target: 300 },    // Maintain second spike
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // More lenient during spikes
    errors: ['rate<0.10'], // Allow up to 10% error rate during spike
    spike_response_time: ['p(95)<1500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function() {
  // Test critical endpoints under spike
  const endpoints = [
    { url: `${BASE_URL}/api/products`, name: 'Products' },
    { url: `${BASE_URL}/api/categories`, name: 'Categories' },
    { url: `${BASE_URL}/`, name: 'Homepage' },
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const start = Date.now();
  const res = http.get(endpoint.url, {
    tags: { name: endpoint.name },
  });
  
  const duration = Date.now() - start;
  spikeResponseTime.add(duration);
  
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time acceptable': (r) => duration < 2000,
  });
  
  errorRate.add(!success);
  
  sleep(0.5); // Short sleep to maximize load
}
