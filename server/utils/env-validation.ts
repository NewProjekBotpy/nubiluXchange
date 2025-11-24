import { logError, logInfo, logWarning } from './logger';

interface EnvConfig {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
  default?: string;
  requiredInProduction?: boolean;
}

const ENV_CONFIGS: EnvConfig[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL database connection string',
    validator: (val) => val.startsWith('postgres://') || val.startsWith('postgresql://')
  },
  {
    name: 'SESSION_SECRET',
    required: true,
    description: 'Secret key for session encryption (min 32 characters)',
    validator: (val) => val.length >= 32
  },
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'Secret key for JWT token generation (min 32 characters)',
    validator: (val) => val.length >= 32
  },
  {
    name: 'NODE_ENV',
    required: false,
    description: 'Environment mode (development, production)',
    default: 'development'
  },
  {
    name: 'PORT',
    required: false,
    description: 'Server port number',
    default: '5000'
  },
  // Required in production for 2FA security
  {
    name: 'TOTP_ENCRYPTION_KEY',
    required: false,
    description: 'Encryption key for 2FA TOTP secrets (min 32 characters)',
    validator: (val) => val.length >= 32,
    requiredInProduction: true
  },
  {
    name: 'MIDTRANS_SERVER_KEY',
    required: false,
    description: 'Midtrans payment gateway server key'
  },
  {
    name: 'MIDTRANS_CLIENT_KEY',
    required: false,
    description: 'Midtrans payment gateway client key'
  },
  {
    name: 'REDIS_URL',
    required: false,
    description: 'Redis connection URL for caching and scaling'
  },
  {
    name: 'SENTRY_DSN',
    required: false,
    description: 'Sentry DSN for error tracking'
  }
];

export function validateEnvironmentVariables(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  logInfo('🔍 Validating environment variables...');
  
  for (const config of ENV_CONFIGS) {
    const value = process.env[config.name];
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Check if required variable is missing (always required or required in production)
    if (config.required && !value) {
      errors.push(`MISSING REQUIRED: ${config.name} - ${config.description}`);
      continue;
    }
    
    // Check if production-required variable is missing in production
    if (config.requiredInProduction && isProduction && !value) {
      errors.push(`MISSING REQUIRED (PRODUCTION): ${config.name} - ${config.description}`);
      continue;
    }
    
    // Apply default if missing and not required
    if (!value && config.default) {
      process.env[config.name] = config.default;
      logInfo(`📌 Using default for ${config.name}: ${config.default}`);
      continue;
    }
    
    // Validate value if validator exists
    if (value && config.validator && !config.validator(value)) {
      errors.push(`INVALID VALUE: ${config.name} - ${config.description}`);
      continue;
    }
    
    // Warn about missing optional but recommended vars in production (only for non-critical vars)
    if (!value && !config.required && !config.requiredInProduction && isProduction) {
      warnings.push(`RECOMMENDED FOR PRODUCTION: ${config.name} - ${config.description}`);
    }
  }
  
  // Log results
  if (errors.length > 0) {
    logError(new Error('Environment validation failed'), 'Environment variable validation errors:');
    errors.forEach(err => logError(new Error(err), `❌ ${err}`));
  }
  
  if (warnings.length > 0) {
    warnings.forEach(warn => {
      logWarning(`  ⚠️  ${warn}`);
    });
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    logInfo('✅ All required environment variables validated successfully');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate environment and exit if critical variables are missing
 */
export function validateEnvironmentOrExit(): void {
  const result = validateEnvironmentVariables();
  
  if (!result.valid) {
    logError(new Error('Environment validation failed'), 'Environment validation failed. Please fix the errors above before starting the server.');
    logError(new Error('Tip'), '💡 Tip: Create a .env file with the required variables.');
    process.exit(1);
  }
  
  if (result.warnings.length > 0) {
    logWarning('⚠️  Some recommended environment variables are missing.');
    logWarning('   The application will run, but some features may be disabled.');
  }
}
