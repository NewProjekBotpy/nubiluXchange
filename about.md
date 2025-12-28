# NubiluXchange - Gaming Account Marketplace

## Overview

NubiluXchange is a full-stack TypeScript gaming account marketplace designed for the Indonesian market. The platform enables secure buying and selling of gaming accounts with social media-inspired features including real-time chat, WhatsApp-style status updates, TikTok-style video feeds, and comprehensive marketplace functionality with escrow protection.

The application follows a mobile-first design philosophy with a modern dark theme aesthetic, combining marketplace transactions with social engagement features to create an interactive gaming community platform.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type-safe component development
- Wouter for lightweight client-side routing
- TanStack Query for server state management with offline capabilities
- Tailwind CSS + Radix UI for modern, accessible component design
- Framer Motion for smooth animations
- Vite as the build tool for fast development and optimized production builds

**Key Design Decisions:**
- **Mobile-First Responsive Design**: All components prioritize mobile experience with progressive enhancement for larger screens
- **Code Splitting**: Lazy-loaded routes and components reduce initial bundle size and improve performance
- **Offline-First Architecture**: IndexedDB integration with service workers enables core functionality without network connectivity
- **Component-Based Architecture**: Reusable UI components from Radix UI ensure consistency and accessibility
- **State Management**: TanStack Query handles server state with automatic caching, while React Context manages UI state

### Backend Architecture

**Technology Stack:**
- Express.js with TypeScript for type-safe API development
- PostgreSQL (Neon) with Drizzle ORM for type-safe database operations
- WebSocket for real-time bidirectional communication
- Redis for distributed caching and rate limiting (optional but recommended)
- JWT authentication with httpOnly cookies for security

**Key Design Decisions:**
- **Repository Pattern**: Database operations abstracted into repository classes for maintainability and testability
- **Service Layer**: Business logic separated into service classes (PaymentService, AuthService, TwoFactorService, etc.)
- **Middleware Pipeline**: Layered middleware for compression, authentication, rate limiting, and performance monitoring
- **Graceful Degradation**: Redis is optional; system falls back to in-memory caching when unavailable
- **WebSocket Architecture**: Separate WebSocket server for real-time features (chat, notifications, admin updates) with message batching and compression support

### Database Architecture

**ORM Choice: Drizzle**
- Type-safe query builder with TypeScript inference
- Schema-first design with automatic type generation
- Migration system via `drizzle-kit` for version control
- PostgreSQL-specific features leveraged (JSONB, full-text search, GIN indexes)

**Key Schema Decisions:**
- **Relational Integrity**: Foreign key constraints with cascading deletes ensure data consistency
- **JSON Columns**: Flexible data storage for game-specific metadata, payment details, and media arrays
- **Indexes**: Strategic indexing on frequently queried columns (created_at, status, user roles)
- **Full-Text Search**: PostgreSQL ts_vector and ts_query for message search with relevance ranking
- **Decimal Precision**: Financial amounts stored as decimal(15,2) to prevent floating-point errors

### Authentication & Authorization

**Authentication Strategy:**
- **JWT Tokens**: Dual validation with both JWT tokens and PostgreSQL session storage
- **HttpOnly Cookies**: Tokens stored in httpOnly cookies to prevent XSS attacks
- **Session Management**: Express-session with PostgreSQL backend for server-side session tracking
- **Two-Factor Authentication**: TOTP-based 2FA with backup codes, encrypted secrets using AES-256-GCM

**Authorization Model:**
- **Role-Based Access Control**: Three roles (user, admin, owner) with hierarchical permissions
- **Admin Approval System**: Admins require owner approval before gaining elevated privileges
- **Centralized Auth Helpers**: Shared `auth-utils.ts` provides consistent authorization checks across frontend and backend

### Payment System

**Payment Gateway Integration:**
- **Midtrans**: Primary payment processor for Indonesian market (QRIS, GoPay, ShopeePay)
- **Escrow System**: Automated escrow transactions protect both buyers and sellers
- **Wallet System**: Internal wallet with transaction history and balance tracking
- **Webhook Security**: Signature verification using SHA-512 for payment status updates

