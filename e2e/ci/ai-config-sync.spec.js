/**
 * AI Config Sync E2E Tests
 *
 * Tests that AI configuration is properly loaded and synced between
 * Settings and Chat components without requiring "Test Connection".
 *
 * These tests are CI-safe (no external AI dependencies).
 */

import { test, expect } from '@playwright/test';

// Storage key must match the one in aiService.js
const AI_CONFIG_KEY = 'rp-ai-config';

test.describe('AI Config Sync', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test for clean state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('Chat shows default Gemini config on fresh start (no localStorage)', async ({ page }) => {
    // Navigate to Chat
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(300);

    // Should show empty state (no error about missing config)
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();

    // Should NOT show the "Configure your AI provider" warning
    // (because default Gemini config has an API key)
    await expect(page.locator('text=Configure your AI provider')).not.toBeVisible();
  });

  test('Settings shows same default Gemini config on fresh start', async ({ page }) => {
    // Navigate to Settings
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(300);

    // Expand AI Assistant section
    await page.click('text=AI Assistant');
    await page.waitForTimeout(300);

    // Provider dropdown should show Google (default) - find div with Provider label, then select inside
    const providerSelect = page.locator('div:has(> label:text("Provider")) select');
    await expect(providerSelect).toHaveValue('google');

    // Model should show gemini-2.5-flash (label is now in a flex container)
    // The AI Assistant section has a select for model - find it by looking within that section
    const aiSection = page.locator('text=AI Assistant').locator('xpath=ancestor::div[contains(@class, "border-b")]');
    const modelSelect = aiSection.locator('select').nth(1); // Second select (first is Provider)
    await expect(modelSelect).toHaveValue('gemini-2.5-flash');
  });

  test('config saved in Settings is immediately available in Chat', async ({ page }) => {
    // Navigate to Settings
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(300);

    // Expand AI Assistant section
    await page.click('text=AI Assistant');
    await page.waitForTimeout(300);

    // Change to Custom provider
    const providerSelect = page.locator('div:has(> label:text("Provider")) select');
    await providerSelect.selectOption('custom');
    await page.waitForTimeout(300);

    // Fill in custom endpoint (placeholder contains "localhost")
    await page.fill('input[placeholder*="localhost"]', 'http://localhost:4000/v1/messages');

    // Fill in model (for custom provider, it's an input field with placeholder containing "Model name")
    await page.fill('input[placeholder*="Model name"]', 'test-model');

    // Navigate to Chat
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(300);

    // Should show empty state (no error)
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();

    // Should NOT show config warning (custom provider doesn't require API key check)
    await expect(page.locator('text=Configure your AI provider')).not.toBeVisible();

    // Verify config was saved to localStorage
    const savedConfig = await page.evaluate(key => {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    }, AI_CONFIG_KEY);

    expect(savedConfig).not.toBeNull();
    expect(savedConfig.provider).toBe('custom');
    expect(savedConfig.customBaseUrl).toBe('http://localhost:4000/v1/messages');
    expect(savedConfig.model).toBe('test-model');
  });

  test('config persists after page reload', async ({ page }) => {
    // Set up config via Settings
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(300);
    await page.click('text=AI Assistant');
    await page.waitForTimeout(300);

    // Change to Anthropic
    const providerSelect = page.locator('div:has(> label:text("Provider")) select');
    await providerSelect.selectOption('anthropic');
    await page.waitForTimeout(300);

    // Enter API key
    await page.fill('input[type="password"]', 'test-api-key-12345');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate to Settings and verify config persisted
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(300);
    await page.click('text=AI Assistant');
    await page.waitForTimeout(300);

    // Provider should still be Anthropic
    const reloadedProviderSelect = page.locator('div:has(> label:text("Provider")) select');
    await expect(reloadedProviderSelect).toHaveValue('anthropic');

    // API key field should have value (we can check it's not empty)
    const apiKeyInput = page.locator('input[type="password"]');
    const apiKeyValue = await apiKeyInput.inputValue();
    expect(apiKeyValue.length).toBeGreaterThan(0);
  });

  test('Chat loads config immediately on page load (no Settings visit required)', async ({ page }) => {
    // Pre-populate localStorage with custom config
    await page.evaluate(key => {
      const config = {
        provider: 'custom',
        apiKey: '', // Custom doesn't need API key
        model: 'test-model',
        customBaseUrl: 'http://localhost:5000/api',
      };
      localStorage.setItem(key, JSON.stringify(config));
    }, AI_CONFIG_KEY);

    // Reload page to pick up the config
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Go directly to Chat (skip Settings)
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(300);

    // Should show empty state with no errors
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();

    // Should NOT show config warning
    await expect(page.locator('text=Configure your AI provider')).not.toBeVisible();

    // Input should be enabled and ready
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeEnabled();
  });

  test('Chat picks up config changes when switching from Settings tab', async ({ page }) => {
    // Open the Chat panel (clicking AI Chat tab toggles panel visibility)
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(300);

    // Verify default state (should work with default Gemini)
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();

    // Switch to Settings tab (chat panel remains visible as a side panel)
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(300);
    await page.click('text=AI Assistant');
    await page.waitForTimeout(300);

    // Change to OpenAI
    const providerSelect = page.locator('div:has(> label:text("Provider")) select');
    await providerSelect.selectOption('openai');
    await page.waitForTimeout(300);

    // Enter API key
    await page.fill('input[type="password"]', 'sk-test-key');
    await page.waitForTimeout(300);

    // Chat panel is still visible (it's a docked panel, not a tab)
    // So we DON'T need to click the AI Chat tab again

    // Chat should still be ready (config was synced via custom event)
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled();

    // Verify the config was actually updated
    const savedConfig = await page.evaluate(key => {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    }, AI_CONFIG_KEY);

    expect(savedConfig.provider).toBe('openai');
  });

  test('empty API key for non-custom provider falls back to defaults (no warning)', async ({
    page,
  }) => {
    // Set Anthropic config without API key
    // With the fix, this should fall back to DEFAULT_AI_CONFIG (Gemini)
    await page.evaluate(key => {
      const config = {
        provider: 'anthropic',
        apiKey: '', // Empty - will trigger fallback to defaults
        model: 'claude-sonnet-4-20250514',
        customBaseUrl: '',
      };
      localStorage.setItem(key, JSON.stringify(config));
    }, AI_CONFIG_KEY);

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Go to Chat
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(300);

    // Should NOT show the config warning - falls back to default Gemini config
    await expect(page.locator('text=Configure your AI provider')).not.toBeVisible();

    // Chat should be usable
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
  });

  test('custom provider works without API key', async ({ page }) => {
    // Set custom config without API key
    await page.evaluate(key => {
      const config = {
        provider: 'custom',
        apiKey: '', // Empty but should be OK for custom
        model: 'local-model',
        customBaseUrl: 'http://localhost:1234/v1',
      };
      localStorage.setItem(key, JSON.stringify(config));
    }, AI_CONFIG_KEY);

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Go to Chat
    await page.click('button:has-text("AI Chat")');
    await page.waitForTimeout(300);

    // Should NOT show config warning
    await expect(page.locator('text=Configure your AI provider')).not.toBeVisible();

    // Should be ready to chat
    await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled();
  });
});
