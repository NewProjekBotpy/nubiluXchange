# Testing Suite

Comprehensive testing infrastructure for the e-commerce marketplace platform.

## Quick Start

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:unit          # Unit tests (Vitest)
npm run test:integration   # Integration tests (Vitest)
npm run test:e2e           # E2E tests (Playwright)
npm run test:performance   # Performance tests (Vitest)
npm run test:k6            # k6 load tests

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests (Playwright)
│   ├── admin.spec.ts       # Admin panel operations
│   ├── auth.spec.ts        # Authentication flows
│   ├── chat.spec.ts        # Chat functionality
│   ├── fraud-monitoring.spec.ts
│   ├── offline.spec.ts     # Offline mode behavior
│   ├── payment.spec.ts     # Payment processing
│   └── products.spec.ts    # Product CRUD operations
│
├── integration/            # Integration tests (Vitest)
│   ├── api-endpoints.test.ts
│   ├── connection-resilience.test.ts
│   ├── database-operations.test.ts
│   ├── fast-data-requests.test.ts
│   ├── third-party-services.test.ts
│   └── websocket.test.ts
│
├── unit/                   # Unit tests (Vitest)
│   ├── AuthService.test.ts
│   ├── PaymentService.test.ts
│   ├── ChatService.test.ts
│   ├── ProductService.test.ts
│   ├── NotificationService.test.ts
│   ├── FraudAlertService.test.ts
│   ├── validation-schemas.test.ts
│   └── ... (21 test files total)
│
├── performance/            # Performance tests
│   ├── k6/                 # k6 load tests
│   │   ├── api-load-test.js
│   │   ├── auth-flow-test.js
│   │   ├── payment-flow-test.js
│   │   ├── spike-test.js
│   │   ├── websocket-stress-test.js
│   │   └── k6-config.js
│   ├── database-queries.test.ts
│   ├── load-testing.test.ts
│   ├── stress-testing.test.ts
│   └── websocket-stress.test.ts
│
├── fixtures/               # Test data
│   └── test-data.ts
│
├── helpers/                # Test utilities
│   ├── playwright-helpers.ts
│   └── test-utils.ts
│
├── mocks/                  # Service mocks
│   └── services.ts
│
└── setup/                  # Test configuration
    ├── e2e-setup.ts
    ├── global-setup.ts
    └── test-env.ts
```

## Test Coverage

- **Overall Coverage**: >80% (target achieved)
- **Unit Tests**: 509+ test cases
- **E2E Tests**: 7 comprehensive test files
- **Integration Tests**: 6 test files
- **Performance Tests**: 4 Vitest + 5 k6 test files

## k6 Load Testing

### Running k6 Tests

```bash
# Run all k6 tests
npm run test:k6

# Run specific k6 tests
npm run test:k6:api        # API load tests
npm run test:k6:auth       # Auth flow tests
npm run test:k6:payment    # Payment flow tests
npm run test:k6:spike      # Spike tests

# Custom k6 runs
k6 run tests/performance/k6/api-load-test.js
k6 run --vus 50 --duration 1m tests/performance/k6/api-load-test.js
```

### k6 Test Types

1. **API Load Test** (`api-load-test.js`)
   - Tests API endpoint performance
   - Simulates realistic user load
   - Measures response times and error rates

2. **Auth Flow Test** (`auth-flow-test.js`)
   - Tests registration and login performance
   - Validates session handling under load

3. **Payment Flow Test** (`payment-flow-test.js`)
   - Tests payment processing performance
   - Simulates real transaction flows

4. **Spike Test** (`spike-test.js`)
   - Tests system behavior under sudden traffic spikes
   - Validates auto-scaling and recovery

5. **WebSocket Stress Test** (`websocket-stress-test.js`)
   - Tests WebSocket connection handling
   - Simulates real-time messaging load

## CI/CD Integration

Tests run automatically on:
- Every push to `main`/`develop` branches
- Every pull request
- Manual workflow dispatch

### GitHub Actions Workflow

The comprehensive testing pipeline includes:

1. **Unit Tests** - Fast feedback on core logic
2. **Integration Tests** - API & database validation
3. **E2E Tests** - Full user workflow testing
4. **Performance Tests** - Vitest performance benchmarks
5. **k6 Load Tests** - Real load testing with k6
6. **Coverage Analysis** - 80% threshold enforcement
7. **Lint & Type Check** - Code quality validation

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('MyService', () => {
  it('should perform operation', async () => {
    const result = await myService.doSomething();
    expect(result).toBe(expected);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="input-email"]', 'test@example.com');
  await page.click('[data-testid="button-login"]');
  await expect(page.locator('[data-testid="text-welcome"]')).toBeVisible();
});
```

### k6 Test Example

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
};

export default function() {
  const res = http.get('http://localhost:5000/api/products');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
```

## Documentation

For detailed testing documentation, see:
- [TESTING_GUIDE.md](../TESTING_GUIDE.md) - Comprehensive testing guide
- [TEST_COVERAGE_REPORT.md](../TEST_COVERAGE_REPORT.md) - Coverage report
- [2FA_TESTING_GUIDE.md](../2FA_TESTING_GUIDE.md) - 2FA testing guide

## Best Practices

1. **Test Organization** - Keep tests organized by type
2. **AAA Pattern** - Arrange, Act, Assert
3. **Mock Dependencies** - Isolate units of work
4. **Descriptive Names** - Clear test descriptions
5. **Async Handling** - Proper async/await usage
6. **Error Scenarios** - Test edge cases and errors
7. **Test Data** - Use fixtures for consistent data

## Troubleshooting

### Common Issues

**Tests fail intermittently**
- Use proper async/await
- Increase timeouts if needed
- Check for race conditions

**Mocks not working**
- Ensure mocks are defined before imports
- Clear mocks between tests

**E2E tests flaky**
- Use proper waits for elements
- Check network conditions
- Verify test isolation

### Debug Tips

```bash
# Run single test
npx vitest path/to/test.ts

# Run with UI
npm run test:ui

# Run E2E with debug
npx playwright test --debug

# k6 verbose output
k6 run --verbose tests/performance/k6/api-load-test.js
```

## Contributing

When adding new features:
1. Write unit tests for business logic
2. Add integration tests for API endpoints
3. Create E2E tests for user workflows
4. Add performance tests for critical paths
5. Update test documentation
