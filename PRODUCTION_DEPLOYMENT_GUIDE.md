# NubiluXchange Production Deployment Guide

## 📋 Table of Contents
1. [Pre-Deployment Security Checklist](#pre-deployment-security-checklist)
2. [Required Environment Variables](#required-environment-variables)
3. [Recommended Production Services](#recommended-production-services)
4. [Database Setup](#database-setup)
5. [Redis Configuration](#redis-configuration)
6. [Security Hardening](#security-hardening)
7. [Performance Optimization](#performance-optimization)
8. [Monitoring & Error Tracking](#monitoring--error-tracking)
9. [Backup Strategy](#backup-strategy)
10. [Post-Deployment Verification](#post-deployment-verification)

---

## 🔐 Pre-Deployment Security Checklist

### Critical Security Requirements

- [ ] **TOTP_ENCRYPTION_KEY is set** (min 32 characters)
  - Without this, 2FA TOTP secrets are stored in **PLAINTEXT** (critical vulnerability)
  - Generate: `openssl rand -hex 32`
  - **NEVER** commit this key to version control
  - Rotate periodically (every 90 days recommended)

- [ ] **SESSION_SECRET is strong** (min 32 characters)
  - Generate: `openssl rand -hex 32`
  - Different from development environment
  - Unique per deployment environment

- [ ] **JWT_SECRET is strong** (min 32 characters)
  - Generate: `openssl rand -hex 32`
  - Different from development environment
  - Unique per deployment environment

- [ ] **DATABASE_URL uses SSL** (`?sslmode=require`)
  - Example: `postgresql://user:pass@host:5432/db?sslmode=require`

- [ ] **NODE_ENV set to production**
  - Enables production optimizations
  - Disables debug logging
  - Enforces stricter validation

---

## 🔑 Required Environment Variables

### Essential (Application won't start without these)

```bash
# Database Connection (PostgreSQL with SSL)
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Security Keys (generate unique values for production)
SESSION_SECRET="your-production-session-secret-min-32-chars"
JWT_SECRET="your-production-jwt-secret-min-32-chars"

# Production Mode
NODE_ENV="production"
```

### Required for Production Security

```bash
# TOTP Encryption (CRITICAL for 2FA security)
# Encrypts 2FA TOTP secrets using AES-256-GCM
TOTP_ENCRYPTION_KEY="your-production-totp-key-min-32-chars"
```

---

## 🚀 Recommended Production Services

### 1. Redis (Highly Recommended)

**Why Redis is Essential for Production:**
- ✅ Background job processing (async operations)
- ✅ Chat message caching (better performance)
- ✅ Session storage (scale across multiple servers)
- ✅ Rate limiting data sharing
- ✅ FYP algorithm caching

**Without Redis:**
- ❌ Background jobs run synchronously (slower)
- ❌ No horizontal scaling for chat
- ❌ Limited caching capabilities

**Setup Options:**

#### Option 1: Upstash (Recommended - Free tier available)
```bash
REDIS_URL="redis://:your-password@global-host.upstash.io:6379"
```

#### Option 2: Redis Cloud
```bash
REDIS_URL="rediss://:your-password@host:port"
```

#### Option 3: Self-hosted Redis
```bash
REDIS_URL="redis://localhost:6379"
```

### 2. Error Monitoring (Sentry)

```bash
# Get from: https://sentry.io
SENTRY_DSN="https://your-key@o123456.ingest.sentry.io/7654321"
```

**Benefits:**
- Real-time error tracking
- Performance monitoring
- User feedback collection
- Stack trace analysis

### 3. Payment Gateway (Midtrans)

```bash
# Production keys (not sandbox)
MIDTRANS_SERVER_KEY="Mid-server-YOUR_PRODUCTION_KEY"
MIDTRANS_CLIENT_KEY="Mid-client-YOUR_PRODUCTION_KEY"
```

### 4. SMS Alerts (Twilio)

```bash
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_FROM_PHONE="+1234567890"
```

**Use Cases:**
- 2FA SMS fallback
- Fraud alerts
- Critical security notifications

### 5. Push Notifications (Web Push)

```bash
# Generate: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY="your-public-vapid-key"
VAPID_PRIVATE_KEY="your-private-vapid-key"
```

### 6. Cloud Storage (Cloudinary - Optional)

```bash
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

---

## 🗄️ Database Setup

### Recommended Provider: Neon PostgreSQL

**Why Neon:**
- ✅ Serverless PostgreSQL (auto-scaling)
- ✅ Built-in connection pooling
- ✅ Automatic backups
- ✅ Free tier available
- ✅ Global edge network

### Setup Steps:

1. **Create Database**
   ```bash
   # Sign up at https://neon.tech
   # Create new project
   # Copy connection string
   ```

2. **Configure Connection String**
   ```bash
   DATABASE_URL="postgresql://user:pass@ep-name-region.neon.tech/dbname?sslmode=require"
   ```

3. **Run Migrations**
   ```bash
   npm run db:push
   # Or the application will auto-migrate on first start
   ```

### Connection Pool Optimization

The application uses `@neondatabase/serverless` with these optimizations:
- **Max connections:** 20
- **Idle timeout:** 30s
- **Connection timeout:** 10s
- **SSL:** Required in production

---

## 🔴 Redis Configuration

### Why Redis Matters

| Feature | Without Redis | With Redis |
|---------|--------------|------------|
| Background Jobs | Synchronous (slow) | Async queue (fast) |
| Chat Scaling | Single server | Multi-server |
| Cache Performance | Limited | Optimal |
| Rate Limiting | In-memory only | Distributed |

### Setup Guide

#### 1. Upstash (Easiest - Recommended)

1. Sign up at https://upstash.com
2. Create Redis database
3. Copy connection string:
   ```bash
   REDIS_URL="redis://:password@global-host.upstash.io:6379"
   ```

#### 2. Redis Cloud

1. Sign up at https://redis.com
2. Create database with SSL
3. Copy connection string:
   ```bash
   REDIS_URL="rediss://:password@host:port"
   ```

#### 3. Local Redis (Development)

```bash
# Install Redis
brew install redis  # macOS
sudo apt install redis-server  # Ubuntu

# Start Redis
redis-server

# Configure
REDIS_URL="redis://localhost:6379"
```

---

## 🛡️ Security Hardening

### 1. Environment Variable Security

```bash
# ❌ NEVER do this:
SESSION_SECRET="weak-secret"
TOTP_ENCRYPTION_KEY="12345"

# ✅ ALWAYS do this:
SESSION_SECRET="$(openssl rand -hex 32)"
TOTP_ENCRYPTION_KEY="$(openssl rand -hex 32)"
```

### 2. SSL/TLS Configuration

- Database: Always use `?sslmode=require`
- Redis: Use `rediss://` (with SSL) in production
- API: Deploy behind HTTPS (Cloudflare, AWS ALB, etc.)

### 3. Rate Limiting

Built-in rate limits (configured in code):
- Login: 10 attempts / 15 min
- Registration: 5 attempts / 15 min
- 2FA: 5 attempts / 1 min
- SMS: 3 attempts / 1 min
- API: 100 requests / 15 min (general)

### 4. Security Headers

The application sets these headers automatically:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (if HTTPS)

### 5. Session Security

- **httpOnly cookies**: ✅ Enabled (prevents XSS)
- **secure flag**: ✅ Auto-enabled in production
- **sameSite**: ✅ Set to 'strict'
- **Session timeout**: 24 hours

---

## ⚡ Performance Optimization

### 1. Database Indexes

The schema includes optimized indexes for:
- User lookups (email, username)
- Product searches (category, status, seller)
- Chat queries (participants, status)
- Transaction history
- Message searches

### 2. Caching Strategy (with Redis)

```bash
# Enable caching
REDIS_URL="your-redis-url"

# The application automatically caches:
# - User sessions (24h)
# - Product listings (5min)
# - Category data (1h)
# - FYP algorithm (30min)
# - Chat messages (5min)
```

### 3. Connection Pooling

Automatically configured:
- PostgreSQL: 20 max connections
- Redis: 10 max connections
- Graceful shutdown handling

---

## 📊 Monitoring & Error Tracking

### 1. Sentry Setup

```bash
# 1. Create account: https://sentry.io
# 2. Create project (Node.js + React)
# 3. Copy DSN
SENTRY_DSN="https://your-key@sentry.io/project-id"
```

**What Sentry Tracks:**
- Server errors (500s, crashes)
- Client errors (JS exceptions)
- Performance issues
- API latency
- User feedback

### 2. Winston Logging

Built-in structured logging:
- **Location:** `/logs` directory
- **Rotation:** Daily
- **Retention:** 14 days
- **Levels:** error, warn, info, http, debug

**Log Files:**
```
logs/
├── error-YYYY-MM-DD.log    # Error logs only
├── combined-YYYY-MM-DD.log # All logs
├── exceptions.log          # Unhandled exceptions
└── rejections.log          # Unhandled promise rejections
```

### 3. Metrics to Monitor

- **Response times:** < 200ms (p95)
- **Error rate:** < 1%
- **Database connections:** < 80% max pool
- **Redis memory:** < 90% max memory
- **CPU usage:** < 70% average

---

## 💾 Backup Strategy

### 1. Database Backups (Automated)

```bash
# Enable automated backups
BACKUP_ENABLED="true"
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
BACKUP_RETENTION_DAYS="30"
BACKUP_DIR="./backups"
```

**Backup Configuration:**
```bash
BACKUP_COMPRESSION_LEVEL="6"  # Balance speed/size
BACKUP_INCLUDE_BLOBS="true"   # Include uploaded files
BACKUP_MAX_SIZE_MB="1000"     # 1GB max
BACKUP_CLEANUP_SCHEDULE="0 3 * * 0"  # Weekly cleanup
```

### 2. Manual Backup

```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# With compression
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz
```

### 3. Restore Procedure

```bash
# From backup file
psql $DATABASE_URL < backup.sql

# From compressed backup
gunzip -c backup.sql.gz | psql $DATABASE_URL
```

---

## ✅ Post-Deployment Verification

### 1. Health Checks

```bash
# API health
curl https://your-domain.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-10-28T14:27:34.000Z",
  "version": "1.0.0"
}
```

### 2. Critical Feature Tests

- [ ] User registration works
- [ ] User login works
- [ ] 2FA setup and verification work
- [ ] Product creation/listing works
- [ ] Chat messaging works (real-time)
- [ ] Payment flow works (if enabled)
- [ ] File upload works
- [ ] Admin panel accessible

### 3. Security Verification

```bash
# Check encryption status in logs
grep "TOTP encryption enabled" logs/combined-*.log
# Should show: ✅ TOTP encryption enabled with AES-256-GCM

# Check Redis connection
grep "Redis" logs/combined-*.log
# Should show: ✅ Redis initialized successfully

# Check database connection
grep "Database" logs/combined-*.log
# Should show: ✅ Database initialized successfully
```

### 4. Performance Baseline

```bash
# Measure API response time
time curl https://your-domain.com/api/products

# Should be < 200ms for cached responses
```

---

## 🚨 Common Deployment Issues

### Issue 1: "TOTP encryption disabled"

**Cause:** TOTP_ENCRYPTION_KEY not set

**Fix:**
```bash
# Generate key
openssl rand -hex 32

# Set in environment
TOTP_ENCRYPTION_KEY="generated-key-here"
```

### Issue 2: "Redis not configured"

**Cause:** REDIS_URL not set

**Fix:**
```bash
# Use Upstash free tier
REDIS_URL="redis://:password@upstash.io:6379"
```

### Issue 3: "Database connection failed"

**Causes:**
- Missing `?sslmode=require` in DATABASE_URL
- Incorrect credentials
- Network/firewall issues

**Fix:**
```bash
# Ensure SSL mode is set
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Issue 4: "Session not persisting"

**Causes:**
- SESSION_SECRET not set
- Cookie domain mismatch
- HTTPS/HTTP mismatch

**Fix:**
```bash
# Ensure SESSION_SECRET is set
SESSION_SECRET="$(openssl rand -hex 32)"

# Check logs for cookie warnings
grep "session" logs/error-*.log
```

---

## 📈 Scaling Considerations

### Horizontal Scaling (Multiple Servers)

**Requirements:**
1. ✅ Redis configured (for session sharing)
2. ✅ Database connection pooling
3. ✅ Stateless application design

**Setup:**
```bash
# All servers must use same:
REDIS_URL="same-redis-instance"
DATABASE_URL="same-database"
SESSION_SECRET="same-secret"
```

### Vertical Scaling (Bigger Server)

**Recommended Specs:**

| Users | CPU | RAM | Database | Redis |
|-------|-----|-----|----------|-------|
| < 100 | 1 core | 512MB | Hobby | Free tier |
| < 1K | 2 cores | 1GB | Basic | 10MB |
| < 10K | 4 cores | 2GB | Standard | 100MB |
| < 100K | 8 cores | 4GB | Premium | 1GB |

---

## 🔄 Environment Migration Checklist

### From Development to Staging

- [ ] Copy all required environment variables
- [ ] Generate new SESSION_SECRET
- [ ] Generate new JWT_SECRET
- [ ] Generate new TOTP_ENCRYPTION_KEY
- [ ] Update DATABASE_URL to staging database
- [ ] Update REDIS_URL to staging Redis
- [ ] Set NODE_ENV="staging"
- [ ] Test 2FA encryption migration
- [ ] Verify all features work

### From Staging to Production

- [ ] Generate new production secrets (all of them!)
- [ ] Update DATABASE_URL to production database
- [ ] Update REDIS_URL to production Redis
- [ ] Configure Sentry with production DSN
- [ ] Enable backup system
- [ ] Configure monitoring alerts
- [ ] Set NODE_ENV="production"
- [ ] Perform security audit
- [ ] Load test critical endpoints
- [ ] Document rollback procedure

---

## 📞 Support & Resources

### Documentation
- [Neon Database Docs](https://neon.tech/docs)
- [Upstash Redis Docs](https://docs.upstash.com/redis)
- [Sentry Node.js Docs](https://docs.sentry.io/platforms/node/)
- [Winston Logging](https://github.com/winstonjs/winston)

### Security Best Practices
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)

---

## 🎯 Quick Start Production Deployment

### Minimal Production Setup (5 minutes)

```bash
# 1. Generate secrets
export SESSION_SECRET=$(openssl rand -hex 32)
export JWT_SECRET=$(openssl rand -hex 32)
export TOTP_ENCRYPTION_KEY=$(openssl rand -hex 32)

# 2. Create Neon database (https://neon.tech)
export DATABASE_URL="postgresql://..."

# 3. Create Upstash Redis (https://upstash.com)
export REDIS_URL="redis://..."

# 4. Set production mode
export NODE_ENV="production"

# 5. Deploy!
npm run build
npm start
```

### Verify Deployment

```bash
# Check all critical services are configured
curl https://your-domain.com/api/health

# Check logs for warnings
tail -f logs/combined-*.log | grep "⚠️"
# Should NOT show TOTP or Redis warnings
```

---

**Last Updated:** 2025-10-28  
**Version:** 1.0.0  
**Application:** NubiluXchange Gaming Marketplace
