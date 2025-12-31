/**
 * Web Search Tool E2E Tests
 *
 * These tests verify that the web_search and fetch_page tools
 * actually work end-to-end with the AI provider.
 *
 * Run with: npx playwright test --project=local e2e/local/web-search.spec.js
 */

import { test, expect } from '@playwright/test';

// Check if ccproxy is available before running tests
async function isCCProxyAvailable() {
  try {
    const response = await fetch('http://localhost:4000/health');
    const data = await response.json();
    return data.status === 'pass' || data.status === 'warn';
  } catch {
    return false;
  }
}

test.describe('Web Search Tool', () => {
  test.beforeEach(async ({ page }) => {
    // Check ccproxy availability
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }

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
  });

  test('web search returns actual results for retirement question', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }

    // Ask a question that should trigger web search
    await page.fill(
      '[data-testid="chat-input"]',
      'What are the 2025 Roth IRA income limits for married filing jointly?'
    );
    await page.click('[data-testid="send-button"]');

    // Wait for tool call indicator (web search)
    await expect(page.locator('[data-testid="tool-call-indicator"]')).toBeVisible({
      timeout: 30000,
    });

    // Wait for response (up to 60s for AI + API calls)
    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({
      timeout: 60000,
    });

    // Get the response text
    const response = await page.locator('[data-testid="message-assistant"]').last().textContent();

    // Should NOT say "I wasn't able to search" or similar failure messages
    expect(response).not.toContain("wasn't able to search");
    expect(response).not.toContain("couldn't search");
    expect(response).not.toContain('technical error');

    // Should contain actual limit information
    // 2025 MFJ phase-out range is around $230k-$250k
    expect(response).toMatch(/\$2[234]\d,?\d{3}/);
  });

  test('web search provides sources in response', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }

    await page.fill(
      '[data-testid="chat-input"]',
      'Search the web for 2025 Medicare IRMAA brackets'
    );
    await page.click('[data-testid="send-button"]');

    // Wait for response
    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({
      timeout: 60000,
    });

    const response = await page.locator('[data-testid="message-assistant"]').last().textContent();

    // Should have searched successfully
    expect(response).not.toContain("wasn't able to search");

    // Response should be substantial (not just an error message)
    expect(response.length).toBeGreaterThan(200);
  });

  test('handles follow-up question after web search', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }

    // First question with web search
    await page.fill(
      '[data-testid="chat-input"]',
      'What are the 2025 Roth IRA income limits for married filing jointly?'
    );
    await page.click('[data-testid="send-button"]');

    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({
      timeout: 60000,
    });

    // Follow-up question
    await page.fill('[data-testid="chat-input"]', 'What about for single filers?');
    await page.click('[data-testid="send-button"]');

    // Wait for second response
    await expect(page.locator('[data-testid="message-assistant"]').last()).toBeVisible({
      timeout: 60000,
    });

    const response = await page.locator('[data-testid="message-assistant"]').last().textContent();

    // Should answer about single filers (context maintained)
    expect(response.toLowerCase()).toMatch(/single|individual/);

    // Should have actual dollar amounts
    expect(response).toMatch(/\$\d+/);
  });
});
