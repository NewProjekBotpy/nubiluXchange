# 🔐 Security Developer Guide

## ⚠️ CRITICAL: Credential File Security

### Files to NEVER Commit
**NEVER commit any files containing authentication cookies, tokens, or credentials:**

```
❌ admin_cookies.txt, fresh_cookies.txt, cookies.txt
❌ *_cookies.txt, *cookies*.txt, curl_cookies.txt
❌ *auth*.txt, *token*.txt, *credential*.txt
❌ *secret*.txt, *session*.txt, *.dump
❌ .env files with real credentials
❌ Any file with sessionId or auth_token values
```

### Emergency Response Protocol
**If you accidentally commit credential files:**

1. **Immediate Action**
   ```bash
   # Delete the files immediately
   git rm admin_cookies.txt fresh_cookies.txt cookies*.txt
   git commit -m "SECURITY: Remove committed credential files"
   ```

2. **Rotate All Secrets** (Use new cryptographically secure values)
   - Rotate `JWT_SECRET` in `server/utils/auth.ts`
   - Rotate `SESSION_SECRET` in `server/index.ts`
   - Update any affected API keys

3. **Invalidate Sessions**
   - Secret rotation automatically invalidates all active sessions/tokens
   - Clear any cached credentials

4. **Update .gitignore**
   - Add patterns to prevent recurrence
   - Test with `git check-ignore filename.txt`

### Security Best Practices

#### Development Testing
```bash
# ✅ Good: Use /tmp for temporary files
curl -c /tmp/test_cookies.txt http://localhost:5000/api/auth/login

# ❌ Bad: Create files in project root
curl -c cookies.txt http://localhost:5000/api/auth/login
```

#### Environment Variables
```bash
# ✅ Production: Use environment variables
export JWT_SECRET="your-secure-32-char-secret"
export SESSION_SECRET="your-secure-32-char-secret"

# ❌ Never hardcode in source
const JWT_SECRET = "actual-secret-key-here";
```

#### Pre-Commit Checks
```bash
# Check for potential credential files before committing
git status | grep -E "(cookie|auth|token|credential|secret)" && echo "⚠️  REVIEW FILES FOR CREDENTIALS!"
```

### Secret Generation
Generate new secrets using:
```bash
# Generate 32-byte hex secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### .gitignore Security Patterns
The following patterns are configured to prevent credential commits:
```
*cookies*.txt
*cookie*
*.cookie
*auth*.txt
*token*.txt
*credential*.txt
*secret*.txt
*session*.txt
*.dump
admin_cookies.*
fresh_cookies.*
```

## 🛡️ Security Architecture

### Authentication Flow
1. Users login with credentials → JWT token generated
2. Token stored in httpOnly cookie (secure, not accessible via JavaScript)
3. Session data stored server-side with secure session secret
4. All API requests validated via cookie-based JWT authentication

### Secret Management
- **Development**: Secure fallback secrets in code (rotated after any leak)
- **Production**: Environment variables (required, causes exit if missing)
- **Rotation**: Changes invalidate all existing sessions automatically

### Security Headers
The application implements comprehensive security headers:
- CSRF protection via SameSite cookies
- XSS protection headers
- Content Security Policy
- Rate limiting for API endpoints

## 🚨 Incident Response

If credentials are compromised:
1. **Assess Impact**: Check logs for unauthorized access
2. **Rotate Secrets**: Generate new JWT_SECRET and SESSION_SECRET
3. **Monitor**: Watch for suspicious activity in logs
4. **Document**: Record incident and preventive measures taken

---
**Remember: When in doubt, treat any file as potentially sensitive and exclude it from version control.**