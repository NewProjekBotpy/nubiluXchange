import { storage } from "../storage";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { Decimal } from "decimal.js";
import { logError } from "./logger";

export interface BalanceValidationResult {
  isValid: boolean;
  currentBalance: string;
  requiredBalance: string;
  message?: string;
}

/**
 * Enhanced balance validation with detailed feedback
 */
export async function validateSufficientBalance(
  userId: number, 
  requiredAmount: string
): Promise<BalanceValidationResult> {
  try {
    const currentBalance = await storage.getWalletBalance(userId);
    const currentDecimal = new Decimal(currentBalance);
    const requiredDecimal = new Decimal(requiredAmount);
    
    const isValid = currentDecimal.greaterThanOrEqualTo(requiredDecimal);
    
    return {
      isValid,
      currentBalance,
      requiredBalance: requiredAmount,
      message: isValid 
        ? undefined 
        : `Insufficient balance. You have Rp ${formatCurrency(currentBalance)}, but need Rp ${formatCurrency(requiredAmount)}.`
    };
  } catch (error) {
    logError(error, 'Balance validation failed', { userId, requiredAmount });
    return {
      isValid: false,
      currentBalance: "0",
      requiredBalance: requiredAmount,
      message: "Unable to verify balance. Please try again."
    };
  }
}

/**
 * Fast balance check without detailed formatting (for high-frequency operations)
 */
export async function quickBalanceCheck(userId: number, requiredAmount: string): Promise<boolean> {
  try {
    const [user] = await db
      .select({ balance: users.walletBalance })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) return false;
    
    const currentDecimal = new Decimal(user.balance || "0");
    const requiredDecimal = new Decimal(requiredAmount);
    
    return currentDecimal.greaterThanOrEqualTo(requiredDecimal);
  } catch (error) {
    logError(error, 'Quick balance check failed', { userId, requiredAmount });
    return false;
  }
}

/**
 * Format currency for Indonesian Rupiah
 */
export function formatCurrency(amount: string): string {
  try {
    const decimal = new Decimal(amount);
    const number = decimal.toNumber();
    return new Intl.NumberFormat('id-ID').format(number);
  } catch (error) {
    return amount;
  }
}

/**
 * Validate amount format and range
 */
export function validateAmount(amount: string | number): { isValid: boolean; message?: string } {
  try {
    const decimal = new Decimal(amount);
    
    if (decimal.lessThanOrEqualTo(0)) {
      return { isValid: false, message: "Amount must be greater than zero" };
    }
    
    if (decimal.greaterThan(100000000)) { // 100 million IDR
      return { isValid: false, message: "Amount exceeds maximum limit of Rp 100,000,000" };
    }
    
    // Check for reasonable decimal places (max 2 for currency)
    if (decimal.decimalPlaces() > 2) {
      return { isValid: false, message: "Amount cannot have more than 2 decimal places" };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, message: "Invalid amount format" };
  }
}