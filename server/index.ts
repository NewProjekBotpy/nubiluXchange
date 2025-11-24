// Load environment variables first
import "dotenv/config";

// Validate critical environment variables before proceeding
import { validateEnvironmentOrExit } from "./utils/env-validation";
validateEnvironmentOrExit();

// Initialize Sentry first, before any other imports
import { initSentry } from "./sentry";
initSentry();

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import ConnectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { registerRoutes, gracefulShutdown } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./init-db";
import { logError, logWarning, logInfo, logHttp, logDebug } from "./utils/logger";
import { captureError } from "./sentry";
import { sentryRequestHandler, sentryPerformanceHandler, sentryErrorHandler } from "./middleware/sentry-error-handler";
import { BackupScheduler } from "./services/BackupScheduler";
import { 
  compressionMiddleware, 
  etagMiddleware, 
  dynamicCacheControl, 
  varyHeaderMiddleware 
} from "./middleware/compression";
import { 
  performanceMonitoringMiddleware, 
  startPerformanceLogging 
} from "./middleware/performance-monitoring";

const app = express();

// Trust proxy for production deployments (Heroku, Railway, etc.)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', true);
}

// BUG FIX: Early exit for Vite dev server internal requests to prevent slow load times
// These paths should bypass heavy middleware (auth, session, rate limiting, etc.)
app.use((req, res, next) => {
  const url = req.url;
  const isViteInternal = url.startsWith('/@vite/') || 
                        url.startsWith('/@react-refresh') || 
                        url.startsWith('/@fs/') ||
                        url === '/@id/__x00__' ||
                        url.includes('?import') ||
                        url.includes('?v=') ||
                        (url.startsWith('/src/') && url.endsWith('.tsx')) ||
                        (url.startsWith('/src/') && url.endsWith('.ts')) ||
                        (url.startsWith('/src/') && url.endsWith('.css'));
  
  if (isViteInternal && process.env.NODE_ENV !== 'production') {
    // Skip to Vite middleware by setting a flag
    (req as any).isViteInternal = true;
    // Add minimal caching headers for better performance
    res.setHeader('Cache-Control', 'no-cache');
    return next();
  }
  next();
});

// Helper to conditionally run middleware (skip for Vite internal requests)
const conditionalMiddleware = (middleware: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if ((req as any).isViteInternal) {
      return next();
    }
    return middleware(req, res, next);
  };
};

// Add performance optimization middlewares early (skip for Vite internal)
app.use(conditionalMiddleware(compressionMiddleware));
app.use(conditionalMiddleware(varyHeaderMiddleware));
app.use(conditionalMiddleware(etagMiddleware));
app.use(conditionalMiddleware(dynamicCacheControl));
app.use(conditionalMiddleware(performanceMonitoringMiddleware));

// Add Sentry middleware at top level before any routes (skip for Vite internal)
app.use(conditionalMiddleware(sentryRequestHandler));
app.use(conditionalMiddleware(sentryPerformanceHandler));

// Security headers middleware
app.use((req, res, next) => {
  if ((req as any).isViteInternal) {
    return next();
  }
  // CORS for cookie authentication - Always validate origins for security
  const origin = req.headers.origin;
  
  // Build list of allowed origins from environment variables
  const allowedDomains = process.env.ALLOWED_DOMAINS || process.env.CORS_ORIGINS || '';
  const allowedDomainList = allowedDomains.split(',').map(d => d.trim()).filter(Boolean);
  
  const allowedOrigins = [
    'http://localhost:5000',
    'https://localhost:5000',
    'http://127.0.0.1:5000',
    'https://127.0.0.1:5000',
    'http://localhost:3000', // For separate dev frontend
    process.env.FRONTEND_URL,
    // Map each allowed domain to both http and https
    ...allowedDomainList.flatMap(domain => [
      `https://${domain}`,
      `http://${domain}`
    ])
  ].filter(Boolean);
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');
  } else if (origin) {
    // Log rejected origins for debugging
    logWarning(`Rejected CORS request from origin: ${origin}`);
  }
  
  // Enhanced security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy for production  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' https://js.stripe.com; " + // Removed unsafe directives for security
      "style-src 'self' https://fonts.googleapis.com; " + // Removed unsafe-inline
      "img-src 'self' data: https: blob:; " + // Allow external images
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "connect-src 'self' ws: wss: https://api.stripe.com https://api.midtrans.com; " + // Allow payment APIs
      "frame-src https://js.stripe.com https://checkout.stripe.com; " + // Allow payment frames
      "frame-ancestors 'none';" +
      "object-src 'none'; " + // Block object/embed
      "base-uri 'self';" // Prevent base tag injection
    );
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
});

