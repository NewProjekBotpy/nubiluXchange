/**
 * Playwright E2E Test Helpers
 * Common functions for Playwright tests
 */

import { Page, expect } from '@playwright/test';

export const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

/**
 * Authentication helpers
 */
export const authHelpers = {
  /**
   * Login with email and password
   */
  login: async (page: Page, email: string, password: string) => {
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');
    
    // Switch to Sign In tab if needed
    const signInTab = page.locator('button[role="tab"]', { hasText: 'Sign In' });
    if (await signInTab.isVisible()) {
      await signInTab.click();
    }
    
    // Fill credentials
    await page.fill('input[data-testid="input-email"]', email);
    await page.fill('input[data-testid="input-password"]', password);
    
    // Submit
    await page.click('button[data-testid="button-login"]');
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  },

  /**
   * Register new user
   */
  register: async (page: Page, userData: { username: string; email: string; password: string }) => {
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');
    
    // Switch to Sign Up tab
    const signUpTab = page.locator('button[role="tab"]', { hasText: 'Sign Up' });
    await signUpTab.click();
    
    // Fill registration form
    await page.fill('input[data-testid="input-username"]', userData.username);
    await page.fill('input[data-testid="input-register-email"]', userData.email);
    await page.fill('input[data-testid="input-register-password"]', userData.password);
    
    // Submit
    await page.click('button[data-testid="button-register"]');
    
    // Wait for success
    await page.waitForLoadState('networkidle');
  },

  /**
   * Logout current user
   */
  logout: async (page: Page) => {
    // Navigate to settings or click logout button
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');
    
    const logoutButton = page.locator('button[data-testid="button-logout"]');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForLoadState('networkidle');
    }
  },

  /**
   * Setup 2FA for current user
   */
  setup2FA: async (page: Page, token: string) => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');
    
    // Click 2FA setup button
    await page.click('button[data-testid="button-2fa-setup"]');
    
    // Wait for QR code dialog
    await expect(page.locator('[data-testid="dialog-2fa-setup"]')).toBeVisible();
    
    // Click next to verification
    await page.click('button[data-testid="button-next-to-verify"]');
    
    // Enter token
    await page.fill('input[data-testid="input-2fa-token"]', token);
    
    // Verify
    await page.click('button[data-testid="button-verify-2fa"]');
    
    // Wait for success
    await expect(page.locator('text=2FA enabled successfully')).toBeVisible();
  },

  /**
   * Login with 2FA
   */
  loginWith2FA: async (page: Page, email: string, password: string, token: string) => {
    await authHelpers.login(page, email, password);
    
    // Wait for 2FA dialog
    await expect(page.locator('[data-testid="dialog-2fa-login"]')).toBeVisible();
    
    // Enter token
    await page.fill('input[data-testid="input-2fa-code"]', token);
    
    // Submit
    await page.click('button[data-testid="button-submit-2fa"]');
    
    // Wait for success
    await page.waitForLoadState('networkidle');
  },
};

/**
 * Product helpers
 */
export const productHelpers = {
  /**
   * Create a new product
   */
  createProduct: async (page: Page, productData: {
    title: string;
    description: string;
    category: string;
    price: string;
  }) => {
    await page.goto(`${BASE_URL}/upload`);
    await page.waitForLoadState('networkidle');
    
    // Fill product form
    await page.fill('input[data-testid="input-product-title"]', productData.title);
    await page.fill('textarea[data-testid="input-product-description"]', productData.description);
    await page.selectOption('select[data-testid="select-category"]', productData.category);
    await page.fill('input[data-testid="input-product-price"]', productData.price);
    
    // Submit
    await page.click('button[data-testid="button-create-product"]');
    
    // Wait for success
    await expect(page.locator('text=Product created successfully')).toBeVisible();
  },

  /**
   * View product details
   */
  viewProduct: async (page: Page, productId: number) => {
    await page.goto(`${BASE_URL}/product/${productId}`);
    await page.waitForLoadState('networkidle');
  },

  /**
   * Delete product
   */
  deleteProduct: async (page: Page, productId: number) => {
    await productHelpers.viewProduct(page, productId);
    
    // Click delete button
    await page.click('button[data-testid="button-delete-product"]');
    
    // Confirm deletion
    await page.click('button[data-testid="button-confirm-delete"]');
    
    // Wait for success
    await expect(page.locator('text=Product deleted')).toBeVisible();
  },
};

/**
 * Chat helpers
 */
export const chatHelpers = {
  /**
   * Send a message in chat
   */
  sendMessage: async (page: Page, chatId: number, message: string) => {
    await page.goto(`${BASE_URL}/chat/${chatId}`);
    await page.waitForLoadState('networkidle');
    
    // Fill message input
    await page.fill('input[data-testid="input-message"]', message);
    
    // Send
    await page.click('button[data-testid="button-send-message"]');
    
    // Wait for message to appear
    await expect(page.locator(`text=${message}`)).toBeVisible();
  },

  /**
   * Open chat with seller
   */
  openChat: async (page: Page, productId: number) => {
    await page.goto(`${BASE_URL}/product/${productId}`);
    await page.waitForLoadState('networkidle');
    
    // Click chat button
    await page.click('button[data-testid="button-chat-seller"]');
    
    // Wait for chat to open
    await page.waitForURL(/\/chat\/\d+/);
  },

  /**
   * React to message
   */
  reactToMessage: async (page: Page, messageId: number, emoji: string) => {
    const message = page.locator(`[data-testid="message-${messageId}"]`);
    await message.hover();
    
    // Click reaction button
    await message.locator('[data-testid="button-add-reaction"]').click();
    
    // Select emoji
    await page.click(`[data-testid="emoji-${emoji}"]`);
  },
};

