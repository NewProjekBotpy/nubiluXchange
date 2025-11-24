// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  globalSetup: './tests/setup/e2e-setup.ts',
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          executablePath: '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dbus', '--disable-dev-shm-usage', '--disable-gpu'],
        },
      },
    },
    {
      name: 'mobile',
      use: { 
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
        launchOptions: {
          executablePath: '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dbus', '--disable-dev-shm-usage', '--disable-gpu'],
        },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 5000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});