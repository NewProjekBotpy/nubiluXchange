/**
 * k6 Authentication Flow Load Test
 * Tests login, registration, and 2FA performance
 * 
 * Run: k6 run tests/performance/k6/auth-flow-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const registrationSuccess = new Counter('registration_success');
const loginSuccess = new Counter('login_success');
const authErrors = new Rate('auth_errors');
const authLatency = new Trend('auth_response_time');

export const options = {
  stages: [
    { duration: '1m', target: 30 },   // Ramp up to 30 users
    { duration: '2m', target: 30 },   // Maintain 30 users
    { duration: '30s', target: 60 },  // Spike to 60 users
    { duration: '1m', target: 60 },   // Maintain spike
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    auth_errors: ['rate<0.05'],
    auth_response_time: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  
  // Test 1: User Registration
  const registrationData = {
    email: `k6test-${timestamp}-${random}@example.com`,
    password: 'K6Test123!@#',
    username: `k6user${timestamp}${random}`,
  };
  
  const regStart = Date.now();
  const registerRes = http.post(
    `${BASE_URL}/api/register`,
    JSON.stringify(registrationData),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Registration' },
    }
  );
  
  const regDuration = Date.now() - regStart;
  authLatency.add(regDuration, { operation: 'registration' });
  
  const regSuccess = check(registerRes, {
    'registration successful': (r) => r.status === 200 || r.status === 201,
    'registration has user data': (r) => r.json('user') !== undefined,
    'registration < 800ms': (r) => regDuration < 800,
  });
  
  if (regSuccess) {
    registrationSuccess.add(1);
  } else {
    authErrors.add(1);
  }
  
  sleep(1);
  
  // Test 2: User Login
  const loginData = {
    email: registrationData.email,
    password: registrationData.password,
  };
  
  const loginStart = Date.now();
  const loginRes = http.post(
    `${BASE_URL}/api/login`,
    JSON.stringify(loginData),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' },
    }
  );
  
  const loginDuration = Date.now() - loginStart;
  authLatency.add(loginDuration, { operation: 'login' });
  
  const loginSuccessful = check(loginRes, {
    'login successful': (r) => r.status === 200,
    'login has session': (r) => r.cookies['connect.sid'] !== undefined,
    'login < 600ms': (r) => loginDuration < 600,
  });
  
  if (loginSuccessful) {
    loginSuccess.add(1);
  } else {
    authErrors.add(1);
  }
  
  // Extract session cookie properly
  let sessionCookie = '';
  if (loginRes.cookies && loginRes.cookies['connect.sid']) {
    const cookieArray = loginRes.cookies['connect.sid'];
    if (cookieArray && cookieArray.length > 0) {
      sessionCookie = cookieArray[0].value;
    }
  }
  
  sleep(1);
  
  // Test 3: Get User Profile (authenticated request)
  if (sessionCookie) {
    const profileStart = Date.now();
    const profileRes = http.get(`${BASE_URL}/api/user/profile`, {
      headers: { 'Cookie': `connect.sid=${sessionCookie}` },
      tags: { name: 'GetProfile' },
    });
    
    const profileDuration = Date.now() - profileStart;
    authLatency.add(profileDuration, { operation: 'profile' });
    
    check(profileRes, {
      'profile retrieved': (r) => r.status === 200,
      'profile < 300ms': (r) => profileDuration < 300,
    });
    
    sleep(1);
    
    // Test 4: Logout
    const logoutRes = http.post(`${BASE_URL}/api/logout`, null, {
      headers: { 'Cookie': `connect.sid=${sessionCookie}` },
      tags: { name: 'Logout' },
    });
    
    check(logoutRes, {
      'logout successful': (r) => r.status === 200 || r.status === 204,
    });
  }
  
  sleep(2);
}
