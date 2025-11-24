# Environment Setup Guide

This document describes all environment variables used by the NubiluXchange application, their validation rules, and setup instructions.

## Required Environment Variables

These variables MUST be set for the application to start. The server will exit with an error if any are missing or invalid.

### DATABASE_URL
- **Description**: PostgreSQL database connection string
- **Validation**: Must start with `postgres://` or `postgresql://`
- **Example**: `postgresql://user:password@host:5432/database`
- **Setup**: Obtain from your PostgreSQL provider (Neon, Railway, etc.) and add to `.env` file

### SESSION_SECRET
- **Description**: Secret key for session encryption
- **Validation**: Minimum 32 characters
- **Example**: Generate with `openssl rand -hex 32`
- **Setup**: Add to `.env` file:
  ```
  SESSION_SECRET="your-random-32-char-or-longer-secret"
  ```

### JWT_SECRET
- **Description**: Secret key for JWT token generation
- **Validation**: Minimum 32 characters
- **Example**: Generate with `openssl rand -hex 32`
- **Setup**: Add to `.env` file:
  ```
  JWT_SECRET="your-random-32-char-or-longer-secret"
  ```

## Optional Environment Variables (with defaults)

These variables have sensible defaults and are not required for development.

### NODE_ENV
- **Description**: Environment mode
- **Default**: `development`
- **Options**: `development`, `production`

### PORT
- **Description**: Server port number
- **Default**: `5000`
- **Example**: `PORT=3000`

## Production-Required Environment Variables

These variables are optional in development but **REQUIRED** in production. The server will exit if they're missing when `NODE_ENV=production`.

### TOTP_ENCRYPTION_KEY
- **Description**: Encryption key for 2FA TOTP secrets
- **Validation**: Minimum 32 characters
- **Production**: **REQUIRED** - Server will not start without this in production
- **Example**: Generate with `openssl rand -hex 32`
- **Setup**: Add to `.env` file:
  ```
  TOTP_ENCRYPTION_KEY="your-random-32-char-or-longer-key"
  ```
- **Security Note**: Without this key, 2FA functionality will be broken in production

## Optional Environment Variables (production recommended)

These variables are optional but recommended for production deployments. The application will warn if they're missing in production.

### MIDTRANS_SERVER_KEY
- **Description**: Midtrans payment gateway server key
- **Example**: `SB-Mid-server-xxx` (sandbox) or `Mid-server-xxx` (production)
- **Setup**: Get from [Midtrans Dashboard](https://dashboard.midtrans.com/)

### MIDTRANS_CLIENT_KEY
- **Description**: Midtrans payment gateway client key
- **Example**: `SB-Mid-client-xxx` (sandbox) or `Mid-client-xxx` (production)
- **Setup**: Get from [Midtrans Dashboard](https://dashboard.midtrans.com/)

### REDIS_URL
- **Description**: Redis connection URL for caching and scaling
- **Example**: `redis://localhost:6379` or `redis://user:pass@host:port`
- **Setup**: 
  - Local: Install Redis and use `redis://localhost:6379`
  - Cloud: Use Redis Labs, Upstash, or similar service

### SENTRY_DSN
- **Description**: Sentry DSN for error tracking
- **Example**: `https://xxx@xxx.ingest.sentry.io/xxx`
- **Setup**: 
  1. Create account at [Sentry.io](https://sentry.io)
  2. Create a new project
  3. Copy the DSN from project settings

## Additional Optional Variables

### VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
- **Description**: Keys for web push notifications
- **Setup**: Generate using `web-push generate-vapid-keys`

### TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_PHONE
- **Description**: Twilio credentials for SMS alerts
- **Setup**: Get from [Twilio Console](https://console.twilio.com/)

### CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
- **Description**: Cloudinary credentials for image uploads
- **Setup**: Get from [Cloudinary Dashboard](https://cloudinary.com/console)

### GOOGLE_CLOUD_API_KEY
- **Description**: Google Cloud API key for Vision API (image verification)
- **Setup**: Get from [Google Cloud Console](https://console.cloud.google.com/)

### BACKUP_ENABLED / BACKUP_SCHEDULE / BACKUP_RETENTION_DAYS
- **Description**: Database backup configuration
- **Examples**:
  ```
  BACKUP_ENABLED=true
  BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
  BACKUP_RETENTION_DAYS=30
  ```

## Quick Start for Development

Create a `.env` file in the project root with minimum required variables:

```env
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/nubiluxchange"
SESSION_SECRET="your-random-32-char-or-longer-secret"
JWT_SECRET="your-random-32-char-or-longer-secret"

# Optional (recommended for full functionality)
TOTP_ENCRYPTION_KEY="your-random-32-char-or-longer-key"
NODE_ENV=development
PORT=5000
```

## Validation Process

The application validates all environment variables at startup:

1. **Pre-initialization Check**: Validation runs before any server initialization
2. **Format Validation**: Required variables are checked for correct format
3. **Security Validation**: Secrets are checked for minimum length requirements
4. **Fail Fast**: Server exits immediately if validation fails
5. **Clear Messages**: Helpful error messages explain what's missing and how to fix it

## Error Messages

If validation fails, you'll see clear error messages:

```
❌ Environment validation failed. Please fix the errors above before starting the server.
💡 Tip: Create a .env file with the required variables.
```

Each missing/invalid variable will show:
- What's missing: `MISSING REQUIRED: SESSION_SECRET`
- Why it's needed: Description of the variable's purpose
- How to fix: Instructions or examples

## Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Configure all required variables with strong secrets (≥32 chars)
- [ ] Set `TOTP_ENCRYPTION_KEY` for 2FA security
- [ ] Configure payment gateway (Midtrans) if needed
- [ ] Set up Redis for scaling and caching
- [ ] Configure Sentry for error tracking
- [ ] Set up backup system (`BACKUP_ENABLED=true`)
- [ ] Configure all security-related variables
- [ ] Never commit `.env` file to version control
