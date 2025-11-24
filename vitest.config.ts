import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./client/src/test/setup.ts'],
    
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/*.spec.ts',
      'tests/e2e/**',
      'tests/integration/**',
      'tests/performance/**',
      'tests/*.test.js',
      'tests/admin-user-roles.test.js',
      'tests/fraud-*.js',
      'tests/offline-mode.test.js',
    ],
    
    include: [
      'tests/unit/**/*.test.ts',
      'client/src/**/*.test.ts',
      'client/src/**/*.test.tsx',
    ],
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        
        'server/**',
        '**/server/**',
        
        'tests/**',
        
        'migrations/**',
        'logs/**',
        'playwright-report/**',
        'test-results/**',
        
        '*.config.ts',
        '*.config.js',
        
        'shared/**',
        'public/**',
        'attached_assets/**',
        
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
