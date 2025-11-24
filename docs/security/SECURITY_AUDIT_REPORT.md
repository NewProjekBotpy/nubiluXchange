# Security Audit Report

**Date:** October 8, 2025  
**Auditor:** Security Audit Team  
**Project:** NXE Gaming Marketplace  
**Scope:** Comprehensive security audit focusing on authentication, session management, security headers, input validation, security monitoring, and error handling

---

## Executive Summary

This security audit identified **4 CRITICAL**, **2 HIGH**, **6 MEDIUM**, and **4 LOW** severity vulnerabilities in the codebase. The most critical issues involve hardcoded secret fallbacks that could be exploited in production, missing .gitignore entries for sensitive files, and non-functional security monitoring features.

**Immediate Actions Required:**
1. Add `.env` to .gitignore to prevent accidental commit of secrets
2. Ensure `JWT_SECRET` and `SESSION_SECRET` are set in production environment
3. Implement SecurityAlertService helper methods (currently mocked)
4. Restrict CORS origins in all environments

---

## Critical Severity Issues

### 1. Hardcoded JWT_SECRET Fallback
**File:** `server/utils/auth.ts:5-9`  
**Severity:** CRITICAL  
**CVSS Score:** 9.1 (Critical)

**Description:**
```typescript
export const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === 'production' 
    ? (() => { console.error('FATAL: JWT_SECRET environment variable is required in production'); process.exit(1); })()
    : '5a0a12df9419bdcbd7da471a6dd8acd5eb16f648e39884ed9f6e5d95a14657dd'
);
```

The fallback secret is hardcoded in the source code. While the code attempts to exit in production, there are edge cases where:
- `NODE_ENV` might not be set correctly
- The application might run in "staging" or other environments
- The hardcoded value is publicly visible in the repository

**Impact:**
- Attackers could forge JWT tokens with the known secret
- Complete authentication bypass possible
- Account takeover vulnerabilities

**Recommendation:**
```typescript
// Better approach - fail fast with no fallback
export const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.error('FATAL: JWT_SECRET environment variable is required');
  console.error('Generate a secure secret with: openssl rand -hex 32');
  process.exit(1);
  throw new Error('JWT_SECRET not configured'); // TypeScript safety
})();
```

**Additional Steps:**
1. Rotate the current JWT secret immediately
2. Invalidate all existing JWT tokens
3. Add startup validation to verify JWT_SECRET length and randomness
4. Document secret generation in deployment guide

---

### 2. Hardcoded SESSION_SECRET Fallback
**File:** `server/index.ts:91-95`  
**Severity:** CRITICAL  
**CVSS Score:** 9.1 (Critical)

**Description:**
```typescript
secret: process.env.SESSION_SECRET || (
  process.env.NODE_ENV === 'production' 
    ? (() => { console.error('FATAL: SESSION_SECRET environment variable is required in production'); process.exit(1); })()
    : 'da15c0e1d057ba39d61cf4e71d46efc887fed4d4c1442cb6bb1224c74b454612'
)
```

Same vulnerability as JWT_SECRET. Hardcoded session secret compromises all session security.

**Impact:**
- Session hijacking and forgery
- Complete authentication bypass
- Cross-site request forgery (CSRF) attacks

**Recommendation:**
Same as JWT_SECRET - remove fallback entirely and fail fast if not configured.

---

### 3. .env File Not in .gitignore
**File:** `.gitignore`  
**Severity:** CRITICAL  
**CVSS Score:** 8.5 (High)

**Description:**
The `.gitignore` file excludes `.env.local` and `.env.production` but NOT `.env`. The current `.env` file contains:
- `DATABASE_URL` with actual database credentials
- `SESSION_SECRET` 
- Potentially other sensitive configuration

**Impact:**
- Accidental commit of `.env` would expose all secrets
- Database credentials could be compromised
- Complete infrastructure breach possible

**Recommendation:**
Add to `.gitignore`:
```gitignore
# Environment files
.env
.env.*
!.env.example
```

