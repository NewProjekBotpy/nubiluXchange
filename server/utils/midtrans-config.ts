/**
 * Midtrans Configuration Validation and Management
 * 
 * This utility provides centralized configuration validation and management
 * for Midtrans payment gateway integration.
 */

import { logInfo } from './logger';

export interface MidtransConfig {
  serverKey: string;
  clientKey: string;
  isProduction: boolean;
  isConfigured: boolean;
}

export interface ConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config?: MidtransConfig;
}

/**
 * Validates Midtrans environment configuration
 */
export function validateMidtransConfig(): ConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.MIDTRANS_CLIENT_KEY;
  const nodeEnv = process.env.NODE_ENV;
  const isProduction = nodeEnv === 'production';
  
  // Check if keys are present
  if (!serverKey) {
    errors.push('MIDTRANS_SERVER_KEY environment variable is required');
  }
  
  if (!clientKey) {
    errors.push('MIDTRANS_CLIENT_KEY environment variable is required');
  }
  
  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      warnings
    };
  }
  
  // Validate key formats - allow production keys in development for testing
  const hasProductionKeys = serverKey!.startsWith('Mid-server-') && clientKey!.startsWith('Mid-client-');
  const hasSandboxKeys = serverKey!.startsWith('SB-Mid-server-') && clientKey!.startsWith('SB-Mid-client-');
  
  if (isProduction) {
    // Production environment should use production keys
    if (serverKey!.startsWith('SB-')) {
      errors.push('Production environment detected but MIDTRANS_SERVER_KEY appears to be a sandbox key (starts with SB-)');
    }
    if (clientKey!.startsWith('SB-')) {
      errors.push('Production environment detected but MIDTRANS_CLIENT_KEY appears to be a sandbox key (starts with SB-)');
    }
    
    // Production keys should start with Mid-
    if (!serverKey!.startsWith('Mid-server-')) {
      warnings.push('MIDTRANS_SERVER_KEY format may be incorrect for production (should start with Mid-server-)');
    }
    if (!clientKey!.startsWith('Mid-client-')) {
      warnings.push('MIDTRANS_CLIENT_KEY format may be incorrect for production (should start with Mid-client-)');
    }
  } else {
    // Development environment - allow both sandbox and production keys
    if (hasProductionKeys) {
      warnings.push('Using production Midtrans keys in development environment - real payments will be processed!');
    } else if (!hasSandboxKeys) {
      warnings.push('MIDTRANS keys format may be incorrect - expected sandbox keys (SB-Mid-server-/SB-Mid-client-) or production keys (Mid-server-/Mid-client-)');
    }
  }
  
  // Additional security validations
  if (serverKey!.length < 30) {
    warnings.push('MIDTRANS_SERVER_KEY appears to be too short - verify it\'s complete');
  }
  if (clientKey!.length < 30) {
    warnings.push('MIDTRANS_CLIENT_KEY appears to be too short - verify it\'s complete');
  }
  
  // Check for common mistakes
  if (serverKey === clientKey) {
    errors.push('MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY should not be the same');
  }
  
  if (serverKey!.includes('client') || clientKey!.includes('server')) {
    errors.push('Keys may be swapped - server key should not contain "client" and client key should not contain "server"');
  }
  
  const config: MidtransConfig = {
    serverKey: serverKey!,
    clientKey: clientKey!,
    isProduction,
    isConfigured: true
  };
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config
  };
}

/**
 * Gets environment-specific configuration messages
 */
export function getConfigInstructions(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    return `
Production Environment Detected:
- Use production keys from Midtrans Dashboard
- Server key should start with: Mid-server-
- Client key should start with: Mid-client-
- Ensure keys are activated in Midtrans Dashboard
- Verify webhook URL is accessible from internet
`;
  } else {
    return `
Development Environment Detected:
- Option 1: Use sandbox keys from Midtrans Dashboard  
  - Server key should start with: SB-Mid-server-
  - Client key should start with: SB-Mid-client-
  - No real money will be processed
- Option 2: Use production keys for testing (CAUTION: real payments!)
  - Server key should start with: Mid-server-
  - Client key should start with: Mid-client-
  - Real money will be processed - use with caution!
`;
  }
}

/**
 * Logs detailed configuration status
 */
export function logConfigStatus(validation: ConfigValidation): void {
  const environment = process.env.NODE_ENV || 'development';
  
  logInfo(`🔧 Midtrans Configuration Status (${environment.toUpperCase()})`);
  
  if (validation.isValid && validation.config) {
    logInfo('✅ Configuration valid');
    logInfo(`   Environment: ${validation.config.isProduction ? 'Production' : 'Sandbox'}`);
    logInfo(`   Server Key: ${validation.config.serverKey.substring(0, 15)}...`);
    logInfo(`   Client Key: ${validation.config.clientKey.substring(0, 15)}...`);
    
    if (validation.warnings.length > 0) {
      logInfo('⚠️  Configuration warnings:');
      validation.warnings.forEach(warning => logInfo(`   - ${warning}`));
    }
  } else {
    logInfo('❌ Configuration invalid');
    validation.errors.forEach(error => logInfo(`   - ${error}`));
  }
  
  logInfo(getConfigInstructions());
}