/**
 * k6 Payment Flow Load Test
 * Tests payment processing performance under load
 * 
 * Run: k6 run tests/performance/k6/payment-flow-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const paymentSuccess = new Counter('payment_success');
const paymentFailures = new Counter('payment_failures');
const paymentLatency = new Trend('payment_processing_time');
const transactionCreated = new Counter('transactions_created');

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 users
    { duration: '2m', target: 20 },   // Maintain 20 users
    { duration: '1m', target: 50 },   // Spike to 50 users
    { duration: '1m', target: 50 },   // Maintain spike
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    payment_processing_time: ['p(95)<2000', 'p(99)<3000'], // 95% under 2s, 99% under 3s
    http_req_failed: ['rate<0.01'],
    payment_failures: ['count<10'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export function setup() {
  // Create test users and products
  const users = [];
  
  for (let i = 0; i < 5; i++) {
    const testUser = {
      email: `payment-test-${i}-${Date.now()}@example.com`,
      password: 'PaymentTest123!',
      username: `paytest${i}${Date.now()}`,
    };
    
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
      
      users.push({
        sessionCookie: sessionCookie,
        userId: loginRes.json('user')?.id,
      });
    }
  }
  
  return { users };
}

export default function(data) {
  const { users } = data;
  
  if (!users || users.length === 0) {
    console.error('No test users available');
    return;
  }
  
  // Select random user
  const user = users[Math.floor(Math.random() * users.length)];
  
  if (!user || !user.sessionCookie) {
    return;
  }
  
  // Build headers with session cookie
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': `connect.sid=${user.sessionCookie}`,
  };
  
  // Step 1: Get available products
  const productsRes = http.get(`${BASE_URL}/api/products?limit=10`, {
    headers: { 'Cookie': `connect.sid=${user.sessionCookie}` },
    tags: { name: 'GetProducts' },
  });
  
  check(productsRes, {
    'products loaded': (r) => r.status === 200,
  });
  
  if (productsRes.status !== 200) {
    paymentFailures.add(1);
    sleep(1);
    return;
  }
  
  const products = productsRes.json();
  if (!products || products.length === 0) {
    sleep(1);
    return;
  }
  
  // Select random product
  const product = products[Math.floor(Math.random() * products.length)];
  
  sleep(1);
  
  // Step 2: Initiate payment
  const paymentStart = Date.now();
  
  const paymentPayload = {
    productId: product.id,
    amount: product.price || 10000,
    paymentMethod: 'bank_transfer',
  };
  
  const paymentRes = http.post(
    `${BASE_URL}/api/payments/create`,
    JSON.stringify(paymentPayload),
    {
      headers: headers,
      tags: { name: 'CreatePayment' },
    }
  );
  
  const paymentDuration = Date.now() - paymentStart;
  paymentLatency.add(paymentDuration);
  
  const paymentSuccessful = check(paymentRes, {
    'payment created': (r) => r.status === 200 || r.status === 201,
    'payment has transaction ID': (r) => r.json('transactionId') !== undefined,
    'payment response < 2s': (r) => paymentDuration < 2000,
  });
  
  if (paymentSuccessful) {
    paymentSuccess.add(1);
    transactionCreated.add(1);
  } else {
    paymentFailures.add(1);
  }
  
  sleep(1);
  
  // Step 3: Check transaction status
  const transactionId = paymentRes.json('transactionId');
  
  if (transactionId) {
    const statusRes = http.get(
      `${BASE_URL}/api/transactions/${transactionId}`,
      {
        headers: { 'Cookie': `connect.sid=${user.sessionCookie}` },
        tags: { name: 'CheckTransactionStatus' },
      }
    );
    
    check(statusRes, {
      'transaction status retrieved': (r) => r.status === 200,
    });
  }
  
  sleep(2);
  
  // Step 4: Verify wallet balance update
  const walletRes = http.get(`${BASE_URL}/api/wallet`, {
    headers: { 'Cookie': `connect.sid=${user.sessionCookie}` },
    tags: { name: 'CheckWallet' },
  });
  
  check(walletRes, {
    'wallet balance retrieved': (r) => r.status === 200,
  });
  
  sleep(1);
}

export function teardown(data) {
  console.log('Payment flow test completed');
}
