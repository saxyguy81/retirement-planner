import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      name: 'chromium',
      headless: true,
      screenshotDirectory: '__baselines__',
      screenshotFailures: true,
    },
    include: ['src/**/*.visual.test.jsx'],
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    // Setup file for browser tests
    setupFiles: ['./tests/visual/setup.js'],
  },
  // Ensure CSS is properly processed
  css: {
    postcss: './postcss.config.js',
  },
});
