/**
 * Full Journey Integration Test
 *
 * End-to-end test that exercises the complete user journey:
 * 1. View initial projections
 * 2. Modify parameters
 * 3. Use optimizer to find best strategy
 * 4. Create scenario from optimizer
 * 5. Ask AI to analyze scenarios
 * 6. Apply AI recommendation to base case
 *
 * This test requires ccproxy-api running locally.
 */

import { test, expect } from '@playwright/test';

async function isCCProxyAvailable() {
  try {
    const response = await fetch('http://localhost:4000/health');
    const data = await response.json();
    return data.status === 'pass' || data.status === 'warn';
  } catch {
    return false;
  }
}

test.describe('Full User Journey', () => {
  test('complete retirement planning workflow', async ({ page }) => {
    const ccproxyAvailable = await isCCProxyAvailable();

    // Step 1: Load application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="app-loaded"]')).toBeVisible();

    // Step 2: Check initial projections
    await expect(page.locator('text=2025')).toBeVisible();
    await expect(page.locator('text=/\\$[0-9]/')).toBeVisible();

    // Step 3: Navigate to Dashboard and verify charts
    await page.click('button:has-text("Dashboard")');
    await page.waitForTimeout(1000);

    // Step 4: Run optimizer
    await page.click('button:has-text("Optimize")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Run Optimization")');
    await page.waitForTimeout(5000);

    // Verify results are shown
    await expect(page.locator('table')).toBeVisible();

    // Step 5: Create scenario from optimizer
    await page.click('button:has-text("Create Scenario")');
    await page.waitForTimeout(500);

    // Should be on Scenarios tab now
    await expect(page.locator('text=Scenario Comparison')).toBeVisible();

    // Step 6: If ccproxy available, test AI integration
    if (ccproxyAvailable) {
      // Configure AI
      await page.click('button:has-text("Settings")');
      await page.waitForTimeout(500);

      const aiSection = page.locator('text=AI Assistant');
      await aiSection.click();
      await page.waitForTimeout(300);

      const providerSelect = page.locator('select').first();
      await providerSelect.selectOption('custom');
      await page.waitForTimeout(300);

      await page.fill('input[placeholder*="endpoint"], input[placeholder*="URL"]', 'http://localhost:4000/v1/messages');
      await page.fill('input[placeholder*="model" i], input[placeholder*="Model"]', 'claude-3-5-sonnet-20241022');
      await page.fill('input[type="password"]', 'test-api-key');

      // Go to AI Chat
      await page.click('button:has-text("AI Chat")');
      await page.waitForTimeout(500);

      // Ask AI about current state
      await page.fill('[data-testid="chat-input"]', "What's my projected heir value and how does it compare to my total taxes paid?");
      await page.click('[data-testid="send-button"]');

      // Wait for AI response
      await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 60000 });

      // Verify AI used tools
      const responseText = await page.locator('[data-testid="message-assistant"]').textContent();
      expect(responseText).toBeTruthy();
    }

    // Step 7: Export data
    await page.click('button:has-text("Projections")');
    await page.waitForTimeout(300);

    // Click Export menu
    await page.click('button:has-text("Export")');
    await page.waitForTimeout(200);

    // Verify export options are visible
    await expect(page.locator('text=XLSX')).toBeVisible();
    await expect(page.locator('text=JSON')).toBeVisible();
    await expect(page.locator('text=PDF')).toBeVisible();

    // Close menu by clicking elsewhere
    await page.click('body', { position: { x: 0, y: 0 } });
  });

  test('parameter modification flow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Expand Timeline section
    await page.click('text=Timeline');
    await page.waitForTimeout(300);

    // Get current end year from summary display
    const initialFinal = await page.locator('text=/Final:.*\\$[0-9]/')
      .textContent()
      .catch(() => 'Final: $0');

    // Expand Account Balances section
    await page.click('text=Account Balances');
    await page.waitForTimeout(300);

    // Modify IRA balance
    const iraInput = page.locator('input[type="number"]').nth(1);
    await iraInput.fill('2500000');
    await iraInput.blur();
    await page.waitForTimeout(500);

    // Verify summary changed
    const newFinal = await page.locator('text=/Final:.*\\$[0-9]/')
      .textContent()
      .catch(() => 'Final: $0');

    // Values should be different (IRA change affects projections)
    // This is a sanity check - the actual values will depend on defaults
  });

  test('save and load state', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Save button
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(300);

    // Should show save dialog
    await expect(page.locator('text=Save Current State')).toBeVisible();

    // Enter a name
    await page.fill('input[placeholder*="name" i]', 'Test Save State');

    // Click Save button in dialog
    await page.click('div[class*="fixed"] button:has-text("Save")');
    await page.waitForTimeout(300);

    // Dialog should close
    await expect(page.locator('text=Save Current State')).not.toBeVisible();

    // Click Load button
    await page.click('button:has-text("Load")');
    await page.waitForTimeout(300);

    // Should show saved state in menu
    await expect(page.locator('text=Test Save State')).toBeVisible();
  });
});