Create `.env.example` template:
```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Session Secret (generate with: openssl rand -hex 32)
SESSION_SECRET="your-secure-session-secret-here"

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET="your-secure-jwt-secret-here"

# OpenAI API Key (Optional)
# OPENAI_API_KEY="your-openai-api-key-here"
```

---

### 4. SecurityAlertService Helper Methods Are Mocked
**File:** `server/services/SecurityAlertService.ts:335-352`  
**Severity:** CRITICAL  
**CVSS Score:** 7.5 (High)

**Description:**
Critical security monitoring methods return hardcoded values:
```typescript
private static async getRecentFailedAttempts(userId: number, since: number): Promise<number> {
  // Mock implementation - would query activity logs
  return 0;
}

private static async isNewDevice(userId: number, userAgent: string): Promise<boolean> {
  // Mock implementation - would check against stored device fingerprints
  return false;
}

private static async isNewLocation(userId: number, ipAddress: string): Promise<boolean> {
  // Mock implementation - would check against stored login locations
  return false;
}

private static async checkRapidActions(userId: number, action: string): Promise<number> {
  // Mock implementation - would count recent actions from activity logs
  return 0;
}
```

**Impact:**
- Failed login detection COMPLETELY DISABLED
- Brute force attacks go undetected
- Suspicious login detection COMPLETELY DISABLED
- Account compromise goes unnoticed
- Rate limiting bypass detection DISABLED
- No protection against automated attacks

**Recommendation:**
Implement these methods properly:
```typescript
private static async getRecentFailedAttempts(userId: number, since: number): Promise<number> {
  const activities = await storage.getUserActivities({
    userId,
    activityType: 'auth_failed',
    since: new Date(since)
  });
  return activities.length;
}

private static async isNewDevice(userId: number, userAgent: string): Promise<boolean> {
  const devices = await storage.getUserDevices(userId);
  const deviceFingerprint = createDeviceFingerprint(userAgent);
  return !devices.some(d => d.fingerprint === deviceFingerprint);
}

private static async isNewLocation(userId: number, ipAddress: string): Promise<boolean> {
  const locations = await storage.getUserLoginLocations(userId);
  return !locations.some(l => l.ipAddress === ipAddress);
}

private static async checkRapidActions(userId: number, action: string): Promise<number> {
  const oneMinuteAgo = Date.now() - 60000;
  const activities = await storage.getUserActivities({
    userId,
    activityType: action,
    since: new Date(oneMinuteAgo)
  });
  return activities.length;
}
```

---

## High Severity Issues

### 5. CORS Allows Any Origin in Development
**File:** `server/index.ts:30-46`  
**Severity:** HIGH  
**CVSS Score:** 7.1 (High)

**Description:**
```typescript
if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
  res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:5000');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  // ...
}
```

In development mode, ANY origin is allowed with credentials. This is dangerous if:
- Development config accidentally runs in production
- Development server is exposed to internet
- Staging environment uses development mode

**Impact:**
- Cross-Origin Resource Sharing (CORS) bypass
- Cross-Site Request Forgery (CSRF) attacks
- Session hijacking from malicious sites
- Data exfiltration via XSS

**Recommendation:**
```typescript
// Always validate origins, even in development
const allowedOrigins = [
  'http://localhost:5000',
  'https://localhost:5000',
  'http://localhost:3000', // For separate dev frontend
  process.env.FRONTEND_URL,
  process.env.PRODUCTION_URL
].filter(Boolean);

if (origin && allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  // ...
} else if (origin) {
  // Log rejected origins for debugging
  console.warn(`Rejected CORS request from origin: ${origin}`);
}
```

---

### 6. WebSocket Origin Validation Only in Production
**File:** `server/routes.ts:133-136`  
**Severity:** HIGH  
**CVSS Score:** 6.8 (Medium)

**Description:**
```typescript
if (process.env.NODE_ENV === 'production' && origin && !allowedOrigins.includes(origin)) {
  ws.close(1008, Buffer.from('Invalid origin'));
  return;
}
```

