import express, { type Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { logInfo, logError } from "../utils/logger";
import { RedisService } from "../services/RedisService";
import { setupWebSocket, gracefulShutdownWebSocket } from "../realtime/websocket";
import { stopPerformanceLogging } from "../middleware/performance-monitoring";
import { ConnectionSecurityService } from "../services/ConnectionSecurityService";
import { CacheManager } from "../utils/cache-manager";
import { CacheWarming } from "../utils/cache-warming";

/**
 * Register all API routes and initialize services
 * 
 * This is the main entry point for setting up the backend:
 * 1. Initializes Redis for caching and pub/sub
 * 2. Sets up static file serving for uploads
 * 3. Initializes WebSocket server for real-time features
 * 4. Registers all API route modules
 * 
 * @param app - Express application instance
 * @returns HTTP server instance with WebSocket attached
 */
export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  logInfo("🔄 Node.js backend initializing...");
  
  // Initialize Redis service for chat scaling and caching
  await RedisService.initialize();
  await RedisService.initializeGlobalSubscription();
  
  // Serve uploaded files statically with enhanced security
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads'), { 
    index: false,
    setHeaders: (res, filePath) => {
      // Prevent MIME type sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // Add additional security headers
      res.setHeader('X-Frame-Options', 'DENY');
      
      // Set appropriate content type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      const imageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const videoTypes = ['.mp4', '.webm', '.ogg'];
      
      if (imageTypes.includes(ext) || videoTypes.includes(ext)) {
        // Allow images and videos to be displayed inline
        res.setHeader('Content-Disposition', 'inline');
        // Cache public media files for better performance (1 day)
        res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
      } else {
        // Force download for other file types and prevent caching
        res.setHeader('Content-Disposition', 'attachment');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  // Initialize WebSocket server for real-time chat and notifications
  setupWebSocket(httpServer);

  // Import feature-specific route modules
  const authRoutes = (await import('./auth.routes')).default;
  const userRoutes = (await import('./user.routes')).default;
  const productRoutes = (await import('./product.routes')).default;
  const chatRoutes = (await import('./chat.routes')).default;
  const paymentRoutes = (await import('./payment.routes')).default;
  const notificationRoutes = (await import('./notification.routes')).default;
  const { pushNotificationController } = await import('./notification.routes');
  const reviewRoutes = (await import('./review.routes')).default;
  const contentRoutes = (await import('./content.routes')).default;
  const sellerRoutes = (await import('./seller.routes')).default;
  const uploadRoutes = (await import('./upload.routes')).default;
  const videoRoutes = (await import('./video.routes')).default;
  const socialRoutes = (await import('./social.routes')).default;
  const activityRoutes = (await import('./activity.routes')).default;
  const musicRoutes = (await import('./music.routes')).default;
  const statusRoutes = (await import('./status.routes')).default;
  const privacyRoutes = (await import('./privacy.routes')).default;
  const paymentMethodsRoutes = (await import('./payment-methods.routes')).default;
  const regionalRoutes = (await import('./regional.routes')).default;
  const feedbackRoutes = (await import('./feedback.routes')).default;
  const platformsRoutes = (await import('./platforms.routes')).default;
  
  // Import admin route modules
  const adminSecurityRoutes = (await import('./admin/security.routes')).default;
  const adminBackupRoutes = (await import('./admin/backup.routes')).default;
  const adminMaintenanceRoutes = (await import('./admin/maintenance.routes')).default;
  const adminAnalyticsRoutes = (await import('./admin/analytics.routes')).default;
  const adminUsersRoutes = (await import('./admin/users.routes')).default;
  const adminFilesRoutes = (await import('./admin/files.routes')).default;
  const adminPerformanceRoutes = (await import('./admin/performance.routes')).default;
  const adminConfigRoutes = (await import('./admin/config.routes')).default;
  const adminStatsRoutes = (await import('./admin/stats.routes')).default;
  const adminReportsRoutes = (await import('./admin/reports.routes')).default;
  const adminVideoRoutes = (await import('./admin/video.routes')).default;
  const adminSeasonsRoutes = (await import('./admin/seasons.routes')).default;
  const adminFraudAlertsRoutes = (await import('./admin/fraud-alerts.routes')).default;

  // Register feature routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/chats', chatRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/push-notifications', pushNotificationController);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api', contentRoutes); // Mounts /api/news/* and /api/admin/content/* routes
  app.use('/api/seller', sellerRoutes);
  app.use('/api/upload', uploadRoutes); // Upload and poster generation routes
  app.use('/api/video-content', videoRoutes); // Video content routes
  app.use('/api', socialRoutes); // Social routes (reposts, etc.)
  app.use('/api/activity-logs', activityRoutes); // Activity logs routes
  app.use('/api/music', musicRoutes); // Music search routes
  app.use('/api', statusRoutes); // Status updates routes (/api/status/*)
  app.use('/api/privacy', privacyRoutes); // Privacy settings and blocked users routes
  app.use('/api/payment-methods', paymentMethodsRoutes); // Payment methods management routes
  app.use('/api/regional', regionalRoutes); // Regional settings routes
  app.use('/api/feedback', feedbackRoutes); // User feedback routes
  app.use('/api/platforms', platformsRoutes); // Platform connections routes
  
  // Register admin routes
  app.use('/api/admin', adminSecurityRoutes); // Mounts /api/admin/security, /api/admin/sms, /api/admin/connection-security
  app.use('/api/admin/backup', adminBackupRoutes);
  app.use('/api/admin/maintenance', adminMaintenanceRoutes);
  app.use('/api/admin/analytics', adminAnalyticsRoutes); // Analytics routes
  app.use('/api/admin/users', adminUsersRoutes); // User management routes
  app.use('/api/admin/files', adminFilesRoutes); // File management routes
  app.use('/api/admin/performance', adminPerformanceRoutes); // Performance monitoring routes
  app.use('/api/admin', adminConfigRoutes); // Config, templates, rules, blacklist routes
  app.use('/api/admin', adminStatsRoutes); // Stats, activity-logs, live metrics, sales, devices, search routes
  app.use('/api/admin', adminReportsRoutes); // User reports and export jobs routes
  app.use('/api/admin/video-content', adminVideoRoutes); // Admin video content management
  app.use('/api/admin/seasons', adminSeasonsRoutes); // Season management routes
  app.use('/api/admin/fraud-alerts', adminFraudAlertsRoutes); // Fraud alert management routes
  
  logInfo("✅ Routes registered successfully");
  
  return httpServer;
}

/**
 * Gracefully shutdown all services
 */
export async function gracefulShutdown(): Promise<void> {
  logInfo('🔄 Starting graceful shutdown...');
  
  // Stop periodic timers to prevent memory leaks
  stopPerformanceLogging();
  ConnectionSecurityService.shutdown();
  CacheManager.stopCleanup();
  CacheWarming.stopPeriodicWarming();
  logInfo('✅ Periodic timers stopped');
  
  // Close WebSocket connections
  await gracefulShutdownWebSocket();
  
  // Disconnect from Redis
  try {
    await RedisService.shutdown();
    logInfo('✅ Redis disconnected');
  } catch (error) {
    logError(error as Error, '⚠️  Error disconnecting from Redis:');
  }
  
  logInfo('✅ Graceful shutdown complete');
}
