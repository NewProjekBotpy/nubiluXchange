/**
 * k6 Configuration
 * Shared configuration for all k6 tests
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
export const WS_URL = __ENV.WS_URL || 'ws://localhost:5000';

// Default options that can be overridden
export const defaultOptions = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  summaryTimeUnit: 'ms',
};

// Common thresholds
export const commonThresholds = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
};

// Load test profiles
export const loadProfiles = {
  smoke: {
    stages: [
      { duration: '30s', target: 1 },
      { duration: '30s', target: 1 },
    ],
  },
  
  average: {
    stages: [
      { duration: '1m', target: 20 },
      { duration: '3m', target: 20 },
      { duration: '1m', target: 0 },
    ],
  },
  
  stress: {
    stages: [
      { duration: '2m', target: 50 },
      { duration: '5m', target: 50 },
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 0 },
    ],
  },
  
  spike: {
    stages: [
      { duration: '30s', target: 10 },
      { duration: '10s', target: 200 },
      { duration: '1m', target: 200 },
      { duration: '30s', target: 0 },
    ],
  },
  
  soak: {
    stages: [
      { duration: '2m', target: 50 },
      { duration: '3h', target: 50 },
      { duration: '2m', target: 0 },
    ],
  },
};