WebSocket connections only validate origin in production mode.

**Impact:**
- Development servers vulnerable to WebSocket hijacking
- Malicious sites can connect to development WebSockets
- Real-time data exfiltration in non-production environments
- Potential for development secrets to leak

**Recommendation:**
```typescript
// Always validate WebSocket origin
if (origin && !allowedOrigins.includes(origin)) {
  console.warn(`Rejected WebSocket connection from origin: ${origin}`);
  ws.close(1008, Buffer.from('Invalid origin'));
  return;
}
```

---

## Medium Severity Issues

### 7. CSP img-src Allows All HTTPS Sources
**File:** `server/index.ts:62`  
**Severity:** MEDIUM  
**CVSS Score:** 5.3 (Medium)

**Description:**
```typescript
"img-src 'self' data: https: blob:; "
```

The `https:` wildcard allows images from ANY HTTPS source.

**Impact:**
- Image-based data exfiltration attacks
- Privacy leaks (user tracking via external images)
- Potential for malicious image payloads

**Recommendation:**
```typescript
"img-src 'self' data: blob: " +
"https://res.cloudinary.com " + // Cloudinary CDN
"https://ui-avatars.com " +      // Avatar service
"https://*.stripe.com; "         // Payment provider images
```

---

### 8. CSP connect-src Allows Any WebSocket
**File:** `server/index.ts:64`  
**Severity:** MEDIUM  
**CVSS Score:** 5.3 (Medium)

**Description:**
```typescript
"connect-src 'self' ws: wss: https://api.stripe.com https://api.midtrans.com; "
```

The `ws:` and `wss:` wildcards allow WebSocket connections to ANY endpoint.

**Impact:**
- Data exfiltration via unauthorized WebSocket connections
- Privacy leaks
- Bypasses for XSS protections

**Recommendation:**
```typescript
// Specify exact WebSocket endpoints
const websocketDomain = new URL(process.env.FRONTEND_URL || 'http://localhost:5000').hostname;
"connect-src 'self' " +
`ws://${websocketDomain} wss://${websocketDomain} ` +
"https://api.stripe.com https://api.midtrans.com; "
```

---

### 9. In-Memory Rate Limiting Won't Work in Cluster Mode
**File:** `server/index.ts:111-175`  
**Severity:** MEDIUM  
**CVSS Score:** 5.0 (Medium)

**Description:**
```typescript
// @ts-ignore - Adding to global for simple implementation
if (!(global as any).rateLimitStore) {
  (global as any).rateLimitStore = new Map();
  // ...
}
```

Comment on line 116: "for production, use Redis"

**Impact:**
- Rate limiting bypassed in multi-process deployments
- Brute force attacks possible
- DoS protection ineffective
- Each process has separate rate limit counters

**Recommendation:**
Use Redis-based rate limiting:
```typescript
import { RedisService } from './services/RedisService';

app.use('/api', async (req, res, next) => {
  const key = `ratelimit:${req.ip}:${req.headers['user-agent']?.substring(0, 50) || 'unknown'}`;
  const maxRequests = req.headers.authorization || req.cookies.auth_token ? 300 : 100;
  const windowMs = 15 * 60 * 1000;
  
  try {
    const current = await RedisService.incr(key);
    if (current === 1) {
      await RedisService.expire(key, Math.ceil(windowMs / 1000));
    }
    
    if (current > maxRequests) {
      const ttl = await RedisService.ttl(key);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'API rate limit exceeded. Please try again later.',
        retryAfter: ttl
      });
    }
    
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
    next();
  } catch (error) {
    console.error('Rate limiting error:', error);
    next(); // Fail open for availability
  }
});
```

---

### 10. Regex-Based XSS Sanitization Can Be Bypassed
**File:** `server/middleware/validation.ts:315-321`  
**Severity:** MEDIUM  
**CVSS Score:** 6.5 (Medium)

**Description:**
```typescript
return obj
  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  .replace(/javascript:/gi, '')
  .replace(/on\w+\s*=/gi, '')
  .trim();
