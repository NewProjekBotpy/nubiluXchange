import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { logError, logWarning, logInfo } from './utils/logger';

// Check if we're in development environment
const isDevelopment = process.env.NODE_ENV !== 'production';

// BUG FIX: Use fetch-based pooling instead of WebSocket for better reliability
// This prevents "Client network socket disconnected before secure TLS connection" errors
neonConfig.poolQueryViaFetch = true;

// Configure WebSocket with SSL certificate handling (for non-pooled queries if needed)
class CustomWebSocket extends ws {
  constructor(url: string | URL, protocols?: string | string[], options?: any) {
    const wsOptions = {
      ...(options || {}),
      // Bypass SSL verification for development environments with self-signed certificates
      rejectUnauthorized: false
    };
    
    if (isDevelopment) {
      logWarning('SSL verification disabled for development WebSocket', { context: 'CustomWebSocket' });
    }
    
    super(url as any, protocols as any, wsOptions);
  }
}

// Use custom WebSocket with SSL bypassing for all development environments
neonConfig.webSocketConstructor = isDevelopment ? CustomWebSocket : ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure SSL and connection pooling for database
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  
  // Connection pool optimization
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum pool size (default 20)
  min: parseInt(process.env.DB_POOL_MIN || '2'), // Minimum pool size (default 2)
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 30 seconds idle timeout
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '15000'), // 15 seconds (increased from 10)
  
  // Statement timeout to prevent long-running queries
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'), // 30 seconds
  
  // Query timeout
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'), // 30 seconds
  
  // Application name for monitoring
  application_name: process.env.APP_NAME || 'marketplace-app',
  
  // SSL configuration - properly handle both dev and production
  ssl: isDevelopment 
    ? { rejectUnauthorized: false } 
    : { rejectUnauthorized: true }
};

export const pool = new Pool(poolConfig);

// Pool event listeners for monitoring
pool.on('connect', (client) => {
  logInfo('✅ Database client connected to pool', { context: 'db-pool' });
});

pool.on('acquire', (client) => {
  logInfo('🔄 Database client acquired from pool', { context: 'db-pool' });
});

pool.on('remove', (client) => {
  logInfo('❌ Database client removed from pool', { context: 'db-pool' });
});

pool.on('error', (err, client) => {
  logError(err, 'db-pool');
});

export const db = drizzle({ client: pool, schema });

// Graceful shutdown handler
export async function closeDatabase(): Promise<void> {
  try {
    await pool.end();
    logInfo('✅ Database pool closed gracefully', { context: 'closeDatabase' });
  } catch (error) {
    logError(error, 'closeDatabase');
  }
}