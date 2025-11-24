# Logging Guidelines - NubiluXchange

## Overview
This document defines logging standards for the NubiluXchange application to ensure production readiness, security, and maintainability.

## Migration Status
- **Server**: Winston logger configured at `server/utils/logger.ts`
- **Client**: Browser-safe logger at `client/src/lib/logger.ts`
- **Target**: Replace all `console.log/error/warn/info` statements

## Log Levels

### Server (Winston)
- **error**: Critical errors, exceptions, failed operations
- **warn**: Warnings, deprecated usage, recoverable errors
- **info**: Important state changes, lifecycle events, successful operations
- **http**: HTTP request/response logging
- **debug**: Detailed diagnostic information (development only)

### Client (Browser)
- **error**: Unhandled errors, critical failures
- **warn**: User-facing warnings, validation failures
- **info**: Important state changes (development only)
- **debug**: Detailed diagnostics (development only)

## Usage Guidelines

### Server Code
```typescript
import { logError, logWarning, logInfo, logHttp, logDebug } from './utils/logger';

// ❌ WRONG - Don't use console
console.log('User logged in');
console.error('Payment failed', error);

// ✅ CORRECT - Use Winston logger
logInfo('User logged in', { userId: user.id, username: user.username });
logError(error, 'Payment processing failed', userId);
logHttp('POST', '/api/payment', 200, 150, { userId, amount });
```

### Client Code
```typescript
import { logError, logWarning, logInfo, logDebug } from '@/lib/logger';

// ❌ WRONG - Don't use console
console.log('Component mounted');
console.error('API call failed', error);

// ✅ CORRECT - Use client logger
logInfo('Component mounted', { component: 'ProductList' });
logError('API call failed', error, { component: 'Checkout', operation: 'processPayment' });
```

## Data Redaction Rules

### NEVER LOG (Automatically Redacted)
- Passwords
- Authentication tokens (JWT, session tokens)
- API keys and secrets
- Credit card numbers
- Personal identification numbers
- Session IDs
- Cookies containing auth data
- OAuth tokens
- Private keys

### LOG WITH CAUTION (Context-Dependent)
- User IDs (OK in metadata, helps debugging)
- Usernames (OK for audit trails)
- Email addresses (OK for admin operations)
- IP addresses (OK for security monitoring)
- Transaction amounts (OK for business logic)

### SAFE TO LOG
- Request methods and URLs
- HTTP status codes
- Response times and durations
- Feature flags and configuration
- Error types and messages (sanitized)
- Operation names and states

## Contextual Metadata

### Required Fields
All logs should include relevant context:
```typescript
logInfo('Operation completed', {
  operation: 'createProduct',    // What happened
  userId: 123,                    // Who did it
  duration: 245,                  // How long it took
  result: 'success'               // What was the outcome
});
```

### Request-Scoped Logging
For HTTP endpoints:
```typescript
logHttp('POST', '/api/products', 201, duration, {
  userId: req.user?.id,
  ip: req.ip,
  userAgent: req.get('user-agent')
});
```

### WebSocket Logging
For real-time operations:
```typescript
logInfo('WebSocket message received', {
  type: 'chat_message',
  chatId,
  userId,
  messageLength: content.length
});
```

## Performance Considerations

### Avoid in Hot Paths
```typescript
// ❌ WRONG - Logging in tight loop
for (let i = 0; i < 10000; i++) {
  logDebug('Processing item', { index: i });
}

// ✅ CORRECT - Log summary
const startTime = Date.now();
for (let i = 0; i < 10000; i++) {
  // Process item
}
logDebug('Batch processing completed', { 
  count: 10000, 
  duration: Date.now() - startTime 
});
```

### Use Appropriate Log Levels
```typescript
// ✅ DEBUG logs are filtered out in production
if (process.env.NODE_ENV === 'production') {
  // Only error, warn, info, http
} else {
  // All levels including debug
}
```

## File-by-File Categories

### High Priority (Auth, Payment, Security)
- `server/routes.ts` - Main routes
- `server/services/PaymentService.ts` - Payment processing
- `server/services/AuthService.ts` - Authentication
- `server/middleware/auth.ts` - Auth middleware
- `server/controllers/PaymentController.ts` - Payment endpoints

### Medium Priority (Core Features)
- `server/services/ChatService.ts` - Real-time chat
- `server/services/NotificationService.ts` - Notifications
- `server/services/ProductService.ts` - Product management
- `server/controllers/*Controller.ts` - All controllers

### Lower Priority (Utilities, UI)
- `server/utils/*.ts` - Utility functions
- `server/middleware/*.ts` - Other middleware
- `client/src/hooks/*.ts` - React hooks
- `client/src/components/*.tsx` - React components

## Testing Logging

### Manual Verification
1. Start application in development mode
2. Trigger various operations (auth, payment, chat)
3. Check `logs/` directory for Winston output
4. Verify browser console for client logs
5. Confirm no sensitive data in logs

### Automated Checks
```bash
# Check for remaining console statements
grep -r "console\\.log" server/ client/
grep -r "console\\.error" server/ client/

# Verify no secrets in logs
grep -r "password\|token\|secret" logs/
```

## Production Checklist

- [ ] All console.log replaced with logger
- [ ] Sensitive data redaction verified
- [ ] Log rotation configured (14 days)
- [ ] Log level set to 'info' in production
- [ ] Client logs disabled/minimized in production
- [ ] Sentry integration tested
- [ ] No performance impact from logging
- [ ] Log storage limits configured

## Common Patterns

### Error Handling
```typescript
try {
  await dangerousOperation();
} catch (error) {
  logError(error, 'Operation failed', userId);
  throw error; // Re-throw if needed
}
```

### State Changes
```typescript
logInfo('User role changed', {
  userId,
  oldRole: 'user',
  newRole: 'admin',
  changedBy: adminId
});
```

### Performance Monitoring
```typescript
const start = Date.now();
const result = await expensiveOperation();
logHttp('GET', '/api/analytics', 200, Date.now() - start, {
  recordCount: result.length
});
```

## Migration Checklist

### Per File
- [ ] Import logger utility
- [ ] Replace all console.log → logInfo/logDebug
- [ ] Replace all console.error → logError
- [ ] Replace all console.warn → logWarning
- [ ] Add contextual metadata
- [ ] Review for sensitive data
- [ ] Test logging output
- [ ] Verify no console statements remain

## References
- Winston documentation: https://github.com/winstonjs/winston
- Server logger: `server/utils/logger.ts`
- Client logger: `client/src/lib/logger.ts`