**Transaction Flow:**
1. Buyer initiates purchase → Funds held in escrow
2. Seller delivers account credentials
3. Buyer confirms receipt → Funds released to seller
4. Dispute handling via admin panel if needed

### Real-Time Features

**WebSocket Implementation:**
- **Bidirectional Communication**: WebSocket server handles chat, notifications, and admin updates
- **Message Batching**: Client-side batching (50ms window, max 10 messages) reduces network overhead
- **Redis Pub/Sub**: Optional Redis integration for scaling across multiple server instances
- **Reconnection Logic**: Exponential backoff with automatic reconnection on network failures
- **Typing Indicators**: Real-time typing status with debouncing to reduce message frequency

### Offline Mode & PWA

**Progressive Web App Features:**
- **Service Worker**: Custom service worker with segmented caching strategy
- **IndexedDB**: Local storage for products, messages, and user data
- **Sync Queue**: Failed operations queued and retried when connectivity returns
- **Background Sync**: Periodic background sync for data freshness
- **Cache-First Strategy**: Static assets cached for instant loading

**Offline Capabilities:**
- Browse products and view cached listings
- Read previous chat conversations
- Queue new messages for sending when online
- View wallet balance and transaction history
- Access user profile and settings

### File Upload System

**Cloud Storage: Cloudinary**
- **Image Optimization**: Automatic compression and format conversion
- **Multiple Upload Contexts**: Product images (max 5), profile pictures, status media, chat attachments
- **Magic Byte Validation**: File type verification based on binary signatures, not extensions
- **Size Limits**: Configurable per upload type (5MB for images, 10MB for videos)

**Local Fallback:**
- Chat file uploads stored locally if Cloudinary not configured
- Graceful degradation ensures core functionality remains available

### Security Measures

**Input Validation & Sanitization:**
- **Zod Schemas**: Runtime type validation for all API inputs
- **DOMPurify**: Client-side HTML sanitization to prevent XSS
- **Rate Limiting**: Multi-level rate limiting (global, per-user, per-endpoint)
- **CORS Configuration**: Strict origin validation in production

**Encryption:**
- **AES-256-GCM**: TOTP secrets encrypted at rest
- **Bcrypt**: Password hashing with 12 salt rounds
- **SSL/TLS**: Required for all production database connections

**Security Headers:**
- Helmet.js middleware enforces OWASP-recommended headers
- Content Security Policy (CSP) prevents XSS and injection attacks
- X-Frame-Options prevents clickjacking
- HSTS enforces HTTPS connections

### Performance Optimization

**Backend Optimizations:**
- **Database Connection Pooling**: Configurable pool size (default: 20 connections)
- **Redis Caching**: TTL-based caching for frequently accessed data
- **Compression Middleware**: Gzip/Brotli compression for API responses
- **Query Optimization**: Batch operations and strategic indexing reduce N+1 queries

**Frontend Optimizations:**
- **Code Splitting**: Route-based chunking reduces initial bundle size
- **Lazy Loading**: Images and components loaded on-demand
- **Virtual Scrolling**: Efficient rendering of long lists (products, messages)
- **Memoization**: React.memo and useMemo prevent unnecessary re-renders

### Monitoring & Error Tracking

**Sentry Integration:**
- **Error Capture**: Automatic exception tracking on both client and server
- **Performance Monitoring**: Transaction tracing with 5% sample rate in production
- **Breadcrumbs**: Contextual information attached to error reports
- **Sensitive Data Scrubbing**: PII and credentials redacted from error logs

**Winston Logging:**
- **Structured Logging**: JSON-formatted logs with consistent metadata
- **Log Rotation**: Daily log files with 14-day retention
- **Log Levels**: Error, warn, info, http, debug levels for granular control
- **Production Optimization**: Debug logs disabled in production

### Testing Strategy

**Test Coverage:**
- **Unit Tests**: Vitest for component and service testing
- **Integration Tests**: API endpoint and database operation testing
- **E2E Tests**: Playwright for critical user flows (auth, payments, chat)
- **Performance Tests**: k6 load testing scripts for scalability validation

**Test Infrastructure:**
- Separate test database with automated seeding
- Mock services for third-party integrations (Midtrans, Cloudinary)
- Test utilities for authentication and data setup

