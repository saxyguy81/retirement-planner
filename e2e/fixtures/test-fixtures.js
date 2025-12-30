/**
 * E2E Test Fixtures
 *
 * Shared test utilities and fixtures for Playwright tests.
 */

import { test as base, expect } from '@playwright/test';

// Extend base test with common fixtures
export const test = base.extend({
  // Wait for app to fully load
  appReady: async ({ page }, use) => {
    await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
    await use(page);
  },

  // Navigate to specific tab
  navigateToTab: async ({ page }, use) => {
    const navigate = async tabName => {
      await page.click(`button:has-text("${tabName}")`);
      await page.waitForTimeout(500);
    };
    await use(navigate);
  },
});

/**
 * Check if ccproxy is available
 */
export async function isCCProxyAvailable() {
  try {
    const response = await fetch('http://localhost:4000/health');
    const data = await response.json();
    return data.status === 'pass' || data.status === 'warn';
  } catch {
    return false;
  }
}

/**
 * Skip test if ccproxy not available
 */
export function requiresCCProxy(testFn) {
  return async args => {
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }
    await testFn(args);
  };
}

/**
 * Configure AI provider for testing with ccproxy
 */
export async function configureAIForCCProxy(page) {
  // Navigate to Settings tab
  await page.click('button:has-text("Settings")');
  await page.waitForTimeout(500);

  // Expand AI Assistant section
  await page.click('text=AI Assistant');
  await page.waitForTimeout(300);

  // Select Custom provider
  await page.selectOption('select', 'custom');
  await page.waitForTimeout(300);

  // Fill in custom endpoint - use Anthropic format
  const baseUrlInput = page.locator('input[placeholder*="endpoint"]').first();
  await baseUrlInput.fill('http://localhost:4000/v1/messages');

  // Fill in model name
  const modelInput = page.locator('input[placeholder*="Model"]');
  await modelInput.fill('claude-3-5-sonnet-20241022');

  // Fill in API key (any non-empty value works for ccproxy)
  const apiKeyInput = page.locator('input[type="password"]');
  await apiKeyInput.fill('test-key');

  // Go back to AI Chat tab
  await page.click('button:has-text("AI Chat")');
  await page.waitForTimeout(500);
}

export { expect };
