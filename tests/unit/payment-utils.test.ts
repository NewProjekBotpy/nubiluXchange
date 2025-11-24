/**
 * Unit Tests: Payment Utilities
 * Tests for payment utility functions and MoneyCalculator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MoneyCalculator, isPaymentsEnabled } from '../../server/utils/payment';

describe('Payment Utilities', () => {
  describe('isPaymentsEnabled', () => {
    it('should return boolean indicating payment availability', () => {
      const result = isPaymentsEnabled();

      expect(typeof result).toBe('boolean');
    });
  });

  describe('MoneyCalculator', () => {
    describe('add', () => {
      it('should add two decimal amounts correctly', () => {
        const result = MoneyCalculator.add('100.50', '50.25');

        expect(result).toBe('150.75');
      });

      it('should handle whole numbers', () => {
        const result = MoneyCalculator.add('100', '200');

        expect(result).toBe('300.00');
      });

      it('should handle zero values', () => {
        const result = MoneyCalculator.add('0', '100');

        expect(result).toBe('100.00');
      });

      it('should maintain precision for small amounts', () => {
        const result = MoneyCalculator.add('0.01', '0.02');

        expect(result).toBe('0.03');
      });

      it('should handle large amounts', () => {
        const result = MoneyCalculator.add('999999999.99', '0.01');

        expect(result).toBe('1000000000.00');
      });

      it('should handle negative amounts', () => {
        const result = MoneyCalculator.add('100', '-50');

        expect(result).toBe('50.00');
      });
    });

    describe('subtract', () => {
      it('should subtract two amounts correctly', () => {
        const result = MoneyCalculator.subtract('100.50', '50.25');

        expect(result).toBe('50.25');
      });

      it('should handle subtraction resulting in zero', () => {
        const result = MoneyCalculator.subtract('100', '100');

        expect(result).toBe('0.00');
      });

      it('should handle subtraction resulting in negative', () => {
        const result = MoneyCalculator.subtract('50', '100');

        expect(result).toBe('-50.00');
      });

      it('should maintain precision', () => {
        const result = MoneyCalculator.subtract('1.00', '0.01');

        expect(result).toBe('0.99');
      });
    });

    describe('multiply', () => {
      it('should multiply amount by factor correctly', () => {
        const result = MoneyCalculator.multiply('100.00', 2);

        expect(result).toBe('200.00');
      });

      it('should handle decimal multipliers', () => {
        const result = MoneyCalculator.multiply('100.00', 1.5);

        expect(result).toBe('150.00');
      });

      it('should handle multiplication by zero', () => {
        const result = MoneyCalculator.multiply('100.00', 0);

        expect(result).toBe('0.00');
      });

      it('should maintain precision with small multipliers', () => {
        const result = MoneyCalculator.multiply('100.00', 0.01);

        expect(result).toBe('1.00');
      });

      it('should handle negative multipliers', () => {
        const result = MoneyCalculator.multiply('100.00', -1);

        expect(result).toBe('-100.00');
      });
    });

    describe('divide', () => {
      it('should divide amount by divisor correctly', () => {
        const result = MoneyCalculator.divide('100.00', 2);

        expect(result).toBe('50.00');
      });

      it('should handle decimal divisors', () => {
        const result = MoneyCalculator.divide('100.00', 1.5);

        expect(parseFloat(result)).toBeCloseTo(66.67, 2);
      });

      it('should throw error when dividing by zero', () => {
        expect(() => MoneyCalculator.divide('100.00', 0)).toThrow();
      });

      it('should maintain precision', () => {
        const result = MoneyCalculator.divide('10.00', 3);

        expect(parseFloat(result)).toBeCloseTo(3.33, 2);
      });

      it('should handle division resulting in whole numbers', () => {
        const result = MoneyCalculator.divide('200.00', 4);

        expect(result).toBe('50.00');
      });
    });

    describe('percentage', () => {
      it('should calculate percentage correctly', () => {
        const result = MoneyCalculator.percentage('100.00', 10);

        expect(result).toBe('10.00');
      });

      it('should handle decimal percentages', () => {
        const result = MoneyCalculator.percentage('100.00', 5.5);

        expect(result).toBe('5.50');
      });

      it('should handle zero percentage', () => {
        const result = MoneyCalculator.percentage('100.00', 0);

        expect(result).toBe('0.00');
      });

      it('should handle percentage over 100', () => {
        const result = MoneyCalculator.percentage('100.00', 150);

        expect(result).toBe('150.00');
      });

      it('should maintain precision for small percentages', () => {
        const result = MoneyCalculator.percentage('1000.00', 0.5);

        expect(result).toBe('5.00');
      });
    });

    describe('compare', () => {
      it('should return 1 when first amount is greater', () => {
        const result = MoneyCalculator.compare('100.00', '50.00');

        expect(result).toBe(1);
      });

      it('should return -1 when first amount is less', () => {
        const result = MoneyCalculator.compare('50.00', '100.00');

        expect(result).toBe(-1);
      });

      it('should return 0 when amounts are equal', () => {
        const result = MoneyCalculator.compare('100.00', '100.00');

        expect(result).toBe(0);
      });

      it('should handle decimal comparison accurately', () => {
        const result = MoneyCalculator.compare('100.01', '100.00');

        expect(result).toBe(1);
      });

      it('should handle very close values', () => {
        const result = MoneyCalculator.compare('0.01', '0.02');

        expect(result).toBe(-1);
      });
    });

    describe('round', () => {
      it('should round amount to 2 decimal places', () => {
        const result = MoneyCalculator.round('100');

        expect(result).toBe('100.00');
      });

      it('should round to 2 decimal places', () => {
        const result = MoneyCalculator.round('100.999');

        expect(result).toBe('101.00');
      });

      it('should handle negative amounts', () => {
        const result = MoneyCalculator.round('-50.50');

        expect(result).toBe('-50.50');
      });

      it('should handle zero', () => {
        const result = MoneyCalculator.round('0');

        expect(result).toBe('0.00');
      });

      it('should truncate excessive decimals', () => {
        const result = MoneyCalculator.round('99.999999');

        expect(result).toBe('100.00');
      });
    });

    describe('toIntegerRupiah', () => {
      it('should convert decimal to integer rupiah', () => {
        const result = MoneyCalculator.toIntegerRupiah('100.50');

        expect(result).toBe(101); // Rounded up
      });

      it('should handle whole numbers', () => {
        const result = MoneyCalculator.toIntegerRupiah('100');

        expect(result).toBe(100);
      });

      it('should round half up', () => {
        expect(MoneyCalculator.toIntegerRupiah('100.5')).toBe(101);
        expect(MoneyCalculator.toIntegerRupiah('100.4')).toBe(100);
      });
    });

    describe('fromIntegerRupiah', () => {
      it('should convert integer to string', () => {
        const result = MoneyCalculator.fromIntegerRupiah(100);

        expect(result).toBe('100');
      });

      it('should handle zero', () => {
        const result = MoneyCalculator.fromIntegerRupiah(0);

        expect(result).toBe('0');
      });

      it('should handle large numbers', () => {
        const result = MoneyCalculator.fromIntegerRupiah(1000000);

        expect(result).toBe('1000000');
      });
    });

    describe('Edge cases', () => {
      it('should handle string inputs', () => {
        const result = MoneyCalculator.add('100.50', '50.25');

        expect(typeof result).toBe('string');
      });

      it('should handle very large numbers', () => {
        const result = MoneyCalculator.add('999999999999.99', '0.01');

        expect(result).toBeDefined();
        expect(parseFloat(result)).toBeGreaterThan(999999999999);
      });

      it('should handle very small numbers', () => {
        const result = MoneyCalculator.add('0.001', '0.002');

        expect(parseFloat(result)).toBeCloseTo(0.003, 3);
      });

      it('should maintain accuracy across operations', () => {
        let result = '100.00';
        result = MoneyCalculator.add(result, '50.50');
        result = MoneyCalculator.subtract(result, '25.25');
        result = MoneyCalculator.multiply(result, 2);
        result = MoneyCalculator.divide(result, 2);

        expect(result).toBe('125.25');
      });
    });

    describe('Error handling', () => {
      it('should handle invalid number strings gracefully', () => {
        // Decimal.js will throw error for truly invalid inputs
        expect(() => MoneyCalculator.add('invalid', '100')).toThrow();
      });

      it('should handle null/undefined inputs', () => {
        expect(() => MoneyCalculator.add(null as any, '100')).toThrow();
        expect(() => MoneyCalculator.add(undefined as any, '100')).toThrow();
      });
    });
  });
});