/**
 * Payment helpers
 */
export const paymentHelpers = {
  /**
   * Initiate payment for product
   */
  initiatePayment: async (page: Page, productId: number, paymentMethod: string) => {
    await page.goto(`${BASE_URL}/product/${productId}`);
    await page.waitForLoadState('networkidle');
    
    // Click buy button
    await page.click('button[data-testid="button-buy-now"]');
    
    // Wait for payment dialog
    await expect(page.locator('[data-testid="dialog-payment"]')).toBeVisible();
    
    // Select payment method
    await page.click(`[data-testid="payment-method-${paymentMethod}"]`);
    
    // Confirm payment
    await page.click('button[data-testid="button-confirm-payment"]');
    
    // Wait for payment page
    await page.waitForLoadState('networkidle');
  },

  /**
   * Simulate successful payment (for testing)
   */
  simulatePaymentSuccess: async (page: Page) => {
    // This would typically involve interacting with payment gateway test page
    // For now, we'll just wait for success redirect
    await page.waitForURL(/\/transaction/);
  },
};

/**
 * Admin panel helpers
 */
export const adminHelpers = {
  /**
   * Navigate to admin panel section
   */
  navigateToSection: async (page: Page, section: string) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Click on section tab
    await page.click(`[data-testid="tab-${section}"]`);
    await page.waitForLoadState('networkidle');
  },

  /**
   * Approve admin request
   */
  approveAdminRequest: async (page: Page, userId: number) => {
    await adminHelpers.navigateToSection(page, 'users');
    
    // Find user row
    const userRow = page.locator(`[data-testid="user-row-${userId}"]`);
    
    // Click approve button
    await userRow.locator('[data-testid="button-approve-admin"]').click();
    
    // Confirm
    await page.click('[data-testid="button-confirm-approve"]');
    
    // Wait for success
    await expect(page.locator('text=Admin approved')).toBeVisible();
  },

  /**
   * Verify user account
   */
  verifyUser: async (page: Page, userId: number) => {
    await adminHelpers.navigateToSection(page, 'users');
    
    // Find user row
    const userRow = page.locator(`[data-testid="user-row-${userId}"]`);
    
    // Click verify button
    await userRow.locator('[data-testid="button-verify-user"]').click();
    
    // Wait for success
    await expect(page.locator('text=User verified')).toBeVisible();
  },
};

/**
 * Offline mode helpers
 */
export const offlineHelpers = {
  /**
   * Go offline
   */
  goOffline: async (page: Page) => {
    await page.context().setOffline(true);
    await page.waitForTimeout(500);
    
    // Verify offline banner appears
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
  },

  /**
   * Go online
   */
  goOnline: async (page: Page) => {
    await page.context().setOffline(false);
    await page.waitForTimeout(500);
  },

  /**
   * Wait for sync to complete
   */
  waitForSync: async (page: Page, timeout = 5000) => {
    await page.waitForFunction(
      () => {
        const banner = document.querySelector('[data-testid="offline-banner"]');
        if (!banner) return true;
        const titleText = banner.textContent || '';
        return titleText.includes('Tersinkronisasi') || titleText.includes('Online');
      },
      { timeout }
    );
  },
};

/**
 * Screenshot helpers
 */
export const screenshotHelpers = {
  /**
   * Take full page screenshot
   */
  fullPage: async (page: Page, name: string) => {
    await page.screenshot({
      path: `tests/screenshots/${name}.png`,
      fullPage: true,
    });
  },

  /**
   * Take element screenshot
   */
  element: async (page: Page, selector: string, name: string) => {
    const element = page.locator(selector);
    await element.screenshot({
      path: `tests/screenshots/${name}.png`,
    });
  },
};

/**
 * Wait utilities
 */
export const waitHelpers = {
  /**
   * Wait for element to be visible
   */
  forVisible: async (page: Page, selector: string, timeout = 5000) => {
    await expect(page.locator(selector)).toBeVisible({ timeout });
  },

  /**
   * Wait for text to appear
   */
  forText: async (page: Page, text: string, timeout = 5000) => {
    await expect(page.locator(`text=${text}`)).toBeVisible({ timeout });
  },

  /**
   * Wait for URL pattern
   */
  forURL: async (page: Page, pattern: string | RegExp, timeout = 5000) => {
    await page.waitForURL(pattern, { timeout });
  },
};

/**
 * Console log helpers
 */
export const consoleHelpers = {
  /**
   * Collect console errors
   */
  collectErrors: (page: Page): string[] => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  },

  /**
   * Collect all console messages
   */
  collectAll: (page: Page): Array<{ type: string; text: string }> => {
    const messages: Array<{ type: string; text: string }> = [];
    page.on('console', (msg) => {
      messages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });
    return messages;
  },
};
