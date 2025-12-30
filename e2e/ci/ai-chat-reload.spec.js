/**
 * AI Chat Reload E2E Tests
 *
 * Tests that AI chat works "out of the box" on fresh page loads,
 * especially after page reloads.
 *
 * Bug: AI chat not working after reload when saved config has empty API key
 * Root cause: loadAIConfig() returns object with empty apiKey, and
 * `|| DEFAULT_AI_CONFIG` fallback doesn't trigger because object is truthy
 */

import { test, expect } from '@playwright/test';

const AI_CONFIG_KEY = 'rp-ai-config';

test.describe('AI Chat Reload Behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('AI Chat works on completely fresh start (no localStorage)', async ({ page }) => {
    // Navigate directly to Chat without visiting Settings
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(300);

    // Should show empty state (not an error)
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();

    // Should NOT show the "Configure your AI provider" warning
    await expect(page.locator('text=Configure your AI provider')).not.toBeVisible();

    // Chat input should be enabled
    await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled();
  });

  test('AI Chat still works after page reload (no localStorage changes)', async ({ page }) => {
    // First visit to Chat
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate back to Chat
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(300);

    // Should still work - no config warning
    await expect(page.locator('text=Configure your AI provider')).not.toBeVisible();
    await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled();
  });

  test('saved config with empty API key for different provider falls back to defaults', async ({
    page,
  }) => {
    // Simulate what happens when user visits Settings and changes provider
    // but doesn't enter an API key - this saves a config with empty apiKey
    await page.evaluate(key => {
      const config = {
        provider: 'anthropic', // Changed from default google
        apiKey: '', // Empty - user didn't enter one
        model: 'claude-sonnet-4-20250514',
        customBaseUrl: '',
      };
      localStorage.setItem(key, JSON.stringify(config));
    }, AI_CONFIG_KEY);

    // Reload page to pick up the config
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate to Chat
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(300);

    // FIX: loadAIConfig() now returns null when saved config has empty API key
    // for non-custom providers, triggering DEFAULT_AI_CONFIG fallback
    // So the Chat should work with the default Gemini config
    await expect(page.locator('text=Configure your AI provider')).not.toBeVisible();
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
  });

  test('FIX VERIFICATION: empty saved config should fall back to defaults', async ({ page }) => {
    // Save a config with empty API key (simulating the bug scenario)
    await page.evaluate(key => {
      const config = {
        provider: 'google', // Same as default
        apiKey: '', // Empty!
        model: 'gemini-2.5-flash',
        customBaseUrl: '',
      };
      localStorage.setItem(key, JSON.stringify(config));
    }, AI_CONFIG_KEY);

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate to Chat
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(300);

    // After the fix: should NOT show warning because we should fall back to default
    // This test will fail until the fix is applied
    // Comment out the expect below if documenting current (broken) behavior
    await expect(page.locator('text=Configure your AI provider')).not.toBeVisible();
  });

  test('Settings visit then Chat should work without explicit "Test Connection"', async ({
    page,
  }) => {
    // User visits Settings first (common flow)
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(300);

    // Just view the AI section, don't change anything
    await page.click('text=AI Assistant');
    await page.waitForTimeout(300);

    // Now go to Chat without clicking "Test Connection"
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(300);

    // Should work - default config should be active
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    await expect(page.locator('text=Configure your AI provider')).not.toBeVisible();
  });

  test('Changing provider in Settings saves config - verify Chat sees it', async ({ page }) => {
    // Go to Settings and change provider
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(300);
    await page.click('text=AI Assistant');
    await page.waitForTimeout(300);

    // Change to OpenAI
    const providerSelect = page.locator('div:has(> label:text("Provider")) select');
    await providerSelect.selectOption('openai');
    await page.waitForTimeout(300);

    // Enter an API key
    await page.fill('input[type="password"]', 'sk-test-key-12345');
    await page.waitForTimeout(100);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Go to Chat
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(300);

    // Should NOT show warning (we entered an API key)
    await expect(page.locator('text=Configure your AI provider')).not.toBeVisible();

    // Verify the saved config
    const savedConfig = await page.evaluate(key => {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    }, AI_CONFIG_KEY);

    expect(savedConfig).not.toBeNull();
    expect(savedConfig.provider).toBe('openai');
  });
});
