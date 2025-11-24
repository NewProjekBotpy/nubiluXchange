import midtransClient from "midtrans-client";
import { Decimal } from "decimal.js";
import { validateMidtransConfig, logConfigStatus } from "./midtrans-config";
import { logInfo, logError, logWarning } from "./logger";

// Initialize Midtrans payment gateway with comprehensive validation
let snap: InstanceType<typeof midtransClient.Snap> | null = null;
let coreApi: InstanceType<typeof midtransClient.CoreApi> | null = null;

// Helper function to check if payments are enabled
export function isPaymentsEnabled(): boolean {
  return snap !== null && coreApi !== null;
}

// Validate configuration and initialize (non-blocking for development)
try {
  const validation = validateMidtransConfig();

  if (validation.isValid && validation.config) {
    try {
      snap = new midtransClient.Snap({
        isProduction: validation.config.isProduction,
        serverKey: validation.config.serverKey,
        clientKey: validation.config.clientKey
      });
      
      coreApi = new midtransClient.CoreApi({
        isProduction: validation.config.isProduction,
        serverKey: validation.config.serverKey,
        clientKey: validation.config.clientKey
      });
      
      logInfo('✅ Midtrans payment gateway initialized successfully');
      
      // Log any warnings
      if (validation.warnings.length > 0) {
        logWarning('⚠️  Configuration warnings:');
        validation.warnings.forEach(warning => logWarning(`   - ${warning}`));
      }
    } catch (error) {
      logError(error, '❌ Midtrans initialization failed');
      snap = null;
      coreApi = null;
    }
  } else {
    // Log configuration status but don't block app startup
    if (process.env.NODE_ENV === 'development') {
      logWarning('⚠️  Midtrans payment gateway not configured');
      logInfo('   Payment features will be disabled');
      logInfo('   App will continue in development mode');
      logInfo('\n   To enable payments, configure:');
      logInfo('   - MIDTRANS_SERVER_KEY (sandbox: SB-Mid-server-...)');
      logInfo('   - MIDTRANS_CLIENT_KEY (sandbox: SB-Mid-client-...)');
    } else {
      // In production, log full details
      logConfigStatus(validation);
    }
    snap = null;
    coreApi = null;
  }
} catch (error) {
  logError(error, '❌ Error during Midtrans configuration');
  logWarning('⚠️  Payment features will be disabled');
  snap = null;
  coreApi = null;
}

// Money calculation utilities using Decimal.js for precision
export class MoneyCalculator {
  /**
   * Add two money amounts with precision
   */
  static add(amount1: string | number, amount2: string | number): string {
    const decimal1 = new Decimal(amount1);
    const decimal2 = new Decimal(amount2);
    const result = decimal1.add(decimal2);
    
    // Use higher precision for very small numbers to preserve accuracy
    if (result.abs().lessThan(0.01)) {
      return result.toFixed(3);
    }
    return result.toFixed(2);
  }

  /**
   * Subtract two money amounts with precision
   */
  static subtract(amount1: string | number, amount2: string | number): string {
    const decimal1 = new Decimal(amount1);
    const decimal2 = new Decimal(amount2);
    return decimal1.sub(decimal2).toFixed(2);
  }

  /**
   * Multiply money amount with precision
   */
  static multiply(amount: string | number, multiplier: string | number): string {
    const decimal1 = new Decimal(amount);
    const decimal2 = new Decimal(multiplier);
    return decimal1.mul(decimal2).toFixed(2);
  }

  /**
   * Divide money amount with precision
   */
  static divide(amount: string | number, divisor: string | number): string {
    const decimal1 = new Decimal(amount);
    const decimal2 = new Decimal(divisor);
    
    if (decimal2.isZero()) {
      throw new Error('Cannot divide by zero');
    }
    
    return decimal1.div(decimal2).toFixed(2);
  }

  /**
   * Calculate percentage of an amount
   */
  static percentage(amount: string | number, percentage: string | number): string {
    const decimal1 = new Decimal(amount);
    const decimal2 = new Decimal(percentage).div(100);
    return decimal1.mul(decimal2).toFixed(2);
  }

  /**
   * Round money amount to 2 decimal places
   */
  static round(amount: string | number): string {
    return new Decimal(amount).toFixed(2);
  }

  /**
   * Compare two money amounts
   * Returns: 1 if amount1 > amount2, -1 if amount1 < amount2, 0 if equal
   */
  static compare(amount1: string | number, amount2: string | number): number {
    const decimal1 = new Decimal(amount1);
    const decimal2 = new Decimal(amount2);
    return decimal1.comparedTo(decimal2);
  }

  /**
   * Convert decimal amount to integer rupiah (IDR has no fractional units)
   */
  static toIntegerRupiah(amount: string | number): number {
    return new Decimal(amount).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  }

  /**
   * Convert integer rupiah to string (for display)
   */
  static fromIntegerRupiah(amount: number): string {
    return new Decimal(amount).toFixed(0);
  }
}

export { snap, coreApi };