import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Tests are split into two categories:
 * - e2e/ci/    - CI-safe tests (no external dependencies)
 * - e2e/local/ - Local-only tests (requires ccproxy-api)
 */

// Configurable timeouts (can be overridden via environment variables)
const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT || '60000', 10);
const DEFAULT_TIMEOUT = parseInt(process.env.E2E_TIMEOUT || '30000', 10);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  timeout: DEFAULT_TIMEOUT,
  expect: {
    timeout: DEFAULT_TIMEOUT,
  },
  use: {
    baseURL: 'http://localhost:5173/retirement-planner/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'ci',
      testDir: './e2e/ci',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'local',
      testDir: './e2e/local',
      timeout: AI_TIMEOUT,
      expect: { timeout: AI_TIMEOUT },
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/retirement-planner/',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
