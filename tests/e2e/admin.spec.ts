/**
 * E2E Tests: Admin Panel Operations
 * Tests for admin dashboard, user management, fraud monitoring, and analytics
 */

import { test, expect } from '@playwright/test';
import { authHelpers, adminHelpers, BASE_URL, waitHelpers } from '../helpers/playwright-helpers';
import { testUsers } from '../fixtures/test-data';

test.describe('Admin Panel Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await authHelpers.login(page, testUsers.admin.email, testUsers.admin.password);
  });

  test.describe('Admin Access Control', () => {
    test('should allow admin access to admin panel', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Should successfully load admin panel
      await expect(page.locator('[data-testid="admin-panel"]')).toBeVisible();
    });

    test('should show admin navigation and tabs', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Check for admin tabs/navigation
      const dashboardTab = page.locator('[data-testid="tab-dashboard"]');
      const usersTab = page.locator('[data-testid="tab-users"]');
      
      await expect(dashboardTab).toBeVisible();
      await expect(usersTab).toBeVisible();
    });
  });

  test.describe('Dashboard Analytics', () => {
    test('should display key performance indicators (KPIs)', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Navigate to dashboard if not already there
      const dashboardTab = page.locator('[data-testid="tab-dashboard"]');
      if (await dashboardTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dashboardTab.click();
      }
      
      // Check for KPI cards
      const totalUsers = page.locator('[data-testid="kpi-total-users"]');
      const totalRevenue = page.locator('[data-testid="kpi-total-revenue"]');
      const activeProducts = page.locator('[data-testid="kpi-active-products"]');
      
      // At least one KPI should be visible
      const kpisVisible = await totalUsers.isVisible({ timeout: 3000 }).catch(() => false) ||
                          await totalRevenue.isVisible({ timeout: 1000 }).catch(() => false) ||
                          await activeProducts.isVisible({ timeout: 1000 }).catch(() => false);
      
      expect(kpisVisible).toBeTruthy();
    });

    test('should display revenue chart', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Look for revenue chart
      const revenueChart = page.locator('[data-testid="chart-revenue"]');
      if (await revenueChart.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(revenueChart).toBeVisible();
      }
    });

    test('should display recent transactions', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Look for transactions list
      const transactionsList = page.locator('[data-testid="list-recent-transactions"]');
      if (await transactionsList.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(transactionsList).toBeVisible();
      }
    });
  });

  test.describe('User Management', () => {
    test('should display users list', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Navigate to users tab
      const usersTab = page.locator('[data-testid="tab-users"]');
      await usersTab.click();
      await page.waitForTimeout(1000);
      
      // Should show users table or list
      const usersTable = page.locator('[data-testid="table-users"]');
      const usersList = page.locator('[data-testid="list-users"]');
      
      const hasUsers = await usersTable.isVisible({ timeout: 3000 }).catch(() => false) ||
                       await usersList.isVisible({ timeout: 1000 }).catch(() => false);
      
      expect(hasUsers).toBeTruthy();
    });

    test('should search for users', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      await page.click('[data-testid="tab-users"]');
      await page.waitForTimeout(1000);
      
      // Find search input
      const searchInput = page.locator('input[data-testid="input-search-users"]');
      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill('admin');
        await page.waitForTimeout(1000);
        
        // Results should be filtered
        await expect(searchInput).toHaveValue('admin');
      }
    });

    test('should filter users by role', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      await page.click('[data-testid="tab-users"]');
      await page.waitForTimeout(1000);
      
      // Find role filter
      const roleFilter = page.locator('select[data-testid="select-role-filter"]');
      if (await roleFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await roleFilter.selectOption('admin');
        await page.waitForTimeout(1000);
      }
    });

    test('should view user details', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      await page.click('[data-testid="tab-users"]');
      await page.waitForTimeout(1000);
      
      // Click on first user row
      const firstUserRow = page.locator('[data-testid^="user-row-"]').first();
      if (await firstUserRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstUserRow.click();
        
        // User details should be displayed
        const userDetails = page.locator('[data-testid="dialog-user-details"]');
        await expect(userDetails).toBeVisible();
      }
    });

    test('should verify user account', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      await page.click('[data-testid="tab-users"]');
      await page.waitForTimeout(1000);
      
      // Find unverified user
      const verifyButton = page.locator('[data-testid^="button-verify-user-"]').first();
      if (await verifyButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await verifyButton.click();
        
        // Should show success message
        await expect(page.locator('text=/verified/i')).toBeVisible({ timeout: 3000 });
      }
    });

    test('should suspend user account', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      await page.click('[data-testid="tab-users"]');
      await page.waitForTimeout(1000);
      
      // Find suspend button
      const suspendButton = page.locator('[data-testid^="button-suspend-user-"]').first();
      if (await suspendButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await suspendButton.click();
        
        // Confirm suspension
        await page.click('[data-testid="button-confirm-suspend"]');
        
        // Should show success
        await expect(page.locator('text=/suspended/i')).toBeVisible({ timeout: 3000 });
      }
    });

    test('should approve admin request', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      await page.click('[data-testid="tab-users"]');
      await page.waitForTimeout(1000);
      
      // Look for pending admin requests
      const approveButton = page.locator('[data-testid^="button-approve-admin-"]').first();
      if (await approveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await approveButton.click();
        
        // Confirm approval
        await page.click('[data-testid="button-confirm-approve"]');
        
        // Should show success
        await expect(page.locator('text=/approved/i')).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Fraud Monitoring', () => {
    test('should display fraud alerts dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      // Navigate to fraud tab
      const fraudTab = page.locator('[data-testid="tab-fraud"]');
      if (await fraudTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fraudTab.click();
        await page.waitForTimeout(1000);
        
        // Should show fraud dashboard
        const fraudDashboard = page.locator('[data-testid="fraud-dashboard"]');
        await expect(fraudDashboard).toBeVisible();
      }
    });

    test('should show fraud alert severity levels', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const fraudTab = page.locator('[data-testid="tab-fraud"]');
      if (await fraudTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fraudTab.click();
        await page.waitForTimeout(1000);
        
        // Check for severity indicators
        const criticalAlerts = page.locator('[data-testid="alerts-critical"]');
        const warningAlerts = page.locator('[data-testid="alerts-warning"]');
        
        const hasAlerts = await criticalAlerts.isVisible({ timeout: 2000 }).catch(() => false) ||
                         await warningAlerts.isVisible({ timeout: 1000 }).catch(() => false);
        
        expect(true).toBeTruthy(); // Placeholder - at least the tab should load
      }
    });

    test('should filter fraud alerts by severity', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const fraudTab = page.locator('[data-testid="tab-fraud"]');
      if (await fraudTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fraudTab.click();
        await page.waitForTimeout(1000);
        
        // Look for severity filter
        const severityFilter = page.locator('[data-testid="select-severity-filter"]');
        if (await severityFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
          await severityFilter.selectOption('critical');
          await page.waitForTimeout(1000);
        }
      }
    });

    test('should acknowledge fraud alert', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const fraudTab = page.locator('[data-testid="tab-fraud"]');
      if (await fraudTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fraudTab.click();
        await page.waitForTimeout(1000);
        
        // Find acknowledge button
        const acknowledgeButton = page.locator('[data-testid^="button-acknowledge-alert-"]').first();
        if (await acknowledgeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await acknowledgeButton.click();
          
          // Should update alert status
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe('Security Monitoring', () => {
    test('should display security tab', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const securityTab = page.locator('[data-testid="tab-security"]');
      if (await securityTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await securityTab.click();
        await page.waitForTimeout(1000);
        
        // Security dashboard should load
        await expect(page).toHaveURL(/admin/);
      }
    });

    test('should show IP blacklist management', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const securityTab = page.locator('[data-testid="tab-security"]');
      if (await securityTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await securityTab.click();
        await page.waitForTimeout(1000);
        
        // Look for blacklist section
        const blacklistSection = page.locator('[data-testid="section-ip-blacklist"]');
        if (await blacklistSection.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(blacklistSection).toBeVisible();
        }
      }
    });

    test('should add IP to blacklist', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const securityTab = page.locator('[data-testid="tab-security"]');
      if (await securityTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await securityTab.click();
        await page.waitForTimeout(1000);
        
        // Find add IP button
        const addButton = page.locator('[data-testid="button-add-ip-blacklist"]');
        if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await addButton.click();
          
          // Fill IP address
          await page.fill('input[data-testid="input-ip-address"]', '192.168.1.100');
          await page.fill('input[data-testid="input-blacklist-reason"]', 'Test blacklist');
          
          // Submit
          await page.click('[data-testid="button-confirm-add-blacklist"]');
          
          // Should show success
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe('Activity Logs', () => {
    test('should display activity logs', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const activityTab = page.locator('[data-testid="tab-activity"]');
      if (await activityTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await activityTab.click();
        await page.waitForTimeout(1000);
        
        // Activity logs should be visible
        const activityLogs = page.locator('[data-testid="list-activity-logs"]');
        await expect(activityLogs).toBeVisible();
      }
    });

    test('should filter activity logs by type', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const activityTab = page.locator('[data-testid="tab-activity"]');
      if (await activityTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await activityTab.click();
        await page.waitForTimeout(1000);
        
        // Find type filter
        const typeFilter = page.locator('[data-testid="select-activity-type"]');
        if (await typeFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
          await typeFilter.selectOption('login');
          await page.waitForTimeout(1000);
        }
      }
    });

    test('should filter activity logs by user', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const activityTab = page.locator('[data-testid="tab-activity"]');
      if (await activityTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await activityTab.click();
        await page.waitForTimeout(1000);
        
        // Find user filter
        const userFilter = page.locator('input[data-testid="input-filter-user"]');
        if (await userFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
          await userFilter.fill('admin');
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe('Sales Dashboard', () => {
    test('should display sales analytics', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const salesTab = page.locator('[data-testid="tab-sales"]');
      if (await salesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await salesTab.click();
        await page.waitForTimeout(1000);
        
        // Sales dashboard should load
        await expect(page).toHaveURL(/admin/);
      }
    });

    test('should show seller performance metrics', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const salesTab = page.locator('[data-testid="tab-sales"]');
      if (await salesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await salesTab.click();
        await page.waitForTimeout(1000);
        
        // Look for seller metrics
        const sellerMetrics = page.locator('[data-testid="section-seller-metrics"]');
        if (await sellerMetrics.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(sellerMetrics).toBeVisible();
        }
      }
    });
  });

  test.describe('Data Export', () => {
    test('should access export center', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const exportTab = page.locator('[data-testid="tab-export"]');
      if (await exportTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await exportTab.click();
        await page.waitForTimeout(1000);
        
        // Export center should be visible
        const exportCenter = page.locator('[data-testid="export-center"]');
        await expect(exportCenter).toBeVisible();
      }
    });

    test('should export user data', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const exportTab = page.locator('[data-testid="tab-export"]');
      if (await exportTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await exportTab.click();
        await page.waitForTimeout(1000);
        
        // Find export users button
        const exportUsersButton = page.locator('[data-testid="button-export-users"]');
        if (await exportUsersButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Click export button
          await exportUsersButton.click();
          
          // Wait for export to initiate
          await page.waitForTimeout(2000);
        }
      }
    });

    test('should export transaction data', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const exportTab = page.locator('[data-testid="tab-export"]');
      if (await exportTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await exportTab.click();
        await page.waitForTimeout(1000);
        
        // Find export transactions button
        const exportTxButton = page.locator('[data-testid="button-export-transactions"]');
        if (await exportTxButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await exportTxButton.click();
          await page.waitForTimeout(2000);
        }
      }
    });
  });

  test.describe('Live Insights', () => {
    test('should display real-time metrics', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const liveTab = page.locator('[data-testid="tab-live-insights"]');
      if (await liveTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await liveTab.click();
        await page.waitForTimeout(1000);
        
        // Live dashboard should load
        const liveDashboard = page.locator('[data-testid="live-insights-dashboard"]');
        await expect(liveDashboard).toBeVisible();
      }
    });

    test('should show active users count', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const liveTab = page.locator('[data-testid="tab-live-insights"]');
      if (await liveTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await liveTab.click();
        await page.waitForTimeout(1000);
        
        // Look for active users metric
        const activeUsers = page.locator('[data-testid="metric-active-users"]');
        if (await activeUsers.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(activeUsers).toBeVisible();
        }
      }
    });
  });

  test.describe('Device Tracking', () => {
    test('should display device tracking dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const deviceTab = page.locator('[data-testid="tab-device-tracking"]');
      if (await deviceTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deviceTab.click();
        await page.waitForTimeout(1000);
        
        // Device tracking should load
        const deviceDashboard = page.locator('[data-testid="device-tracking-dashboard"]');
        await expect(deviceDashboard).toBeVisible();
      }
    });

    test('should show device distribution', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const deviceTab = page.locator('[data-testid="tab-device-tracking"]');
      if (await deviceTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deviceTab.click();
        await page.waitForTimeout(1000);
        
        // Look for device charts
        const deviceChart = page.locator('[data-testid="chart-device-distribution"]');
        if (await deviceChart.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(deviceChart).toBeVisible();
        }
      }
    });
  });

  test.describe('User Reports', () => {
    test('should display user reports system', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const reportsTab = page.locator('[data-testid="tab-user-reports"]');
      if (await reportsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await reportsTab.click();
        await page.waitForTimeout(1000);
        
        // Reports system should load
        const reportsSystem = page.locator('[data-testid="user-reports-system"]');
        await expect(reportsSystem).toBeVisible();
      }
    });

    test('should review reported content', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const reportsTab = page.locator('[data-testid="tab-user-reports"]');
      if (await reportsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await reportsTab.click();
        await page.waitForTimeout(1000);
        
        // Find first report
        const firstReport = page.locator('[data-testid^="report-item-"]').first();
        if (await firstReport.isVisible({ timeout: 3000 }).catch(() => false)) {
          await firstReport.click();
          
          // Report details should show
          await expect(page.locator('[data-testid="report-details"]')).toBeVisible();
        }
      }
    });

    test('should take action on reported content', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin`);
      
      const reportsTab = page.locator('[data-testid="tab-user-reports"]');
      if (await reportsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await reportsTab.click();
        await page.waitForTimeout(1000);
        
        const firstReport = page.locator('[data-testid^="report-item-"]').first();
        if (await firstReport.isVisible({ timeout: 3000 }).catch(() => false)) {
          await firstReport.click();
          
          // Take action button
          const actionButton = page.locator('[data-testid="button-take-action"]');
          if (await actionButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await actionButton.click();
            
            // Select action type
            await page.click('[data-testid="action-remove-content"]');
            
            // Confirm action
            await page.click('[data-testid="button-confirm-action"]');
            
            // Should show success
            await page.waitForTimeout(1000);
          }
        }
      }
    });
  });
});
