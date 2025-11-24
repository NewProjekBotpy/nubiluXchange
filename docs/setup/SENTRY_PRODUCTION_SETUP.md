# Sentry Production Setup Guide untuk NXE Marketplace

## Overview
Dokumen ini menjelaskan cara mengkonfigurasi Sentry untuk production-ready error monitoring di NXE Marketplace. Sistem telah dikonfigurasi dengan comprehensive error tracking untuk backend Node.js dan frontend React.

## 🔧 Arsitektur Error Tracking

### Backend (Server-side)
- **File**: `server/sentry.ts`
- **Integrations**: Node.js dengan profiling
- **Middleware**: Request tracking, performance monitoring, error handling
- **Data Scrubbing**: Comprehensive PII dan sensitive data protection

### Frontend (Client-side)
- **File**: `client/src/lib/sentry.ts`
- **Integrations**: Browser tracing, session replay
- **Error Boundaries**: React error boundary dengan Sentry integration
- **Data Scrubbing**: Client-side sensitive data filtering

## 🚀 Production Deployment

### 1. Environment Variables yang Diperlukan

#### Backend Environment Variables
```bash
# Required - Sentry DSN untuk backend
SENTRY_DSN=https://your-dsn@o123456.ingest.sentry.io/123456

# Optional - Enhanced configuration
SENTRY_RELEASE=nxe-marketplace@1.0.0
SENTRY_SERVER_NAME=nxe-prod-server-01
NODE_ENV=production

# Platform-specific (auto-detected)
RAILWAY_REPLICA_ID=auto-detected
RENDER_INSTANCE_ID=auto-detected
```

#### Frontend Environment Variables
```bash
# Required - Sentry DSN untuk frontend (harus diawali VITE_)
VITE_SENTRY_DSN=https://your-dsn@o123456.ingest.sentry.io/123456

# Optional - Enhanced configuration
VITE_SENTRY_RELEASE=nxe-marketplace-client@1.0.0
VITE_APP_VERSION=1.0.0
```

### 2. Sentry Project Setup