```

Regex-based sanitization is known to be bypassable.

**Impact:**
- Cross-Site Scripting (XSS) attacks possible
- Account takeover via XSS
- Session hijacking
- Malicious script injection

**Recommendation:**
Use a proper HTML sanitization library:
```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    // Use DOMPurify for robust HTML sanitization
    return DOMPurify.sanitize(obj, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href', 'target'],
      ALLOW_DATA_ATTR: false
    });
  }
  // ... rest of implementation
}
```

Note: DOMPurify is already in package.json, so use it!

---

### 11. JWT Contains Sensitive Email Data
**File:** `server/utils/auth.ts:20-30`  
**Severity:** MEDIUM  
**CVSS Score:** 4.5 (Medium)

**Description:**
```typescript
return jwt.sign(
  { 
    id: user.id, 
    username: user.username, 
    email: user.email,  // Sensitive PII
    role: user.role 
  },
  JWT_SECRET,
  { expiresIn: '7d' }
);
```

Email addresses are PII and included in JWT payload. While JWTs are signed, they are NOT encrypted - anyone can decode and read the payload.

**Impact:**
- Email addresses exposed in client-side JWT
- Privacy violations (GDPR concerns)
- Information disclosure
- Email harvesting by malicious actors

**Recommendation:**
```typescript
// Only include necessary claims
return jwt.sign(
  { 
    id: user.id, 
    username: user.username, 
    role: user.role 
    // Remove email - fetch from database when needed
  },
  JWT_SECRET,
  { expiresIn: '7d' }
);
```

Update authentication middleware to fetch email from database if needed.

---

### 12. Redis Recommendation for Rate Limiting Not Implemented
**File:** `server/index.ts:116` (comment)  
**Severity:** MEDIUM  
**CVSS Score:** 5.0 (Medium)

**Description:**
Comment states: "for production, use Redis" but implementation uses in-memory Map.

**Impact:**
- Same as Issue #9
- Production deployments vulnerable
- No centralized rate limiting

**Recommendation:**
See Issue #9 for implementation details.

---

## Low Severity Issues

### 13. Non-Deterministic Rate Limit Cleanup
**File:** `server/index.ts:149-172`, `server/middleware/validation.ts:269`  
**Severity:** LOW  
**CVSS Score:** 3.1 (Low)

**Description:**
```typescript
// FIX: Deterministic cleanup - run every 5 minutes instead of random
const timeSinceLastCleanup = now - ((global as any).rateLimitLastCleanup || 0);
if (timeSinceLastCleanup > 5 * 60 * 1000) { // 5 minutes
  // cleanup...
}
```

The cleanup is deterministic in main rate limiter but validation.ts still uses:
```typescript
if (Math.random() < 0.05) { // 5% chance to trigger cleanup
```

**Impact:**
- Unpredictable memory usage
- Potential memory leaks in high-traffic scenarios
- Inconsistent behavior

**Recommendation:**
Use deterministic cleanup everywhere:
```typescript
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

// In middleware
if (Date.now() - lastCleanup > CLEANUP_INTERVAL) {
  lastCleanup = Date.now();
  // cleanup logic
}
```

---

### 14. Blacklist Errors Silently Ignored
**File:** `server/middleware/securityMonitoring.ts:97-100`  
**Severity:** LOW  
**CVSS Score:** 3.3 (Low)

**Description:**
```typescript
} catch (error) {
  console.error('Error checking IP blacklist:', error);
  // Continue processing - don't block on blacklist check errors
}
```

Blacklist check errors are logged but requests continue processing.

**Impact:**
- Blacklisted IPs might get through during errors
- Reduced security effectiveness
- No alerting on blacklist system failures

**Recommendation:**
```typescript
} catch (error) {
  console.error('Error checking IP blacklist:', error);
  
  // Alert admins about blacklist system failure
  await SecurityAlertService.createAlert(
    'unusual_activity',
    'medium',
    'Blacklist check failed',
    { error: error.message, path, ipAddress },
    undefined,
    req
  );
  
  // Continue processing - availability over security in this case
  // But track failures for monitoring
}
```

---

### 15. CSP May Break Inline Styles
**File:** `server/index.ts:61`  
**Severity:** LOW  
**CVSS Score:** 2.0 (Low)

**Description:**
```typescript
"style-src 'self' https://fonts.googleapis.com; " // Removed unsafe-inline
```

No `unsafe-inline` for styles may break inline styling.

**Impact:**
- UI/UX issues if inline styles are used
- Broken application appearance
- Functionality issues

**Recommendation:**
1. Use CSS-in-JS with nonce:
```typescript
const nonce = crypto.randomBytes(16).toString('base64');
res.locals.cspNonce = nonce;

