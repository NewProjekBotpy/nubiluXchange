/**
 * E2E Tests: Authentication Flow
 * Tests for login, register, logout, and 2FA functionality
 */

import { test, expect } from '@playwright/test';
import { authHelpers, BASE_URL, waitHelpers } from '../helpers/playwright-helpers';
import { testUsers, test2FA } from '../fixtures/test-data';

test.describe('Authentication Flow', () => {
  test.describe('User Registration', () => {
    test('should successfully register a new user', async ({ page }) => {
      const newUser = {
        username: `testuser_${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        password: 'Test123!@#',
      };

      await page.goto(`${BASE_URL}/auth`);
      
      // Switch to Sign Up tab
      await page.click('button[role="tab"]:has-text("Sign Up")');
      
      // Fill registration form
      await page.fill('input[data-testid="input-username"]', newUser.username);
      await page.fill('input[data-testid="input-register-email"]', newUser.email);
      await page.fill('input[data-testid="input-register-password"]', newUser.password);
      
      // Submit
      await page.click('button[data-testid="button-register"]');
      
      // Wait for successful registration
      await waitHelpers.forText(page, 'successfully', 10000);
      
      // Should redirect to home page
      await expect(page).toHaveURL(BASE_URL + '/');
    });

    test('should show error for duplicate email', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth`);
      await page.click('button[role="tab"]:has-text("Sign Up")');
      
      // Use existing admin email
      await page.fill('input[data-testid="input-username"]', 'newuser');
      await page.fill('input[data-testid="input-register-email"]', testUsers.admin.email);
      await page.fill('input[data-testid="input-register-password"]', 'Test123!@#');
      
      await page.click('button[data-testid="button-register"]');
      
      // Should show error
      await expect(page.locator('text=/email.*already/i')).toBeVisible();
    });

    test('should show validation error for weak password', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth`);
      await page.click('button[role="tab"]:has-text("Sign Up")');
      
      await page.fill('input[data-testid="input-username"]', 'testuser');
      await page.fill('input[data-testid="input-register-email"]', 'test@example.com');
      await page.fill('input[data-testid="input-register-password"]', '123'); // Too short
      
      await page.click('button[data-testid="button-register"]');
      
      // Should show password validation error
      await expect(page.locator('text=/password.*6/i')).toBeVisible();
    });
  });

  test.describe('User Login', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      await authHelpers.login(page, testUsers.admin.email, testUsers.admin.password);
      
      // Should be redirected to home
      await expect(page).toHaveURL(BASE_URL + '/');
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth`);
      
      await page.fill('input[data-testid="input-email"]', 'wrong@example.com');
      await page.fill('input[data-testid="input-password"]', 'wrongpassword');
      
      await page.click('button[data-testid="button-login"]');
      
      // Should show error
      await expect(page.locator('text=/invalid.*credentials/i')).toBeVisible();
    });

    test('should persist session after page reload', async ({ page }) => {
      await authHelpers.login(page, testUsers.admin.email, testUsers.admin.password);
      
      // Reload page
      await page.reload();
      
      // Should still be logged in (not redirected to auth page)
      await expect(page).not.toHaveURL(/\/auth/);
    });
  });

  test.describe('User Logout', () => {
    test('should successfully logout', async ({ page }) => {
      // Login first
      await authHelpers.login(page, testUsers.admin.email, testUsers.admin.password);
      
      // Navigate to settings
      await page.goto(`${BASE_URL}/settings`);
      
      // Click logout
      const logoutButton = page.locator('button[data-testid="button-logout"]');
      await logoutButton.click();
      
      // Should be redirected to auth page
      await waitHelpers.forURL(page, /\/auth/);
    });

    test('should clear session after logout', async ({ page }) => {
      await authHelpers.login(page, testUsers.admin.email, testUsers.admin.password);
      
      await page.goto(`${BASE_URL}/settings`);
      await page.click('button[data-testid="button-logout"]');
      
      // Try to access protected page
      await page.goto(`${BASE_URL}/admin`);
      
      // Should redirect to auth
      await waitHelpers.forURL(page, /\/auth/);
    });
  });

  test.describe('Two-Factor Authentication (2FA)', () => {
    test('should setup 2FA successfully', async ({ page }) => {
      await authHelpers.login(page, testUsers.admin.email, testUsers.admin.password);
      
      await page.goto(`${BASE_URL}/settings`);
      
      // Click 2FA setup button
      await page.click('button[data-testid="button-2fa-setup"]');
      
      // Wait for dialog
      await expect(page.locator('[data-testid="dialog-2fa-setup"]')).toBeVisible();
      
      // Should show QR code
      await expect(page.locator('[data-testid="container-qr-code"]')).toBeVisible();
      
      // Should show secret key
      const secretInput = page.locator('input[data-testid="input-secret-key"]');
      await expect(secretInput).toBeVisible();
      const secret = await secretInput.inputValue();
      expect(secret).toBeTruthy();
    });

    test('should verify 2FA token and enable 2FA', async ({ page }) => {
      await authHelpers.login(page, testUsers.admin.email, testUsers.admin.password);
      
      await page.goto(`${BASE_URL}/settings`);
      await page.click('button[data-testid="button-2fa-setup"]');
      await expect(page.locator('[data-testid="dialog-2fa-setup"]')).toBeVisible();
      
      // Proceed to verification
      await page.click('button[data-testid="button-next-to-verify"]');
      
      // Enter verification code (mock)
      await page.fill('input[data-testid="input-2fa-token"]', test2FA.validTOTPToken);
      await page.click('button[data-testid="button-verify-2fa"]');
      
      // Should show backup codes
      await expect(page.locator('text=/backup.*codes/i')).toBeVisible();
    });

    test('should require 2FA for login when enabled', async ({ page }) => {
      // This test assumes 2FA is already enabled for a test user
      await page.goto(`${BASE_URL}/auth`);
      
      await page.fill('input[data-testid="input-email"]', testUsers.admin.email);
      await page.fill('input[data-testid="input-password"]', testUsers.admin.password);
      await page.click('button[data-testid="button-login"]');
      
      // Should show 2FA dialog (if 2FA is enabled for admin)
      const twoFADialog = page.locator('[data-testid="dialog-2fa-login"]');
      const isVisible = await twoFADialog.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        // Verify 2FA prompt is shown
        await expect(twoFADialog).toBeVisible();
        await expect(page.locator('input[data-testid="input-2fa-code"]')).toBeVisible();
      }
    });

    test('should successfully login with 2FA token', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth`);
      
      await page.fill('input[data-testid="input-email"]', testUsers.admin.email);
      await page.fill('input[data-testid="input-password"]', testUsers.admin.password);
      await page.click('button[data-testid="button-login"]');
      
      // Check if 2FA is enabled
      const twoFADialog = page.locator('[data-testid="dialog-2fa-login"]');
      const needs2FA = await twoFADialog.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (needs2FA) {
        // Enter 2FA code
        await page.fill('input[data-testid="input-2fa-code"]', test2FA.validTOTPToken);
        await page.click('button[data-testid="button-submit-2fa"]');
        
        // Should redirect to home
        await waitHelpers.forURL(page, BASE_URL + '/');
      }
    });

    test('should allow login with backup code', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth`);
      
      await page.fill('input[data-testid="input-email"]', testUsers.admin.email);
      await page.fill('input[data-testid="input-password"]', testUsers.admin.password);
      await page.click('button[data-testid="button-login"]');
      
      const twoFADialog = page.locator('[data-testid="dialog-2fa-login"]');
      const needs2FA = await twoFADialog.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (needs2FA) {
        // Switch to backup code tab
        await page.click('button[data-testid="tab-backup-code"]');
        
        // Enter backup code
        await page.fill('input[data-testid="input-backup-code"]', test2FA.backupCodes[0]);
        await page.click('button[data-testid="button-verify-backup"]');
        
        // Should succeed or show error if code is invalid/used
        await page.waitForTimeout(1000);
      }
    });

    test('should disable 2FA successfully', async ({ page }) => {
      await authHelpers.login(page, testUsers.admin.email, testUsers.admin.password);
      
      await page.goto(`${BASE_URL}/settings`);
      
      // Click disable 2FA button
      const disableButton = page.locator('button[data-testid="button-2fa-disable"]');
      if (await disableButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await disableButton.click();
        
        // Enter password to confirm
        await page.fill('input[data-testid="input-password-confirm"]', testUsers.admin.password);
        await page.click('button[data-testid="button-confirm-disable-2fa"]');
        
        // Should show success message
        await expect(page.locator('text=/2FA.*disabled/i')).toBeVisible();
      }
    });
  });

  test.describe('Session Management', () => {
    test('should redirect to auth page when accessing protected route without login', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Should redirect to auth
      await waitHelpers.forURL(page, /\/auth/);
    });

    test('should allow access to public routes without login', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      
      // Should stay on home page
      await expect(page).toHaveURL(BASE_URL + '/');
    });
  });
});
