/**
 * Unit Tests: Balance Validator
 * Tests for balance validation utility functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from 'decimal.js';
import {
  validateSufficientBalance,
  quickBalanceCheck,
  formatCurrency,
  validateAmount,
  BalanceValidationResult
} from '../../server/utils/balance-validator';
import { storage } from '../../server/storage';
import { db } from '../../server/db';

// Mock dependencies
vi.mock('../../server/storage');
vi.mock('../../server/db');

describe('Balance Validator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateSufficientBalance', () => {
    it('should return valid result when balance is sufficient', async () => {
      const userId = 1;
      const requiredAmount = '100.00';
      const currentBalance = '150.00';

      vi.mocked(storage.getWalletBalance).mockResolvedValue(currentBalance);

      const result = await validateSufficientBalance(userId, requiredAmount);

      expect(result.isValid).toBe(true);
      expect(result.currentBalance).toBe(currentBalance);
      expect(result.requiredBalance).toBe(requiredAmount);
      expect(result.message).toBeUndefined();
    });

    it('should return invalid result when balance is insufficient', async () => {
      const userId = 1;
      const requiredAmount = '200.00';
      const currentBalance = '100.00';

      vi.mocked(storage.getWalletBalance).mockResolvedValue(currentBalance);

      const result = await validateSufficientBalance(userId, requiredAmount);

      expect(result.isValid).toBe(false);
      expect(result.currentBalance).toBe(currentBalance);
      expect(result.requiredBalance).toBe(requiredAmount);
      expect(result.message).toContain('Insufficient balance');
      expect(result.message).toContain('100');
      expect(result.message).toContain('200');
    });

    it('should handle exact balance match', async () => {
      const userId = 1;
      const requiredAmount = '100.00';
      const currentBalance = '100.00';

      vi.mocked(storage.getWalletBalance).mockResolvedValue(currentBalance);

      const result = await validateSufficientBalance(userId, requiredAmount);

      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should handle decimal amounts correctly', async () => {
      const userId = 1;
      const requiredAmount = '99.99';
      const currentBalance = '100.00';

      vi.mocked(storage.getWalletBalance).mockResolvedValue(currentBalance);

      const result = await validateSufficientBalance(userId, requiredAmount);

      expect(result.isValid).toBe(true);
    });

    it('should handle error during balance retrieval', async () => {
      const userId = 1;
      const requiredAmount = '100.00';

      vi.mocked(storage.getWalletBalance).mockRejectedValue(new Error('Database error'));

      const result = await validateSufficientBalance(userId, requiredAmount);

      expect(result.isValid).toBe(false);
      expect(result.currentBalance).toBe('0');
      expect(result.message).toContain('Unable to verify balance');
    });

    it('should handle zero balance', async () => {
      const userId = 1;
      const requiredAmount = '50.00';
      const currentBalance = '0';

      vi.mocked(storage.getWalletBalance).mockResolvedValue(currentBalance);

      const result = await validateSufficientBalance(userId, requiredAmount);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Insufficient balance');
    });
  });

  describe('quickBalanceCheck', () => {
    it('should return true when balance is sufficient', async () => {
      const userId = 1;
      const requiredAmount = '100.00';

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ balance: '150.00' }])
        })
      } as any);

      const result = await quickBalanceCheck(userId, requiredAmount);

      expect(result).toBe(true);
    });

    it('should return false when balance is insufficient', async () => {
      const userId = 1;
      const requiredAmount = '200.00';

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ balance: '100.00' }])
        })
      } as any);

      const result = await quickBalanceCheck(userId, requiredAmount);

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      const userId = 999;
      const requiredAmount = '100.00';

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      } as any);

      const result = await quickBalanceCheck(userId, requiredAmount);

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const userId = 1;
      const requiredAmount = '100.00';

      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await quickBalanceCheck(userId, requiredAmount);

      expect(result).toBe(false);
    });

    it('should handle null balance', async () => {
      const userId = 1;
      const requiredAmount = '100.00';

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ balance: null }])
        })
      } as any);

      const result = await quickBalanceCheck(userId, requiredAmount);

      expect(result).toBe(false);
    });
  });

  describe('formatCurrency', () => {
    it('should format Indonesian Rupiah correctly', () => {
      const amount = '1000000';
      const result = formatCurrency(amount);
      
      expect(result).toBe('1.000.000');
    });

    it('should handle decimal amounts', () => {
      const amount = '1234.56';
      const result = formatCurrency(amount);
      
      expect(result).toContain('1.234');
    });

    it('should handle zero amount', () => {
      const amount = '0';
      const result = formatCurrency(amount);
      
      expect(result).toBe('0');
    });

    it('should handle small amounts', () => {
      const amount = '10';
      const result = formatCurrency(amount);
      
      expect(result).toBe('10');
    });

    it('should handle invalid amount gracefully', () => {
      const amount = 'invalid';
      const result = formatCurrency(amount);
      
      expect(result).toBe('invalid');
    });

    it('should format large amounts correctly', () => {
      const amount = '999999999';
      const result = formatCurrency(amount);
      
      expect(result).toContain('999');
    });
  });

  describe('validateAmount', () => {
    it('should validate positive amounts', () => {
      const amount = '100.00';
      const result = validateAmount(amount);

      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should reject zero amount', () => {
      const amount = '0';
      const result = validateAmount(amount);

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Amount must be greater than zero');
    });

    it('should reject negative amounts', () => {
      const amount = '-100';
      const result = validateAmount(amount);

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Amount must be greater than zero');
    });

    it('should reject amounts exceeding maximum limit', () => {
      const amount = '100000001';
      const result = validateAmount(amount);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('exceeds maximum limit');
    });

    it('should accept amounts at maximum limit', () => {
      const amount = '100000000';
      const result = validateAmount(amount);

      expect(result.isValid).toBe(true);
    });

    it('should reject amounts with more than 2 decimal places', () => {
      const amount = '100.123';
      const result = validateAmount(amount);

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('more than 2 decimal places');
    });

    it('should accept amounts with 2 decimal places', () => {
      const amount = '100.12';
      const result = validateAmount(amount);

      expect(result.isValid).toBe(true);
    });

    it('should accept amounts with 1 decimal place', () => {
      const amount = '100.5';
      const result = validateAmount(amount);

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid number format', () => {
      const amount = 'not-a-number';
      const result = validateAmount(amount);

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Invalid amount format');
    });

    it('should handle numeric input', () => {
      const amount = 100;
      const result = validateAmount(amount);

      expect(result.isValid).toBe(true);
    });
  });
});