res.setHeader('Content-Security-Policy', 
  "style-src 'self' 'nonce-" + nonce + "' https://fonts.googleapis.com;"
);
```

2. Or allow hashed styles:
```typescript
"style-src 'self' 'sha256-<hash-of-allowed-inline-styles>' https://fonts.googleapis.com;"
```

---

### 16. Limited Sentry Scrub List
**File:** `server/sentry.ts:75`  
**Severity:** LOW  
**CVSS Score:** 3.0 (Low)

**Description:**
```typescript
const sensitiveKeys = ['token', 'password', 'secret', 'key', 'email', 'phone', 'credit_card', 'ssn', 'api_key'];
```

Could include more sensitive patterns.

**Impact:**
- Potential PII leakage to Sentry
- Compliance issues (GDPR, PCI-DSS)
- Privacy violations

**Recommendation:**
```typescript
const sensitiveKeys = [
  // Authentication
  'token', 'jwt', 'auth', 'session', 'cookie',
  'password', 'passwd', 'pwd', 'pass',
  
  // Secrets
  'secret', 'key', 'api_key', 'apikey', 'access_key',
  'private_key', 'client_secret',
  
  // PII
  'email', 'mail', 'phone', 'mobile', 'tel',
  'ssn', 'sin', 'nino', 'tax_id',
  'credit_card', 'card_number', 'cvv', 'cvc',
  'address', 'street', 'city', 'postal',
  'ip_address', 'ip',
  
  // Financial
  'account', 'iban', 'swift', 'routing',
  'balance', 'amount', 'price',
  
  // Identity
  'passport', 'license', 'id_card',
  'birthdate', 'dob', 'birth_date'
];
```

---

## Positive Security Practices

The following security best practices are correctly implemented:

### ✅ Strong Password Hashing
- Bcrypt with 12 rounds (server/utils/auth.ts:13)
- Industry-standard cost factor
- Resistant to brute force attacks

### ✅ HTTP-Only Cookies for JWT
- Tokens stored in httpOnly cookies (server/middleware/auth.ts:27)
- Protected from XSS attacks
- Secure flag enabled in production (server/index.ts:99)
- SameSite protection (server/index.ts:102)

### ✅ Dual Session Validation
- JWT validated against session (server/middleware/auth.ts:41-56)
- Session mismatch triggers security event
- Session destroyed on mismatch (server/middleware/auth.ts:51)

### ✅ Comprehensive Sentry Data Scrubbing
- Headers scrubbed (server/sentry.ts:66-72)
- Query parameters scrubbed (server/sentry.ts:77-82)
- POST data scrubbed (server/sentry.ts:85-104)
- Exception values scrubbed (server/sentry.ts:116-127)
- IP addresses removed in production (server/sentry.ts:108)

### ✅ File Upload Security
- Magic byte validation (server/middleware/validation.ts:151-210)
- MIME type verification
- Dangerous extensions blocked
- Path traversal prevention
- Null byte injection prevention
- Filename sanitization

### ✅ Security Headers
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- HSTS with preload (production)
- Permissions-Policy

### ✅ Zod Schema Validation
- Strong type validation (server/middleware/validation.ts:22-75)
- Detailed error messages
- Consistent validation across application

### ✅ Structured Error Handling
- No internal details leaked (server/utils/error-handler.ts)
- User-friendly error messages
- Proper HTTP status codes
- Sentry integration for error tracking

---

## Recommendations Summary

### Immediate Actions (Within 24 Hours)
1. ✅ Add `.env` to `.gitignore`
2. ✅ Verify `JWT_SECRET` and `SESSION_SECRET` are set in production
3. ✅ Review and restrict CORS origins for all environments
4. ✅ Implement SecurityAlertService helper methods

### Short-term Actions (Within 1 Week)
1. Implement Redis-based rate limiting for production
2. Replace regex sanitization with DOMPurify
3. Remove email from JWT payload
4. Restrict CSP directives (img-src, connect-src)
5. Add WebSocket origin validation for all environments

### Medium-term Actions (Within 1 Month)
1. Implement proper device fingerprinting
2. Add IP geolocation for login location tracking
3. Set up monitoring for security alert system failures
4. Implement CSP nonce for inline styles
5. Expand Sentry scrub list

### Long-term Actions (Ongoing)
1. Regular security audits (quarterly)
2. Penetration testing
3. Security training for developers
4. Automated security scanning in CI/CD
5. Bug bounty program

---

## Compliance Notes

### GDPR Compliance
- ✅ Email scrubbed from Sentry in production
- ⚠️ Email in JWT payload (recommendation: remove)
- ✅ IP addresses removed from Sentry in production
- ✅ sendDefaultPii: false

### PCI-DSS Compliance
- ✅ Strong encryption (bcrypt 12 rounds)
- ✅ Secure session management
- ✅ Access control (role-based)
- ⚠️ Ensure payment data never logged to Sentry

### OWASP Top 10 Coverage
1. ✅ Injection: Zod validation, parameterized queries
2. ✅ Broken Authentication: Strong JWT/session, httpOnly cookies
3. ⚠️ Sensitive Data Exposure: Email in JWT
4. ✅ XML External Entities: N/A (no XML processing)
5. ⚠️ Broken Access Control: Good role-based, but monitoring mocked
6. ✅ Security Misconfiguration: Good headers, but dev CORS issue
7. ⚠️ XSS: File upload validation good, but regex sanitization weak
8. ✅ Insecure Deserialization: Safe JSON parsing
9. ⚠️ Using Components with Known Vulnerabilities: Regular updates needed
10. ⚠️ Insufficient Logging & Monitoring: Monitoring mocked

---

## Testing Recommendations

### Security Testing Checklist
- [ ] Penetration test for authentication bypass
- [ ] Test rate limiting under load (cluster mode)
- [ ] XSS payload testing with various bypass techniques
- [ ] CSRF token validation testing
- [ ] Session fixation testing
- [ ] JWT token manipulation testing
- [ ] File upload malicious payload testing
- [ ] SQL injection testing (parametrized queries)
- [ ] WebSocket hijacking testing
- [ ] CORS bypass testing

### Automated Security Tools
1. **SAST (Static Analysis)**
   - ESLint security plugins
   - SonarQube
   - Semgrep

2. **DAST (Dynamic Analysis)**
   - OWASP ZAP
   - Burp Suite
   - Nikto

3. **Dependency Scanning**
   - npm audit
   - Snyk
   - Dependabot

4. **Secret Scanning**
   - GitGuardian
   - TruffleHog
   - git-secrets

---

## Conclusion

The application demonstrates several **strong security practices**, particularly in password hashing, session management, and error handling. However, **critical vulnerabilities** exist that must be addressed immediately:

1. **Hardcoded secret fallbacks** pose the highest risk
2. **Mocked security monitoring** leaves the application vulnerable to attacks
3. **Development configuration leaks** could expose production systems

With the recommended fixes implemented, the security posture will be significantly improved. Regular security audits and continuous monitoring are essential for maintaining a secure application.

**Overall Security Rating: 6.5/10** (Medium Risk)
- After implementing critical fixes: **8.5/10** (Low Risk)

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