// Handle preflight requests
app.options('*', (req, res) => {
  res.sendStatus(200);
});

// Configure session store
const PgSession = ConnectPgSimple(session);

// Instantiate session middleware once (not per-request for performance)
const sessionMiddleware = session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET!, // Already validated at startup
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Only use secure cookies in production
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  },
  name: 'sessionId' // Change default session name for security
});

// Instantiate cookie parser once (not per-request for performance)
const cookieParserMiddleware = cookieParser();

// Session middleware with secure configuration (skip for Vite internal)
app.use((req, res, next) => {
  if ((req as any).isViteInternal) {
    return next();
  }
  sessionMiddleware(req, res, next);
});

// Cookie parser middleware - CRITICAL for authentication (skip for Vite internal)
app.use((req, res, next) => {
  if ((req as any).isViteInternal) {
    return next();
  }
  cookieParserMiddleware(req, res, next);
});

// Global rate limiting with Redis (production) or in-memory (development) fallback
app.use('/api', async (req, res, next) => {
  // More aggressive rate limiting for anonymous users
  const maxRequests = req.headers.authorization || req.cookies.auth_token ? 300 : 100;
  const windowSeconds = 15 * 60; // 15 minutes
  const key = `rate_limit:api:${req.ip}:${req.headers['user-agent']?.substring(0, 50) || 'unknown'}`;
  
  try {
    // Try Redis-based rate limiting first (for production scaling)
    const { RedisService } = await import('./services/RedisService');
    
    if (RedisService.isAvailable()) {
      const current = await RedisService.instance.get(key);
      
      if (!current) {
        // First request in window
        await RedisService.instance.setex(key, windowSeconds, '1');
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowSeconds * 1000).toISOString());
        return next();
      }
      
      const count = parseInt(current);
      if (count >= maxRequests) {
        const ttl = await RedisService.instance.ttl(key);
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'API rate limit exceeded. Please try again later.',
          retryAfter: ttl > 0 ? ttl : windowSeconds
        });
      }
      
      await RedisService.instance.incr(key);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count - 1));
      const ttl = await RedisService.instance.ttl(key);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + ttl * 1000).toISOString());
      return next();
    }
  } catch (error) {
    // Redis error - fall through to in-memory
    logWarning('Redis rate limiting unavailable, using in-memory fallback:', error);
  }
  
  // Fallback: In-memory rate limiting (for development or when Redis is unavailable)
  const now = Date.now();
  
  // Constants for rate limit store management
  const MAX_STORE_SIZE = 10000; // Maximum entries before forced cleanup
  const TARGET_STORE_SIZE = 5000; // Target size after cleanup
  const WARNING_STORE_SIZE = 8000; // Trigger more aggressive cleanup
  const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  // @ts-ignore - Adding to global for simple implementation
  if (!(global as any).rateLimitStore) {
    (global as any).rateLimitStore = new Map();
    (global as any).rateLimitLastCleanup = now;
  }
  const store = (global as any).rateLimitStore;
  
  // Early cleanup trigger if store is getting large
  if (store.size > WARNING_STORE_SIZE) {
    const currentTime = Date.now();
    for (const [storeKey, storeData] of store.entries()) {
      if (currentTime > storeData.resetTime) {
        store.delete(storeKey);
      }
    }
    logInfo(`🧹 Proactive rate limit cleanup: Store size was ${store.size + WARNING_STORE_SIZE}, now ${store.size}`);
  }
  
  let userData = store.get(key);
  if (!userData || now > userData.resetTime) {
    // Clean up expired entry before adding new one
    if (userData && now > userData.resetTime) {
      store.delete(key);
    }
    userData = { count: 1, resetTime: now + windowSeconds * 1000 };
    store.set(key, userData);
  } else {
    userData.count++;
  }
  
  if (userData.count > maxRequests) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'API rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((userData.resetTime - now) / 1000)
    });
  }
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - userData.count));
  res.setHeader('X-RateLimit-Reset', new Date(userData.resetTime).toISOString());
  
  // Periodic cleanup - run every 5 minutes
  const timeSinceLastCleanup = now - ((global as any).rateLimitLastCleanup || 0);
  if (timeSinceLastCleanup > CLEANUP_INTERVAL) {
    (global as any).rateLimitLastCleanup = now;
    const currentTime = Date.now();
    const initialSize = store.size;
    let cleanedCount = 0;
    
    // Remove expired entries
    for (const [storeKey, storeData] of store.entries()) {
      if (currentTime > storeData.resetTime) {
        store.delete(storeKey);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logInfo(`🧹 Rate limit cleanup: Removed ${cleanedCount} expired entries. Store size: ${initialSize} → ${store.size}`);
    }
    
    // Safety: If store still too large after cleanup, force removal of oldest entries
    if (store.size > MAX_STORE_SIZE) {
      const entriesToRemove = Array.from(store.entries() as IterableIterator<[string, { count: number; resetTime: number }]>)
        .sort((a, b) => a[1].resetTime - b[1].resetTime)
        .slice(0, store.size - TARGET_STORE_SIZE) // Keep only TARGET_STORE_SIZE most recent
        .map(entry => entry[0]);
      entriesToRemove.forEach(key => store.delete(key));
      logWarning(`⚠️  Rate limit store size exceeded ${MAX_STORE_SIZE}. Forced cleanup removed ${entriesToRemove.length} oldest entries. New size: ${store.size}`);
    }
  }
  
  next();
});