## Deployment

### Production Deployment (Vercel + Supabase)

The application is configured for serverless deployment on Vercel with Supabase as the database backend - both completely free without requiring a credit card.

**Deployment Stack:**
- **Frontend + Backend**: Vercel (Hobby tier - 100GB bandwidth/month free)
- **Database**: Supabase (Free tier - 500MB database, 1GB storage)
- **Cost**: $0/month for basic usage

**Setup Guide:**
See `VERCEL_DEPLOYMENT_GUIDE.md` for complete step-by-step deployment instructions.

**Key Files:**
- `vercel.json`: Deployment configuration for Vercel
- `.env.example`: Template for all required environment variables
- `VERCEL_DEPLOYMENT_GUIDE.md`: Complete deployment tutorial in Bahasa Indonesia

**Required Environment Variables:**
```
DATABASE_URL              # Supabase PostgreSQL connection string
SESSION_SECRET            # Min 32 characters (generate with: openssl rand -base64 32)
JWT_SECRET                # Min 32 characters  
TOTP_ENCRYPTION_KEY       # Min 32 characters (required for 2FA in production)
NODE_ENV=production
FRONTEND_URL              # Your Vercel deployment URL
ALLOWED_DOMAINS           # Your Vercel domain (for CORS)
```

**Database Migration:**
The application uses Drizzle ORM which is compatible with both Neon and Supabase PostgreSQL. Simply update `DATABASE_URL` to your Supabase connection string and run migrations.

## External Dependencies

### Required Services

**Database:**
- **PostgreSQL (Supabase/Neon)**: Primary data store with SSL connections required
- **Connection String**: Direct connection string from Supabase Dashboard
- **Migration Management**: Drizzle Kit handles schema changes

**Environment Variables (Critical):**
- `DATABASE_URL`: PostgreSQL connection string (required)
- `SESSION_SECRET`: Min 32 characters for session encryption (required)
- `JWT_SECRET`: Min 32 characters for JWT signing (required)
- `TOTP_ENCRYPTION_KEY`: Min 32 characters for 2FA secret encryption (required for 2FA)

### Optional Services

**Redis:**
- **Purpose**: Distributed caching and rate limiting
- **Fallback**: In-memory caching if unavailable
- **Configuration**: `REDIS_URL` environment variable

**Cloudinary:**
- **Purpose**: Cloud image/video storage and optimization
- **Configuration**: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **Fallback**: Local file storage for chat attachments

**Midtrans Payment Gateway:**
- **Purpose**: Indonesian payment processing (QRIS, e-wallets)
- **Configuration**: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`
- **Validation**: Keys must match environment (SB- prefix for sandbox)

**Sentry:**
- **Purpose**: Error tracking and performance monitoring
- **Configuration**: `SENTRY_DSN`
- **Optional**: Application functions without Sentry but loses error tracking

**Google Cloud Vision:**
- **Purpose**: Image analysis and OCR for advanced features
- **Configuration**: `GOOGLE_CLOUD_API_KEY`
- **Optional**: Used for content moderation and automated features

**DeepSeek/OpenAI:**
- **Purpose**: AI-powered content generation (posters, descriptions)
- **Configuration**: `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`
- **Optional**: Fallback to placeholder content if unavailable

**Web Push Notifications:**
- **Purpose**: Browser push notifications for messages and alerts
- **Configuration**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
- **Optional**: Notifications disabled if not configured

### Third-Party Libraries

**Frontend:**
- Radix UI: Accessible component primitives
- Recharts: Data visualization for analytics
- date-fns: Date manipulation and formatting
- Lucide React: Icon library
- Framer Motion: Animation library

**Backend:**
- bcryptjs: Password hashing
- jsonwebtoken: JWT token generation
- otplib: TOTP generation for 2FA
- helmet: Security headers middleware
- compression: Response compression
- express-session: Session management
- connect-pg-simple: PostgreSQL session store

**Development:**
- TypeScript: Type safety across stack
- ESBuild: Fast bundling for production
- Playwright: E2E testing framework
- Vitest: Unit testing framework
- Drizzle Kit: Database migration tool
