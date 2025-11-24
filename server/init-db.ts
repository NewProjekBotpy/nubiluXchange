import { db } from './db';
import { sql } from 'drizzle-orm';
import { exec } from 'child_process';
import { promisify } from 'util';
import { seedDatabase } from './seed';
import { logError, logInfo, logWarning } from './utils/logger';

const execAsync = promisify(exec);

/**
 * Check if a table exists in the database
 */
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(
      sql`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      );`
    );
    return result.rows[0]?.exists === true;
  } catch (error) {
    logWarning(`Failed to check if table '${tableName}' exists`, { 
      error: error instanceof Error ? error.message : String(error),
      context: 'tableExists'
    });
    return false;
  }
}

/**
 * Automatically push database schema to create all tables
 */
async function pushDatabaseSchema(): Promise<void> {
  logInfo('🔄 Pushing database schema to create tables...', { context: 'pushDatabaseSchema' });
  
  try {
    const { stdout, stderr } = await execAsync('npx drizzle-kit push', { 
      timeout: 60000,
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    
    if (stdout && stdout.trim()) {
      logInfo('📊 Schema push output:', { 
        output: stdout.trim(), 
        context: 'pushDatabaseSchema' 
      });
    }
    
    if (stderr && stderr.trim() && !stderr.includes('Warning')) {
      logWarning('Schema push warnings:', { 
        warnings: stderr.trim(), 
        context: 'pushDatabaseSchema' 
      });
    }
    
    logInfo('✅ Database schema pushed successfully', { context: 'pushDatabaseSchema' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(error, 'pushDatabaseSchema');
    throw new Error(`Database schema push failed: ${errorMessage}`);
  }
}

/**
 * Database initialization script with automatic schema synchronization
 * Automatically creates or syncs database schema on every server startup
 */
export async function initializeDatabase(): Promise<void> {
  try {
    logInfo('🔍 Initializing database...', { context: 'initializeDatabase' });
    
    // Step 1: Check if critical tables exist
    logInfo('🔍 Checking if database tables exist...', { context: 'initializeDatabase' });
    const criticalTables = ['users', 'products', 'status_updates', 'transactions'];
    const tableChecks = await Promise.all(
      criticalTables.map(async (table) => ({
        table,
        exists: await tableExists(table)
      }))
    );
    
    const missingTables = tableChecks.filter(check => !check.exists).map(check => check.table);
    const allTablesExist = missingTables.length === 0;
    
    if (!allTablesExist) {
      logInfo(`📋 Missing tables detected: ${missingTables.join(', ')}`, { 
        context: 'initializeDatabase' 
      });
      logInfo('🚀 First-time setup: Creating database schema...', { 
        context: 'initializeDatabase' 
      });
      
      // Push schema to create all tables
      await pushDatabaseSchema();
      
      // Verify tables were created
      logInfo('🔍 Verifying tables were created...', { context: 'initializeDatabase' });
      for (const table of criticalTables) {
        const exists = await tableExists(table);
        if (!exists) {
          throw new Error(
            `Critical table '${table}' was not created. Database schema push may have failed.`
          );
        }
      }
      
      logInfo('✅ All critical database tables created successfully', { 
        context: 'initializeDatabase' 
      });
    } else {
      logInfo('✅ All critical tables exist', { context: 'initializeDatabase' });
      
      // Step 2: Validate existing schema for known issues
      logInfo('🔍 Validating database schema...', { context: 'initializeDatabase' });
      let schemaMismatch = false;
      
      try {
        // Check if images column exists in news table (common schema mismatch)
        const newsExists = await tableExists('news');
        if (newsExists) {
          await db.execute(sql`SELECT images FROM news LIMIT 1`);
          logInfo('✅ Schema validation passed', { context: 'initializeDatabase' });
        }
      } catch (validationError) {
        if (validationError instanceof Error && validationError.message.includes('column')) {
          schemaMismatch = true;
          logWarning('⚠️ Schema mismatch detected!', { 
            error: validationError.message,
            context: 'initializeDatabase' 
          });
        }
      }
      
      // Step 3: Auto-sync schema if mismatch detected
      if (schemaMismatch) {
        logInfo('🔄 Auto-syncing database schema to fix mismatch...', { 
          context: 'initializeDatabase' 
        });
        
        try {
          await pushDatabaseSchema();
          logInfo('✅ Schema synchronized successfully', { context: 'initializeDatabase' });
        } catch (error) {
          logWarning('⚠️ Auto-sync completed with warnings (schema may need manual review):', { 
            error: error instanceof Error ? error.message : String(error), 
            context: 'initializeDatabase' 
          });
        }
      } else {
        logInfo('✅ Database schema is up to date', { context: 'initializeDatabase' });
      }
    }
    
    // Step 4: Seed the database with initial data if needed
    logInfo('🌱 Checking if database needs seeding...', { context: 'initializeDatabase' });
    await seedDatabase();
    
    logInfo('✅ Database initialization completed successfully', { 
      context: 'initializeDatabase' 
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logError(error, 'initializeDatabase');
    
    // Provide helpful error messages
    if (errorMessage.includes('DATABASE_URL')) {
      logError(new Error('💡 Database connection failed. Please ensure DATABASE_URL is configured.'), 'initializeDatabase');
    } else if (errorMessage.includes('timeout')) {
      logError(new Error('💡 Database operation timed out. The database may be slow or unavailable.'), 'initializeDatabase');
    } else if (errorMessage.includes('drizzle-kit')) {
      logError(new Error('💡 Schema migration failed. Try running "npx drizzle-kit push" manually.'), 'initializeDatabase');
    }
    
    throw error;
  }
}