// Request size limits for DoS protection
// Skip JSON/urlencoded parsing for file upload routes (they use multipart/form-data handled by multer)
const jsonParser = express.json({ limit: '1mb' });
const urlencodedParser = express.urlencoded({ extended: false, limit: '1mb' });

app.use((req, res, next) => {
  // Skip body parsers for upload routes - multer will handle them
  logInfo(`🔍 Request path: ${req.path}, method: ${req.method}, content-type: ${req.headers['content-type']}`);
  if (req.path.startsWith('/api/upload/')) {
    logInfo(`⏭️  Skipping JSON parser for upload route: ${req.path}`);
    return next();
  }
  jsonParser(req, res, next);
});

app.use((req, res, next) => {
  // Skip body parsers for upload routes - multer will handle them
  if (req.path.startsWith('/api/upload/')) {
    return next();
  }
  urlencodedParser(req, res, next);
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Use structured logging for API requests
      logHttp(req.method, path, res.statusCode, duration, {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        userId: req.userId,
        responseSize: capturedJsonResponse ? JSON.stringify(capturedJsonResponse).length : 0
      });
      
      // Keep simple console log for development
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  logInfo("🚀 [INIT] Step 1/7: Starting Node.js backend initialization...");
  logInfo("Node.js backend initializing...");
  
  logInfo("🚀 [INIT] Step 2/7: Initializing database...");
  // Initialize database (ensure tables exist)
  await initializeDatabase();
  logInfo("✅ [INIT] Step 2/7: Database initialized successfully");
  
  logInfo("🚀 [INIT] Step 3/7: Initializing push notification service...");
  // Initialize push notification service
  const { PushNotificationService } = await import('./services/PushNotificationService');
  PushNotificationService.initialize();
  logInfo("✅ [INIT] Step 3/7: Push notification service initialized");
  
  logInfo("🚀 [INIT] Step 4/7: Initializing SMS alert service...");
  // Initialize SMS alert service
  const { SMSAlertService } = await import('./services/SMSAlertService');
  SMSAlertService.initialize();
  logInfo("✅ [INIT] Step 4/7: SMS alert service initialized");
  
  logInfo("🚀 [INIT] Step 5/7: Initializing connection security service...");
  // Initialize connection security service
  const { ConnectionSecurityService } = await import('./services/ConnectionSecurityService');
  ConnectionSecurityService.initialize();
  logInfo("✅ [INIT] Step 5/7: Connection security service initialized");
  
  logInfo("🚀 [INIT] Step 6/8: Initializing backup scheduler...");
  // Initialize backup scheduler (automated backups)
  try {
    await BackupScheduler.initialize();
    logInfo("✅ [INIT] Step 6/8: Backup scheduler initialized");
  } catch (error) {
    logInfo("⚠️  [INIT] Step 6/8: Backup scheduler failed (non-critical)");
    logError(error, 'Failed to initialize backup scheduler');
    captureError(error as Error, { context: 'BACKUP_SCHEDULER_INIT' });
  }

  logInfo("🚀 [INIT] Step 7/9: Initializing background job service...");
  // Initialize background job service for async task processing
  try {
    const { BackgroundJobService } = await import('./services/BackgroundJobService');
    await BackgroundJobService.initialize();
    logInfo("✅ [INIT] Step 7/9: Background job service initialized");
  } catch (error) {
    logInfo("⚠️  [INIT] Step 7/9: Background job service failed (non-critical)");
    logError(error, 'Failed to initialize background job service');
    captureError(error as Error, { context: 'BACKGROUND_JOB_SERVICE_INIT' });
  }

  logInfo("🚀 [INIT] Step 8/10: Starting cache warming and performance monitoring...");
  // Start periodic cache warming (every 30 minutes)
  try {
    const { CacheWarming } = await import('./utils/cache-warming');
    CacheWarming.startPeriodicWarming(30);
    logInfo("✅ [INIT] Step 8/10: Cache warming scheduled");
  } catch (error) {
    logInfo("⚠️  [INIT] Step 8/10: Cache warming failed (non-critical)");
    logError(error, 'Failed to start cache warming');
  }

  // Start performance logging (every 15 minutes)
  startPerformanceLogging(15);
  
  logInfo("🚀 [INIT] Step 9/10: Initializing cleanup scheduler...");
  // Initialize cleanup scheduler for automated data cleanup
  try {
    const { CleanupScheduler } = await import('./services/CleanupScheduler');
    CleanupScheduler.initialize();
    logInfo("✅ [INIT] Step 9/10: Cleanup scheduler initialized");
  } catch (error) {
    logInfo("⚠️  [INIT] Step 9/10: Cleanup scheduler failed (non-critical)");
    logError(error, 'Failed to initialize cleanup scheduler');
  }
  
  logInfo("🚀 [INIT] Step 10/10: Registering API routes...");
  const server = await registerRoutes(app);
  logInfo("✅ [INIT] Step 10/10: API routes registered successfully");

  // Use Sentry error handler as the final error middleware
  app.use(sentryErrorHandler);

  logInfo("🚀 [INIT] Setting up frontend serving...");
  // Gunakan static serve untuk menghindari masalah HMR WebSocket conflict
  // Sementara menggunakan production mode untuk development
  if (app.get("env") === "development" && !process.env.DISABLE_HMR) {
    await setupVite(app, server);
    logInfo("✅ [INIT] Vite dev server setup complete");
  } else {
    // Jika dalam mode production atau HMR disabled, gunakan static files
    try {
      serveStatic(app);
      logInfo("✅ [INIT] Static file serving setup complete");
    } catch (error) {
      // Jika tidak ada build, fallback ke Vite tapi dengan HMR disabled
      logWarning("Build not found, using Vite with HMR disabled");
      await setupVite(app, server);
      logInfo("✅ [INIT] Vite dev server setup complete (fallback)");
    }
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  logInfo("🚀 [INIT] Starting server on port 5000...");
  
  server.listen(port, "0.0.0.0", () => {
    logInfo("✅ [INIT] ========================================");
    logInfo("✅ [INIT] SERVER STARTED SUCCESSFULLY!");
    logInfo("✅ [INIT] ========================================");
    log(`🚀 Node.js API server running on port ${port}`);
    log(`⚛️  React frontend serving on port ${port}`);
    log(`📱 Access the app at: http://localhost:${port}`);
    log(`🔗 API available at: http://localhost:${port}/api`);
    log("");
    log("✅ TypeScript full-stack application is running!");
  });
  
  // Global error handlers for uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logError(error, 'Uncaught Exception');
    captureError(error, { context: 'UNCAUGHT_EXCEPTION' });
    logError(error as Error, '💥 FATAL: Uncaught exception:');
    // In production, you might want to gracefully shutdown
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
  
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logError(error, 'Unhandled Promise Rejection');
    captureError(error, { context: 'UNHANDLED_REJECTION', promise: String(promise) });
    logError(reason as Error, '💥 Unhandled promise rejection:');
  });
  
  process.on('SIGTERM', async () => {
    logInfo('SIGTERM signal received: starting graceful shutdown');
    await gracefulShutdown();
    server.close(() => {
      logInfo('HTTP server closed');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', async () => {
    logInfo('SIGINT signal received: starting graceful shutdown');
    await gracefulShutdown();
    server.close(() => {
      logInfo('HTTP server closed');
      process.exit(0);
    });
  });
})().catch((error: Error) => {
  logError(error, 'Server initialization failed');
  captureError(error, { context: 'SERVER_INIT' });
  logError(error as Error, '💥 FATAL: Failed to start server:');
  process.exit(1);
});
