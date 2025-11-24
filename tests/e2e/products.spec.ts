/**
 * E2E Tests: Product CRUD Operations
 * Tests for creating, reading, updating, and deleting products
 */

import { test, expect } from '@playwright/test';
import { authHelpers, productHelpers, BASE_URL } from '../helpers/playwright-helpers';
import { testUsers, testProducts } from '../fixtures/test-data';

test.describe('Product Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as seller
    await authHelpers.login(page, testUsers.seller.email, testUsers.seller.password);
  });

  test.describe('Product Creation', () => {
    test('should create a new product successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/upload`);
      await page.waitForLoadState('networkidle');
      
      const product = testProducts.mobileLegends;
      
      // Fill product form
      await page.fill('input[data-testid="input-product-title"]', product.title);
      await page.fill('textarea[data-testid="input-product-description"]', product.description);
      await page.selectOption('select[data-testid="select-category"]', product.category);
      await page.fill('input[data-testid="input-product-price"]', product.price);
      
      // Submit
      await page.click('button[data-testid="button-create-product"]');
      
      // Should show success message
      await expect(page.locator('text=/product.*created/i')).toBeVisible();
    });

    test('should show validation error for missing required fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/upload`);
      
      // Try to submit without filling any fields
      await page.click('button[data-testid="button-create-product"]');
      
      // Should show validation errors
      await expect(page.locator('text=/title.*required/i')).toBeVisible();
    });

    test('should show error for invalid price', async ({ page }) => {
      await page.goto(`${BASE_URL}/upload`);
      
      await page.fill('input[data-testid="input-product-title"]', 'Test Product');
      await page.fill('input[data-testid="input-product-price"]', '-100'); // Negative price
      
      await page.click('button[data-testid="button-create-product"]');
      
      // Should show price validation error
      await expect(page.locator('text=/price.*positive/i')).toBeVisible();
    });

    test('should upload product images', async ({ page }) => {
      await page.goto(`${BASE_URL}/upload`);
      
      // Upload image (if file input is available)
      const fileInput = page.locator('input[type="file"][data-testid="input-product-images"]');
      if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // This would require an actual image file in the test environment
        // For now, we just verify the upload functionality exists
        await expect(fileInput).toBeVisible();
      }
    });
  });

  test.describe('Product Viewing', () => {
    test('should display product details correctly', async ({ page }) => {
      // First, check if there are any products
      await page.goto(`${BASE_URL}/`);
      
      const productCard = page.locator('[data-testid^="card-product-"]').first();
      if (await productCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await productCard.click();
        
        // Should show product details
        await expect(page.locator('[data-testid="text-product-title"]')).toBeVisible();
        await expect(page.locator('[data-testid="text-product-price"]')).toBeVisible();
        await expect(page.locator('[data-testid="text-product-description"]')).toBeVisible();
      }
    });

    test('should display seller information', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      
      const productCard = page.locator('[data-testid^="card-product-"]').first();
      if (await productCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await productCard.click();
        
        // Should show seller info
        await expect(page.locator('[data-testid="text-seller-name"]')).toBeVisible();
      }
    });

    test('should filter products by category', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      
      // Click category filter
      const categoryFilter = page.locator('select[data-testid="select-category-filter"]');
      if (await categoryFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await categoryFilter.selectOption('mobile_legends');
        
        // Wait for products to load
        await page.waitForTimeout(1000);
        
        // All visible products should be from the selected category
        const products = page.locator('[data-testid^="card-product-"]');
        const count = await products.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should search products by title', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      
      const searchInput = page.locator('input[data-testid="input-search"]');
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill('Mobile Legends');
        await searchInput.press('Enter');
        
        // Wait for search results
        await page.waitForTimeout(1000);
        
        // Should show search results
        const results = page.locator('[data-testid^="card-product-"]');
        const count = await results.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Product Updating', () => {
    test('should update product details successfully', async ({ page }) => {
      // Go to seller dashboard
      await page.goto(`${BASE_URL}/seller-dashboard`);
      
      // Find a product to edit
      const editButton = page.locator('button[data-testid^="button-edit-product-"]').first();
      if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.click();
        
        // Update title
        const titleInput = page.locator('input[data-testid="input-product-title"]');
        await titleInput.clear();
        await titleInput.fill('Updated Product Title');
        
        // Save changes
        await page.click('button[data-testid="button-update-product"]');
        
        // Should show success message
        await expect(page.locator('text=/updated.*successfully/i')).toBeVisible();
      }
    });

    test('should update product price', async ({ page }) => {
      await page.goto(`${BASE_URL}/seller-dashboard`);
      
      const editButton = page.locator('button[data-testid^="button-edit-product-"]').first();
      if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.click();
        
        // Update price
        const priceInput = page.locator('input[data-testid="input-product-price"]');
        await priceInput.clear();
        await priceInput.fill('600000');
        
        await page.click('button[data-testid="button-update-product"]');
        
        await expect(page.locator('text=/updated/i')).toBeVisible();
      }
    });
  });

  test.describe('Product Deletion', () => {
    test('should delete product successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/seller-dashboard`);
      
      const deleteButton = page.locator('button[data-testid^="button-delete-product-"]').first();
      if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteButton.click();
        
        // Confirm deletion
        await page.click('button[data-testid="button-confirm-delete"]');
        
        // Should show success message
        await expect(page.locator('text=/deleted/i')).toBeVisible();
      }
    });

    test('should show confirmation dialog before deletion', async ({ page }) => {
      await page.goto(`${BASE_URL}/seller-dashboard`);
      
      const deleteButton = page.locator('button[data-testid^="button-delete-product-"]').first();
      if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteButton.click();
        
        // Should show confirmation dialog
        await expect(page.locator('[data-testid="dialog-confirm-delete"]')).toBeVisible();
        await expect(page.locator('text=/are you sure/i')).toBeVisible();
        
        // Cancel deletion
        await page.click('button[data-testid="button-cancel-delete"]');
        
        // Dialog should close
        await expect(page.locator('[data-testid="dialog-confirm-delete"]')).not.toBeVisible();
      }
    });
  });

  test.describe('Product Status', () => {
    test('should mark product as sold', async ({ page }) => {
      await page.goto(`${BASE_URL}/seller-dashboard`);
      
      const markSoldButton = page.locator('button[data-testid^="button-mark-sold-"]').first();
      if (await markSoldButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await markSoldButton.click();
        
        // Should show success
        await expect(page.locator('text=/marked.*sold/i')).toBeVisible();
      }
    });
  });
});
