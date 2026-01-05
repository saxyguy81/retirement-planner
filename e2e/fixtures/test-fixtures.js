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

/**
 * Send a chat message and wait for AI response
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} message - Message to send
 * @param {number} timeout - Timeout in ms (default 90s for AI responses)
 * @returns {Promise<string>} The assistant's response text
 */
export async function sendChatMessage(page, message, timeout = 90000) {
  await page.fill('[data-testid="chat-input"]', message);
  await page.click('[data-testid="send-button"]');
  await expect(page.locator('[data-testid="message-assistant"]').last()).toBeVisible({
    timeout,
  });
  return page.locator('[data-testid="message-assistant"]').last().textContent();
}

/**
 * Wait for a tool call indicator to appear and disappear
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} toolName - Expected tool name (optional)
 * @param {number} timeout - Timeout in ms
 */
export async function waitForToolCall(page, toolName = null, timeout = 30000) {
  const locator = toolName
    ? page.locator(`[data-testid="tool-call-indicator"]:has-text("${toolName}")`)
    : page.locator('[data-testid="tool-call-indicator"]');

  await expect(locator).toBeVisible({ timeout });
}

/**
 * Navigate to a specific tab in the app
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} tabName - Tab name (e.g., 'Projections', 'AI Chat', 'Settings')
 */
export async function navigateToTab(page, tabName) {
  await page.click(`button:has-text("${tabName}")`);
  await page.waitForTimeout(500);
}

/**
 * Check if a scenario exists in the Scenarios tab
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} scenarioName - Name of the scenario to find
 */
export async function scenarioExists(page, scenarioName) {
  await navigateToTab(page, 'Scenarios');
  const scenario = page.locator(`text=${scenarioName}`);
  return scenario.isVisible();
}

/**
 * Get the value of a specific projection field
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {string} field - Field name (e.g., 'totalEOY', 'heirValue')
 * @param {number} row - Row index (0-based)
 */
export async function getProjectionValue(page, field, row = 0) {
  await navigateToTab(page, 'Projections');
  const cell = page.locator(`[data-testid="projection-${field}"]`).nth(row);
  return cell.textContent();
}

/**
 * Common AI test setup: configure ccproxy and navigate to chat
 * @param {import('@playwright/test').Page} page - Playwright page
 */
export async function setupAITest(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Navigate to Settings and configure AI
  await page.click('button:has-text("Settings")');
  await page.waitForTimeout(500);

  // Expand AI Assistant section if collapsed
  const aiSection = page.locator('text=AI Assistant');
  await aiSection.click();
  await page.waitForTimeout(300);

  // Select Custom provider
  const providerSelect = page.locator('select').first();
  await providerSelect.selectOption('custom');
  await page.waitForTimeout(300);

  // Fill in ccproxy endpoint
  await page.fill(
    'input[placeholder*="endpoint"], input[placeholder*="URL"]',
    'http://localhost:4000/v1/messages'
  );

  // Fill in model
  await page.fill(
    'input[placeholder*="model" i], input[placeholder*="Model"]',
    'claude-3-5-sonnet-20241022'
  );

  // Fill in API key (any value works for ccproxy)
  await page.fill('input[type="password"]', 'test-api-key');

  // Navigate to AI Chat
  await page.click('button:has-text("AI Chat")');
  await page.waitForTimeout(500);
}

/**
 * Assert that a response contains expected content patterns
 * @param {string} response - The AI response text
 * @param {Array<string|RegExp>} patterns - Patterns to match
 */
export function assertResponseContains(response, patterns) {
  for (const pattern of patterns) {
    if (typeof pattern === 'string') {
      expect(response.toLowerCase()).toContain(pattern.toLowerCase());
    } else {
      expect(response).toMatch(pattern);
    }
  }
}

/**
 * Clear chat history by clicking New Chat button
 * @param {import('@playwright/test').Page} page - Playwright page
 */
export async function clearChatHistory(page) {
  await page.click('[data-testid="new-chat-button"]');
  await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({ timeout: 5000 });
}

export { expect };
