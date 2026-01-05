/**
 * AI Chat E2E Tests
 *
 * Tests for the AI Chat functionality.
 * These tests require ccproxy-api running locally.
 *
 * Run with: npx playwright test --project=local
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

test.describe('AI Chat', () => {
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
    await page.fill('input[placeholder*="endpoint"], input[placeholder*="URL"]', 'http://localhost:4000/api/v1/messages');

    // Fill in model
    await page.fill('input[placeholder*="model" i], input[placeholder*="Model"]', 'claude-sonnet-4-20250514');

    // Fill in API key (any value works for ccproxy)
    await page.fill('input[type="password"]', 'test-api-key');

    // Navigate to AI Chat
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(500);
  });

  test('shows empty state with capabilities', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }

    // Should show empty state
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();

    // Should show capability cards
    await expect(page.locator('[data-testid="capability-card"]').first()).toBeVisible();
  });

  test('can send message and receive streaming response', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }

    // Type a simple message
    await page.fill('[data-testid="chat-input"]', "What's my current heir value?");

    // Click send button
    await page.click('[data-testid="send-button"]');

    // Should show streaming content or loading indicator
    await expect(
      page.locator('[data-testid="streaming-content"]').or(page.locator('text=Thinking...'))
    ).toBeVisible({ timeout: 10000 });

    // Wait for response (up to 60 seconds for AI)
    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 60000 });

    // Response should contain some financial information
    const responseText = await page.locator('[data-testid="message-assistant"]').textContent();
    expect(responseText).toMatch(/\$|value|heir/i);
  });

  test('AI can use get_current_state tool', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }

    // Ask a question that requires the tool
    await page.fill('[data-testid="chat-input"]', 'Show me my current retirement parameters');
    await page.click('[data-testid="send-button"]');

    // Should show tool call indicator
    await expect(page.locator('[data-testid="tool-call-indicator"]')).toBeVisible({ timeout: 30000 });

    // Wait for response
    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 60000 });
  });

  test('AI can create scenario', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }

    // Ask AI to create a scenario
    await page.fill('[data-testid="chat-input"]', 'Create a scenario called "Test Scenario" with $100K Roth conversion in 2026');
    await page.click('[data-testid="send-button"]');

    // Wait for response
    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 60000 });

    // Should show action hint with link to scenarios
    await expect(page.locator('[data-testid="action-hint"]')).toBeVisible({ timeout: 5000 });
  });

  test('cancel button stops AI request', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }

    // Send a message
    await page.fill('[data-testid="chat-input"]', 'Tell me about Roth conversions');
    await page.click('[data-testid="send-button"]');

    // Wait for loading state
    await expect(page.locator('[data-testid="cancel-button"]')).toBeVisible({ timeout: 5000 });

    // Click cancel
    await page.click('[data-testid="cancel-button"]');

    // Should return to ready state (send button visible)
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible({ timeout: 5000 });
  });

  test('Escape key cancels request', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }

    await page.fill('[data-testid="chat-input"]', 'Explain retirement planning');
    await page.click('[data-testid="send-button"]');

    // Wait for cancel button to appear
    await expect(page.locator('[data-testid="cancel-button"]')).toBeVisible({ timeout: 5000 });

    // Press Escape
    await page.keyboard.press('Escape');

    // Should return to ready state
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible({ timeout: 5000 });
  });

  test('New Chat button clears history', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }

    // Send a message first
    await page.fill('[data-testid="chat-input"]', 'Hello');
    await page.click('[data-testid="send-button"]');

    // Wait for response
    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 60000 });

    // Click New Chat button
    await page.click('[data-testid="new-chat-button"]');

    // Messages should be cleared, empty state should return
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({ timeout: 5000 });
  });

  test('copy button appears on hover', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }

    // Send a message and wait for response
    await page.fill('[data-testid="chat-input"]', "What's my current portfolio total?");
    await page.click('[data-testid="send-button"]');
    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 60000 });

    // Hover over the assistant message
    await page.locator('[data-testid="message-assistant"]').hover();

    // Copy button should appear
    await expect(page.locator('[data-testid="copy-button"]')).toBeVisible();
  });

  test('token usage displays in header', async ({ page }) => {
    const available = await isCCProxyAvailable();
    if (!available) {
      test.skip();
      return;
    }

    // Send a message and wait for response
    await page.fill('[data-testid="chat-input"]', 'Hello!');
    await page.click('[data-testid="send-button"]');
    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 60000 });

    // Token usage should be visible
    await expect(page.locator('[data-testid="token-usage"]')).toBeVisible();
  });
});
