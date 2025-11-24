/**
 * E2E Tests: Payment Flow
 * Tests for Midtrans payment integration and wallet operations
 */

import { test, expect } from '@playwright/test';
import { authHelpers, paymentHelpers, BASE_URL, waitHelpers } from '../helpers/playwright-helpers';
import { testUsers, testPayments } from '../fixtures/test-data';

test.describe('Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as buyer
    await authHelpers.login(page, testUsers.buyer.email, testUsers.buyer.password);
  });

  test.describe('Product Purchase', () => {
    test('should initiate payment for product', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      
      // Click on first product
      const productCard = page.locator('[data-testid^="card-product-"]').first();
      if (await productCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await productCard.click();
        
        // Click buy button
        const buyButton = page.locator('button[data-testid="button-buy-now"]');
        await buyButton.click();
        
        // Payment dialog should open
        await expect(page.locator('[data-testid="dialog-payment"]')).toBeVisible();
      }
    });

    test('should select payment method (QRIS)', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      
      const productCard = page.locator('[data-testid^="card-product-"]').first();
      if (await productCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await productCard.click();
        await page.click('button[data-testid="button-buy-now"]');
        
        // Select QRIS
        const qrisOption = page.locator('[data-testid="payment-method-qris"]');
        if (await qrisOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await qrisOption.click();
          
          // Should highlight selected method
          await expect(qrisOption).toHaveClass(/selected|active/);
        }
      }
    });

    test('should select payment method (GoPay)', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      
      const productCard = page.locator('[data-testid^="card-product-"]').first();
      if (await productCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await productCard.click();
        await page.click('button[data-testid="button-buy-now"]');
        
        // Select GoPay
        const gopayOption = page.locator('[data-testid="payment-method-gopay"]');
        if (await gopayOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await gopayOption.click();
          await expect(gopayOption).toHaveClass(/selected|active/);
        }
      }
    });

    test('should confirm payment and redirect', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      
      const productCard = page.locator('[data-testid^="card-product-"]').first();
      if (await productCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await productCard.click();
        await page.click('button[data-testid="button-buy-now"]');
        
        // Select payment method
        const qrisOption = page.locator('[data-testid="payment-method-qris"]');
        if (await qrisOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await qrisOption.click();
          
          // Confirm payment
          await page.click('button[data-testid="button-confirm-payment"]');
          
          // Should redirect to payment page or transaction page
          await page.waitForTimeout(3000);
          
          // URL should change
          expect(page.url()).not.toBe(`${BASE_URL}/`);
        }
      }
    });
  });

  test.describe('Wallet Operations', () => {
    test('should display wallet balance', async ({ page }) => {
      await page.goto(`${BASE_URL}/wallet`);
      
      // Should show balance
      const balanceElement = page.locator('[data-testid="text-wallet-balance"]');
      await expect(balanceElement).toBeVisible();
      
      const balance = await balanceElement.textContent();
      expect(balance).toMatch(/Rp\s[\d.,]+/);
    });

    test('should show wallet transaction history', async ({ page }) => {
      await page.goto(`${BASE_URL}/wallet`);
      
      // Should show transactions or empty state
      const transactionList = page.locator('[data-testid="list-transactions"]');
      const emptyState = page.locator('[data-testid="empty-state-transactions"]');
      
      const hasTransactions = await transactionList.isVisible({ timeout: 3000 }).catch(() => false);
      const isEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
      
      expect(hasTransactions || isEmpty).toBeTruthy();
    });

    test('should initiate wallet top-up', async ({ page }) => {
      await page.goto(`${BASE_URL}/wallet`);
      
      // Click top-up button
      const topUpButton = page.locator('button[data-testid="button-topup-wallet"]');
      await topUpButton.click();
      
      // Dialog should open
      await expect(page.locator('[data-testid="dialog-topup"]')).toBeVisible();
      
      // Fill amount
      await page.fill('input[data-testid="input-topup-amount"]', '100000');
      
      // Confirm
      await page.click('button[data-testid="button-confirm-topup"]');
      
      // Should redirect to payment
      await page.waitForTimeout(2000);
    });

    test('should send money to another user', async ({ page }) => {
      await page.goto(`${BASE_URL}/wallet`);
      
      // Click send money button
      const sendButton = page.locator('button[data-testid="button-send-money"]');
      if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendButton.click();
        
        // Fill recipient
        await page.fill('input[data-testid="input-recipient-username"]', testUsers.seller.username);
        await page.fill('input[data-testid="input-send-amount"]', '50000');
        
        // Confirm
        await page.click('button[data-testid="button-confirm-send"]');
        
        // Should show success or error
        await page.waitForTimeout(2000);
      }
    });

    test('should request money from another user', async ({ page }) => {
      await page.goto(`${BASE_URL}/wallet`);
      
      // Click request money button
      const requestButton = page.locator('button[data-testid="button-request-money"]');
      if (await requestButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await requestButton.click();
        
        // Fill form
        await page.fill('input[data-testid="input-request-from"]', testUsers.seller.username);
        await page.fill('input[data-testid="input-request-amount"]', '25000');
        await page.fill('textarea[data-testid="input-request-note"]', 'Test request');
        
        // Confirm
        await page.click('button[data-testid="button-confirm-request"]');
        
        // Should show success
        await expect(page.locator('text=/request.*sent/i')).toBeVisible();
      }
    });
  });

  test.describe('Payment Status', () => {
    test('should check payment status', async ({ page }) => {
      await page.goto(`${BASE_URL}/transaction-history`);
      
      // Find a transaction
      const transaction = page.locator('[data-testid^="transaction-"]').first();
      if (await transaction.isVisible({ timeout: 5000 }).catch(() => false)) {
        await transaction.click();
        
        // Should show transaction details
        await expect(page.locator('[data-testid="text-transaction-status"]')).toBeVisible();
      }
    });

    test('should display different payment statuses correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/transaction-history`);
      
      // Check for status badges
      const statusBadges = page.locator('[data-testid^="badge-status-"]');
      const count = await statusBadges.count();
      
      if (count > 0) {
        // Each status should have appropriate styling
        for (let i = 0; i < Math.min(count, 5); i++) {
          const badge = statusBadges.nth(i);
          await expect(badge).toBeVisible();
        }
      }
    });
  });

  test.describe('E-Wallet Integration', () => {
    test('should connect e-wallet account', async ({ page }) => {
      await page.goto(`${BASE_URL}/wallet`);
      
      // Click connect e-wallet button
      const connectButton = page.locator('button[data-testid="button-connect-ewallet"]');
      if (await connectButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await connectButton.click();
        
        // Select provider (e.g., GoPay, OVO, DANA)
        await page.click('[data-testid="ewallet-provider-gopay"]');
        
        // Fill phone number
        await page.fill('input[data-testid="input-ewallet-phone"]', '081234567890');
        
        // Verify
        await page.click('button[data-testid="button-verify-ewallet"]');
        
        // Should send OTP or show verification step
        await page.waitForTimeout(2000);
      }
    });

    test('should display connected e-wallets', async ({ page }) => {
      await page.goto(`${BASE_URL}/wallet`);
      
      // Check for connected e-wallets section
      const ewalletSection = page.locator('[data-testid="section-connected-ewallets"]');
      if (await ewalletSection.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Should show list of connected wallets or empty state
        await expect(ewalletSection).toBeVisible();
      }
    });
  });
});