#### a. Buat Sentry Account dan Project
1. Daftar di [sentry.io](https://sentry.io)
2. Buat organization baru: `nxe-marketplace`
3. Buat project baru:
   - **Platform**: Node.js (untuk backend)
   - **Platform**: React (untuk frontend)
   - **Name**: `nxe-marketplace-backend` dan `nxe-marketplace-frontend`

#### b. Dapatkan DSN
1. Masuk ke Project Settings → Client Keys (DSN)
2. Copy DSN untuk masing-masing project
3. Set sebagai environment variables

### 3. Configuration Optimizations untuk Production

#### Performance Sampling Rates
- **Backend Traces**: 5% (0.05) untuk mengurangi overhead
- **Backend Profiling**: 2% (0.02) untuk performance insights
- **Frontend Traces**: 5% (0.05) untuk web vitals
- **Session Replay**: 2% normal, 50% on errors

#### Memory Optimization
- **Breadcrumbs**: Max 50 (production) vs 100 (development)
- **Data Scrubbing**: Comprehensive PII removal
- **Transaction Filtering**: Health checks dan favicon requests diabaikan

## 🔒 Security Features

### Data Privacy (GDPR Compliant)
- **No IP Tracking**: IP addresses dihapus dari events
- **No Email in Production**: Email users tidak dikirim ke Sentry
- **Sensitive Data Scrubbing**: Automatic removal untuk:
  - Passwords
  - API keys
  - Credit card numbers
  - Phone numbers
  - Social security numbers

### Comprehensive Data Scrubbing
```javascript
const sensitiveKeys = [
  'token', 'password', 'secret', 'key', 
  'email', 'phone', 'credit_card', 'ssn', 'api_key'
];
```

## 📊 Monitoring Features

### 1. Error Tracking
- **Server Errors**: Database, API, authentication errors
- **Client Errors**: JavaScript errors, React component crashes
- **Network Errors**: API call failures, timeout issues

### 2. Performance Monitoring
- **Server Performance**: Request duration, slow queries
- **Client Performance**: Page load times, Core Web Vitals
- **Profiling**: CPU dan memory usage (production rate-limited)

### 3. Session Replay
- **Error Sessions**: Full replay ketika error terjadi
- **Sample Sessions**: 2% normal sessions untuk insight
- **Privacy**: Text dan inputs di-mask di production

## 🧪 Testing Sentry Integration

### 1. Manual Testing Endpoints
```bash
# Test server error tracking
curl -X POST https://your-domain.com/api/test/sentry/error

# Test server message logging
curl -X POST https://your-domain.com/api/test/sentry/message \
  -H "Content-Type: application/json" \
  -d '{"level": "warning", "message": "Test production monitoring"}'
```

### 2. Frontend Error Testing
```javascript
// Dispatch manual error untuk testing
import { captureError } from '@/lib/sentry';

const testError = new Error('Production Sentry Test');
captureError(testError, { 
  context: 'production_test',
  userId: 'test-user-123',
  timestamp: new Date().toISOString()
});
```

## 🚦 Deployment Checklist

### Pre-Deployment
- [ ] Sentry project dibuat dan dikonfigurasi
- [ ] DSN environment variables di-set
- [ ] Rate limiting dikonfigurasi untuk production
- [ ] Data scrubbing rules diverifikasi

### Post-Deployment
- [ ] Test error tracking endpoint berfungsi
- [ ] Verify events muncul di Sentry dashboard
- [ ] Check session replay berfungsi
- [ ] Confirm sensitive data tidak ter-capture

### Monitoring Setup
- [ ] Set up alerts untuk critical errors
- [ ] Configure performance thresholds
- [ ] Set up daily/weekly error reports
- [ ] Configure team notifications

## 📈 Sentry Dashboard Configuration

### 1. Alerts Setup
```yaml
Error Rate Alert:
  - Threshold: >10 errors/minute
  - Environment: production
  - Notification: Email + Slack

Performance Alert:
  - Threshold: P95 response time >2s
  - Duration: 5 minutes
  - Notification: Team channel
```

### 2. Release Tracking
```bash
# Setup release tracking untuk deployment monitoring
export SENTRY_RELEASE="nxe-marketplace@$(date +%Y%m%d%H%M%S)"
```

## 🔍 Troubleshooting

### Common Issues

#### 1. DSN Tidak Terdeteksi
```bash
# Check environment variables
echo $SENTRY_DSN
echo $VITE_SENTRY_DSN

# Verify dalam application logs
tail -f logs/combined-$(date +%Y-%m-%d).log | grep -i sentry
```

#### 2. Events Tidak Muncul di Dashboard
- Verify DSN format dan validity
- Check network connectivity ke Sentry
- Verify rate limiting tidak memblokir events

#### 3. Session Replay Tidak Berfungsi
- Check browser compatibility
- Verify HTTPS deployment (required untuk replay)
- Check CSP headers tidak memblokir Sentry

### Debug Mode
```javascript
// Enable debug mode untuk troubleshooting
debug: process.env.NODE_ENV !== 'production'
```

## 📞 Support

### Sentry Documentation
- [Node.js Setup](https://docs.sentry.io/platforms/node/)
- [React Setup](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)

### Team Contacts
- **DevOps Lead**: Setup production environment
- **Frontend Lead**: Client-side error debugging
- **Backend Lead**: Server-side performance monitoring

---

## 📋 Quick Start Commands

```bash
# 1. Set production environment variables
export SENTRY_DSN="your-backend-dsn"
export VITE_SENTRY_DSN="your-frontend-dsn"
export SENTRY_RELEASE="nxe-marketplace@$(date +%Y%m%d)"

# 2. Build dan deploy application
npm run build
npm run start

# 3. Test Sentry integration
curl -X POST https://your-domain.com/api/test/sentry/error

# 4. Monitor dashboard
echo "Check Sentry dashboard: https://sentry.io/organizations/nxe-marketplace/"
```

**Status**: ✅ Production Ready - Comprehensive error tracking configured with security best practices.