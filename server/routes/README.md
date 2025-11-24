# Routes Module

This directory contains the refactored route structure for the application. The goal is to break down the monolithic `server/routes.ts` file (3,810 lines) into manageable, feature-specific modules.

## Current Structure

### `server/routes/index.ts`
Main entry point that:
- Exports `registerRoutes(app: Express): Promise<Server>` function
- Initializes Redis service for caching and pub/sub
- Sets up static file serving for uploads
- Initializes WebSocket server via `setupWebSocket()`
- Composes all feature-specific route modules
- Returns the HTTP server instance

### `server/realtime/websocket.ts`
WebSocket server module that handles:
- Real-time chat messaging with Redis scaling
- Typing indicators
- User online/offline status
- Message reactions
- Admin real-time updates and fraud alerts
- Connection authentication and security
- Graceful shutdown via exported `wsServer` and `wsClients`

## Future Route Structure

The following route modules will be created in subsequent phases:

### Phase 2: Core Authentication & Users
- `auth.routes.ts` - Authentication endpoints (login, register, 2FA, etc.)
- `user.routes.ts` - User profile and management endpoints
- `security.routes.ts` - Security-related endpoints (sessions, devices, etc.)

### Phase 3: Products & Transactions
- `product.routes.ts` - Product CRUD and search endpoints
- `transaction.routes.ts` - Transaction and payment endpoints
- `review.routes.ts` - Product reviews and ratings

### Phase 4: Communication
- `chat.routes.ts` - Chat REST API endpoints (history, attachments, etc.)
- `notification.routes.ts` - Push notifications and preferences

### Phase 5: Admin Features
- `admin/index.ts` - Admin route aggregator
- `admin/analytics.routes.ts` - Analytics and reporting
- `admin/users.routes.ts` - User management
- `admin/content.routes.ts` - Content moderation
- `admin/fraud.routes.ts` - Fraud detection and monitoring
- `admin/backup.routes.ts` - Backup and maintenance
- `admin/sms.routes.ts` - SMS alerts management
- `admin/security.routes.ts` - Security monitoring

### Phase 6: Content & Media
- `upload.routes.ts` - File upload endpoints
- `news.routes.ts` - News and announcements
- `status.routes.ts` - WhatsApp-style status updates
- `video.routes.ts` - Video content endpoints

## How to Add New Routes

### 1. Create a Route Module

Create a new file in `server/routes/` (e.g., `feature.routes.ts`):

```typescript
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/authorization';
import { validate } from '../middleware/validation';
import { featureController } from '../controllers/FeatureController';

const router = Router();

// Public routes
router.get('/public', featureController.getPublic);

// Authenticated routes
router.get('/private', requireAuth, featureController.getPrivate);

// Admin-only routes
router.post('/admin', requireAuth, requireAdmin, featureController.adminAction);

export default router;
```

### 2. Register in `index.ts`

Update `server/routes/index.ts` to include your new route:

```typescript
import featureRoutes from './feature.routes';

export async function registerRoutes(app: Express): Promise<Server> {
  // ... existing setup ...
  
  // Register feature routes
  app.use('/api/feature', featureRoutes);
  
  // ... rest of setup ...
}
```

### 3. Best Practices

- **Keep routes thin**: Business logic belongs in controllers/services
- **Use middleware**: Leverage existing auth, validation, and rate limiting
- **Type safety**: Use TypeScript types from `@shared/schema.ts`
- **Error handling**: Let middleware handle errors, don't try/catch in routes
- **Validation**: Use Zod schemas for request validation
- **Documentation**: Add JSDoc comments for complex routes

### 4. Route Organization

```
server/routes/
├── index.ts              # Main route aggregator
├── auth.routes.ts        # Authentication
├── user.routes.ts        # User management
├── product.routes.ts     # Products
├── chat.routes.ts        # Chat REST API
├── admin/                # Admin routes
│   ├── index.ts          # Admin route aggregator
│   ├── analytics.routes.ts
│   └── users.routes.ts
└── README.md             # This file
```

## Migration Strategy

The migration from the monolithic `server/routes.ts` will happen in phases:

1. **Phase 1 (Complete)**: Create scaffolding and extract WebSocket logic
2. **Phase 2**: Extract authentication and user routes
3. **Phase 3**: Extract product and transaction routes
4. **Phase 4**: Extract communication routes
5. **Phase 5**: Extract admin routes
6. **Phase 6**: Extract content and media routes
7. **Phase 7**: Remove old `server/routes.ts` file

Each phase will:
- Extract specific routes into new modules
- Test functionality thoroughly
- Update imports across the codebase
- Maintain backward compatibility until migration is complete

## Testing

After adding new routes:

1. **Unit tests**: Test route handlers in isolation
2. **Integration tests**: Test full request/response cycle
3. **E2E tests**: Test user workflows
4. **TypeScript**: Ensure no compilation errors
5. **Runtime**: Verify app starts and routes work

## Related Documentation

- [WebSocket Optimizations](../../docs/security/WEBSOCKET_OPTIMIZATIONS.md)
- [Security Guidelines](../../docs/security/SECURITY_DEVELOPER_GUIDE.md)
- [Logging Guidelines](../../docs/security/LOGGING_GUIDELINES.md)
