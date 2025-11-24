/**
 * k6 Load Test: API Endpoints
 * Tests API performance under load
 * 
 * Run: k6 run tests/performance/k6/api-load-test.js
 * Run with options: k6 run --vus 50 --duration 30s tests/performance/k6/api-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const successfulRequests = new Counter('successful_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms, 99% under 1s
    http_req_failed: ['rate<0.01'], // Error rate under 1%
    errors: ['rate<0.05'],
    api_response_time: ['p(95)<400'],
  },
};

// Base URL - use environment variable or default
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// Test data
const testUser = {
  email: `loadtest-${Date.now()}@example.com`,
  password: 'LoadTest123!',
  username: `loadtest${Date.now()}`,
};

export function setup() {
  // Register a test user for authenticated requests
  const registerRes = http.post(`${BASE_URL}/api/register`, JSON.stringify(testUser), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (registerRes.status === 200 || registerRes.status === 201) {
    const loginRes = http.post(`${BASE_URL}/api/login`, JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    // Extract session cookie properly
    let sessionCookie = '';
    if (loginRes.cookies && loginRes.cookies['connect.sid']) {
      const cookieArray = loginRes.cookies['connect.sid'];
      if (cookieArray && cookieArray.length > 0) {
        sessionCookie = cookieArray[0].value;
      }
    }
    
    return { sessionCookie, userId: loginRes.json('user')?.id };
  }
  
  return { sessionCookie: '', userId: null };
}

export default function(data) {
  const { sessionCookie } = data;
  
  // Build headers with cookie if available
  const headers = sessionCookie ? {
    'Cookie': `connect.sid=${sessionCookie}`,
  } : {};
  
  // Test 1: Get products list (public endpoint)
  const productsRes = http.get(`${BASE_URL}/api/products`, {
    tags: { name: 'ProductsList' },
  });
  
  check(productsRes, {
    'products status is 200': (r) => r.status === 200,
    'products response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  apiResponseTime.add(productsRes.timings.duration, { endpoint: 'products' });
  errorRate.add(productsRes.status !== 200);
  
  if (productsRes.status === 200) {
    successfulRequests.add(1);
  }
  
  sleep(1);
  
  // Test 2: Get categories (public endpoint)
  const categoriesRes = http.get(`${BASE_URL}/api/categories`, {
    tags: { name: 'Categories' },
  });
  
  check(categoriesRes, {
    'categories status is 200': (r) => r.status === 200,
  });
  
  apiResponseTime.add(categoriesRes.timings.duration, { endpoint: 'categories' });
  errorRate.add(categoriesRes.status !== 200);
  
  sleep(1);
  
  // Test 3: Search products
  const searchRes = http.get(`${BASE_URL}/api/products?search=mobile`, {
    tags: { name: 'ProductSearch' },
  });
  
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 600ms': (r) => r.timings.duration < 600,
  });
  
  apiResponseTime.add(searchRes.timings.duration, { endpoint: 'search' });
  errorRate.add(searchRes.status !== 200);
  
  sleep(1);
  
  // Test 4: Get user profile (authenticated)
  if (sessionCookie) {
    const profileRes = http.get(`${BASE_URL}/api/user/profile`, {
      headers: headers,
      tags: { name: 'UserProfile' },
    });
    
    check(profileRes, {
      'profile status is 200': (r) => r.status === 200,
    });
    
    apiResponseTime.add(profileRes.timings.duration, { endpoint: 'profile' });
    errorRate.add(profileRes.status !== 200);
  }
  
  sleep(1);
  
  // Test 5: Get notifications (authenticated)
  if (sessionCookie) {
    const notificationsRes = http.get(`${BASE_URL}/api/notifications`, {
      headers: headers,
      tags: { name: 'Notifications' },
    });
    
    check(notificationsRes, {
      'notifications response time < 300ms': (r) => r.timings.duration < 300,
    });
    
    apiResponseTime.add(notificationsRes.timings.duration, { endpoint: 'notifications' });
  }
  
  sleep(2);
}

export function teardown(data) {
  // Cleanup test user if needed
  console.log('Load test completed');
}
